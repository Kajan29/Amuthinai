import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { donationsApi, type DonationAssignmentInfo } from '@/api/donations.api';
import { queryClient } from '@/api/queryClient';
import { ChatLog } from '@/components/ChatLog';
import { DeliveryPinCard } from '@/components/DeliveryPinCard';
import { DonationProgress } from '@/components/flow/DonationProgress';
import { RecipientInfoCard } from '@/components/flow/RecipientInfoCard';
import { deliveryMethodMeta, methodOfMode } from '@/components/flow/deliveryMethods';
import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Card, Screen } from '@/components/ui';
import { IN_TRANSIT_STATUSES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { donorColors } from '@/theme/donor';
import { colors, radius, spacing, typography } from '@/theme';
import type { Address, DonationStatus, GeoPoint } from '@/types';
import { MapView, Marker, Polyline } from '@/utils/maps';

type Pane = 'track' | 'timeline' | 'chat';

function toLatLng(point?: GeoPoint | null) {
  const coords = point?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function interpolate(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  t: number,
) {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * t,
    longitude: start.longitude + (end.longitude - start.longitude) * t,
  };
}

function progressForStatus(status: DonationStatus): number {
  if (status === 'delivered') return 1;
  if (status === 'in_transit') return 0.7;
  if (status === 'picked_up') return 0.45;
  if (status === 'assigned') return 0.18;
  return 0;
}

function addressLine(address?: Address | null) {
  if (!address) return '';
  return [address.line1, address.city, address.district].filter(Boolean).join(', ');
}

/** FR12 — donor tracking: live map like the recipient track screen, plus timeline and chat. */
export default function DonationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pane, setPane] = useState<Pane>('track');

  const donation = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationsApi.byId(id),
    refetchInterval: 20_000,
  });

  const assignment = useQuery({
    queryKey: ['donation', id, 'assignment'],
    queryFn: () => donationsApi.assignment(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const timeline = useQuery({
    queryKey: ['donation', id, 'timeline'],
    queryFn: () => donationsApi.timeline(id),
    enabled: pane === 'timeline',
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

  const item = donation.data;
  const tracking = assignment.data;
  const mode = tracking?.assignment ? (tracking.mode ?? 'volunteer') : null;
  const inPerson = mode === 'recipient_pickup' || mode === 'donor_delivery';
  const method = deliveryMethodMeta(
    mode ? methodOfMode(mode) : (tracking?.deliveryMethod ?? item?.deliveryMethod),
  );
  const methodConfirmed = Boolean(mode) || Boolean(tracking?.deliveryMethodConfirmed);

  async function refreshAll() {
    await Promise.all([
      donation.refetch(),
      assignment.refetch(),
      queryClient.invalidateQueries({ queryKey: ['donor.dashboard'] }),
    ]);
  }
  const pickup =
    toLatLng(tracking?.pickupAddress?.location) ?? toLatLng(item?.pickupAddress?.location);
  const drop = toLatLng(tracking?.dropAddress?.location);
  const latestProof = tracking?.proofs?.[tracking.proofs.length - 1];
  const proofPoint = toLatLng(latestProof?.location);
  const live = Boolean(item && IN_TRANSIT_STATUSES.includes(item.status));

  const volunteerPoint = useMemo(() => {
    if (proofPoint && live) return proofPoint;
    if (pickup && drop) return interpolate(pickup, drop, progressForStatus(item?.status ?? 'pending_approval'));
    if (pickup) {
      return {
        latitude: pickup.latitude + 0.004,
        longitude: pickup.longitude + 0.005,
      };
    }
    return null;
  }, [drop, item?.status, live, pickup, proofPoint]);

  const mapCenter = pickup ?? drop ?? { latitude: 9.6615, longitude: 80.0167 };
  const routePoints = [pickup, volunteerPoint, drop].filter(
    (point): point is { latitude: number; longitude: number } => Boolean(point),
  );

  const mapboxTrackingUrl = getMapboxStaticMapUrl({
    center: mapCenter,
    zoom: 13.5,
    width: 640,
    height: 420,
    auto: routePoints.length > 1,
    markers: [
      pickup ? { ...pickup, label: 'warehouse', color: '5A1626' } : null,
      volunteerPoint && live ? { ...volunteerPoint, label: 'bicycle', color: '0F7B4F' } : null,
      drop ? { ...drop, label: 'home', color: 'F59E0B' } : null,
    ].filter((marker): marker is NonNullable<typeof marker> => Boolean(marker)),
    paths: routePoints.length > 1 ? [{ coordinates: routePoints, strokeColor: '5A1626', strokeWidth: 4 }] : [],
  });

  const etaText = useMemo(() => {
    if (!item) return t('donor.matchingRider');
    if (item.status === 'delivered') return t('donor.deliveredSafe');
    if (item.status === 'in_transit' || item.status === 'picked_up') {
      return tracking?.etaMinutes
        ? t('donor.enRouteRecipient', { minutes: tracking.etaMinutes })
        : t('donor.pickedUp');
    }
    if (item.status === 'assigned' && tracking?.volunteer) {
      return tracking.etaMinutes
        ? t('donor.enRoutePickup', { minutes: tracking.etaMinutes })
        : t('donor.riderOnWay');
    }
    return t('donor.matchingRider');
  }, [item, t, tracking?.etaMinutes, tracking?.volunteer]);

  if (donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{donation.error?.message ?? 'Donation not found'}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: item.title }} />
      <Screen scroll={pane !== 'chat'}>
        <Card>
          <View style={styles.header}>
            <Text style={styles.title}>{item.title}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>
            {item.servings} servings · {item.foodType}
          </Text>
          <UrgentCountdown cookedAt={item.cookedAt} safeForHours={item.safeForHours} />
          <View style={styles.progressWrap}>
            <DonationProgress status={item.status} accent={donorColors.plum} />
          </View>
          {Boolean(item.rejectionReason) && <Text style={styles.error}>{item.rejectionReason}</Text>}
        </Card>

        <View style={styles.tabs}>
          {(['track', 'timeline', 'chat'] as Pane[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setPane(key)}
              style={[styles.tab, pane === key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, pane === key && styles.tabLabelActive]}>
                {key === 'track' ? t('donor.trackTitle') : key === 'timeline' ? 'Status' : 'Messages'}
              </Text>
            </Pressable>
          ))}
        </View>

        {pane === 'track' ? (
          <View style={styles.trackBlock}>
            <View style={styles.mapboxContainer}>
              {Platform.OS !== 'web' && pickup ? (
                <MapView
                  style={styles.trackingMapView}
                  initialRegion={{
                    latitude: mapCenter.latitude,
                    longitude: mapCenter.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {pickup ? (
                    <Marker
                      coordinate={pickup}
                      title={t('donor.startPoint')}
                      description={addressLine(tracking?.pickupAddress ?? item.pickupAddress)}
                      pinColor="#5A1626"
                    />
                  ) : null}
                  {volunteerPoint && (live || tracking?.volunteer) ? (
                    <Marker
                      coordinate={volunteerPoint}
                      title={tracking?.volunteer?.name || t('donor.waitingVolunteer')}
                      description={t('donor.volunteerNow')}
                      pinColor="#0F7B4F"
                    />
                  ) : null}
                  {drop ? (
                    <Marker
                      coordinate={drop}
                      title={t('donor.destination')}
                      description={addressLine(tracking?.dropAddress)}
                      pinColor="#F59E0B"
                    />
                  ) : null}
                  {routePoints.length > 1 ? (
                    <Polyline coordinates={routePoints} strokeColor="#5A1626" strokeWidth={4} />
                  ) : null}
                </MapView>
              ) : (
                <MapboxStaticImage uri={mapboxTrackingUrl} style={styles.mapboxImage} />
              )}

              <View style={styles.mapEtaFloatingPill}>
                <View style={[styles.greenPulseDot, !live && { backgroundColor: '#10B981' }]} />
                <Text style={styles.mapEtaText}>{etaText}</Text>
              </View>
            </View>

            <View style={styles.methodCard}>
              <View style={styles.methodIcon}>
                <Ionicons name={method?.icon ?? 'help-outline'} size={18} color={donorColors.plum} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.endpointLabel}>{t('flow.deliveredHow')}</Text>
                <Text style={styles.methodTitle}>
                  {method ? t(method.labelKey) : t('flow.methodPending')}
                </Text>
                <Text style={styles.methodHint}>
                  {methodConfirmed && method ? t(method.hintKey) : t('flow.adminConfirms')}
                </Text>
              </View>
            </View>

            {tracking?.recipient ? (
              <RecipientInfoCard
                accent={donorColors.plum}
                recipient={{
                  name: tracking.recipient.name,
                  servingsNeeded: tracking.recipient.servingsNeeded,
                  familySize: tracking.recipient.familySize,
                  neededBy: tracking.recipient.neededBy,
                  notes: tracking.recipient.notes,
                  dietaryRequirements: tracking.recipient.dietaryRequirements,
                  areaLabel: tracking.recipient.areaLabel,
                  phone: tracking.recipient.phone,
                  origin: tracking.recipient.origin,
                }}
              />
            ) : item.status === 'pending_approval' || item.status === 'approved' ? (
              <View style={styles.methodCard}>
                <View style={styles.methodIcon}>
                  <Ionicons name="people-outline" size={18} color={donorColors.plum} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodTitle}>{t('flow.awaitingClaim')}</Text>
                  <Text style={styles.methodHint}>{t('flow.generalHint')}</Text>
                </View>
              </View>
            ) : null}

            {inPerson && tracking ? (
              <DonorHandoverPanel
                info={tracking}
                recipientName={tracking.recipient?.name ?? t('flow.recipientLabel')}
                onDone={refreshAll}
              />
            ) : null}

            {!inPerson ? (
            <View style={styles.volunteerInfoCard}>
              <View style={styles.volunteerAvatarWrap}>
                <Text style={styles.volunteerAvatarInitial}>
                  {tracking?.volunteer?.name?.[0] || 'V'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.volunteerName}>
                    {tracking?.volunteer?.name || t('donor.waitingVolunteer')}
                  </Text>
                  {tracking?.volunteer ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#0F7B4F" />
                      <Text style={styles.verifiedText}>{t('donor.verifiedDonor')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.volunteerVehicle}>
                  {tracking?.volunteer?.vehicleType || t('donor.matchingRider')}
                  {tracking?.routeKm != null ? ` • ${tracking.routeKm.toFixed(1)} km` : ''}
                </Text>
              </View>
              {tracking?.volunteer?.phone ? (
                <Pressable
                  style={styles.callVolunteerBtn}
                  onPress={() => void Linking.openURL(`tel:${tracking.volunteer!.phone}`)}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
            ) : null}

            <DeliveryPinCard
              pin={tracking?.pickupPin}
              label={t('donor.pickupPin')}
              hint={t('donor.pickupPinHint')}
            />

            <View style={styles.endpointsCard}>
              <Endpoint
                color="#5A1626"
                label={t('donor.startPoint')}
                value={addressLine(tracking?.pickupAddress ?? item.pickupAddress) || t('donor.noMapYet')}
              />
              <View style={styles.endpointLine} />
              {!inPerson ? (
                <>
                  <Endpoint
                    color="#0F7B4F"
                    label={t('donor.volunteerNow')}
                    value={
                      tracking?.volunteer
                        ? t('donor.volunteerAway', {
                            name: tracking.volunteer.name,
                            minutes: tracking.etaMinutes ?? 0,
                          })
                        : t('donor.waitingVolunteer')
                    }
                  />
                  <View style={styles.endpointLine} />
                </>
              ) : null}
              <Endpoint
                color="#F59E0B"
                label={t('donor.destination')}
                value={
                  addressLine(tracking?.dropAddress) ||
                  (mode === 'recipient_pickup'
                    ? t('flow.methodRecipientPickup')
                    : tracking?.recipient?.areaLabel || t('donor.matchingRider'))
                }
              />
            </View>

            {tracking?.proofs?.length ? (
              <View style={styles.proofsCard}>
                <Text style={styles.proofsTitle}>{t('donor.proofsTitle')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proofRow}>
                  {tracking.proofs.map((proof) => (
                    <View key={proof.id} style={styles.proofSlot}>
                      {proof.photoUrl ? (
                        <Image source={{ uri: proof.photoUrl }} style={styles.proofImage} />
                      ) : (
                        <View style={[styles.proofImage, styles.proofVerified]}>
                          <Ionicons name="shield-checkmark" size={26} color={donorColors.green} />
                        </View>
                      )}
                      <Text style={styles.proofLabel}>
                        {proof.stage}
                        {proof.pinVerified ? ' · ✓' : ''}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {pane === 'timeline' ? <StatusTimeline events={timeline.data ?? []} /> : null}

        {pane === 'chat' ? (
          <ChatLog
            messages={messages.data ?? []}
            currentUserId={user?.id ?? ''}
            onSend={async (body) => {
              await sendMessage.mutateAsync(body);
            }}
          />
        ) : null}

        {timeline.isPending && pane === 'timeline' ? (
          <Text style={styles.meta}>{t('common.loading')}</Text>
        ) : null}
      </Screen>
    </>
  );
}

/**
 * Recipient self-pickup and donor self-delivery: the donor confirms the handover by typing
 * the recipient's code. For self-delivery they first mark that they have set off.
 */
function DonorHandoverPanel({
  info,
  recipientName,
  onDone,
}: {
  info: DonationAssignmentInfo;
  recipientName: string;
  onDone: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const assignmentId = info.assignment?.id ?? '';
  const delivering = info.mode === 'donor_delivery';

  const depart = useMutation({
    mutationFn: () => donationsApi.depart(assignmentId),
    onSuccess: onDone,
    onError: (error) => Alert.alert(t('flow.departTitle'), (error as Error).message),
  });

  const confirm = useMutation({
    mutationFn: () => donationsApi.confirmHandover(assignmentId, { pin: code }),
    async onSuccess() {
      setCode('');
      Alert.alert(t('flow.handoverDone'), t('flow.handoverDoneBody'));
      await onDone();
    },
    onError: (error) => Alert.alert(t('flow.handoverTitle'), (error as Error).message),
  });

  if (info.assignment?.status === 'completed') {
    return (
      <View style={[styles.handoverCard, styles.handoverDone]}>
        <Ionicons name="checkmark-circle" size={22} color={donorColors.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.methodTitle}>{t('flow.handoverDone')}</Text>
          <Text style={styles.methodHint}>{t('flow.verificationRequired')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.handoverCard}>
      {info.canDepart ? (
        <View style={styles.departBlock}>
          <Text style={styles.methodTitle}>{t('flow.departTitle')}</Text>
          <Text style={styles.methodHint}>{t('flow.departLead', { name: recipientName })}</Text>
          <Pressable
            onPress={() => depart.mutate()}
            disabled={depart.isPending}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            {depart.isPending ? (
              <ActivityIndicator color={donorColors.plum} />
            ) : (
              <>
                <Ionicons name="car" size={16} color={donorColors.plum} />
                <Text style={styles.secondaryBtnText}>{t('flow.departButton')}</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
          <Ionicons name="keypad" size={16} color={donorColors.orange} />
          <Text style={styles.methodTitle}>{t('flow.handoverTitle')}</Text>
        </View>
        <Text style={styles.methodHint}>
          {delivering
            ? t('flow.handoverLeadDelivery', { name: recipientName })
            : t('flow.handoverLeadPickup', { name: recipientName })}
        </Text>
      </View>
      <TextInput
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t('flow.handoverCodePlaceholder')}
        placeholderTextColor="#B3AAA3"
        style={styles.codeInput}
        accessibilityLabel={t('flow.handoverCodePlaceholder')}
      />
      <Pressable
        onPress={() => confirm.mutate()}
        disabled={code.length !== 4 || confirm.isPending || !info.canConfirmHandover}
        style={({ pressed }) => [
          styles.primaryBtn,
          (code.length !== 4 || !info.canConfirmHandover) && { opacity: 0.45 },
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
      >
        {confirm.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{t('flow.handoverConfirm')}</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.handoverFoot}>{t('flow.verificationRequired')}</Text>
    </View>
  );
}

function Endpoint({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.endpointRow}>
      <View style={[styles.endpointDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.endpointLabel}>{label}</Text>
        <Text style={styles.endpointValue}>{value}</Text>
      </View>
    </View>
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
  trackBlock: { gap: 12 },
  mapboxContainer: {
    backgroundColor: '#E4EFF5',
    borderRadius: 18,
    height: 220,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  trackingMapView: { height: '100%', width: '100%' },
  mapboxImage: { height: '100%', width: '100%' },
  mapEtaFloatingPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 20, 16, 0.88)',
    borderRadius: 12,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
    right: 12,
  },
  greenPulseDot: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  mapEtaText: { color: '#FFFFFF', flex: 1, fontSize: 12, fontWeight: '700' },
  volunteerInfoCard: {
    alignItems: 'center',
    backgroundColor: '#FDF7F8',
    borderColor: '#F8DCE2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  volunteerAvatarWrap: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  volunteerAvatarInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  volunteerName: { color: '#1A1A1A', fontSize: 14, fontWeight: '800' },
  volunteerVehicle: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  verifiedBadge: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  verifiedText: { color: '#0F7B4F', fontSize: 11, fontWeight: '700' },
  callVolunteerBtn: {
    alignItems: 'center',
    backgroundColor: '#0F7B4F',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  endpointsCard: {
    backgroundColor: '#FDFBF9',
    borderColor: '#ECE7E1',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  endpointRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  endpointDot: { borderRadius: 5, height: 10, marginTop: 4, width: 10 },
  endpointLine: { backgroundColor: '#E5E7EB', height: 16, marginLeft: 4, width: 2 },
  endpointLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  endpointValue: { color: '#1F2937', fontSize: 13, fontWeight: '600', marginTop: 2 },
  proofsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  proofsTitle: { color: donorColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 10 },
  proofRow: { gap: 10 },
  proofSlot: { width: 110 },
  proofImage: { borderRadius: 10, height: 80, width: 110 },
  proofLabel: { color: donorColors.muted, fontSize: 11, marginTop: 6, textTransform: 'capitalize' },
  proofVerified: { alignItems: 'center', backgroundColor: donorColors.greenSoft, justifyContent: 'center' },
  progressWrap: { marginTop: 14 },
  methodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: '#F4E9EC',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  methodTitle: { color: donorColors.ink, fontSize: 14, fontWeight: '800' },
  methodHint: { color: donorColors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  handoverCard: {
    backgroundColor: donorColors.orangeSoft,
    borderColor: '#F6D3A1',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  handoverDone: {
    alignItems: 'center',
    backgroundColor: donorColors.greenSoft,
    borderColor: '#BFE6CF',
    flexDirection: 'row',
  },
  departBlock: {
    borderBottomColor: '#F6D3A1',
    borderBottomWidth: 1,
    gap: 6,
    paddingBottom: 12,
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D2A8',
    borderRadius: 14,
    borderWidth: 1,
    color: donorColors.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    paddingVertical: 12,
    textAlign: 'center',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: donorColors.plum,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  secondaryBtnText: { color: donorColors.plum, fontSize: 13, fontWeight: '800' },
  handoverFoot: { color: '#9A6B3A', fontSize: 11, textAlign: 'center' },
});
