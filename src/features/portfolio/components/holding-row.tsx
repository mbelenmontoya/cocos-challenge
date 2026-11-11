import { StyleSheet, Text, View } from 'react-native';

import { ChangeText } from '@/components/change-text';
import { colors } from '@/components/theme';
import { formatCurrency } from '@/utils/format';

import type { Holding } from '../types/holding';
import { gain, marketValue, returnPercent } from '../utils/holding-metrics';

export function HoldingRow({ holding }: { holding: Holding }) {
  return (
    <View style={styles.row} accessibilityLabel={`Activo ${holding.ticker ?? holding.instrument_id}`}>
      <View style={styles.identity}>
        <Text style={styles.ticker}>{holding.ticker ?? `Instrumento #${holding.instrument_id}`}</Text>
        <Text style={styles.detail}>Cantidad: {holding.quantity ?? 'No disponible'}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.value}>{formatCurrency(marketValue(holding))}</Text>
        <Text style={styles.detail}>Ganancia: {formatCurrency(gain(holding))}</Text>
        <ChangeText label="Rendimiento" value={returnPercent(holding)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  identity: { flex: 1, gap: 5 },
  ticker: { fontSize: 18, fontWeight: '700', color: colors.text },
  detail: { fontSize: 13, color: colors.muted },
  values: { alignItems: 'flex-end', gap: 6 },
  value: { fontSize: 18, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
