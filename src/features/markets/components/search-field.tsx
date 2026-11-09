import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { colors } from '@/components/theme';
import { debounce } from '@/utils/debounce';

import { normalizeTicker } from '../utils/normalize-ticker';

// Holds the typed text itself so keystrokes do not re-render the list.
export function SearchField({ onSearch }: { onSearch: (query: string) => void }) {
  const [text, setText] = useState('');
  const [search] = useState(() => debounce(onSearch, 300));

  useEffect(() => search.cancel, [search]);

  return (
    <TextInput
      accessibilityLabel="Buscar por ticker"
      autoCapitalize="characters"
      autoCorrect={false}
      placeholder="Buscar por ticker"
      placeholderTextColor={colors.muted}
      style={styles.search}
      value={text}
      onChangeText={(value) => {
        setText(value);
        search(normalizeTicker(value));
      }}
    />
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.input, fontSize: 16, color: colors.text },
});
