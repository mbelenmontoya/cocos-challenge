import { StyleSheet, Text } from 'react-native';

import { formatSignedPercent } from '@/utils/format';

import { colors } from './theme';

/** A percentage change, with sign as well as color, and an optional label before it. */
export function ChangeText({ value, label }: { value: number | null; label?: string }) {
  const tone = value !== null && value > 0 ? styles.positive : value !== null && value < 0 ? styles.negative : styles.neutral;
  const change = <Text style={[styles.change, tone]}>{formatSignedPercent(value)}</Text>;
  if (!label) return change;
  return <Text style={styles.label}>{label}: {change}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.muted },
  change: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  neutral: { color: colors.muted },
});
