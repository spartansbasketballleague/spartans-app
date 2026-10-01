import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Game } from '@/lib/games';
import { statusLine } from '@/lib/format';
import { color, font, space } from '@/theme';
import { LiveDot } from './ui';

// One game, scoreboard style: away over home, scores on the right, status on
// the left. Winner in black, loser greyed, like a newspaper line score.
export function GameRow({ game, showDivision, highlight }: { game: Game; showDivision?: boolean; highlight?: (team: string) => boolean }) {
  const g = game;
  const done = g.status === 'final';
  const hasScore = g.status === 'final' || g.status === 'live';
  const awayWon = done && g.awayScore > g.homeScore;
  const homeWon = done && g.homeScore > g.awayScore;

  const line = (team: string, score: number, won: boolean, lost: boolean) => (
    <View style={s.line}>
      <Text numberOfLines={1} style={[s.team, lost && s.dim, highlight?.(team) && s.mine]}>
        {team}
      </Text>
      {hasScore ? <Text style={[s.score, lost && s.dim, won && s.win]}>{score}</Text> : null}
    </View>
  );

  return (
    <Pressable
      onPress={() => router.push(`/game/${g.id}`)}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bone }]}
      accessibilityRole="button"
      accessibilityLabel={`${g.away} ${hasScore ? g.awayScore : ''} at ${g.home} ${hasScore ? g.homeScore : ''}, ${statusLine(g)}`}
    >
      <View style={s.status}>
        {g.status === 'live' ? <LiveDot /> : <Text style={[s.statusText, done && { color: color.ink }]}>{statusLine(g)}</Text>}
        {g.status === 'live' ? <Text style={s.sub}>{statusLine(g)}</Text> : null}
        {g.isPlayoff ? <Text style={s.tag}>{g.label || 'Playoffs'}</Text> : null}
      </View>
      <View style={s.teams}>
        {line(g.away, g.awayScore, awayWon, homeWon)}
        {line(g.home, g.homeScore, homeWon, awayWon)}
        <Text numberOfLines={1} style={s.meta}>
          {showDivision ? `${g.division}  ·  ` : ''}
          {g.location}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.rule,
    backgroundColor: color.paper,
  },
  status: { width: 76, paddingTop: 3 },
  statusText: { fontFamily: font.label, fontSize: 13, letterSpacing: 0.5, color: color.muted, textTransform: 'uppercase' },
  sub: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: 2 },
  tag: { fontFamily: font.label, fontSize: 10, letterSpacing: 1, color: color.orange, textTransform: 'uppercase', marginTop: 4 },
  teams: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 1 },
  team: { flex: 1, fontFamily: font.bodyBold, fontSize: 18, color: color.ink, paddingRight: space(2) },
  score: { fontFamily: font.display, fontSize: 22, color: color.ink, minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  win: { color: color.ink },
  dim: { color: '#A39E97' },
  mine: { textDecorationLine: 'underline', textDecorationColor: color.orange },
  meta: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: 3 },
});
