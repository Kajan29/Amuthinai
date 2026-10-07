import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function RequestSuccess() {
  const { t } = useTranslation();

  return (
    <Screen
      safeTop
      footer={
        <Button
          label={t('recipient.dashboard')}
          onPress={() => router.replace('/(recipient)/dashboard')}
        />
      }
    >
      <View style={styles.wrapper}>
        <Ionicons name="checkmark-circle" size={88} color={colors.success} />
        <Text style={styles.title}>Request received</Text>
        <Text style={styles.body}>
          We will match you with a nearby donation and notify you when a volunteer is on the way.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
