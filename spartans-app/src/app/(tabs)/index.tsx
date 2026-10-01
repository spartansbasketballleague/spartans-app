import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameRow } from '@/components/GameRow';
import { Empty, Loading, OfflineBanner, Picker, SectionHead, TopBar, AccountButton } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useSeason } from '@/data/games';
import { dayShort, longDate, monthDay, todayISO } from '@/lib/format';
import { Game, divisionsIn, teamInGame } from '@/lib/games';
import { color, font, space } from '@/theme';

const DAY_W = 64;

export default function ScoresScreen() {
  const { season, seasons, setSeason, seasonGames, all } = useSeason();
  const { favTeams: follows, isFollowing } = useAccount();
  const [mineOnly, setMineOnly] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const strip = useRef<ScrollView>(null);

  const pool = useMemo(
    () => (mineOnly ? seasonGames.filter((g) => follows.some((t) => teamInGame(g, t))) : seasonGames),
    [seasonGames, mineOnly, follows],
  );
  const days = useMemo(() => Array.from(new Set(pool.map((g) => g.date).filter(Boolean))).sort(), [pool]);

  // Default to today, else the next game day, else the last one played.
  const defaultDay = useMemo(() => {
    const t = todayISO();
    return days.find((d) => d >= t) ?? days[days.length - 1] ?? null;
  }, [days]);
  const selected = day && days.includes(day) ? day : defaultDay;

  useEffect(() => {
    const i = selected ? days.indexOf(selected) : -1;
    if (i > 0) setTimeout(() => strip.current?.scrollTo({ x: Math.max(0, (i - 2) * DAY_W), animated: false }), 0);
  }, [selected, days]);

  const byDivision = useMemo(() => {
    const games = pool.filter((g) => g.date === selected);
    return divisionsIn(games).map((d) => ({ division: d, games: games.filter((g) => g.division === d) }));
  }, [pool, selected]);

  const live = seasonGames.filter((g) => g.status === 'live');

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar right={<AccountButton />} />
      <Picker dark options={seasons.map((s) => ({ key: s.key, label: s.label }))} value={season?.key ?? null} onChange={(k) => { setSeason(k); setDay(null); }} />
      <OfflineBanner updatedAt={all.updatedAt} />

      <View style={s.stripWrap}>
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false}>
          {days.map((d) => {
            const on = d === selected;
            const isToday = d === todayISO();
            return (
              <Pressable key={d} onPress={() => setDay(d)} style={[s.day, on && s.dayOn]}>
                <Text style={[s.dayName, on && { color: color.ink }]}>{isToday ? 'Today' : dayShort(d)}</Text>
                <Text style={[s.dayDate, on && { color: color.ink }]}>{monthDay(d)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={all.isRefreshing} onRefresh={all.refresh} tintColor={color.orange} />}
      >
        <View style={s.filterRow}>
          <Text style={s.dateTitle}>{selected ? longDate(selected) : ''}</Text>
          {follows.length > 0 && (
            <Pressable onPress={() => setMineOnly((v) => !v)} hitSlop={8}>
              <Text style={[s.filter, mineOnly && { color: color.orange }]}>{mineOnly ? 'My teams' : 'All games'}  ▾</Text>
            </Pressable>
          )}
        </View>

        {live.length > 0 && selected !== todayISO() && (
          <Pressable onPress={() => setDay(todayISO())} style={s.liveNote}>
            <Text style={s.liveNoteText}>{live.length} game{live.length > 1 ? 's' : ''} live now. Tap to see today.</Text>
          </Pressable>
        )}

        {all.isLoading && !all.games.length ? (
          <Loading />
        ) : all.error && !all.games.length ? (
          <Empty title="Couldn't load games" body="Pull down to try again." />
        ) : byDivision.length === 0 ? (
          <Empty title="No games" body={mineOnly ? "None of the teams you follow play this day." : 'Nothing scheduled.'} />
        ) : (
          byDivision.map(({ division, games }) => (
            <View key={division}>
              <SectionHead>{division}</SectionHead>
              {games.map((g: Game) => (
                <GameRow key={g.id} game={g} highlight={isFollowing} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: space(10) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  stripWrap: { backgroundColor: color.bone, borderBottomWidth: 1, borderBottomColor: color.rule },
  day: { width: DAY_W, alignItems: 'center', paddingVertical: space(2.5), borderBottomWidth: 3, borderBottomColor: 'transparent' },
  dayOn: { borderBottomColor: color.orange, backgroundColor: color.paper },
  dayName: { fontFamily: font.label, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.muted },
  dayDate: { fontFamily: font.bodyBold, fontSize: 16, color: color.muted, marginTop: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space(4), paddingTop: space(4) },
  dateTitle: { fontFamily: font.display, fontSize: 26, color: color.ink, textTransform: 'uppercase' },
  filter: { fontFamily: font.label, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.muted },
  liveNote: { marginHorizontal: space(4), marginTop: space(3), paddingVertical: space(2), paddingHorizontal: space(3), borderLeftWidth: 3, borderLeftColor: color.orange, backgroundColor: color.bone },
  liveNoteText: { fontFamily: font.bodyBold, fontSize: 15, color: color.ink },
});
