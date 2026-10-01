// Everything the league might want to change without touching screen code.

export const SUPABASE_URL = 'https://wuyjwkiwifxyrvnbaxhp.supabase.co';
// Publishable (client-side) key — same one the website stats viewer uses.
export const SUPABASE_KEY = 'sb_publishable_OfD7cRQWHY--ZsPleISoCg_y0xAR4sx';

export const TWITCH_CHANNEL = 'spartansbasketball_league';
// Twitch embeds require a "parent" domain; the league's site is used.
export const TWITCH_PARENT = 'spartansbball.com';

// In the order the league asked for: IG, Twitch, FB, TikTok.
export const SOCIALS: { key: string; label: string; handle: string; url: string }[] = [
  { key: 'instagram', label: 'Instagram', handle: '@spartans_bball', url: 'https://www.instagram.com/spartans_bball/' },
  { key: 'twitch', label: 'Twitch', handle: `twitch.tv/${TWITCH_CHANNEL}`, url: `https://www.twitch.tv/${TWITCH_CHANNEL}` },
  { key: 'facebook', label: 'Facebook', handle: 'SpartansBasketballLeague', url: 'https://www.facebook.com/SpartansBasketballLeague/' },
  // TODO(league): confirm TikTok handle.
  { key: 'tiktok', label: 'TikTok', handle: '@spartans_bball', url: 'https://www.tiktok.com/@spartans_bball' },
];

export const LEAGUE = {
  name: 'Spartans Basketball League',
  site: 'https://www.spartansbball.com',
  phone: '(631) 770-3600',
  email: 'info@spartansbasketballleague.com',
};

// Game ids to leave out of everything (demo/test games, one-offs).
export const EXCLUDED_ID_PREFIXES = ['test_', 'custom_'];
export const EXCLUDED_DIVISIONS = ['Demo', 'Custom'];

// Display-name fixes by player id ("Coach Steve" is Steven Giustino).
export const NAME_OVERRIDES: Record<number, string> = { 33: 'Steven Giustino' };

// Reminder lead times for games of teams a user follows (minutes before tip).
export const REMINDER_LEADS = [60, 10, 0];
