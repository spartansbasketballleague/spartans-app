import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cell, Empty, HeadCell, Loading, OfflineBanner, PageTitle, Picker, TopBar, AccountButton } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useSeason } from '@/data/games';
import { divisionsIn } from '@/lib/games';
import { buildStandings } from '@/lib/standings';
import { color, font, space } from '@/theme';

export default function StandingsScreen() {
  const { season, seasons, setSeason, seasonGames, all } = useSeason();
  const { isFollowing } = useAccount();
  const divisions = useMemo(() => divisionsIn(seasonGames), [seasonGames]);
  const [division, setDivision] = useState<string | null>(null);
  const div = division && divisions.includes(division) ? division : divisions[0] ?? null;

  const rows = useMemo(() => (div ? buildStandings(seasonGames.filter((g) => g.division === div)) : []), [seasonGames, div]);
  const anyPlayed = rows.some((r) => r.w + r.l > 0);

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar right={<AccountButton />} />
      <Picker dark options={seasons.map((s) => ({ key: s.key, label: s.label }))} value={season?.key ?? null} onChange={setSeason} />
      <OfflineBanner updatedAt={all.updatedAt} />
      <ScrollView refreshControl={<RefreshControl refreshing={all.isRefreshing} onRefresh={all.refresh} tintColor={color.orange} />}>
        <PageTitle kicker={season?.label}>Standings</PageTitle>
        <Picker options={divisions.map((d) => ({ key: d, label: d }))} value={div} onChange={setDivision} />

        {all.isLoading && !all.games.length ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No standings yet" />
        ) : (
          <View style={{ marginTop: space(2) }}>
            <View style={[s.row, s.head]}>
              <HeadCell w={22} align="left">#</HeadCell>
              <HeadCell align="left">Team</HeadCell>
              <HeadCell w={28}>W</HeadCell>
              <HeadCell w={28}>L</HeadCell>
              <HeadCell w={40}>GB</HeadCell>
              <HeadCell w={44}>Diff</HeadCell>
              <HeadCell w={38}>Strk</HeadCell>
            </View>
            {rows.map((r, i) => (
              <Pressable
                key={r.team}
                onPress={() => router.push(`/team/${encodeURIComponent(r.team)}?season=${season?.key ?? ''}`)}
                style={({ pressed }) => [s.row, i % 2 === 1 && { backgroundColor: color.bone }, pressed && { backgroundColor: '#EDE9E3' }]}
              >
                <Cell w={22} align="left" muted>{i + 1}</Cell>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 }}>
                  <Text numberOfLines={1} style={s.team}>{r.team}</Text>
                  {isFollowing(r.team) ? <Icon name="starFilled" size={13} color={color.orange} /> : null}
                </View>
                <Cell w={28} bold>{r.w}</Cell>
                <Cell w={28}>{r.l}</Cell>
                <Cell w={40} muted>{r.gb === 0 ? '–' : r.gb.toFixed(1).replace('.0', '')}</Cell>
                <Cell w={44} style={{ color: r.diff > 0 ? color.ink : r.diff < 0 ? color.muted : color.muted }}>
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </Cell>
                <Cell w={38} style={r.streak.startsWith('W') ? { color: color.orangeDeep } : undefined}>{r.streak || '–'}</Cell>
              </Pressable>
            ))}
            <Text style={s.note}>
              {anyPlayed
                ? 'Regular season games only. Ties in the standings go to head-to-head first; point differential is used only when the teams have not played each other.'
                : 'No games have been played in this division yet.'}
            </Text>
          </View>
        )}
        <View style={{ height: space(10) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(3) },
  head: { paddingVertical: space(2), borderBottomWidth: 1.5, borderBottomColor: color.ink },
  team: { fontFamily: font.bodyBold, fontSize: 17, color: color.ink, flexShrink: 1 },
  note: { fontFamily: font.body, fontSize: 14, color: color.muted, paddingHorizontal: space(4), paddingTop: space(4), lineHeight: 19 },
});
