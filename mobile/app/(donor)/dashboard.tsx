import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DonorOpenRequest } from '@/api/donations.api';
import { DonorDonationCard } from '@/components/donor/DonorDonationCard';
import { DonorShell } from '@/components/donor/DonorShell';
import { RecipientInfoCard } from '@/components/flow/RecipientInfoCard';
import { EmptyState } from '@/components/ui';
import { IN_TRANSIT_STATUSES, TERMINAL_STATUSES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';
import { formatClock } from '@/utils/format';

type Tab = 'all' | 'inTransit' | 'history';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'all', labelKey: 'donor.tabAll' },
  { key: 'inTransit', labelKey: 'donor.tabInTransit' },
  { key: 'history', labelKey: 'donor.tabHistory' },
];

export default function DonorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dashboard = useDonorDashboard();
  const updateDraft = useDonationDraft((state) => state.update);
  const draftTitle = useDonationDraft((state) => state.draft.title);
  const hasDraft = Boolean(draftTitle?.trim());
  const [tab, setTab] = useState<Tab>('all');
  const [selectedRequest, setSelectedRequest] = useState<DonorOpenRequest | null>(null);

  const items = useMemo(() => dashboard.data?.donations ?? [], [dashboard.data]);
  const openRequests = dashboard.data?.openRequests ?? [];
  const needsAction = items.filter((item) => item.awaitingDonorHandover);
  const counts = useMemo(
    () => ({
      all: items.length,
      inTransit: items.filter((item) => IN_TRANSIT_STATUSES.includes(item.status)).length,
      history: items.filter((item) => TERMINAL_STATUSES.includes(item.status)).length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    if (tab === 'inTransit') return items.filter((item) => IN_TRANSIT_STATUSES.includes(item.status));
    if (tab === 'history') return items.filter((item) => TERMINAL_STATUSES.includes(item.status));
    return items;
  }, [items, tab]);

  const donor = dashboard.data?.donor;
  const stats = dashboard.data?.stats;
  const firstName = donor?.firstName ?? user?.name.split(' ')[0] ?? '';

  function openDonation(id: string) {
    router.push(`/(donor)/donation/${id}`);
  }

  function postWithoutRequest() {
    updateDraft({ foodRequestId: undefined, requestSummary: undefined });
    router.push('/(donor)/post-donation/step1-food');
  }

  /** The donor accepts a recipient's request: the wizard is prefilled for that need. */
  function answerRequest(request: DonorOpenRequest) {
    setSelectedRequest(null);
    updateDraft({
      foodRequestId: request.id,
      requestSummary: request,
      servings: request.servingsNeeded,
    });
    router.push('/(donor)/post-donation/step1-food');
  }

  if (dashboard.isPending && !dashboard.data) {
    return (
      <DonorShell active="home">
        <View style={styles.center}>
          <ActivityIndicator color={donorColors.plum} />
        </View>
      </DonorShell>
    );
  }

  return (
    <DonorShell active="home">
      <View style={styles.root}>
        <FlatList
          data={visible}
          keyExtractor={(donation) => donation.id}
          refreshing={dashboard.isFetching}
          onRefresh={() => void dashboard.refetch()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.greetingRow}>
                <View style={styles.greetingCopy}>
                  <Text style={styles.greeting}>{t('donor.greeting', { name: firstName })} 👋</Text>
                  <Text style={styles.subline}>
                    {t('donor.activeInHub', {
                      count: donor?.activeContributions ?? 0,
                      hub: donor?.hub ?? 'Jaffna Hub',
                    })}
                  </Text>
                </View>
                {donor?.isVerified || user?.isVerified ? (
                  <View style={styles.verified}>
                    <Ionicons name="checkmark-circle" size={14} color={donorColors.green} />
                    <Text style={styles.verifiedText}>{t('donor.verifiedDonor')}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.stats}>
                <Stat
                  icon="restaurant-outline"
                  value={stats?.mealsShared ?? 0}
                  label={t('donor.mealsShared')}
                />
                <Stat
                  icon="people-outline"
                  value={stats?.familiesFed ?? 0}
                  label={t('donor.familiesFed')}
                />
                <Stat
                  icon="star"
                  value={stats?.karmaPoints ?? user?.karmaPoints ?? 0}
                  label={t('donor.karmaPts')}
                  tone="karma"
                />
              </View>

              {needsAction.map((item) => (
                <Pressable
                  key={`action-${item.id}`}
                  onPress={() => openDonation(item.id)}
                  style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <View style={styles.actionIcon}>
                    <Ionicons
                      name={item.deliveryMethod === 'self_drop' ? 'car' : 'keypad'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionKicker}>{t('flow.awaitingYou')}</Text>
                    <Text style={styles.actionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.actionBody} numberOfLines={2}>
                      {item.deliveryMethod === 'self_drop'
                        ? t('flow.methodDonorDeliveryHint')
                        : t('flow.methodRecipientPickupHint')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={donorColors.plum} />
                </Pressable>
              ))}

              <View style={styles.needsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{t('donor.needsTitle')}</Text>
                  <Text style={styles.sectionLead}>
                    {openRequests.length
                      ? t('flow.familiesWaiting', { count: openRequests.length })
                      : t('donor.needsLead')}
                  </Text>
                </View>
              </View>
              {openRequests.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.needsRow}
                >
                  {openRequests.map((request) => (
                    <Pressable
                      key={request.id}
                      onPress={() => setSelectedRequest(request)}
                      style={({ pressed }) => [
                        styles.needCard,
                        request.isUrgent && styles.needCardUrgent,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={styles.needTop}>
                        <View style={styles.needAvatar}>
                          <Text style={styles.needAvatarText}>
                            {request.recipientName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {request.isUrgent ? (
                          <View style={styles.urgentTag}>
                            <Ionicons name="flame" size={10} color="#C2410C" />
                            <Text style={styles.urgentTagText}>{t('flow.urgent')}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.needName} numberOfLines={1}>
                        {request.recipientName}
                      </Text>
                      <Text style={styles.needMeals}>
                        {t('donor.needsMeals', { count: request.servingsNeeded })}
                      </Text>
                      <Text style={styles.needMeta} numberOfLines={1}>
                        <Ionicons name="location-outline" size={11} color={donorColors.muted} />{' '}
                        {request.locationLabel}
                      </Text>
                      <Text
                        style={[styles.needMeta, request.isUrgent && styles.needMetaUrgent]}
                        numberOfLines={1}
                      >
                        {t('donor.needsBy', { time: formatClock(request.neededBy) })}
                      </Text>
                      <View style={styles.helpPill}>
                        <Text style={styles.helpPillText}>{t('donor.helpNow')}</Text>
                        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.needsEmpty}>
                  <Ionicons name="heart-outline" size={18} color={donorColors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.needsEmptyTitle}>{t('donor.needsEmpty')}</Text>
                    <Text style={styles.needsEmptyHint}>{t('donor.needsEmptyHint')}</Text>
                  </View>
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                {TABS.map(({ key, labelKey }) => {
                  const active = tab === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setTab(key)}
                      style={[styles.tab, active && styles.tabActive]}
                    >
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                        {t(labelKey)}
                      </Text>
                      <View style={[styles.count, active && styles.countActive]}>
                        <Text style={[styles.countText, active && styles.countTextActive]}>
                          {counts[key]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title={t('common.empty')}
              description={t('donor.emptyDonations')}
              actionLabel={t('donor.postSurplus')}
              onAction={postWithoutRequest}
            />
          }
          renderItem={({ item }) => (
            <DonorDonationCard donation={item} onPress={() => openDonation(item.id)} />
          )}
        />

        <View style={styles.ctaWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={postWithoutRequest}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <View style={styles.plus}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.ctaLabel}>
              {hasDraft ? t('donor.continueDraft') : t('flow.postGeneral')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedRequest(null)} />
        {selectedRequest ? (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('donor.fulfillRequest')}</Text>
            <RecipientInfoCard
              accent={donorColors.plum}
              recipient={{
                name: selectedRequest.recipientName,
                servingsNeeded: selectedRequest.servingsNeeded,
                familySize: selectedRequest.familySize,
                neededBy: selectedRequest.neededBy,
                notes: selectedRequest.notes,
                dietaryRequirements: selectedRequest.dietaryRequirements,
                areaLabel: selectedRequest.locationLabel,
                isUrgent: selectedRequest.isUrgent,
              }}
            />
            <Text style={styles.sheetHint}>{t('flow.adminConfirms')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => answerRequest(selectedRequest)}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Ionicons name="hand-left-outline" size={16} color="#FFFFFF" />
              <Text style={styles.ctaLabel}>{t('flow.answerRequest')}</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </DonorShell>
  );
}

function Stat({
  icon,
  value,
  label,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  tone?: 'default' | 'karma';
}) {
  const karma = tone === 'karma';

  return (
    <View style={[styles.stat, karma && styles.statKarma]}>
      <View style={[styles.statIcon, karma && styles.statIconKarma]}>
        <Ionicons name={icon} size={16} color={karma ? donorColors.orange : '#9A918A'} />
      </View>
      <Text style={[styles.statValue, karma && styles.statValueKarma]}>{value.toLocaleString('en-US')}</Text>
      <Text style={[styles.statLabel, karma && styles.statLabelKarma]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  center: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    flex: 1,
    justifyContent: 'center',
  },
  list: { paddingBottom: 12, paddingHorizontal: 16 },
  separator: { height: 12 },
  headerBlock: { gap: 16, paddingBottom: 16, paddingTop: 4 },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  greetingCopy: { flex: 1, gap: 4 },
  greeting: { color: donorColors.ink, fontSize: 26, fontWeight: '800' },
  subline: { color: donorColors.muted, fontSize: 13 },
  verified: {
    alignItems: 'center',
    backgroundColor: donorColors.greenSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedText: { color: donorColors.green, fontSize: 11, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    alignItems: 'center',
    backgroundColor: donorColors.card,
    borderRadius: 16,
    elevation: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 14,
    shadowColor: '#3A2A22',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statKarma: { backgroundColor: donorColors.orangeSoft },
  statIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginBottom: 4,
    width: 28,
  },
  statIconKarma: { backgroundColor: '#FFE4C2' },
  statValue: { color: donorColors.ink, fontSize: 22, fontWeight: '800' },
  statValueKarma: { color: donorColors.orange },
  statLabel: {
    color: donorColors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statLabelKarma: { color: '#C47A2A' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: donorColors.plum },
  tabLabel: { color: donorColors.muted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#FFFFFF' },
  count: {
    alignItems: 'center',
    backgroundColor: donorColors.badge,
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countText: { color: donorColors.ink, fontSize: 10, fontWeight: '800' },
  countTextActive: { color: '#FFFFFF' },
  ctaWrap: { paddingBottom: 10, paddingHorizontal: 16, paddingTop: 4 },
  cta: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
  plus: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  ctaLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  actionCard: {
    alignItems: 'center',
    backgroundColor: donorColors.orangeSoft,
    borderColor: '#F6D3A1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.orange,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionKicker: {
    color: '#C47A2A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionTitle: { color: donorColors.ink, fontSize: 14, fontWeight: '800', marginTop: 1 },
  actionBody: { color: donorColors.muted, fontSize: 12, marginTop: 2 },
  needsHeader: { alignItems: 'flex-end', flexDirection: 'row', marginBottom: -6 },
  sectionTitle: { color: donorColors.ink, fontSize: 17, fontWeight: '800' },
  sectionLead: { color: donorColors.muted, fontSize: 12, marginTop: 2 },
  needsRow: { gap: 10, paddingRight: 4 },
  needCard: {
    backgroundColor: donorColors.card,
    borderColor: donorColors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
    padding: 12,
    width: 168,
  },
  needCardUrgent: { borderColor: '#FDBA74', backgroundColor: '#FFFBF5' },
  needTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  needAvatar: {
    alignItems: 'center',
    backgroundColor: '#F4E9EC',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginBottom: 6,
    width: 32,
  },
  needAvatarText: { color: donorColors.plum, fontSize: 14, fontWeight: '800' },
  urgentTag: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentTagText: { color: '#C2410C', fontSize: 9, fontWeight: '800' },
  needName: { color: donorColors.ink, fontSize: 14, fontWeight: '800' },
  needMeals: { color: donorColors.plum, fontSize: 13, fontWeight: '700' },
  needMeta: { color: donorColors.muted, fontSize: 11 },
  needMetaUrgent: { color: '#C2410C', fontWeight: '700' },
  helpPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: donorColors.plum,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  needsEmpty: {
    alignItems: 'center',
    backgroundColor: donorColors.card,
    borderColor: donorColors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  needsEmptyTitle: { color: donorColors.ink, fontSize: 13, fontWeight: '700' },
  needsEmptyHint: { color: donorColors.muted, fontSize: 12, marginTop: 2 },
  sheetBackdrop: { backgroundColor: 'rgba(28,22,20,0.45)', flex: 1 },
  sheet: {
    backgroundColor: donorColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 14,
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: donorColors.badge,
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  sheetTitle: { color: donorColors.ink, fontSize: 19, fontWeight: '800' },
  sheetHint: { color: donorColors.muted, fontSize: 12, textAlign: 'center' },
});
