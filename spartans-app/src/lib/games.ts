import { EXCLUDED_DIVISIONS, EXCLUDED_ID_PREFIXES, NAME_OVERRIDES } from '@/config';

// Raw row as selected from Supabase (see data/queries.ts for the select).
export type RawGameRow = {
  id: string;
  updated_at: string | null;
  state: {
    status?: string;
    half?: string | number;
    meta?: {
      home?: string;
      away?: string;
      division?: string;
      date?: string;
      time?: string;
      location?: string;
      gameName?: string;
      isPlayoff?: boolean | string;
    };
    players?: Record<string, RawStatLine>;
    homePlayers?: RawRosterEntry[];
    awayPlayers?: RawRosterEntry[];
    hiddenPlayers?: Record<string, unknown>;
  };
};

type RawStatLine = {
  pts?: number;
  reb?: number;
  ast?: number;
  fls?: number;
  makes?: { ft?: number; fg2?: number; fg3?: number };
};

type RawRosterEntry = { id?: string; pid?: number | string; name?: string; number?: string };

export type GameStatus = 'pregame' | 'live' | 'final' | 'cancelled';

export type PlayerLine = {
  pid: number | null;
  key: string;
  name: string;
  number: string;
  pts: number;
  reb: number;
  ast: number;
  fls: number;
  ft: number;
  fg2: number;
  fg3: number;
  hidden: boolean;
};

export type Game = {
  id: string;
  season: string; // e.g. "fa26"
  status: GameStatus;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  startsAt: number; // epoch ms, local time
  division: string;
  location: string;
  home: string;
  away: string;
  label: string; // gameName, e.g. "Semifinal"
  isPlayoff: boolean;
  half: number;
  homeScore: number;
  awayScore: number;
  homePlayers: PlayerLine[];
  awayPlayers: PlayerLine[];
  updatedAt: string | null;
};

export type Season = { key: string; label: string; order: number };

// ---- Seasons ---------------------------------------------------------------
// Ids look like fa26g12, su26g4, s26g_v2_31, or plain g109 (Winter 2026, the
// first season in the system). Any future prefix like w27g / sp27g is picked
// up automatically.

const TERM: Record<string, { label: string; rank: number }> = {
  w: { label: 'Winter', rank: 0 },
  wi: { label: 'Winter', rank: 0 },
  s: { label: 'Spring', rank: 1 },
  sp: { label: 'Spring', rank: 1 },
  su: { label: 'Summer', rank: 2 },
  fa: { label: 'Fall', rank: 3 },
  f: { label: 'Fall', rank: 3 },
};

export function seasonKeyFromId(id: string): string | null {
  if (/^g\d+$/.test(id)) return 'w26';
  const m = /^([a-z]+)(\d{2})g/.exec(id);
  if (!m) return null;
  const term = m[1] === 'wi' ? 'w' : m[1] === 'sp' ? 's' : m[1] === 'f' ? 'fa' : m[1];
  return TERM[term] ? `${term}${m[2]}` : null;
}

export function seasonFromKey(key: string): Season {
  const m = /^([a-z]+)(\d{2})$/.exec(key)!;
  const t = TERM[m[1]];
  const year = 2000 + Number(m[2]);
  return { key, label: `${t.label} ${year}`, order: year * 10 + t.rank };
}

// ---- Parsing -----------------------------------------------------------------

// Rosters mix "DEREK MEDOLLA" and "dennis acosta"; tidy only all-caps or
// all-lowercase names so hand-typed ones like "McEvoy" are left alone.
export function cleanName(raw: string) {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}

const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);

function toLines(roster: RawRosterEntry[] | undefined, stats: Record<string, RawStatLine>, hidden: Record<string, unknown>): PlayerLine[] {
  return (roster ?? []).map((p, i) => {
    const key = p.id ?? (p.pid != null ? `pid_${p.pid}` : `idx_${i}`);
    const s = stats[key] ?? {};
    const pidNum = p.pid != null ? Number(p.pid) : key.startsWith('pid_') ? Number(key.slice(4)) : NaN;
    return {
      pid: isFinite(pidNum) ? pidNum : null,
      key,
      name: (isFinite(pidNum) && NAME_OVERRIDES[pidNum]) || cleanName(p.name ?? '') || 'Unknown',
      number: p.number && p.number !== '?' ? String(p.number) : '',
      pts: n(s.pts),
      reb: n(s.reb),
      ast: n(s.ast),
      fls: n(s.fls),
      ft: n(s.makes?.ft),
      fg2: n(s.makes?.fg2),
      fg3: n(s.makes?.fg3),
      hidden: hidden[key] === true, // {pid_x: false} means shown
    };
  });
}

function toStatus(s: string | undefined): GameStatus {
  if (s === 'live' || s === 'final' || s === 'cancelled') return s;
  return 'pregame';
}

export function parseGame(row: RawGameRow): Game | null {
  if (EXCLUDED_ID_PREFIXES.some((p) => row.id.startsWith(p))) return null;
  const season = seasonKeyFromId(row.id);
  if (!season) return null;
  const st = row.state ?? {};
  const meta = st.meta ?? {};
  if (!meta.home || !meta.away) return null;
  if (EXCLUDED_DIVISIONS.includes(meta.division ?? '')) return null;

  const stats = st.players ?? {};
  const hidden = st.hiddenPlayers ?? {};
  const homePlayers = toLines(st.homePlayers, stats, hidden);
  const awayPlayers = toLines(st.awayPlayers, stats, hidden);
  // Scores aren't stored directly; they're the sum of player points.
  const sum = (a: PlayerLine[]) => a.reduce((t, p) => t + p.pts, 0);

  const date = meta.date ?? '';
  const time = meta.time ?? '';
  const startsAt = date ? new Date(`${date}T${time || '00:00'}:00`).getTime() : 0;

  return {
    id: row.id,
    season,
    status: toStatus(st.status),
    date,
    time,
    startsAt,
    division: (meta.division ?? '').trim() || 'Other',
    location: meta.location ?? '',
    home: meta.home.trim(),
    away: meta.away.trim(),
    label: meta.gameName ?? '',
    isPlayoff: meta.isPlayoff === true || meta.isPlayoff === 'true',
    half: n(st.half) || 1,
    homeScore: sum(homePlayers),
    awayScore: sum(awayPlayers),
    homePlayers,
    awayPlayers,
    updatedAt: row.updated_at,
  };
}

export function seasonsIn(games: Game[]): Season[] {
  const keys = Array.from(new Set(games.map((g) => g.season)));
  return keys.map(seasonFromKey).sort((a, b) => b.order - a.order);
}

export function divisionsIn(games: Game[]): string[] {
  const order = (d: string) => {
    const l = d.toLowerCase();
    if (l.startsWith("men's")) return 0;
    if (l.startsWith('women')) return 1;
    if (l.includes('high school')) return 2;
    return 3;
  };
  return Array.from(new Set(games.map((g) => g.division))).sort(
    (a, b) => order(a) - order(b) || a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function sameTeam(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function teamInGame(g: Game, team: string) {
  return sameTeam(g.home, team) || sameTeam(g.away, team);
}
