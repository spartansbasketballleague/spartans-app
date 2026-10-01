import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/components/Icon';
import { color, font } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color: c }: { color: unknown }) => <Icon name={icon} color={String(c)} size={22} />,
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.orange,
        tabBarInactiveTintColor: '#8C877F',
        tabBarStyle: { backgroundColor: color.ink, borderTopColor: color.ink, height: 68 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
        tabBarLabelStyle: { fontFamily: font.label, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Scores', 'scores')} />
      <Tabs.Screen name="standings" options={tab('Standings', 'standings')} />
      <Tabs.Screen name="stats" options={tab('Stats', 'stats')} />
      <Tabs.Screen name="favorites" options={tab('Favorites', 'star')} />
      <Tabs.Screen name="watch" options={tab('Watch', 'watch')} />
    </Tabs>
  );
}
