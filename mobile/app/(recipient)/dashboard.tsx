import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { donationsApi } from '@/api/donations.api';
import { requestsApi } from '@/api/requests.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Badge, Button, Card, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** Active request status card, with the delivery PIN the volunteer will ask for (FR9). */
export default function RecipientDashboard() {
  const { t } = useTranslation();
  const requests = useOfflineQuery('recipient.requests', () => requestsApi.mine());

  const active = requests.data?.items.find((request) =>
    ['open', 'matched'].includes(request.status),
  );

  const timeline = useQuery({
    queryKey: ['request', active?.id, 'timeline'],
    queryFn: () => donationsApi.timeline(active!.id),
    enabled: Boolean(active && active.status === 'matched'),
  });

  return (
    <Screen
      footer={
        active ? undefined : (
          <Button
            label={t('recipient.newRequest')}
            onPress={() => router.push('/(recipient)/request/step1-location')}
          />
        )
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('recipient.dashboard')}</Text>
        <LanguageSwitcher />
      </View>

      {!active ? (
        <EmptyState
          title={t('common.empty')}
          description="Raise a request and a volunteer will bring food to your location."
        />
      ) : (
        <>
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {active.servingsNeeded} {t('recipient.servingsNeeded')}
              </Text>
              <Badge
                label={active.status === 'open' ? 'Looking for food' : 'Volunteer on the way'}
                tone={active.status === 'open' ? 'warning' : 'info'}
              />
            </View>
            <Text style={styles.meta}>
              {t('recipient.neededBy')}: {formatDateTime(active.neededBy)}
            </Text>
            <Text style={styles.meta}>
              {active.dropAddress.line1}, {active.dropAddress.city}
            </Text>
          </Card>

          {timeline.data && timeline.data.length > 0 && (
            <Card>
              <Text style={styles.title}>Progress</Text>
              <StatusTimeline events={timeline.data} />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  heading: { ...typography.h3, color: colors.text },
  title: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  meta: { ...typography.body, color: colors.textMuted },
});
