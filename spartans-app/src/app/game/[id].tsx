import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cell, Empty, HeadCell, LiveDot, Loading, OfflineBanner, SectionHead, TopBar } from '@/components/ui';
import { useGame } from '@/data/games';
import { clock, longDate, statusLine } from '@/lib/format';
import { Game, PlayerLine } from '@/lib/games';
import { color, font, space } from '@/theme';

function BoxScore({ team, lines, total }: { team: string; lines: PlayerLine[]; total: number }) {
  const shown = lines.filter((p) => !p.hidden).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  const sum = (k: keyof PlayerLine) => shown.reduce((t, p) => t + (p[k] as number), 0);
  return (
    <View>
      <SectionHead>{team}</SectionHead>
      <View style={[s.row, s.head]}>
        <HeadCell align="left">Player</HeadCell>
        <HeadCell w={34}>PTS</HeadCell>
        <HeadCell w={34}>2PM</HeadCell>
        <HeadCell w={34}>3PM</HeadCell>
        <HeadCell w={30}>FT</HeadCell>
        <HeadCell w={26}>F</HeadCell>
      </View>
      {shown.length === 0 ? (
        <Text style={s.none}>No box score yet.</Text>
      ) : (
        shown.map((p, i) => (
          <Pressable
            key={p.key}
            disabled={p.pid == null}
            onPress={() => router.push(`/player/${p.pid}`)}
            style={({ pressed }) => [s.row, i % 2 === 1 && { backgroundColor: color.bone }, pressed && { backgroundColor: '#EDE9E3' }]}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', paddingRight: 6 }}>
              <Text style={s.num}>{p.number}</Text>
              <Text numberOfLines={1} style={s.player}>{p.name}</Text>
            </View>
            <Cell w={34} bold>{p.pts}</Cell>
            <Cell w={34}>{p.fg2}</Cell>
            <Cell w={34}>{p.fg3}</Cell>
            <Cell w={30}>{p.ft}</Cell>
            <Cell w={26} style={p.fls >= 5 ? { color: color.orangeDeep } : undefined}>{p.fls}</Cell>
          </Pressable>
        ))
      )}
      {shown.length > 0 && (
        <View style={[s.row, s.totals]}>
          <Text style={[s.player, { flex: 1 }]}>Team</Text>
          <Cell w={34} bold>{total}</Cell>
          <Cell w={34} bold>{sum('fg2')}</Cell>
          <Cell w={34} bold>{sum('fg3')}</Cell>
          <Cell w={30} bold>{sum('ft')}</Cell>
          <Cell w={26} bold>{sum('fls')}</Cell>
        </View>
      )}
    </View>
  );
}

function Scoreboard({ g }: { g: Game }) {
  const hasScore = g.status === 'live' || g.status === 'final';
  const side = (team: string, score: number, other: number) => {
    const lost = g.status === 'final' && score < other;
    return (
      <Pressable style={s.side} onPress={() => router.push(`/team/${encodeURIComponent(team)}?season=${g.season}`)}>
        <Text style={[s.bigScore, lost && { color: '#6E6A64' }]}>{hasScore ? score : '–'}</Text>
        <Text style={[s.sideTeam, lost && { color: '#8C877F' }]} numberOfLines={2}>{team}</Text>
      </Pressable>
    );
  };
  return (
    <View style={s.board}>
      <Text style={s.boardKicker}>
        {g.division}
        {g.isPlayoff ? `  ·  ${g.label || 'Playoffs'}` : ''}
      </Text>
      <View style={s.boardRow}>
        {side(g.away, g.awayScore, g.homeScore)}
        <View style={s.mid}>
          {g.status === 'live' ? <LiveDot /> : null}
          <Text style={s.midText}>{statusLine(g)}</Text>
        </View>
        {side(g.home, g.homeScore, g.awayScore)}
      </View>
      <Text style={s.boardMeta}>
        {longDate(g.date)}  ·  {clock(g.time)}
        {g.location ? `  ·  ${g.location}` : ''}
      </Text>
    </View>
  );
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { game, isLoading, updatedAt } = useGame(id);

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar back />
      <OfflineBanner updatedAt={updatedAt} />
      {!game ? (
        isLoading ? <Loading /> : <Empty title="Game not found" />
      ) : (
        <ScrollView>
          <Scoreboard g={game} />
          {game.status === 'live' && <Text style={s.liveNote}>Scores update on their own while the game is on.</Text>}
          {game.status === 'pregame' ? (
            <Empty title="Box score after tip-off" body="Stats show up here as soon as the scorer starts the game." />
          ) : game.status === 'cancelled' ? (
            <Empty title="This game was cancelled" />
          ) : (
            <>
              <BoxScore team={game.away} lines={game.awayPlayers} total={game.awayScore} />
              <BoxScore team={game.home} lines={game.homePlayers} total={game.homeScore} />
            </>
          )}
          <View style={{ height: space(12) }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  board: { backgroundColor: color.ink, paddingHorizontal: space(4), paddingTop: space(4), paddingBottom: space(5) },
  boardKicker: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.5, color: color.orange, textTransform: 'uppercase', textAlign: 'center' },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space(3) },
  side: { flex: 1, alignItems: 'center' },
  bigScore: { fontFamily: font.display, fontSize: 56, color: color.paper, lineHeight: 64, fontVariant: ['tabular-nums'] },
  sideTeam: { fontFamily: font.bodyBold, fontSize: 17, color: color.paper, textAlign: 'center', marginTop: 2 },
  mid: { width: 80, alignItems: 'center', paddingTop: space(5), gap: 4 },
  midText: { fontFamily: font.label, fontSize: 13, letterSpacing: 1, color: '#BDB7AE', textTransform: 'uppercase' },
  boardMeta: { fontFamily: font.body, fontSize: 14, color: '#9A958E', textAlign: 'center', marginTop: space(4) },
  liveNote: { fontFamily: font.body, fontSize: 14, color: color.muted, paddingHorizontal: space(4), paddingTop: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(2.5) },
  head: { paddingVertical: space(2), borderBottomWidth: 1.5, borderBottomColor: color.ink },
  totals: { borderTopWidth: 1.5, borderTopColor: color.ink },
  num: { fontFamily: font.num, fontSize: 13, color: color.muted, width: 24 },
  player: { fontFamily: font.bodyBold, fontSize: 16, color: color.ink, flexShrink: 1 },
  none: { fontFamily: font.body, fontSize: 15, color: color.muted, padding: space(4) },
});
