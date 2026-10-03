import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function PostDonationSuccess() {
  const { t } = useTranslation();

  return (
    <Screen
      footer={
        <Button label={t('donor.dashboard')} onPress={() => router.replace('/(donor)/dashboard')} />
      }
    >
      <View style={styles.wrapper}>
        <Ionicons name="checkmark-circle" size={88} color={colors.success} />
        <Text style={styles.title}>{t('donor.posted')}</Text>
        <Text style={styles.body}>{t('donor.postedBody')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
