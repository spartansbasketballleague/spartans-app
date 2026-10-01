import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { Game, RawGameRow, Season, parseGame, seasonsIn } from '@/lib/games';
import { supabase } from '@/lib/supabase';

// Only the parts of game state the app reads (skips timeouts, possession, logs).
const SELECT =
  'id,updated_at,status:state->>status,meta:state->meta,half:state->half,players:state->players,homePlayers:state->homePlayers,awayPlayers:state->awayPlayers,hiddenPlayers:state->hiddenPlayers';

type SlimRow = {
  id: string;
  updated_at: string | null;
  status: string | null;
  meta: RawGameRow['state']['meta'];
  half: string | number | null;
  players: RawGameRow['state']['players'];
  homePlayers: RawGameRow['state']['homePlayers'];
  awayPlayers: RawGameRow['state']['awayPlayers'];
  hiddenPlayers: RawGameRow['state']['hiddenPlayers'];
};

function slimToRaw(r: SlimRow): RawGameRow {
  return {
    id: r.id,
    updated_at: r.updated_at,
    state: {
      status: r.status ?? undefined,
      meta: r.meta ?? undefined,
      half: r.half ?? undefined,
      players: r.players ?? undefined,
      homePlayers: r.homePlayers ?? undefined,
      awayPlayers: r.awayPlayers ?? undefined,
      hiddenPlayers: r.hiddenPlayers ?? undefined,
    },
  };
}

// Web preview only: loads a saved snapshot instead of the live database.
const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW_DATA === '1';

async function fetchAllGames(): Promise<RawGameRow[]> {
  if (PREVIEW) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./preview-snapshot.json') as RawGameRow[];
  }
  const out: RawGameRow[] = [];
  const page = 500;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('game_state')
      .select(SELECT)
      .range(from, from + page - 1)
      .order('id');
    if (error) throw error;
    out.push(...(data as unknown as SlimRow[]).map(slimToRaw));
    if (!data || data.length < page) break;
  }
  return out;
}

export const GAMES_KEY = ['games'] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: Infinity, // keep all-time history for offline use
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'sbl-cache-v1' });

// ---- Connectivity --------------------------------------------------------------

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)),
);

export function useOnline() {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}

// ---- Live updates ------------------------------------------------------------------
// One realtime channel for the whole app. When the scorer's table changes, the
// affected game is patched into the cache so every screen updates at once.

function RealtimeBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    if (PREVIEW) return;
    const channel = supabase
      .channel('game_state_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload) => {
        const row = (payload.new ?? {}) as RawGameRow;
        if (!row.id) return;
        qc.setQueryData<RawGameRow[]>(GAMES_KEY, (prev) => {
          if (!prev) return prev;
          const i = prev.findIndex((r) => r.id === row.id);
          if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== (payload.old as RawGameRow).id);
          if (i === -1) return [...prev, row];
          const next = prev.slice();
          next[i] = row;
          return next;
        });
      })
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') qc.invalidateQueries({ queryKey: GAMES_KEY });
    });
    return () => {
      supabase.removeChannel(channel);
      sub.remove();
    };
  }, [qc]);
  return null;
}

// ---- Season selection -----------------------------------------------------------

type SeasonCtx = { season: string | null; setSeason: (k: string) => void };
const SeasonContext = createContext<SeasonCtx>({ season: null, setSeason: () => {} });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<string | null>(null);
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: Infinity, buster: 'v1' }}>
      <RealtimeBridge />
      <SeasonContext.Provider value={{ season, setSeason }}>{children}</SeasonContext.Provider>
    </PersistQueryClientProvider>
  );
}

// ---- Hooks -------------------------------------------------------------------------

export function useGames() {
  const q = useQuery({ queryKey: GAMES_KEY, queryFn: fetchAllGames });
  const games = useMemo(
    () => (q.data ?? []).map(parseGame).filter((g): g is Game => !!g).sort((a, b) => a.startsAt - b.startsAt),
    [q.data],
  );
  const seasons = useMemo(() => seasonsIn(games), [games]);
  return {
    games,
    seasons,
    isLoading: q.isLoading,
    isRefreshing: q.isRefetching,
    error: q.error as Error | null,
    updatedAt: q.dataUpdatedAt,
    refresh: () => q.refetch(),
  };
}

export function useSeason(): { season: Season | null; seasons: Season[]; setSeason: (k: string) => void; seasonGames: Game[]; all: ReturnType<typeof useGames> } {
  const all = useGames();
  const { season, setSeason } = useContext(SeasonContext);
  const current = all.seasons.find((s) => s.key === season) ?? all.seasons[0] ?? null;
  const seasonGames = useMemo(() => (current ? all.games.filter((g) => g.season === current.key) : []), [all.games, current]);
  return { season: current, seasons: all.seasons, setSeason, seasonGames, all };
}

export function useGame(id: string | undefined) {
  const { games, ...rest } = useGames();
  return { game: games.find((g) => g.id === id) ?? null, ...rest };
}
