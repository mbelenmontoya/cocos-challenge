import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { calculateReturn, type Instrument } from './instruments';
import { useMarket } from './use-market';

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const percentage = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function InstrumentRow({ instrument }: { instrument: Instrument }) {
  const change = calculateReturn(instrument);
  const sign = change !== null && change > 0 ? '+' : change !== null && change < 0 ? '−' : '';
  const tone = change !== null && change > 0 ? styles.positive : change !== null && change < 0 ? styles.negative : styles.neutral;

  return (
    <View style={styles.row} accessibilityLabel={`Instrumento ${instrument.ticker}`}>
      <View style={styles.identity}>
        <Text style={styles.ticker}>{instrument.ticker}</Text>
        <Text style={styles.name}>{instrument.name ?? 'Nombre no disponible'}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.price}>{instrument.last_price === null ? 'No disponible' : currency.format(instrument.last_price)}</Text>
        <Text style={[styles.change, tone]}>{change === null ? 'No disponible' : `${sign}${percentage.format(Math.abs(change))} %`}</Text>
      </View>
    </View>
  );
}

export function MarketScreen() {
  const market = useMarket();
  const refresh = () => { void market.refetch({ cancelRefetch: false }); };
  const retryButton = (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: market.isFetching }} disabled={market.isFetching} style={styles.button} onPress={refresh}>
      <Text style={styles.buttonText}>Reintentar</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.brand}>COCOS CHALLENGE</Text>
        <Text accessibilityRole="header" style={styles.title}>Mercado</Text>
        <Text style={styles.subtitle}>Acciones argentinas · Precios en pesos</Text>
      </View>
      {market.isPending ? <Text style={styles.message}>Cargando acciones…</Text> : market.isError && !market.data ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={styles.error}>{market.error.message}</Text>
          {retryButton}
        </View>
      ) : (
        <FlatList
          accessibilityLabel="Lista de acciones"
          data={market.data?.instruments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <InstrumentRow instrument={item} />}
          contentContainerStyle={styles.list}
          onRefresh={refresh}
          refreshing={market.isFetching}
          ListEmptyComponent={<Text style={styles.message}>No hay acciones disponibles.</Text>}
          ListHeaderComponent={
            <View style={styles.listHeading}>
              <Text style={styles.timestamp}>Última consulta exitosa: {new Date(market.dataUpdatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}</Text>
              {market.isError && (
                <View style={styles.refreshError}>
                  <Text accessibilityRole="alert" style={styles.error}>No se pudo actualizar. {market.error.message}</Text>
                  {retryButton}
                </View>
              )}
              {market.data && (market.data.incomplete > 0 || market.data.omitted > 0) && (
                <Text accessibilityRole="alert" style={styles.notice}>
                  Información incompleta: {market.data.incomplete} acciones con datos no disponibles. {market.data.omitted} registros no pudieron mostrarse.
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  heading: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 20, gap: 10 },
  brand: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, color: '#636E7C' },
  title: { fontSize: 34, fontWeight: '700', color: '#17202C' },
  subtitle: { fontSize: 14, color: '#636E7C' },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  listHeading: { gap: 16, paddingBottom: 8 },
  timestamp: { fontSize: 12, color: '#636E7C' },
  refreshError: { gap: 12, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E6E9ED' },
  identity: { flex: 1, gap: 5 },
  ticker: { fontSize: 18, fontWeight: '700', color: '#17202C' },
  name: { fontSize: 13, color: '#636E7C' },
  values: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 18, fontWeight: '600', color: '#17202C', fontVariant: ['tabular-nums'] },
  change: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  positive: { color: '#147644' },
  negative: { color: '#B32632' },
  neutral: { color: '#636E7C' },
  message: { padding: 24, color: '#636E7C' },
  notice: { padding: 16, marginBottom: 8, backgroundColor: '#FFF5DF', borderRadius: 12, color: '#694A09', fontSize: 14, lineHeight: 21 },
  state: { padding: 24, gap: 20, alignItems: 'flex-start' },
  error: { fontSize: 15, lineHeight: 23, color: '#B32632' },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: '#17202C', minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
