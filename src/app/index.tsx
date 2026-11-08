import { Stack } from 'expo-router';

import { MarketScreen } from '@/features/markets/MarketScreen';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MarketScreen />
    </>
  );
}
