import { StyleSheet, Text, View } from 'react-native';

import { ChangeText } from '@/components/change-text';
import { colors } from '@/components/theme';
import { formatCurrency } from '@/utils/format';

import type { Instrument } from '../types/instrument';
import { calculateReturn } from '../utils/calculate-return';

export function InstrumentRow({ instrument }: { instrument: Instrument }) {
  return (
    <View style={styles.row} accessibilityLabel={`Instrumento ${instrument.ticker}`}>
      <View style={styles.identity}>
        <Text style={styles.ticker}>{instrument.ticker}</Text>
        <Text style={styles.name}>{instrument.name ?? 'Nombre no disponible'}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.price}>{formatCurrency(instrument.last_price)}</Text>
        <ChangeText value={calculateReturn(instrument)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  identity: { flex: 1, gap: 5 },
  ticker: { fontSize: 18, fontWeight: '700', color: colors.text },
  name: { fontSize: 13, color: colors.muted },
  values: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 18, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
