import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './theme';

type ScreenProps = { title: string; subtitle: string; headerContent?: ReactNode; children: ReactNode };

export function Screen({ title, subtitle, headerContent, children }: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.brand}>COCOS CHALLENGE</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {headerContent}
      </View>
      {children}
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
