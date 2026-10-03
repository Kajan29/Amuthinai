import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Button, Input, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/language.store';
import { colors, typography } from '@/theme';

/** FR1 — account creation; the role is chosen on the next screen. */
export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const language = useLanguageStore((state) => state.language);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await register({ ...form, email: form.email.trim(), language });
      router.replace('/(auth)/select-role');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('auth.register')}</Text>

      <Input label={t('auth.name')} value={form.name} onChangeText={set('name')} />
      <Input
        label={t('auth.email')}
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        label={t('auth.phone')}
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
      />
      <Input
        label={t('auth.password')}
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        hint="At least 8 characters"
        error={error ?? undefined}
      />

      <Button label={t('common.continue')} onPress={handleSubmit} loading={isSubmitting} />

      <Text style={styles.footer}>
        {t('auth.haveAccount')}{' '}
        <Link href="/(auth)/login" style={styles.link}>
          {t('auth.login')}
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text },
  footer: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
});
