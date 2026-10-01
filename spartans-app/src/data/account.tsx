import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { sameTeam } from '@/lib/games';
import { supabase } from '@/lib/supabase';

// Accounts are for fans, family and players alike. An account holds private
// contact info (first/last name, email, optional cell) plus favorite players
// and teams. Contact info lives in the `profiles` table, which only the
// account owner can read. Players link their own stats with a claim code the
// league sends them; each player can be claimed by one account only.
//
// Favorites work signed out (saved on the phone) and sync to the account
// once someone signs in.

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'player' | 'fan';
  favorite_players: number[];
  favorite_teams: string[];
};

type AccountCtx = {
  session: Session | null;
  profile: Profile | null;
  profileLoading: boolean;
  needsProfile: boolean; // signed in but hasn't filled in name yet
  myPid: number | null; // player this account has claimed
  favPlayers: number[];
  favTeams: string[];
  isFavPlayer: (pid: number) => boolean;
  toggleFavPlayer: (pid: number) => void;
  isFollowing: (team: string) => boolean;
  toggleFollow: (team: string) => void;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  saveProfile: (p: { first_name: string; last_name: string; phone: string | null; role: 'player' | 'fan' }) => Promise<void>;
  claimPlayer: (code: string) => Promise<number>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);
const LOCAL_KEY = 'sbl-favorites-v2';

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [favPlayers, setFavPlayers] = useState<number[]>([]);
  const [favTeams, setFavTeams] = useState<string[]>([]);
  const [myPid, setMyPid] = useState<number | null>(null);
  const local = useRef({ players: [] as number[], teams: [] as string[] });

  // Phone-saved favorites + existing session
  useEffect(() => {
    AsyncStorage.getItem(LOCAL_KEY)
      .then((v) => {
        if (!v) return;
        const f = JSON.parse(v) as { players: number[]; teams: string[] };
        local.current = f;
        setFavPlayers(f.players ?? []);
        setFavTeams(f.teams ?? []);
      })
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Load the profile when someone signs in; merge phone favorites into it.
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setMyPid(null);
      return;
    }
    supabase
      .from('player_claims')
      .select('pid')
      .maybeSingle()
      .then(({ data }) => setMyPid((data as { pid: number } | null)?.pid ?? null));
    let cancelled = false;
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('id,first_name,last_name,email,phone,role,favorite_players,favorite_teams')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        const p = data as Profile | null;
        if (p) {
          const players = Array.from(new Set([...p.favorite_players, ...local.current.players]));
          const teams = [...p.favorite_teams];
          for (const t of local.current.teams) if (!teams.some((x) => sameTeam(x, t))) teams.push(t);
          if (players.length !== p.favorite_players.length || teams.length !== p.favorite_teams.length) {
            await supabase.from('profiles').update({ favorite_players: players, favorite_teams: teams }).eq('id', p.id);
          }
          setProfile({ ...p, favorite_players: players, favorite_teams: teams });
          setFavPlayers(players);
          setFavTeams(teams);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (players: number[], teams: string[]) => {
      setFavPlayers(players);
      setFavTeams(teams);
      local.current = { players, teams };
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(local.current)).catch(() => {});
      if (profile) {
        setProfile({ ...profile, favorite_players: players, favorite_teams: teams });
        supabase.from('profiles').update({ favorite_players: players, favorite_teams: teams }).eq('id', profile.id).then(() => {});
      }
    },
    [profile],
  );

  const value = useMemo<AccountCtx>(
    () => ({
      session,
      profile,
      profileLoading,
      needsProfile: !!session && !profileLoading && !profile,
      myPid,
      favPlayers,
      favTeams,
      isFavPlayer: (pid) => favPlayers.includes(pid),
      toggleFavPlayer: (pid) =>
        persist(favPlayers.includes(pid) ? favPlayers.filter((x) => x !== pid) : [...favPlayers, pid], favTeams),
      isFollowing: (team) => favTeams.some((f) => sameTeam(f, team)),
      toggleFollow: (team) =>
        persist(favPlayers, favTeams.some((f) => sameTeam(f, team)) ? favTeams.filter((f) => !sameTeam(f, team)) : [...favTeams, team]),
      sendCode: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) throw error;
      },
      verifyCode: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) throw error;
      },
      saveProfile: async ({ first_name, last_name, phone, role }) => {
        if (!session) throw new Error('Not signed in');
        const row = {
          id: session.user.id,
          email: session.user.email ?? '',
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone?.trim() || null,
          role,
          favorite_players: favPlayers,
          favorite_teams: favTeams,
        };
        const { data, error } = await supabase
          .from('profiles')
          .upsert(row)
          .select('id,first_name,last_name,email,phone,role,favorite_players,favorite_teams')
          .single();
        if (error) throw error;
        setProfile(data as Profile);
      },
      claimPlayer: async (code) => {
        const { data, error } = await supabase.rpc('claim_player', { p_code: code });
        if (error) throw error;
        const r = data as { ok: boolean; pid?: number; error?: string };
        if (!r.ok || r.pid == null) throw new Error(r.error ?? 'That code didn\'t work.');
        setMyPid(r.pid);
        if (profile) setProfile({ ...profile, role: 'player' });
        return r.pid;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      deleteAccount: async () => {
        const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
        if (error) throw error;
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [session, profile, profileLoading, favPlayers, favTeams, persist, myPid],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount outside AccountProvider');
  return v;
}
