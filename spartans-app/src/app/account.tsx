import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClaimCard } from '@/components/ClaimCard';
import { Icon } from '@/components/Icon';
import { Button, Loading, PageTitle, SectionHead, TopBar } from '@/components/ui';
import { useAccount } from '@/data/account';
import { LEAGUE, SOCIALS } from '@/config';
import { color, font, space } from '@/theme';

function LinkRow({ title, sub, onPress }: { title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.linkRow, pressed && { backgroundColor: color.bone }]} accessibilityRole="link">
      <View style={{ flex: 1 }}>
        <Text style={s.linkTitle}>{title}</Text>
        {sub ? <Text style={s.linkSub}>{sub}</Text> : null}
      </View>
      <Icon name="arrow" size={18} color={color.muted} />
    </Pressable>
  );
}

// Name + optional cell. Used for new accounts and for editing later.
function ProfileForm({ initial, onDone, submitLabel }: { initial?: { first_name: string; last_name: string; phone: string | null; role: 'player' | 'fan' }; onDone?: () => void; submitLabel: string }) {
  const { saveProfile, session } = useAccount();
  const [first, setFirst] = useState(initial?.first_name ?? '');
  const [last, setLast] = useState(initial?.last_name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [role, setRole] = useState<'player' | 'fan' | null>(initial?.role ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const phoneOk = !phone.trim() || /^[0-9+()\-. ]{7,20}$/.test(phone.trim());
  const ok = first.trim().length > 0 && last.trim().length > 0 && phoneOk && role != null;

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      await saveProfile({ first_name: first, last_name: last, phone: phone || null, role: role ?? 'fan' });
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.form}>
      <Text style={s.label}>Are you a player or a fan?</Text>
      <View style={s.roleRow}>
        {([
          ['player', 'Player', 'I play in the league'],
          ['fan', 'Fan', 'Parent, family, friend'],
        ] as const).map(([key, title, sub]) => (
          <Pressable key={key} onPress={() => setRole(key)} style={[s.role, role === key && s.roleOn]} accessibilityState={{ selected: role === key }}>
            <Text style={[s.roleTitle, role === key && { color: color.paper }]}>{title}</Text>
            <Text style={[s.roleSub, role === key && { color: '#D9D4CC' }]}>{sub}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>First name</Text>
      <TextInput value={first} onChangeText={setFirst} style={s.input} autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
      <Text style={s.label}>Last name</Text>
      <TextInput value={last} onChangeText={setLast} style={s.input} autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
      <Text style={s.label}>Email</Text>
      <Text style={s.readonly}>{session?.user.email}</Text>
      <Text style={s.label}>Cell phone (optional)</Text>
      <TextInput value={phone} onChangeText={setPhone} style={s.input} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="(631) 555-0123" placeholderTextColor="#B8B3AB" />
      {!phoneOk ? <Text style={s.err}>That phone number doesn't look right.</Text> : null}
      <Text style={s.fine}>Your email and phone number are private. They're only used by the league office and are never shown in the app.</Text>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Button label={busy ? 'Saving…' : submitLabel} onPress={save} disabled={!ok || busy} />
    </View>
  );
}

export default function AccountScreen() {
  const acct = useAccount();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!acct.session) setEditing(false);
  }, [acct.session]);

  const confirmDelete = () => {
    const run = async () => {
      try {
        await acct.deleteAccount();
        router.replace('/');
      } catch {
        Alert.alert('Could not delete account', 'Check your connection and try again, or contact the league office.');
      }
    };
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert('Delete your account?', 'This removes your name, contact info and saved favorites. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar back />
      <ScrollView keyboardShouldPersistTaps="handled">
        {!acct.session ? (
          <>
            <PageTitle kicker="Players, parents & fans">Your account</PageTitle>
            <View style={s.block}>
              <Text style={s.lead}>Create a free account to keep your favorite players and teams on every device and get game reminders.</Text>
              <Button label="Sign in or create account" onPress={() => router.push('/sign-in')} />
            </View>
          </>
        ) : acct.profileLoading ? (
          <Loading />
        ) : acct.needsProfile ? (
          <>
            <PageTitle kicker="Almost done">Create account</PageTitle>
            <ProfileForm submitLabel="Create account" />
          </>
        ) : editing && acct.profile ? (
          <>
            <PageTitle kicker="Your account">Edit details</PageTitle>
            <ProfileForm initial={acct.profile} submitLabel="Save" onDone={() => setEditing(false)} />
          </>
        ) : acct.profile ? (
          <>
            <PageTitle kicker="Your account">{`${acct.profile.first_name} ${acct.profile.last_name}`}</PageTitle>
            <View style={s.details}>
              <Text style={s.detail}>{acct.profile.email}</Text>
              {acct.profile.phone ? <Text style={s.detail}>{acct.profile.phone}</Text> : null}
              <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                <Text style={s.edit}>Edit details</Text>
              </Pressable>
            </View>
            {(acct.profile.role === 'player' || acct.myPid != null) && <ClaimCard />}
          </>
        ) : null}

        <SectionHead>Follow the league</SectionHead>
        {SOCIALS.map((x) => (
          <LinkRow key={x.key} title={x.label} sub={x.handle} onPress={() => Linking.openURL(x.url)} />
        ))}

        <SectionHead>League office</SectionHead>
        <LinkRow title="spartansbball.com" sub="Sign-ups, rules, FAQs" onPress={() => Linking.openURL(LEAGUE.site)} />
        <LinkRow title={LEAGUE.phone} sub="Call" onPress={() => Linking.openURL(`tel:${LEAGUE.phone.replace(/\D/g, '')}`)} />
        <LinkRow title={LEAGUE.email} sub="Email" onPress={() => Linking.openURL(`mailto:${LEAGUE.email}`)} />

        {acct.session && (
          <View style={[s.block, { marginTop: space(6) }]}>
            <Button kind="line" label="Sign out" onPress={acct.signOut} />
            <Pressable onPress={confirmDelete} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: space(2) }}>
              <Text style={s.danger}>Delete my account</Text>
            </Pressable>
          </View>
        )}
        <View style={{ height: space(12) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  block: { paddingHorizontal: space(4), gap: space(3) },
  lead: { fontFamily: font.body, fontSize: 18, color: color.ink, lineHeight: 23 },
  form: { paddingHorizontal: space(4), gap: space(1) },
  label: { fontFamily: font.label, fontSize: 11, letterSpacing: 1.2, color: color.muted, textTransform: 'uppercase', marginTop: space(3) },
  input: { fontFamily: font.bodyBold, fontSize: 20, color: color.ink, borderBottomWidth: 2, borderBottomColor: color.ink, paddingVertical: space(2) },
  readonly: { fontFamily: font.bodyBold, fontSize: 20, color: color.muted, paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: color.rule },
  fine: { fontFamily: font.body, fontSize: 14, color: color.muted, lineHeight: 19, marginVertical: space(4) },
  err: { fontFamily: font.body, fontSize: 15, color: color.orangeDeep, marginTop: space(1) },
  details: { paddingHorizontal: space(4), gap: 2 },
  detail: { fontFamily: font.body, fontSize: 17, color: color.muted },
  edit: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.2, color: color.orange, textTransform: 'uppercase', marginTop: space(3) },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(3.5), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.rule },
  linkTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.ink },
  linkSub: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: 1 },
  roleRow: { flexDirection: 'row', gap: space(3), marginTop: space(2), marginBottom: space(2) },
  role: { flex: 1, borderWidth: 2, borderColor: color.ink, padding: space(3) },
  roleOn: { backgroundColor: color.ink },
  roleTitle: { fontFamily: font.label, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase', color: color.ink },
  roleSub: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: 2 },
  danger: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.2, color: color.orangeDeep, textTransform: 'uppercase' },
});
