import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChangeText } from '@/components/change-text';
import { colors } from '@/components/theme';
import { formatCurrency } from '@/utils/format';

import type { Instrument } from '../types/instrument';
import { calculateReturn } from '../utils/calculate-return';

type InstrumentRowProps = { instrument: Instrument; onPress?: () => void };

export function InstrumentRow({ instrument, onPress }: InstrumentRowProps) {
  const content = (
    <>
      <View style={styles.identity}>
        <Text style={styles.ticker}>{instrument.ticker}</Text>
        <Text style={styles.name}>{instrument.name ?? 'Nombre no disponible'}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.price}>{formatCurrency(instrument.last_price)}</Text>
        <ChangeText value={calculateReturn(instrument)} />
      </View>
    </>
  );
  const label = `Instrumento ${instrument.ticker}`;

  if (!onPress) return <View style={styles.row} accessibilityLabel={label}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre el formulario de orden"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  identity: { flex: 1, gap: 5 },
  ticker: { fontSize: 18, fontWeight: '700', color: colors.text },
  name: { fontSize: 13, color: colors.muted },
  values: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 18, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
