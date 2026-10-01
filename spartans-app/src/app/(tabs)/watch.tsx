import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { GameRow } from '@/components/GameRow';
import { Button, PageTitle, SectionHead, TopBar, AccountButton } from '@/components/ui';
import { useGames } from '@/data/games';
import { todayISO } from '@/lib/format';
import { TWITCH_CHANNEL, TWITCH_PARENT } from '@/config';
import { color, font, space } from '@/theme';

// Twitch only allows its player inside pages on an approved "parent" domain,
// so the embed is loaded as a tiny page that says it lives on the league site.
const playerHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${TWITCH_PARENT}&autoplay=true&muted=false" allowfullscreen allow="autoplay; fullscreen"></iframe></body></html>`;

function Player() {
  if (Platform.OS === 'web') {
    return (
      <View style={[s.player, s.placeholder]}>
        <Text style={s.phText}>The Twitch player appears here in the app.</Text>
      </View>
    );
  }
  return (
    <View style={s.player}>
      <WebView
        source={{ html: playerHtml, baseUrl: `https://${TWITCH_PARENT}` }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}

export default function WatchScreen() {
  const { games } = useGames();
  const today = todayISO();
  const tonight = games.filter((g) => g.date === today && g.status !== 'cancelled');

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TopBar right={<AccountButton />} />
      <ScrollView>
        <PageTitle kicker="Live on Twitch">Watch</PageTitle>
        <Player />
        <View style={{ padding: space(4), gap: space(3) }}>
          <Text style={s.body}>
            Games are streamed on Twitch. If nothing is live right now, the player shows the channel's offline screen.
          </Text>
          <Button label="Open in Twitch" onPress={() => Linking.openURL(`https://www.twitch.tv/${TWITCH_CHANNEL}`)} />
        </View>
        {tonight.length > 0 && (
          <>
            <SectionHead>Today's games</SectionHead>
            {tonight.map((g) => (
              <GameRow key={g.id} game={g} showDivision />
            ))}
          </>
        )}
        <View style={{ height: space(10) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  player: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  phText: { fontFamily: font.label, color: '#9A958E', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  body: { fontFamily: font.body, fontSize: 16, color: color.muted, lineHeight: 21 },
});
