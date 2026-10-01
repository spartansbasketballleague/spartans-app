import { Game, sameTeam } from './games';

export type StandingRow = {
  team: string;
  w: number;
  l: number;
  pct: number;
  pf: number;
  pa: number;
  diff: number;
  streak: string; // "W3", "L1"
  last5: ('W' | 'L')[];
  gb: number;
};

// Regular-season finals only. Playoff games and cancellations never count.
export function countsForStandings(g: Game) {
  return g.status === 'final' && !g.isPlayoff && g.homeScore !== g.awayScore;
}

export function buildStandings(games: Game[]): StandingRow[] {
  const finals = games.filter(countsForStandings).sort((a, b) => a.startsAt - b.startsAt);
  const teams = new Map<string, { name: string; results: ('W' | 'L')[]; pf: number; pa: number }>();
  const get = (name: string) => {
    const k = name.toLowerCase();
    if (!teams.has(k)) teams.set(k, { name, results: [], pf: 0, pa: 0 });
    return teams.get(k)!;
  };
  // Teams on the schedule with no finals yet still get a 0-0 row.
  for (const g of games) {
    if (g.isPlayoff || g.status === 'cancelled') continue;
    get(g.home);
    get(g.away);
  }
  for (const g of finals) {
    const h = get(g.home);
    const a = get(g.away);
    const homeWon = g.homeScore > g.awayScore;
    h.results.push(homeWon ? 'W' : 'L');
    a.results.push(homeWon ? 'L' : 'W');
    h.pf += g.homeScore; h.pa += g.awayScore;
    a.pf += g.awayScore; a.pa += g.homeScore;
  }

  const rows: StandingRow[] = Array.from(teams.values()).map((t) => {
    const w = t.results.filter((r) => r === 'W').length;
    const l = t.results.length - w;
    let streak = '';
    if (t.results.length) {
      const last = t.results[t.results.length - 1];
      let c = 0;
      for (let i = t.results.length - 1; i >= 0 && t.results[i] === last; i--) c++;
      streak = `${last}${c}`;
    }
    return {
      team: t.name,
      w,
      l,
      pct: w + l ? w / (w + l) : 0,
      pf: t.pf,
      pa: t.pa,
      diff: t.pf - t.pa,
      streak,
      last5: t.results.slice(-5),
      gb: 0,
    };
  });

  const sorted = sortWithTiebreakers(rows, finals);
  const lead = sorted[0];
  for (const r of sorted) r.gb = lead ? (lead.w - r.w + (r.l - lead.l)) / 2 : 0;
  return sorted;
}

// League rule: head-to-head first; point differential only when the tied
// teams never played each other. Pass one sorts by record then differential
// so three-way ties start from a stable order; pass two applies H2H inside
// each group of teams with the same record.
function sortWithTiebreakers(rows: StandingRow[], finals: Game[]): StandingRow[] {
  const byRecord = [...rows].sort((a, b) => b.pct - a.pct || b.w - a.w || b.diff - a.diff);
  const out: StandingRow[] = [];
  let i = 0;
  while (i < byRecord.length) {
    let j = i + 1;
    while (j < byRecord.length && byRecord[j].w === byRecord[i].w && byRecord[j].l === byRecord[i].l) j++;
    const group = byRecord.slice(i, j);
    out.push(...(group.length > 1 ? breakTie(group, finals) : group));
    i = j;
  }
  return out;
}

function breakTie(group: StandingRow[], finals: Game[]): StandingRow[] {
  const inGroup = (name: string) => group.some((r) => sameTeam(r.team, name));
  const h2h = new Map<string, { w: number; gp: number }>();
  for (const r of group) h2h.set(r.team, { w: 0, gp: 0 });
  for (const g of finals) {
    if (!inGroup(g.home) || !inGroup(g.away)) continue;
    const winner = g.homeScore > g.awayScore ? g.home : g.away;
    for (const r of group) {
      if (sameTeam(r.team, g.home) || sameTeam(r.team, g.away)) {
        const e = h2h.get(r.team)!;
        e.gp++;
        if (sameTeam(r.team, winner)) e.w++;
      }
    }
  }
  const playedEachOther = group.every((r) => h2h.get(r.team)!.gp > 0);
  if (!playedEachOther) return group; // already ordered by differential
  return [...group].sort((a, b) => {
    const ha = h2h.get(a.team)!;
    const hb = h2h.get(b.team)!;
    return hb.w / hb.gp - ha.w / ha.gp || b.diff - a.diff;
  });
}
