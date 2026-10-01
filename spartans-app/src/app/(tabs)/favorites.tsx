import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GameRow } from '@/components/GameRow';
import { Icon } from '@/components/Icon';
import { Button, OfflineBanner, PageTitle, SectionHead, TopBar, AccountButton } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useGames } from '@/data/games';
import { monthDay, one } from '@/lib/format';
import { Game, sameTeam, teamInGame } from '@/lib/games';
import { gameLog, perGame, playerDirectory } from '@/lib/players';
import { color, font, space } from '@/theme';

// Anyone can search any player and save them. Players who claimed their own
// profile (with a league code) see it first. Only names, jersey numbers and
// teams are ever shown.

function FavPlayerCard({ pid, games, own }: { pid: number; games: Game[]; own?: boolean }) {
  const { toggleFavPlayer } = useAccount();
  const log = useMemo(() => gameLog(games, pid), [games, pid]);
  const latest = log[0];
  if (!latest) return null;
  const season = latest.game.season;
  const inSeason = log.filter((e) => e.game.season === season && e.game.status === 'final' && !e.game.isPlayoff);
  const pts = inSeason.reduce((t, e) => t + e.line.pts, 0);
  const next = games.find((g) => g.status !== 'final' && g.status !== 'cancelled' && g.startsAt > Date.now() - 3 * 3600_000 && teamInGame(g, latest.team));

  return (
    <View style={s.card}>
      <Pressable onPress={() => router.push(`/player/${pid}`)} style={{ flex: 1 }}>
        <Text style={s.cardName}>{latest.line.name}</Text>
        <Text style={s.cardTeam} numberOfLines={1}>
          {latest.line.number ? `#${latest.line.number}  ·  ` : ''}
          {latest.team}
        </Text>
        <View style={s.cardStats}>
          <Text style={s.cardStat}>
            <Text style={s.cardStatNum}>{one(perGame(pts, inSeason.length))}</Text> PPG
          </Text>
          <Text style={s.cardStat}>
            <Text style={s.cardStatNum}>{inSeason.length}</Text> GP
          </Text>
          <Text style={s.cardStat}>
            Last: <Text style={s.cardStatNum}>{latest.line.pts}</Text> pts
          </Text>
        </View>
        {next ? (
          <Text style={s.cardNext} numberOfLines={1}>
            {next.status === 'live' ? 'Playing now' : `Next: ${monthDay(next.date)}`} vs {sameTeam(next.home, latest.team) ? next.away : next.home}
          </Text>
        ) : null}
      </Pressable>
      {!own && (
        <Pressable onPress={() => toggleFavPlayer(pid)} hitSlop={12} accessibilityLabel={`Remove ${latest.line.name} from favorites`}>
          <Icon name="starFilled" size={22} color={color.orange} />
        </Pressable>
      )}
    </View>
  );
}

