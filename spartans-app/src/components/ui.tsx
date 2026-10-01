import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnline } from '@/data/games';
import { ago } from '@/lib/format';
import { color, font, space } from '@/theme';
import { Icon } from './Icon';

// ---- Top bar ---------------------------------------------------------------

export function TopBar({ back, right }: { back?: boolean; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + space(2) }]}>
      <View style={styles.topSide}>
        {back && (
          <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back">
            <Icon name="back" color={color.paper} />
          </Pressable>
        )}
      </View>
      <Image
        source={require('../../assets/brand/long_logo_dark_bg_trim.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Spartans Basketball League"
      />
      <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function AccountButton() {
  return (
    <Pressable hitSlop={12} onPress={() => router.push('/account')} accessibilityLabel="Your account">
      <Icon name="more" color={color.paper} />
    </Pressable>
  );
}

// ---- Headings --------------------------------------------------------------

export function PageTitle({ children, kicker }: { children: string; kicker?: string }) {
  return (
    <View style={styles.pageTitle}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.pageTitleText}>{children}</Text>
    </View>
  );
}

export function SectionHead({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionHeadText}>{children}</Text>
      {right}
    </View>
  );
}

// ---- Tab-style picker (underline, not pills) -------------------------------

export function Picker<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: { key: T; label: string }[];
  value: T | null;
  onChange: (k: T) => void;
  dark?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.picker, dark && { backgroundColor: color.ink, borderBottomColor: color.ruleDark }]}
      contentContainerStyle={{ paddingHorizontal: space(3) }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.pickItem, on && styles.pickItemOn]} accessibilityState={{ selected: on }}>
            <Text style={[styles.pickText, dark && { color: '#9A958E' }, on && { color: dark ? color.paper : color.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---- Status --------------------------------------------------------------------

export function OfflineBanner({ updatedAt }: { updatedAt: number }) {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineTitle}>You're offline</Text>
      <Text style={styles.offlineBody}>
        Showing stats saved {updatedAt ? ago(updatedAt) : 'earlier'}. Connect to the internet to see new updates.
      </Text>
    </View>
  );
}

export function LiveDot() {
  return (
    <View style={styles.liveWrap}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.orange} />
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function Button({ label, onPress, kind = 'solid', disabled, style }: { label: string; onPress: () => void; kind?: 'solid' | 'line'; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, kind === 'line' && styles.btnLine, (pressed || disabled) && { opacity: 0.6 }, style]}
    >
      <Text style={[styles.btnText, kind === 'line' && { color: color.ink }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Tables --------------------------------------------------------------------

export function Cell({ children, w, align = 'right', bold, muted, style }: { children: React.ReactNode; w?: number; align?: 'left' | 'right' | 'center'; bold?: boolean; muted?: boolean; style?: TextStyle }) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.cell,
        w ? { width: w } : { flex: 1 },
        { textAlign: align },
        bold && { fontFamily: font.bodyBold, color: color.ink },
        muted && { color: color.muted },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function HeadCell({ children, w, align = 'right', active }: { children: React.ReactNode; w?: number; align?: 'left' | 'right' | 'center'; active?: boolean }) {
  return (
    <Text numberOfLines={1} style={[styles.headCell, w ? { width: w } : { flex: 1 }, { textAlign: align }, active && { color: color.orange }]}>
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({
  topBar: {
    backgroundColor: color.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingBottom: space(2),
  },
  topSide: { width: 40 },
  // Trimmed copy of the long logo (transparent margin removed, artwork untouched).
  logo: { flex: 1, height: 38 },
  pageTitle: { paddingHorizontal: space(4), paddingTop: space(5), paddingBottom: space(3) },
  kicker: { fontFamily: font.label, fontSize: 12, letterSpacing: 1.5, color: color.orange, textTransform: 'uppercase', marginBottom: 2 },
  pageTitleText: { fontFamily: font.display, fontSize: 34, color: color.ink, textTransform: 'uppercase', lineHeight: 40 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(6),
    marginHorizontal: space(4),
    paddingBottom: space(1.5),
    borderBottomWidth: 3,
    borderBottomColor: color.orange,
    alignSelf: 'stretch',
  },
  sectionHeadText: { fontFamily: font.label, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase', color: color.ink },
  picker: { flexGrow: 0, backgroundColor: color.paper, borderBottomWidth: 1, borderBottomColor: color.rule },
  pickItem: { paddingHorizontal: space(2.5), paddingVertical: space(3), borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  pickItemOn: { borderBottomColor: color.orange },
  pickText: { fontFamily: font.label, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: color.muted },
  offline: { backgroundColor: color.ink, paddingHorizontal: space(4), paddingVertical: space(2.5), borderLeftWidth: 4, borderLeftColor: color.orange },
  offlineTitle: { fontFamily: font.label, color: color.paper, textTransform: 'uppercase', letterSpacing: 1, fontSize: 13 },
  offlineBody: { fontFamily: font.body, color: '#CFCAC2', fontSize: 15, marginTop: 2 },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.orange },
  liveText: { fontFamily: font.label, fontSize: 12, color: color.orange, letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(10) },
  empty: { paddingHorizontal: space(6), paddingVertical: space(12), alignItems: 'center' },
  emptyTitle: { fontFamily: font.label, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, color: color.ink, textAlign: 'center' },
  emptyBody: { fontFamily: font.body, fontSize: 16, color: color.muted, textAlign: 'center', marginTop: space(2), lineHeight: 21 },
  btn: { backgroundColor: color.orange, paddingVertical: space(3.5), paddingHorizontal: space(5), alignItems: 'center' },
  btnLine: { backgroundColor: 'transparent', borderWidth: 2, borderColor: color.ink },
  btnText: { fontFamily: font.label, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: color.paper },
  cell: { fontFamily: font.num, fontSize: 16, color: '#2B2926', fontVariant: ['tabular-nums'] },
  headCell: { fontFamily: font.label, fontSize: 11, letterSpacing: 0.8, color: color.muted, textTransform: 'uppercase' },
});
