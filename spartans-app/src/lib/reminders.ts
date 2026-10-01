import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REMINDER_LEADS } from '@/config';
import { Game, teamInGame } from './games';
import { clock } from './format';

// Pregame reminders (1 hour, 10 minutes, tip-off) are scheduled on the phone
// for every upcoming game of a followed team. They work with no server and
// keep working offline. Halftime and final-score alerts depend on the scorer
// and need a server push — see README, "Before launch" item 2.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function copy(g: Game, lead: number) {
  const matchup = `${g.away} at ${g.home}`;
  if (lead === 0) return { title: 'Tip-off', body: `${matchup} is starting now${g.location ? ` at ${g.location}` : ''}.` };
  if (lead >= 60) return { title: 'Game in 1 hour', body: `${matchup}, ${clock(g.time)}${g.location ? ` at ${g.location}` : ''}.` };
  return { title: `Game in ${lead} minutes`, body: `${matchup}${g.location ? ` at ${g.location}` : ''}.` };
}

export async function syncReminders(games: Game[], follows: string[]) {
  if (Platform.OS === 'web') return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('games', {
      name: 'Game reminders',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#F26522',
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const upcoming = games
    .filter((g) => g.status === 'pregame' && g.startsAt > now && follows.some((t) => teamInGame(g, t)))
    .sort((a, b) => a.startsAt - b.startsAt);

  // iOS keeps at most 64 pending local notifications per app.
  let count = 0;
  outer: for (const g of upcoming) {
    for (const lead of REMINDER_LEADS) {
      const at = g.startsAt - lead * 60_000;
      if (at <= now) continue;
      if (count >= 60) break outer;
      await Notifications.scheduleNotificationAsync({
        content: { ...copy(g, lead), data: { gameId: g.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'games' },
      });
      count++;
    }
  }
  return count;
}
