import { focusManager, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';

import { marketQueryOptions, searchQueryOptions } from './market-query';

export function useMarket(query: string) {
  const [isScreenFocused, setScreenFocused] = useState(false);
  const isAppActive = useSyncExternalStore(focusManager.subscribe, () => focusManager.isFocused(), () => true);

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));

  return useQuery({
    ...(query ? searchQueryOptions(query) : marketQueryOptions),
    enabled: isScreenFocused && isAppActive,
    subscribed: isScreenFocused && isAppActive,
  });
}
