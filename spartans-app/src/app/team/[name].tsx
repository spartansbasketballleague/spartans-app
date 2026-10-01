import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameRow } from '@/components/GameRow';
import { Icon } from '@/components/Icon';
import { Cell, Empty, HeadCell, OfflineBanner, Picker, SectionHead, TopBar } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useGames } from '@/data/games';
import { one } from '@/lib/format';
import { seasonFromKey, teamInGame } from '@/lib/games';
import { perGame, playerTotals } from '@/lib/players';
import { buildStandings } from '@/lib/standings';
import { color, font, space } from '@/theme';

export default function TeamScreen() {
  const params = useLocalSearchParams<{ name: string; season?: string }>();
  const team = decodeURIComponent(params.name ?? '');
  const { games, updatedAt } = useGames();
  const { isFollowing, toggleFollow } = useAccount();

  const teamGames = useMemo(() => games.filter((g) => teamInGame(g, team)), [games, team]);
  const seasonKeys = useMemo(
    () => Array.from(new Set(teamGames.map((g) => g.season))).map(seasonFromKey).sort((a, b) => b.order - a.order),
    [teamGames],
  );
  const [picked, setPicked] = useState<string | null>(params.season || null);
  const season = seasonKeys.find((s) => s.key === picked) ?? seasonKeys[0];

  const inSeason = teamGames.filter((g) => g.season === season?.key);
  const division = inSeason[inSeason.length - 1]?.division ?? '';
  const record = useMemo(() => {
    const div = games.filter((g) => g.season === season?.key && g.division === division);
    const rows = buildStandings(div);
    const i = rows.findIndex((r) => r.team.toLowerCase() === team.toLowerCase());
    return i >= 0 ? { ...rows[i], place: i + 1, of: rows.length } : null;
  }, [games, season?.key, division, team]);

  const roster = useMemo(() => {
    const mine = inSeason.map((g) => ({
      ...g,
      homePlayers: g.home.toLowerCase() === team.toLowerCase() ? g.homePlayers : [],
      awayPlayers: g.away.toLowerCase() === team.toLowerCase() ? g.awayPlayers : [],
    }));
    return playerTotals(mine).sort((a, b) => b.pts - a.pts);
  }, [inSeason, team]);

  const upcoming = inSeason.filter((g) => g.status === 'pregame' || g.status === 'live');
  const results = inSeason.filter((g) => g.status === 'final').reverse();
  const following = isFollowing(team);

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar back />
      <OfflineBanner updatedAt={updatedAt} />
      <ScrollView>
        <View style={s.hero}>
          <Text style={s.kicker}>{division}</Text>
          <Text style={s.name}>{team}</Text>
          {record && (
            <Text style={s.record}>
              {record.w}-{record.l}  ·  {ordinal(record.place)} of {record.of}
              {record.streak ? `  ·  ${record.streak}` : ''}
            </Text>
          )}
          <Pressable onPress={() => toggleFollow(team)} style={[s.follow, following && s.following]} accessibilityRole="button">
            <Icon name={following ? 'starFilled' : 'star'} size={16} color={following ? color.ink : color.paper} />
            <Text style={[s.followText, following && { color: color.ink }]}>{following ? 'Following' : 'Follow team'}</Text>
          </Pressable>
        </View>
        {seasonKeys.length > 1 && <Picker options={seasonKeys.map((x) => ({ key: x.key, label: x.label }))} value={season?.key ?? null} onChange={setPicked} />}

        {upcoming.length > 0 && (
          <>
            <SectionHead>Up next</SectionHead>
            {upcoming.slice(0, 5).map((g) => <GameRow key={g.id} game={g} />)}
          </>
        )}

        <SectionHead>Players</SectionHead>
        {roster.length === 0 ? (
          <Text style={s.none}>Player stats show up after the first game.</Text>
        ) : (
          <>
            <View style={[s.row, s.head]}>
              <HeadCell align="left">Player</HeadCell>
              <HeadCell w={30}>GP</HeadCell>
              <HeadCell w={44}>PPG</HeadCell>
              <HeadCell w={40}>3PM</HeadCell>
              <HeadCell w={40}>FTM</HeadCell>
              <HeadCell w={40}>High</HeadCell>
            </View>
            {roster.map((p, i) => (
              <Pressable key={p.pid} onPress={() => router.push(`/player/${p.pid}`)} style={({ pressed }) => [s.row, i % 2 === 1 && { backgroundColor: color.bone }, pressed && { backgroundColor: '#EDE9E3' }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={s.num}>{p.number}</Text>
                  <Text numberOfLines={1} style={s.player}>{p.name}</Text>
                </View>
                <Cell w={30} muted>{p.gp}</Cell>
                <Cell w={44} bold>{one(perGame(p.pts, p.gp))}</Cell>
                <Cell w={40}>{p.fg3}</Cell>
                <Cell w={40}>{p.ft}</Cell>
                <Cell w={40}>{p.high}</Cell>
              </Pressable>
            ))}
          </>
        )}

        <SectionHead>Results</SectionHead>
        {results.length === 0 ? <Empty title="No results yet" /> : results.map((g) => <GameRow key={g.id} game={g} />)}
        <View style={{ height: space(12) }} />
      </ScrollView>
    </View>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const s = StyleSheet.create({
  hero: { backgroundColor: color.ink, paddingHorizontal: space(4), paddingTop: space(5), paddingBottom: space(5) },
  kicker: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.5, color: color.orange, textTransform: 'uppercase' },
  name: { fontFamily: font.display, fontSize: 38, color: color.paper, textTransform: 'uppercase', lineHeight: 44, marginTop: 2 },
  record: { fontFamily: font.bodyBold, fontSize: 18, color: '#BDB7AE', marginTop: space(1) },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: space(4), borderWidth: 2, borderColor: color.paper, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  following: { backgroundColor: color.orange, borderColor: color.orange },
  followText: { fontFamily: font.label, fontSize: 13, letterSpacing: 1.2, color: color.paper, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(2.5) },
  head: { paddingVertical: space(2), borderBottomWidth: 1.5, borderBottomColor: color.ink },
  num: { fontFamily: font.num, fontSize: 13, color: color.muted, width: 24 },
  player: { fontFamily: font.bodyBold, fontSize: 16, color: color.ink, flexShrink: 1 },
  none: { fontFamily: font.body, fontSize: 15, color: color.muted, padding: space(4) },
});
