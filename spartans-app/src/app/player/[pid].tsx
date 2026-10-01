import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from '@/components/BarChart';
import { Icon } from '@/components/Icon';
import { Cell, Empty, HeadCell, OfflineBanner, Picker, SectionHead, TopBar } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useGames } from '@/data/games';
import { monthDay, one } from '@/lib/format';
import { seasonFromKey } from '@/lib/games';
import { gameLog, perGame } from '@/lib/players';
import { color, font, space } from '@/theme';

export default function PlayerScreen() {
  const { pid: pidParam } = useLocalSearchParams<{ pid: string }>();
  const pid = Number(pidParam);
  const { games, updatedAt } = useGames();
  const { isFavPlayer, toggleFavPlayer, myPid } = useAccount();
  const log = useMemo(() => gameLog(games, pid), [games, pid]);
  const finals = log.filter((e) => e.game.status === 'final');

  const seasons = useMemo(
    () => Array.from(new Set(log.map((e) => e.game.season))).map(seasonFromKey).sort((a, b) => b.order - a.order),
    [log],
  );
  const [scope, setScope] = useState<string>('all');
  const inScope = scope === 'all' ? finals : finals.filter((e) => e.game.season === scope);
  const regular = inScope.filter((e) => !e.game.isPlayoff);

  const tot = (k: 'pts' | 'fg3' | 'ft') => regular.reduce((t, e) => t + e.line[k], 0);
  const gp = regular.length;
  const high = Math.max(0, ...inScope.map((e) => e.line.pts));
  const latest = log[0];

  const chart = [...inScope].reverse().slice(-15);

  const bySeason = seasons.map((s) => {
    const rs = finals.filter((e) => e.game.season === s.key && !e.game.isPlayoff);
    const t = (k: 'pts' | 'fg3') => rs.reduce((a, e) => a + e.line[k], 0);
    const hi = Math.max(0, ...finals.filter((e) => e.game.season === s.key).map((e) => e.line.pts));
    return { s, gp: rs.length, ppg: perGame(t('pts'), rs.length), fg3: t('fg3'), high: hi, team: rs[0]?.team ?? '' };
  });

  if (!latest) {
    return (
      <View style={{ flex: 1, backgroundColor: color.paper }}>
        <TopBar back />
        <Empty title="No games yet" body="This player hasn't appeared in a game box score." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar back />
      <OfflineBanner updatedAt={updatedAt} />
      <ScrollView>
        <View style={s.hero}>
          <Text style={s.kicker}>{pid === myPid ? `You  ·  ${latest.game.division}` : latest.game.division}</Text>
          <Text style={s.name}>{latest.line.name}</Text>
          <Pressable onPress={() => router.push(`/team/${encodeURIComponent(latest.team)}?season=${latest.game.season}`)}>
            <Text style={s.team}>
              {latest.line.number ? `#${latest.line.number}  ·  ` : ''}
              {latest.team}  →
            </Text>
          </Pressable>
          <Pressable onPress={() => toggleFavPlayer(pid)} style={[s.fav, isFavPlayer(pid) && s.favOn]} accessibilityRole="button">
            <Icon name={isFavPlayer(pid) ? 'starFilled' : 'star'} size={16} color={isFavPlayer(pid) ? color.ink : color.paper} />
            <Text style={[s.favText, isFavPlayer(pid) && { color: color.ink }]}>{isFavPlayer(pid) ? 'Favorite' : 'Add to favorites'}</Text>
          </Pressable>
          <View style={s.statRow}>
            {[
              ['GP', String(gp)],
              ['PPG', one(perGame(tot('pts'), gp))],
              ['3PM', String(tot('fg3'))],
              ['FTM', String(tot('ft'))],
              ['High', String(high)],
            ].map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={s.statValue}>{v}</Text>
                <Text style={s.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        <Picker options={[{ key: 'all', label: 'All-time' }, ...seasons.map((x) => ({ key: x.key, label: x.label }))]} value={scope} onChange={setScope} />

        {chart.length > 1 && (
          <>
            <SectionHead>Points by game</SectionHead>
            <View style={{ paddingHorizontal: space(4), paddingTop: space(4) }}>
              <BarChart
                values={chart.map((e) => e.line.pts)}
                labels={chart.map((e) => monthDay(e.game.date).split(' ')[1])}
                average={perGame(tot('pts'), gp)}
                highlightLast
                caption={`Last ${chart.length} games. Dashed line is the ${scope === 'all' ? 'career' : 'season'} average.`}
              />
            </View>
          </>
        )}

        {scope === 'all' && bySeason.length > 0 && (
          <>
            <SectionHead>Season by season</SectionHead>
            <View style={[s.row, s.head]}>
              <HeadCell align="left">Season</HeadCell>
              <HeadCell w={30}>GP</HeadCell>
              <HeadCell w={44}>PPG</HeadCell>
              <HeadCell w={40}>3PM</HeadCell>
              <HeadCell w={40}>High</HeadCell>
            </View>
            {bySeason.map((r, i) => (
              <View key={r.s.key} style={[s.row, i % 2 === 1 && { backgroundColor: color.bone }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cellTitle}>{r.s.label}</Text>
                  <Text style={s.cellSub} numberOfLines={1}>{r.team}</Text>
                </View>
                <Cell w={30} muted>{r.gp}</Cell>
                <Cell w={44} bold>{one(r.ppg)}</Cell>
                <Cell w={40}>{r.fg3}</Cell>
                <Cell w={40}>{r.high}</Cell>
              </View>
            ))}
          </>
        )}

        <SectionHead>Game log</SectionHead>
        <View style={[s.row, s.head]}>
          <HeadCell w={52} align="left">Date</HeadCell>
          <HeadCell align="left">Opponent</HeadCell>
          <HeadCell w={64}>Result</HeadCell>
          <HeadCell w={32}>PTS</HeadCell>
          <HeadCell w={32}>3PM</HeadCell>
          <HeadCell w={32}>FTM</HeadCell>
        </View>
        {(scope === 'all' ? log : log.filter((e) => e.game.season === scope)).map((e, i) => {
          const g = e.game;
          const my = e.team === g.home ? g.homeScore : g.awayScore;
          const opp = e.team === g.home ? g.awayScore : g.homeScore;
          return (
            <Pressable key={g.id} onPress={() => router.push(`/game/${g.id}`)} style={({ pressed }) => [s.row, i % 2 === 1 && { backgroundColor: color.bone }, pressed && { backgroundColor: '#EDE9E3' }]}>
              <Cell w={52} align="left" muted>{monthDay(g.date)}</Cell>
              <Text numberOfLines={1} style={[s.cellTitle, { flex: 1, paddingRight: 6 }]}>
                {e.team === g.home ? 'vs ' : '@ '}
                {e.opponent}
              </Text>
              <Cell w={64} style={e.won ? { color: color.ink, fontFamily: font.bodyBold } : { color: color.muted }}>
                {g.status === 'live' ? 'Live' : `${e.won ? 'W' : 'L'} ${my}-${opp}`}
              </Cell>
              <Cell w={32} bold>{e.line.pts}</Cell>
              <Cell w={32}>{e.line.fg3}</Cell>
              <Cell w={32}>{e.line.ft}</Cell>
            </Pressable>
          );
        })}
        <View style={{ height: space(12) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: color.ink, paddingHorizontal: space(4), paddingTop: space(5), paddingBottom: space(5) },
  kicker: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.5, color: color.orange, textTransform: 'uppercase' },
  name: { fontFamily: font.display, fontSize: 38, color: color.paper, textTransform: 'uppercase', lineHeight: 44, marginTop: 2 },
  team: { fontFamily: font.bodyBold, fontSize: 17, color: '#BDB7AE', marginTop: 2 },
  statRow: { flexDirection: 'row', marginTop: space(5) },
  fav: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: space(4), borderWidth: 2, borderColor: color.paper, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  favOn: { backgroundColor: color.orange, borderColor: color.orange },
  favText: { fontFamily: font.label, fontSize: 13, letterSpacing: 1.2, color: color.paper, textTransform: 'uppercase' },
  statValue: { fontFamily: font.display, fontSize: 28, color: color.paper },
  statLabel: { fontFamily: font.label, fontSize: 11, letterSpacing: 1, color: '#9A958E', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(2.5) },
  head: { paddingVertical: space(2), borderBottomWidth: 1.5, borderBottomColor: color.ink },
  cellTitle: { fontFamily: font.bodyBold, fontSize: 16, color: color.ink },
  cellSub: { fontFamily: font.body, fontSize: 13, color: color.muted },
});
