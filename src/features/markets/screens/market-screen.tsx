import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QueryList } from '@/components/query-list';
import { colors } from '@/components/theme';

import { InstrumentRow } from '../components/instrument-row';
import { SearchField } from '../components/search-field';
import { useMarket } from '../hooks/use-market';
import type { Market } from '../types/instrument';

const getNotice = ({ incomplete, omitted }: Market) => (incomplete > 0 || omitted > 0
  ? `Información incompleta: ${incomplete} instrumentos con datos no disponibles. ${omitted} registros no pudieron mostrarse.`
  : null);

export function MarketScreen() {
  const [query, setQuery] = useState('');
  const market = useMarket(query);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.brand}>COCOS CHALLENGE</Text>
        <Text accessibilityRole="header" style={styles.title}>Mercado</Text>
        <Text style={styles.subtitle}>Instrumentos · Precios en pesos</Text>
        <SearchField onSearch={setQuery} />
      </View>
      <QueryList
        query={market}
        items={market.data?.instruments}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => <InstrumentRow instrument={item} />}
        emptyMessage={query ? `No encontramos instrumentos para ${query}.` : 'No hay instrumentos disponibles.'}
        loadingMessage="Cargando instrumentos…"
        listLabel="Lista de instrumentos"
        getNotice={getNotice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  heading: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 20, gap: 10 },
  brand: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, color: colors.muted },
  title: { fontSize: 34, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
});
