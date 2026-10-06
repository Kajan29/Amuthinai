import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOnboardingStore } from '@/store/onboarding.store';
import { colors, spacing, typography } from '@/theme';

/**
 * Development utility screen to reset onboarding
 * Access via: /_dev-reset
 */
export default function DevResetScreen() {
  const router = useRouter();
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  const handleReset = async () => {
    await resetOnboarding();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Tools</Text>
      <Text style={styles.description}>
        Reset onboarding to see the onboarding screens again
      </Text>

      <Pressable onPress={handleReset} style={styles.button}>
        <Text style={styles.buttonText}>Reset Onboarding</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  buttonText: {
    ...typography.bodyStrong,
    color: colors.textInverse,
  },
  backButton: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