export default function FavoritesScreen() {
  const { games, updatedAt } = useGames();
  const acct = useAccount();
  const [q, setQ] = useState('');
  const people = useMemo(() => playerDirectory(games), [games]);
  const needle = q.trim().toLowerCase();
  const matches = needle.length >= 2 ? people.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 30) : [];

  const teamGames = useMemo(
    () =>
      acct.favTeams.map((t) => ({
        team: t,
        next: games.find((g) => (g.status === 'pregame' || g.status === 'live') && teamInGame(g, t)),
      })),
    [games, acct.favTeams],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar right={<AccountButton />} />
      <OfflineBanner updatedAt={updatedAt} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <PageTitle kicker="Players & teams you follow">Favorites</PageTitle>

        <View style={s.searchWrap}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search any player to add" placeholderTextColor="#A39E97" style={s.search} autoCorrect={false} clearButtonMode="while-editing" />
        </View>
        {matches.map((p) => {
          const fav = acct.isFavPlayer(p.pid);
          return (
            <View key={p.pid} style={s.result}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/player/${p.pid}`)}>
                <Text style={s.resultName}>{p.name}</Text>
                <Text style={s.resultTeam}>{p.team}</Text>
              </Pressable>
              <Pressable onPress={() => acct.toggleFavPlayer(p.pid)} hitSlop={12} style={[s.addBtn, fav && s.addBtnOn]}>
                <Text style={[s.addText, fav && { color: color.paper }]}>{fav ? 'Saved' : 'Add'}</Text>
              </Pressable>
            </View>
          );
        })}
        {needle.length >= 2 && matches.length === 0 ? <Text style={s.hint}>No players match "{q.trim()}".</Text> : null}

        {acct.profile?.role === 'player' && acct.myPid == null && (
          <Pressable onPress={() => router.push('/account')} style={s.setup}>
            <Text style={s.setupTitle}>Finish your player setup</Text>
            <Text style={s.setupBody}>Got your code from Spartans? Tap here to enter it and link your stats.</Text>
          </Pressable>
        )}

        {acct.myPid != null && (
          <>
            <SectionHead>You</SectionHead>
            <FavPlayerCard pid={acct.myPid} games={games} own />
          </>
        )}

        <SectionHead>Players</SectionHead>
        {acct.favPlayers.length === 0 ? (
          <Text style={s.hint}>Search above to save your player, your kid, or anyone you like to watch. You'll see their stats here and get reminders before their games.</Text>
        ) : (
          acct.favPlayers.map((pid) => <FavPlayerCard key={pid} pid={pid} games={games} />)
        )}

        <SectionHead>Teams</SectionHead>
        {teamGames.length === 0 ? (
          <Text style={s.hint}>Tap "Follow team" on any team page to add it here.</Text>
        ) : (
          teamGames.map(({ team, next }) => (
            <View key={team}>
              <Pressable onPress={() => router.push(`/team/${encodeURIComponent(team)}`)} style={s.teamRow}>
                <Icon name="starFilled" size={15} color={color.orange} />
                <Text style={s.teamName}>{team}</Text>
              </Pressable>
              {next ? <GameRow game={next} /> : null}
            </View>
          ))
        )}

        {!acct.session && (acct.favPlayers.length > 0 || acct.favTeams.length > 0) && (
          <View style={s.block}>
            <Text style={s.hint}>Your favorites are saved on this phone. Create a free account to keep them on every device.</Text>
            <Button kind="line" label="Create account" onPress={() => router.push('/sign-in')} />
          </View>
        )}
        <View style={{ height: space(12) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { paddingHorizontal: space(4), paddingBottom: space(2) },
  search: { fontFamily: font.body, fontSize: 18, color: color.ink, borderBottomWidth: 2, borderBottomColor: color.ink, paddingVertical: space(2.5) },
  result: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(3), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.rule },
  resultName: { fontFamily: font.bodyBold, fontSize: 17, color: color.ink },
  resultTeam: { fontFamily: font.body, fontSize: 14, color: color.muted },
  addBtn: { borderWidth: 2, borderColor: color.ink, paddingHorizontal: space(3), paddingVertical: space(1.5) },
  addBtnOn: { backgroundColor: color.orange, borderColor: color.orange },
  addText: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.ink },
  hint: { fontFamily: font.body, fontSize: 15, color: color.muted, paddingHorizontal: space(4), paddingTop: space(3), lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: space(4), paddingVertical: space(4), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.rule },
  cardName: { fontFamily: font.display, fontSize: 24, color: color.ink, textTransform: 'uppercase' },
  cardTeam: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: 1 },
  cardStats: { flexDirection: 'row', gap: space(4), marginTop: space(2) },
  cardStat: { fontFamily: font.label, fontSize: 11, letterSpacing: 1, color: color.muted, textTransform: 'uppercase' },
  cardStatNum: { fontFamily: font.display, fontSize: 18, color: color.ink, letterSpacing: 0 },
  cardNext: { fontFamily: font.bodyBold, fontSize: 14, color: color.orangeDeep, marginTop: space(2) },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingTop: space(4), paddingBottom: space(1) },
  teamName: { fontFamily: font.bodyBold, fontSize: 18, color: color.ink },
  block: { paddingHorizontal: space(4), gap: space(3), marginTop: space(4) },
  setup: { marginHorizontal: space(4), marginTop: space(2), paddingVertical: space(3), paddingHorizontal: space(3), borderLeftWidth: 4, borderLeftColor: color.orange, backgroundColor: color.bone },
  setupTitle: { fontFamily: font.label, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: color.ink },
  setupBody: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: 2 },
});
