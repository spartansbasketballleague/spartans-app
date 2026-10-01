import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccount } from '@/data/account';
import { useGames } from '@/data/games';
import { playerDirectory } from '@/lib/players';
import { color, font, space } from '@/theme';
import { supabase } from '@/lib/supabase';
import { Button } from './ui';

// Players link their stats with the 6-character code the league sends them.
export function ClaimCard() {
  const { myPid, claimPlayer } = useAccount();
  const { games } = useGames();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [requested, setRequested] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const me = useMemo(() => (myPid == null ? null : playerDirectory(games).find((p) => p.pid === myPid) ?? null), [games, myPid]);

  if (myPid != null) {
    return (
      <Pressable onPress={() => router.push(`/player/${myPid}`)} style={s.linked}>
        <Text style={s.kicker}>Your player profile</Text>
        <Text style={s.name}>{me?.name ?? `Player #${myPid}`}</Text>
        {me?.team ? <Text style={s.team}>{me.team}</Text> : null}
        <Text style={s.more}>See your stats  →</Text>
      </Pressable>
    );
  }

  const ask = async () => {
    setErr(null);
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-code', { method: 'POST' });
      if (error) throw error;
      const r = data as { already?: string };
      setRequested(
        r.already === 'requested'
          ? 'You already asked recently. Spartans will send your code by email or text.'
          : 'Request sent. Spartans will send your code by email or text.',
      );
    } catch {
      setErr('Could not send the request. Check your connection and try again.');
    } finally {
      setAsking(false);
    }
  };

  const go = async () => {
    setErr(null);
    setBusy(true);
    try {
      await claimPlayer(code);
      setCode('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That code didn\'t work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.box}>
      <Text style={s.kicker}>Finish your player setup</Text>
      <Text style={s.p}>Spartans will send you a 6-character code by email or text. When it arrives, enter it here to link your stats to your account.</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="ABC234"
        placeholderTextColor="#C9C4BC"
        autoCapitalize="characters"
        autoCorrect={false}
        style={s.input}
      />
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Button label={busy ? 'Checking…' : 'Claim profile'} onPress={go} disabled={busy || code.length < 6} />
      <View style={s.divider} />
      {requested ? (
        <Text style={s.sent}>{requested}</Text>
      ) : (
        <Button kind="line" label={asking ? 'Sending…' : 'Request your code'} onPress={ask} disabled={asking} />
      )}
      <Text style={s.fine}>No code yet? You can use the app as normal in the meantime. Come back here anytime from the person icon at the top.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginHorizontal: space(4), marginTop: space(5), padding: space(4), borderWidth: 2, borderColor: color.ink, gap: space(2) },
  linked: { marginHorizontal: space(4), marginTop: space(5), padding: space(5), backgroundColor: color.ink, borderTopWidth: 4, borderTopColor: color.orange },
  kicker: { fontFamily: font.label, fontSize: 11, letterSpacing: 1.5, color: color.orange, textTransform: 'uppercase' },
  name: { fontFamily: font.display, fontSize: 30, color: color.paper, textTransform: 'uppercase', marginTop: 2 },
  team: { fontFamily: font.body, fontSize: 16, color: '#BDB7AE' },
  more: { fontFamily: font.label, fontSize: 12, letterSpacing: 1, color: color.paper, textTransform: 'uppercase', marginTop: space(4) },
  p: { fontFamily: font.body, fontSize: 16, color: color.ink, lineHeight: 21 },
  input: { fontFamily: font.display, fontSize: 34, letterSpacing: 8, color: color.ink, borderBottomWidth: 2, borderBottomColor: color.ink, paddingVertical: space(2), marginBottom: space(2) },
  err: { fontFamily: font.body, fontSize: 15, color: color.orangeDeep },
  divider: { height: 1, backgroundColor: color.rule, marginVertical: space(2) },
  sent: { fontFamily: font.bodyBold, fontSize: 15, color: color.ink, borderLeftWidth: 3, borderLeftColor: color.orange, paddingLeft: space(2), paddingVertical: space(1) },
  fine: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: space(1) },
});
