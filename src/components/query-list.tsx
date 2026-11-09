import type { UseQueryResult } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type QueryListProps<TData, TItem> = {
  query: UseQueryResult<TData, Error>;
  items: TItem[] | undefined;
  keyExtractor: (item: TItem) => string;
  renderItem: (item: TItem) => ReactElement;
  emptyMessage: string;
  loadingMessage: string;
  listLabel: string;
  getNotice?: (data: TData) => string | null;
};

/** A list backed by a query: loading, error, retry, pull to refresh and last update. */
export function QueryList<TData, TItem>({ query, items, keyExtractor, renderItem, emptyMessage, loadingMessage, listLabel, getNotice }: QueryListProps<TData, TItem>) {
  const [isPulling, setPulling] = useState(false);
  const refresh = () => query.refetch({ cancelRefetch: false });
  const pullToRefresh = () => {
    setPulling(true);
    void refresh().finally(() => setPulling(false));
  };
  const retryButton = (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: query.isFetching }} disabled={query.isFetching} style={styles.button} onPress={refresh}>
      <Text style={styles.buttonText}>Reintentar</Text>
    </Pressable>
  );

  if (query.isPending) return <Text style={styles.message}>{loadingMessage}</Text>;
  if (query.isError && !query.data) {
    return (
      <View style={styles.state}>
        <Text accessibilityRole="alert" style={styles.error}>{query.error.message}</Text>
        {retryButton}
      </View>
    );
  }

  const notice = query.data && getNotice?.(query.data);
  return (
    <FlatList
      accessibilityLabel={listLabel}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      onRefresh={pullToRefresh}
      refreshing={isPulling}
      ListEmptyComponent={<Text style={styles.message}>{emptyMessage}</Text>}
      ListHeaderComponent={
        <View style={styles.listHeading}>
          <Text style={styles.timestamp}>Última consulta exitosa: {new Date(query.dataUpdatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}</Text>
          {query.isError && (
            <View style={styles.refreshError}>
              <Text accessibilityRole="alert" style={styles.error}>No se pudo actualizar. {query.error.message}</Text>
              {retryButton}
            </View>
          )}
          {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  listHeading: { gap: 16, paddingBottom: 8 },
  timestamp: { fontSize: 12, color: colors.muted },
  refreshError: { gap: 12, alignItems: 'flex-start' },
  message: { padding: 24, color: colors.muted },
  notice: { padding: 16, marginBottom: 8, backgroundColor: colors.warningSurface, borderRadius: 12, color: colors.warningText, fontSize: 14, lineHeight: 21 },
  state: { padding: 24, gap: 20, alignItems: 'flex-start' },
  error: { fontSize: 15, lineHeight: 23, color: colors.negative },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.text, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
});
