import { focusManager, type QueryKey, useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';

/** Runs a query only while its screen is focused and the app is active. */
export function useFocusedQuery<TData, TKey extends QueryKey>(options: UseQueryOptions<TData, Error, TData, TKey>): UseQueryResult<TData, Error> {
  const [isScreenFocused, setScreenFocused] = useState(false);
  const isAppActive = useSyncExternalStore(focusManager.subscribe, () => focusManager.isFocused(), () => true);

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));

  return useQuery({
    ...options,
    enabled: isScreenFocused && isAppActive,
    subscribed: isScreenFocused && isAppActive,
  });
}
