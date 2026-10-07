import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { colors, spacing, typography } from '@/theme';
import type { Role } from '@/types';

/** FR1 — a new account picks one of the three self-service roles. Admins are provisioned. */
const SELECTABLE_ROLES: { role: Role; labelKey: string; description: string }[] = [
  {
    role: 'donor',
    labelKey: 'auth.roleDonor',
    description: 'Share surplus food from your kitchen or business.',
  },
  {
    role: 'volunteer',
    labelKey: 'auth.roleVolunteer',
    description: 'Collect donations and deliver them nearby.',
  },
  {
    role: 'recipient',
    labelKey: 'auth.roleRecipient',
    description: 'Request meals for your household or community.',
  },
];

export default function SelectRole() {
  const { t } = useTranslation();
  const { selectRole } = useAuth();
  const [pending, setPending] = useState<Role | null>(null);

  async function choose(role: Role) {
    setPending(role);
    try {
      await selectRole(role);
      router.replace(HOME_ROUTE[role] as never);
    } finally {
      setPending(null);
    }
  }

  return (
    <Screen safeTop>
      <Text style={styles.title}>{t('auth.selectRole')}</Text>

      {SELECTABLE_ROLES.map(({ role, labelKey, description }) => (
        <Card key={role}>
          <Text style={styles.roleTitle}>{t(labelKey)}</Text>
          <Text style={styles.roleDescription}>{description}</Text>
          <Button
            label={t('common.continue')}
            onPress={() => void choose(role)}
            loading={pending === role}
            disabled={pending !== null && pending !== role}
            style={styles.action}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text },
  roleTitle: { ...typography.h3, color: colors.text },
  roleDescription: { ...typography.body, color: colors.textMuted },
  action: { marginTop: spacing.sm },
});
