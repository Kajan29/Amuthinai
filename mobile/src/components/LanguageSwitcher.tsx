import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES } from '@/constants';
import { useLanguageStore } from '@/store/language.store';
import { colors, radius, spacing, typography } from '@/theme';

/** NFR6 — mounted in every screen header so language can be changed at any point. */
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <View style={styles.row}>
      {LANGUAGES.map(({ code, label }) => {
        const isActive = code === language;

        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => void setLanguage(code)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: { backgroundColor: '#FDF2F4', borderColor: '#5A1626' },
  label: { ...typography.caption, color: colors.textMuted },
  labelActive: { color: '#5A1626', fontWeight: '700' },
});
