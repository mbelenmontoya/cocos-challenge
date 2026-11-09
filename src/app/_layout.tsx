import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import '@/config/env';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Tabs screenOptions={{ headerShown: false, tabBarIcon: () => null }}>
        <Tabs.Screen name="index" options={{ title: 'Mercado' }} />
        <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      </Tabs>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
