import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.wrapper}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          Go to the home screen
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  title: { ...typography.h3, color: colors.text },
  link: { ...typography.body, color: colors.primary },
});
