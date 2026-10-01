import { Game, PlayerLine } from './games';

export type PlayerTotals = {
  pid: number;
  name: string;
  number: string;
  team: string;
  division: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  fls: number;
  fg2: number;
  fg3: number;
  ft: number;
  high: number;
};

export type GameLogEntry = {
  game: Game;
  team: string;
  opponent: string;
  won: boolean | null;
  line: PlayerLine;
};

function played(line: PlayerLine) {
  return !line.hidden && line.pid != null;
}

// Season (or any slice of games) totals keyed by player id.
export function playerTotals(games: Game[], opts: { includePlayoffs?: boolean } = {}): PlayerTotals[] {
  const map = new Map<number, PlayerTotals>();
  for (const g of games) {
    if (g.status !== 'final') continue;
    if (g.isPlayoff && !opts.includePlayoffs) continue;
    const sides: [PlayerLine[], string][] = [
      [g.homePlayers, g.home],
      [g.awayPlayers, g.away],
    ];
    for (const [lines, team] of sides) {
      for (const p of lines) {
        if (!played(p)) continue;
        const t =
          map.get(p.pid!) ??
          { pid: p.pid!, name: p.name, number: p.number, team, division: g.division, gp: 0, pts: 0, reb: 0, ast: 0, fls: 0, fg2: 0, fg3: 0, ft: 0, high: 0 };
        t.gp++;
        t.pts += p.pts;
        t.reb += p.reb;
        t.ast += p.ast;
        t.fls += p.fls;
        t.fg2 += p.fg2;
        t.fg3 += p.fg3;
        t.ft += p.ft;
        t.high = Math.max(t.high, p.pts);
        // Most recent game wins for name/number/team
        t.name = p.name;
        if (p.number) t.number = p.number;
        t.team = team;
        t.division = g.division;
        map.set(p.pid!, t);
      }
    }
  }
  return Array.from(map.values());
}

export function gameLog(games: Game[], pid: number): GameLogEntry[] {
  const out: GameLogEntry[] = [];
  for (const g of games) {
    if (g.status !== 'final' && g.status !== 'live') continue;
    const home = g.homePlayers.find((p) => p.pid === pid && !p.hidden);
    const away = g.awayPlayers.find((p) => p.pid === pid && !p.hidden);
    const line = home ?? away;
    if (!line) continue;
    const isHome = !!home;
    const my = isHome ? g.homeScore : g.awayScore;
    const opp = isHome ? g.awayScore : g.homeScore;
    out.push({
      game: g,
      team: isHome ? g.home : g.away,
      opponent: isHome ? g.away : g.home,
      won: g.status === 'final' ? my > opp : null,
      line,
    });
  }
  return out.sort((a, b) => b.game.startsAt - a.game.startsAt);
}

export type PlayerDirectoryEntry = { pid: number; name: string; team: string; lastSeen: number };

// Everyone who has appeared on a roster, for player search.
export function playerDirectory(games: Game[]): PlayerDirectoryEntry[] {
  const map = new Map<number, PlayerDirectoryEntry>();
  for (const g of games) {
    for (const [lines, team] of [[g.homePlayers, g.home], [g.awayPlayers, g.away]] as const) {
      for (const p of lines) {
        if (p.pid == null) continue;
        const cur = map.get(p.pid);
        if (!cur || g.startsAt > cur.lastSeen) map.set(p.pid, { pid: p.pid, name: p.name, team, lastSeen: g.startsAt });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const perGame = (total: number, gp: number) => (gp ? total / gp : 0);
