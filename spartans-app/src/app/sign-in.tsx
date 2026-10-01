import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, PageTitle, TopBar } from '@/components/ui';
import { useAccount } from '@/data/account';
import { color, font, space } from '@/theme';

// Email + 6-digit code. No passwords to forget.
export default function SignIn() {
  const { sendCode, verifyCode } = useAccount();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (step === 'email') {
        await sendCode(email.trim().toLowerCase());
        setStep('code');
      } else {
        await verifyCode(email.trim().toLowerCase(), code.trim());
        router.replace('/account');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar back />
      <ScrollView keyboardShouldPersistTaps="handled">
        <PageTitle kicker="Players, parents & fans">Sign in</PageTitle>
        <View style={s.body}>
          {step === 'email' ? (
            <>
              <Text style={s.p}>Enter your email and we'll send you a 6-digit code. New here? The same code creates your account.</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor="#A39E97"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                style={s.input}
              />
            </>
          ) : (
            <>
              <Text style={s.p}>We sent a code to {email}. It can take a minute to show up.</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor="#C9C4BC"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                style={[s.input, s.code]}
              />
            </>
          )}
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Button
            label={busy ? 'One sec…' : step === 'email' ? 'Send code' : 'Sign in'}
            onPress={go}
            disabled={busy || (step === 'email' ? !/.+@.+\..+/.test(email) : code.length < 6)}
          />
          {step === 'code' && <Button kind="line" label="Use a different email" onPress={() => { setStep('email'); setCode(''); }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: space(4), gap: space(4) },
  p: { fontFamily: font.body, fontSize: 18, color: color.ink, lineHeight: 23 },
  input: { fontFamily: font.bodyBold, fontSize: 20, color: color.ink, borderBottomWidth: 2, borderBottomColor: color.ink, paddingVertical: space(2.5) },
  code: { fontFamily: font.display, fontSize: 36, letterSpacing: 10 },
  err: { fontFamily: font.body, fontSize: 15, color: color.orangeDeep },
});
