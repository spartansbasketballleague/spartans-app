import { Anton_400Regular } from '@expo-google-fonts/anton';
import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Oswald_400Regular, Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider, useAccount } from '@/data/account';
import { DataProvider, useGames } from '@/data/games';
import { gameLog } from '@/lib/players';
import { syncReminders } from '@/lib/reminders';
import { color } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Keeps phone reminders in step with the schedule and the teams followed.
function ReminderSync() {
  const { games } = useGames();
  const { favTeams, favPlayers } = useAccount();
  // Remind for followed teams plus the current team of every favorite player.
  const teams = useMemo(() => {
    const out = [...favTeams];
    for (const pid of favPlayers) {
      const last = gameLog(games, pid)[0];
      if (last && !out.some((t) => t.toLowerCase() === last.team.toLowerCase())) out.push(last.team);
    }
    return out;
  }, [games, favTeams, favPlayers]);
  useEffect(() => {
    syncReminders(games, teams).catch(() => {});
  }, [games, teams]);

  // Tapping a reminder opens that game.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.gameId;
      if (typeof id === 'string') router.push(`/game/${id}`);
    });
    return () => sub.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Anton_400Regular,
    Oswald_400Regular,
    Oswald_600SemiBold,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <DataProvider>
        <AccountProvider>
          <ReminderSync />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="account" />
          </Stack>
        </AccountProvider>
      </DataProvider>
    </SafeAreaProvider>
  );
}
