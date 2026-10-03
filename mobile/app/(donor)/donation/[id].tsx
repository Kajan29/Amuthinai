import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { donationsApi } from '@/api/donations.api';
import { ChatLog } from '@/components/ChatLog';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Card, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, typography } from '@/theme';

type Pane = 'timeline' | 'chat';

/** FR12 — donor's view of a single donation: status trail plus the conversation log. */
export default function DonationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pane, setPane] = useState<Pane>('timeline');

  const donation = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationsApi.byId(id),
  });

  const timeline = useQuery({
    queryKey: ['donation', id, 'timeline'],
    queryFn: () => donationsApi.timeline(id),
  });

  const messages = useQuery({
    queryKey: ['donation', id, 'messages'],
    queryFn: () => donationsApi.messages(id),
    enabled: pane === 'chat',
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => donationsApi.sendMessage(id, body),
    onSuccess: () => messages.refetch(),
  });

  if (donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!donation.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{donation.error?.message ?? 'Donation not found'}</Text>
      </View>
    );
  }

  const item = donation.data;

  return (
    <>
      <Stack.Screen options={{ title: item.title }} />
      <Screen scroll={pane === 'timeline'}>
        <Card>
          <View style={styles.header}>
            <Text style={styles.title}>{item.title}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>
            {item.servings} servings · {item.foodType}
          </Text>
          <UrgentCountdown cookedAt={item.cookedAt} safeForHours={item.safeForHours} />
          {Boolean(item.rejectionReason) && (
            <Text style={styles.error}>{item.rejectionReason}</Text>
          )}
        </Card>

        <View style={styles.tabs}>
          {(['timeline', 'chat'] as Pane[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setPane(key)}
              style={[styles.tab, pane === key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, pane === key && styles.tabLabelActive]}>
                {key === 'timeline' ? 'Status' : 'Messages'}
              </Text>
            </Pressable>
          ))}
        </View>

        {pane === 'timeline' ? (
          <StatusTimeline events={timeline.data ?? []} />
        ) : (
          <ChatLog
            messages={messages.data ?? []}
            currentUserId={user?.id ?? ''}
            onSend={async (body) => {
              await sendMessage.mutateAsync(body);
            }}
          />
        )}

        {timeline.isPending && pane === 'timeline' && (
          <Text style={styles.meta}>{t('common.loading')}</Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
  tabs: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  tab: { borderRadius: radius.sm, flex: 1, paddingVertical: spacing.sm },
  tabActive: { backgroundColor: colors.primaryLight },
  tabLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  tabLabelActive: { color: colors.primaryDark, fontWeight: '600' },
});
