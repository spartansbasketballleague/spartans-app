import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cell, Empty, HeadCell, Loading, OfflineBanner, PageTitle, Picker, TopBar, AccountButton } from '@/components/ui';
import { useSeason } from '@/data/games';
import { one } from '@/lib/format';
import { divisionsIn } from '@/lib/games';
import { PlayerTotals, perGame, playerTotals } from '@/lib/players';
import { color, font, space } from '@/theme';

type Cat = 'ppg' | 'pts' | 'fg3' | 'ft' | 'high';
const CATS: { key: Cat; label: string; value: (p: PlayerTotals) => number; fmt: (p: PlayerTotals) => string }[] = [
  { key: 'ppg', label: 'Points / game', value: (p) => perGame(p.pts, p.gp), fmt: (p) => one(perGame(p.pts, p.gp)) },
  { key: 'pts', label: 'Total points', value: (p) => p.pts, fmt: (p) => String(p.pts) },
  { key: 'fg3', label: '3-pointers', value: (p) => p.fg3, fmt: (p) => String(p.fg3) },
  { key: 'ft', label: 'Free throws', value: (p) => p.ft, fmt: (p) => String(p.ft) },
  { key: 'high', label: 'Best game', value: (p) => p.high, fmt: (p) => String(p.high) },
];

export default function StatsScreen() {
  const { season, seasons, setSeason, seasonGames, all } = useSeason();
  const divisions = useMemo(() => divisionsIn(seasonGames), [seasonGames]);
  const [division, setDivision] = useState<string>('all');
  const [cat, setCat] = useState<Cat>('ppg');
  const [q, setQ] = useState('');
  const div = division === 'all' || divisions.includes(division) ? division : 'all';
  const c = CATS.find((x) => x.key === cat)!;

  const list = useMemo(() => {
    const games = div === 'all' ? seasonGames : seasonGames.filter((g) => g.division === div);
    let players = playerTotals(games);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      players = players.filter((p) => p.name.toLowerCase().includes(needle) || p.team.toLowerCase().includes(needle));
    }
    return players.sort((a, b) => c.value(b) - c.value(a) || b.gp - a.gp).slice(0, q ? 100 : 30);
  }, [seasonGames, div, q, c]);

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar right={<AccountButton />} />
      <Picker dark options={seasons.map((s) => ({ key: s.key, label: s.label }))} value={season?.key ?? null} onChange={setSeason} />
      <OfflineBanner updatedAt={all.updatedAt} />
      <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={all.isRefreshing} onRefresh={all.refresh} tintColor={color.orange} />}>
        <PageTitle kicker={season?.label}>League Leaders</PageTitle>
        <Picker options={[{ key: 'all', label: 'All divisions' }, ...divisions.map((d) => ({ key: d, label: d }))]} value={div} onChange={setDivision} />
        <Picker options={CATS.map((x) => ({ key: x.key, label: x.label }))} value={cat} onChange={setCat} />

        <View style={s.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Find a player or team"
            placeholderTextColor="#A39E97"
            style={s.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {all.isLoading && !all.games.length ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title={q ? 'No players found' : 'No stats yet'} body={q ? undefined : 'Leaders show up once games go final.'} />
        ) : (
          <View>
            <View style={[s.row, s.head]}>
              <HeadCell w={26} align="left">#</HeadCell>
              <HeadCell align="left">Player</HeadCell>
              <HeadCell w={30}>GP</HeadCell>
              <HeadCell w={54} active>{({ ppg: 'PPG', pts: 'PTS', fg3: '3PM', ft: 'FTM', high: 'High' } as const)[cat]}</HeadCell>
            </View>
            {list.map((p, i) => (
              <Pressable
                key={p.pid}
                onPress={() => router.push(`/player/${p.pid}`)}
                style={({ pressed }) => [s.row, i % 2 === 1 && { backgroundColor: color.bone }, pressed && { backgroundColor: '#EDE9E3' }]}
              >
                <Cell w={26} align="left" muted>{i + 1}</Cell>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text numberOfLines={1} style={s.name}>{p.name}</Text>
                  <Text numberOfLines={1} style={s.team}>
                    {p.number ? `#${p.number}  ·  ` : ''}{p.team}
                  </Text>
                </View>
                <Cell w={30} muted>{p.gp}</Cell>
                <Cell w={54} style={s.value}>{c.fmt(p)}</Cell>
              </Pressable>
            ))}
            <Text style={s.note}>Regular season, final games only.</Text>
          </View>
        )}
        <View style={{ height: space(10) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { paddingHorizontal: space(4), paddingVertical: space(3) },
  search: { fontFamily: font.body, fontSize: 17, color: color.ink, borderBottomWidth: 1.5, borderBottomColor: color.ink, paddingVertical: space(2) },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(2.5) },
  head: { paddingVertical: space(2), borderBottomWidth: 1.5, borderBottomColor: color.ink },
  name: { fontFamily: font.bodyBold, fontSize: 17, color: color.ink },
  team: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: 1 },
  value: { fontFamily: font.display, fontSize: 20, color: color.ink },
  note: { fontFamily: font.body, fontSize: 14, color: color.muted, paddingHorizontal: space(4), paddingTop: space(4) },
});
