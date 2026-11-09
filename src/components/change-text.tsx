import { StyleSheet, Text } from 'react-native';

import { formatSignedPercent } from '@/utils/format';

import { colors } from './theme';

/** A percentage change, with sign as well as color. */
export function ChangeText({ value }: { value: number | null }) {
  const tone = value !== null && value > 0 ? styles.positive : value !== null && value < 0 ? styles.negative : styles.neutral;
  return <Text style={[styles.change, tone]}>{formatSignedPercent(value)}</Text>;
}

const styles = StyleSheet.create({
  change: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  neutral: { color: colors.muted },
});
