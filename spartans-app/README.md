# Spartans Basketball League app

iOS + Android app built with Expo (SDK 57), Expo Router and TypeScript. It reads the same Supabase `game_state` table the scorer app writes to, so scores, box scores, standings and leaders match the website with no double entry.

## What's in it

| Tab | What it shows |
|---|---|
| Scores | Date strip for the season, games grouped by division, live games update on their own |
| Standings | Per division, W-L, GB, point diff, streak. Head-to-head tiebreaker, then point diff |
| Stats | League leaders (PPG, total points, 3PM, FTM, best game), search by player or team |
| Favorites | Search any player and save them, plus teams you follow, with season stats and next game |
| Watch | Twitch player, "Open in Twitch", today's games |

The person icon in the top bar opens the account screen: sign in or create an account (email + 6-digit code), player or fan, name and optional cell, claim your player profile, socials, league office, sign out, delete account.

Also: game pages (box score), team pages (record, roster stats, schedule, follow button), player pages (all-time and by season, points chart, game log).

- **Seasons**: toggle on every tab. Worked out from game ids (`fa26g…`, `su26g…`, `s26g…`, plain `g…` = Winter 2026). New prefixes like `w27g` show up with no code change.
- **Offline**: all-time data is saved on the phone. With no connection the app keeps working and shows "You're offline. Showing stats saved X ago. Connect to the internet to see new updates."
- **Accounts**: anyone can make one (players, parents, family, fans). Stored in the `profiles` table: first name, last name, email, optional cell, favorites. Only the account owner can read their row; signed-out visitors can't read the table at all. Email and phone are never shown in the app.
- **Claiming a player**: only with the random 6-character code the league sends that player (`player_claims` table). One account per player, one player per account, 10 wrong tries per hour max. Codes are never readable from the app. League office: `select * from admin_claims` to see who claimed what; `select reset_claim(<pid>)` frees a player and returns a new code; `select fill_claim_codes()` adds codes for new players; `select * from admin_players_waiting` lists accounts that signed up as players and still need a code. Players can sign up without a code and enter it later from the account screen.
- **Reminders**: for followed teams and the current team of every favorite player, 1 hour before, 10 minutes before, and at tip-off. Scheduled on the phone, so they work offline.
- **Stats shown**: points, 2PM, 3PM, FT, fouls. Rebounds and assists are left out because the scorer app hasn't recorded them in any season.

## League office portal

`portal/index.html` is one self-contained page. Host it on Netlify (drag the `portal` folder into app.netlify.com/drop) or open it straight from your computer. Only emails listed in the `admins` table can get in (right now: info@spartansbasketballleague.com); everyone else sees "No access". Every portal action goes through admin-only database functions (`admin_*`), so the page itself holds no secrets.

- **Accounts**: search, edit name/cell/type, link or unlink a player, delete an account.
- **Player codes**: search, copy, issue a new code, link to an account by hand, export CSV, add codes for new players.
- **Waiting for code**: player accounts without a linked player, with when they pressed "Request your code".

To add another admin: `insert into admins (email) values ('name@example.com');`

## "Request your code" emails

The button in the app calls the `request-code` Edge Function. Each press is saved (shows in the portal) and limited to once per 12 hours per account. To also get an email at info@: create a free Resend account (resend.com), verify the spartansbasketballleague.com domain there, create an API key, and add it in Supabase under Edge Functions > Secrets as `RESEND_API_KEY`. Optional secrets: `CODE_REQUEST_TO` (inbox, default info@spartansbasketballleague.com) and `CODE_REQUEST_FROM` (default `Spartans App <app@spartansbasketballleague.com>`).

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your phone
npx tsc --noEmit        # typecheck
```

Web preview with saved sample data (no database needed): `EXPO_PUBLIC_PREVIEW_DATA=1 npx expo start --web`

## Settings in one place

`src/config.ts`: Supabase keys, Twitch channel, social links, league contact info, excluded game ids, name fixes, reminder times.

## Before launch (open items)

1. **Database security (must fix).** `game_state` and `rosters` have policies that let anyone holding the public key insert, change or delete every row. That key sits inside the website and will be inside the app. The fix is to give the scorer app a login and limit writes to it. That touches the scorer app, so it needs to be planned, not done on the fly.
2. **Halftime and final-score alerts.** These fire when the scorer changes a game, so they need a server: a `push_tokens` table plus a Supabase Edge Function triggered on `game_state` updates, sending through Expo's push service. This is a database change, so it waits for approval.
3. **Sign-in emails.** In Supabase, Auth > Email Templates > Magic Link: put `{{ .Token }}` in the template so people get a 6-digit code. Set up custom SMTP (Mailchimp Transactional or similar) because Supabase's built-in sender is rate-limited.
4. **Delete account** is built: the `delete-account` Edge Function deletes only the signed-in caller's own account (profile goes with it).
5. **Confirm**: TikTok handle (placeholder in `src/config.ts`).
6. **One-off games**: ids starting `custom_` are left out right now. That includes a Men's Championship on 3/26 and a Men's West game on 4/22. Say which season they belong to and they'll be added.
7. **Tiebreakers**: the standings follow the league rule (H2H first, point diff only if teams never met). To match the website exactly, drop in the website's stats viewer file and the logic can be copied over.
8. Store accounts: Apple Developer ($99/yr) and Google Play ($25). Then `npx eas-cli@latest build` and `submit`.

## Layout

```
src/app/          screens (Expo Router)
src/components/   top bar, pickers, game row, chart, icons
src/data/         Supabase fetch, offline cache, live updates, account
src/lib/          parsing, seasons, standings, player totals, reminders
assets/brand/     league logos as supplied (plus copies with only the empty margin trimmed)
```
