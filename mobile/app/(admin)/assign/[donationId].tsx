import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi, type VolunteerAvailability, type VolunteerSuggestion } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { AdminHeader } from '@/components/AdminHeader';
import { RecipientInfoCard } from '@/components/flow/RecipientInfoCard';
import { SafeTimePill } from '@/components/flow/SafeTimePill';
import {
  DELIVERY_METHODS,
  deliveryMethodMeta,
  methodOfMode,
} from '@/components/flow/deliveryMethods';
import { colors, radius, spacing } from '@/theme';
import type { DeliveryMethod } from '@/types';
import { formatAddress, formatClock, titleCase } from '@/utils/format';

const AVAILABILITY_TONE: Record<VolunteerAvailability, { bg: string; text: string }> = {
  available: { bg: '#E7F6EE', text: '#0F7B4F' },
  busy: { bg: '#FFF4E0', text: '#B45309' },
  off_duty: { bg: '#F3F4F6', text: '#6B7280' },
  out_of_range: { bg: '#FDECEC', text: '#B42318' },
};

export default function AssignVolunteer() {
  const { donationId } = useLocalSearchParams<{ donationId: string }>();
  const { t } = useTranslation();

  const { data: options, isPending } = useQuery({
    queryKey: ['assign', donationId],
    queryFn: () => adminApi.assignmentOptions(donationId),
    enabled: Boolean(donationId),
  });

  const [method, setMethod] = useState<DeliveryMethod>('volunteer_rider');
  useEffect(() => {
    if (options?.deliveryMethod) setMethod(options.deliveryMethod);
  }, [options?.deliveryMethod]);

  const recipient = options?.recipient ?? null;
  const current = options?.currentAssignment ?? null;
  const currentMode = current?.ngoId ? null : (current?.mode ?? (current ? 'volunteer' : null));
  const isApproved = options?.donation.status === 'approved';
  const canChooseMethod = isApproved && !current && Boolean(recipient);
  const showVolunteers =
    Boolean(recipient) &&
    ((current && currentMode === 'volunteer') || (!current && isApproved && method === 'volunteer_rider'));
  const preferred = deliveryMethodMeta(options?.deliveryMethod);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assign', donationId] }),
      queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] }),
      queryClient.invalidateQueries({ queryKey: ['admin.assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['admin.kpis'] }),
      queryClient.invalidateQueries({ queryKey: ['admin.monitor'] }),
      queryClient.invalidateQueries({ queryKey: ['admin.donation', donationId] }),
    ]);
  }

  const link = useMutation({
    mutationFn: (requestId: string) => adminApi.linkRequest(donationId, requestId),
    onSuccess: refresh,
    onError: (error) => Alert.alert(t('flow.linkRecipient'), (error as Error).message),
  });

  const chooseMethod = useMutation({
    mutationFn: (chosen: DeliveryMethod) => adminApi.chooseDeliveryMethod(donationId, chosen),
    async onSuccess(_result, chosen) {
      await refresh();
      Alert.alert(
        t('flow.methodSet'),
        chosen === 'volunteer_rider' ? t('flow.volunteerPick') : t('flow.codesSent'),
      );
    },
    onError: (error) => Alert.alert(t('flow.confirmMethod'), (error as Error).message),
  });

  const assign = useMutation({
    mutationFn: (volunteerId: string) =>
      current
        ? adminApi.reassign(current.id, volunteerId, 'Reassigned by admin')
        : adminApi.assignVolunteer(donationId, volunteerId, recipient?.id),
    async onSuccess() {
      await refresh();
      Alert.alert(
        current ? 'Courier Reassigned' : 'Courier Assigned',
        current
          ? 'The previous volunteer was notified and a new rider was assigned.'
          : 'The volunteer was notified with the food details and pickup location. Codes are sent once they accept.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
    onError(error) {
      Alert.alert('Could not assign volunteer', (error as Error).message);
    },
  });

  const assignNgo = useMutation({
    mutationFn: (ngoId: string) => adminApi.assignToNgo(donationId, ngoId, recipient?.id),
    async onSuccess() {
      await refresh();
      Alert.alert(
        'NGO Assigned',
        'This donation was handed to a partner organisation.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
    onError(error) {
      Alert.alert('Could not assign NGO', (error as Error).message);
    },
  });

  const volunteers = options?.volunteers ?? [];
  const firstAssignable = volunteers.find((item) => item.assignable)?.volunteer.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader showBack onBack={() => router.back()} subtitle="DELIVERY METHOD & DISPATCH" />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>
            {current ? 'Delivery in progress' : t('flow.chooseMethod')}
          </Text>
          {options?.donation ? (
            <>
              <Text style={styles.screenSubheading}>
                {options.donation.title} · {options.donation.servings} servings · ready{' '}
                {formatClock(options.donation.cookedAt) || '—'}
              </Text>
              <View style={styles.headerPills}>
                <SafeTimePill expiresAt={options.donation.expiresAt} />
                {options.isUrgent ? (
                  <View style={styles.urgentPill}>
                    <Ionicons name="flash" size={11} color="#B42318" />
                    <Text style={styles.urgentPillText}>{t('flow.quickCollection')}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>

        {isPending ? <ActivityIndicator color={colors.adminMaroon} /> : null}

        {options && options.donation.status === 'pending_approval' ? (
          <View style={styles.noticeCard}>
            <Ionicons name="hourglass-outline" size={18} color="#B45309" />
            <Text style={styles.noticeText}>
              Approve this donation first, then choose how it reaches the recipient.
            </Text>
          </View>
        ) : null}

        {/* 1. Recipient */}
        {options ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1 · {t('flow.recipientLabel').toUpperCase()}</Text>
            {recipient ? (
              <RecipientInfoCard
                accent={colors.adminMaroon}
                title={recipient.origin === 'claim' ? t('flow.claimedGeneral') : t('flow.forRequest')}
                recipient={{
                  name: recipient.name,
                  servingsNeeded: recipient.servingsNeeded,
                  familySize: recipient.familySize,
                  neededBy: recipient.neededBy,
                  notes: recipient.notes,
                  dietaryRequirements: recipient.dietaryRequirements,
                  areaLabel: `${formatAddress(recipient.dropAddress)} · ${recipient.distanceKm} km`,
                  phone: recipient.phone,
                  origin: recipient.origin,
                }}
              />
            ) : (
              <>
                <View style={styles.noticeCard}>
                  <Ionicons name="people-outline" size={18} color={colors.adminMaroon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{t('flow.noRecipient')}</Text>
                    <Text style={styles.screenSubheading}>{t('flow.noRecipientHint')}</Text>
                  </View>
                </View>
                {(options.requests ?? []).map((req) => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.cardTitle}>
                        {t('flow.servingsNeeded', { count: req.servingsNeeded })}
                        {req.familySize ? ` · ${t('flow.familyOf', { count: req.familySize })}` : ''}
                      </Text>
                      <Text style={styles.screenSubheading}>
                        {formatAddress(req.dropAddress)} · {req.distanceKm} km
                      </Text>
                      <Text style={styles.screenSubheading}>
                        {t('flow.neededBy', { time: formatClock(req.neededBy) })}
                        {req.dietaryRequirements.length
                          ? ` · ${req.dietaryRequirements.map(titleCase).join(', ')}`
                          : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.linkBtn}
                      onPress={() => link.mutate(req.id)}
                      disabled={link.isPending}
                      activeOpacity={0.8}
                    >
                      {link.isPending && link.variables === req.id ? (
                        <ActivityIndicator color={colors.adminMaroon} size="small" />
                      ) : (
                        <Text style={styles.linkBtnText}>{t('flow.linkRecipient')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        ) : null}

        {/* 2. Delivery method */}
        {options && recipient ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2 · {t('flow.chooseMethod').toUpperCase()}</Text>

            {current ? (
              <View style={styles.currentCard}>
                <Ionicons
                  name={
                    current.ngoId
                      ? 'business-outline'
                      : (deliveryMethodMeta(methodOfMode(currentMode))?.icon ?? 'bicycle')
                  }
                  size={20}
                  color={colors.mint}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {current.ngoId
                      ? 'NGO partner delivery'
                      : t(deliveryMethodMeta(methodOfMode(currentMode))?.labelKey ?? 'flow.methodVolunteer')}
                  </Text>
                  <Text style={styles.screenSubheading}>
                    {t(`status.${options.donation.status}`)} · {titleCase(current.status)}
                    {currentMode && currentMode !== 'volunteer' ? ` · ${t('flow.codesSent')}` : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {DELIVERY_METHODS.map((entry) => {
                  const selected = method === entry.method;
                  const isPreferred = preferred?.method === entry.method;
                  return (
                    <TouchableOpacity
                      key={entry.method}
                      style={[styles.methodCard, selected && styles.methodCardOn, !canChooseMethod && { opacity: 0.6 }]}
                      onPress={() => setMethod(entry.method)}
                      disabled={!canChooseMethod}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={[styles.methodIcon, selected && styles.methodIconOn]}>
                        <Ionicons
                          name={entry.icon}
                          size={18}
                          color={selected ? '#FFFFFF' : colors.adminMaroon}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.methodTitleRow}>
                          <Text style={styles.cardTitle}>{t(entry.labelKey)}</Text>
                          {isPreferred ? (
                            <View style={styles.preferBadge}>
                              <Text style={styles.preferBadgeText}>Donor prefers</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.screenSubheading}>{t(entry.hintKey)}</Text>
                      </View>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? colors.adminMaroon : '#C9BFC2'}
                      />
                    </TouchableOpacity>
                  );
                })}

                {canChooseMethod && method !== 'volunteer_rider' ? (
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => chooseMethod.mutate(method)}
                    disabled={chooseMethod.isPending}
                    activeOpacity={0.8}
                  >
                    {chooseMethod.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                        <Text style={styles.assignBtnText}>{t('flow.confirmMethod')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {/* 3. Volunteer selection */}
        {showVolunteers ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3 · {t('flow.volunteerPick').toUpperCase()}</Text>
            <Text style={styles.screenSubheading}>
              Ranked by distance to pickup, availability, vehicle capacity and current load.
            </Text>
            {volunteers.length === 0 ? (
              <Text style={styles.screenSubheading}>
                No verified volunteers nearby. Use an NGO fallback below.
              </Text>
            ) : null}
            {volunteers.map((item) => (
              <VolunteerCard
                key={item.volunteer.id}
                item={item}
                isTop={item.volunteer.id === firstAssignable}
                reassigning={Boolean(current)}
                pending={assign.isPending && assign.variables === item.volunteer.id}
                disabled={assign.isPending || item.volunteer.id === current?.volunteerId}
                onAssign={() => assign.mutate(item.volunteer.id)}
              />
            ))}

            {!current
              ? (options?.ngos ?? []).map((ngo) => (
                  <View key={ngo.id} style={styles.selfDeliveryCard}>
                    <Text style={styles.selfDeliveryTitle}>NGO fallback · {ngo.name}</Text>
                    <Text style={styles.selfDeliveryDesc}>
                      {formatAddress(ngo.address)} · {ngo.distanceKm} km · {ngo.contactPhone}
                    </Text>
                    <TouchableOpacity
                      style={styles.confirmSelfBtn}
                      onPress={() => assignNgo.mutate(ngo.id)}
                      disabled={assignNgo.isPending}
                    >
                      <Text style={styles.confirmSelfText}>Assign to {ngo.name} →</Text>
                    </TouchableOpacity>
                  </View>
                ))
              : null}
          </View>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VolunteerCard({
  item,
  isTop,
  reassigning,
  pending,
  disabled,
  onAssign,
}: {
  item: VolunteerSuggestion;
  isTop: boolean;
  reassigning: boolean;
  pending: boolean;
  disabled: boolean;
  onAssign: () => void;
}) {
  const { t } = useTranslation();
  const tone = AVAILABILITY_TONE[item.availability];
  const availabilityLabel =
    item.availability === 'available'
      ? t('flow.available')
      : item.availability === 'busy'
        ? t('flow.busy', { count: item.activeAssignments })
        : item.availability === 'off_duty'
          ? t('flow.offDuty')
          : t('flow.outOfRange');

  return (
    <View style={[styles.card, isTop && styles.cardTopMatch, !item.assignable && styles.cardMuted]}>
      <View style={styles.cardHeader}>
        {item.volunteer.avatarUrl ? (
          <Image source={{ uri: item.volunteer.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={22} color={colors.mint} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.volName}>{item.volunteer.name}</Text>
            {isTop ? (
              <View style={styles.bestMatchBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                <Text style={styles.bestMatchText}>Best Match ({Math.round(item.score * 100)}%)</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.volVehicle}>
            {titleCase(item.volunteer.vehicleType) || 'Volunteer'} · {item.distanceKm} km ·{' '}
            {t('flow.eta', { minutes: item.etaMinutes })}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statTag, { backgroundColor: tone.bg }]}>
          <View style={[styles.dot, { backgroundColor: tone.text }]} />
          <Text style={[styles.statTagText, { color: tone.text }]}>{availabilityLabel}</Text>
        </View>
        <View style={[styles.statTag, !item.canCarryLoad && { backgroundColor: '#FFF4E0' }]}>
          <Ionicons
            name={item.canCarryLoad ? 'cube-outline' : 'warning-outline'}
            size={12}
            color={item.canCarryLoad ? colors.textMuted : '#B45309'}
          />
          <Text style={styles.statTagText}>
            {item.canCarryLoad ? t('flow.capacity', { count: item.capacityServings }) : t('flow.tooSmall')}
          </Text>
        </View>
        <View style={styles.statTag}>
          <Ionicons name="ribbon-outline" size={12} color={colors.mint} />
          <Text style={styles.statTagText}>{t('flow.deliveries', { count: item.completedDeliveries })}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.assignBtn,
          !isTop && styles.assignBtnSecondary,
          (!item.assignable || disabled) && { opacity: 0.5 },
        ]}
        onPress={onAssign}
        disabled={!item.assignable || disabled}
        activeOpacity={0.8}
      >
        {pending ? (
          <ActivityIndicator color={isTop ? '#FFFFFF' : colors.adminMaroon} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={14} color={isTop ? '#FFFFFF' : colors.adminMaroon} />
            <Text style={[styles.assignBtnText, !isTop && styles.assignBtnTextSecondary]}>
              {!item.assignable
                ? availabilityLabel
                : reassigning
                  ? 'Reassign to this volunteer'
                  : 'Assign & notify volunteer'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: colors.creamBg,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 60,
  },
  headerBlock: {
    marginBottom: spacing.md,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  urgentPill: {
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  urgentPillText: { color: '#B42318', fontSize: 11, fontWeight: '800' },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E4852',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  noticeText: { color: '#92400E', flex: 1, fontSize: 12, fontWeight: '600' },
  requestCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  linkBtn: {
    backgroundColor: '#FBEFF2',
    borderRadius: radius.pill,
    maxWidth: 130,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkBtnText: { color: colors.adminMaroon, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  currentCard: {
    alignItems: 'center',
    backgroundColor: colors.mintLight,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  methodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  methodCardOn: {
    backgroundColor: '#FFFCFC',
    borderColor: colors.adminMaroon,
    borderWidth: 1.5,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: '#FBEFF2',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  methodIconOn: { backgroundColor: colors.adminMaroon },
  methodTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preferBadge: {
    backgroundColor: '#FFF4E0',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  preferBadgeText: { color: '#B45309', fontSize: 9, fontWeight: '800' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopMatch: {
    borderColor: colors.adminMaroon,
    backgroundColor: '#FFFCFC',
  },
  cardMuted: {
    backgroundColor: '#FAFAFA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEE',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.mintLight,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bestMatchBadge: {
    backgroundColor: colors.adminMaroon,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestMatchText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  volVehicle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  statTag: {
    backgroundColor: '#FAF7F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  dot: { borderRadius: 3, height: 6, width: 6 },
  assignBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  assignBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  assignBtnTextSecondary: {
    color: colors.adminMaroon,
  },
  selfDeliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  selfDeliveryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  selfDeliveryDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  confirmSelfBtn: {
    backgroundColor: '#FAF5F5',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  confirmSelfText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
});
