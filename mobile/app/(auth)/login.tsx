import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button, Input, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { colors, spacing, typography } from '@/theme';

/** FR1 — email and password login. */
export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email.trim(), password);
      router.replace(user.role ? (HOME_ROUTE[user.role] as never) : '/(auth)/select-role');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('common.appName')}</Text>
        <LanguageSwitcher />
      </View>

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        error={error ?? undefined}
      />

      <Button label={t('auth.login')} onPress={handleSubmit} loading={isSubmitting} />

      <Text style={styles.footer}>
        {t('auth.noAccount')}{' '}
        <Link href="/(auth)/register" style={styles.link}>
          {t('auth.register')}
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  title: { ...typography.h1, color: colors.primary },
  footer: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
});
