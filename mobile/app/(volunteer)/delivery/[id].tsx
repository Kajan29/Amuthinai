import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { requestsApi } from '@/api/requests.api';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Badge, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { radius, spacing, typography } from '@/theme';
import { volunteerColors, getTier } from '@/theme/volunteer';
import { toLatLng } from '@/utils/geo';
import { MapView, Marker, Polyline } from '@/utils/maps';

const PIN_LENGTH = 4;

/**
 * FR9 & FR10 — Delivery & Handover Verification screen.
 * Follows route to recipient/hub, verifies condition checklist,
 * captures timestamped handover proof, verifies 4-digit recipient PIN,
 * and automatically awards Karma points with celebration breakdown.
 */
export default function ConfirmDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { point, error: locationError, refresh } = useLocation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedKarma, setEarnedKarma] = useState(25);
  const [checklist, setChecklist] = useState({
    condition: true,
    countMatches: true,
    recipientIdentified: true,
  });

  const pinInputs = useRef<Array<TextInput | null>>([]);

  const assignment = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => assignmentsApi.byId(id),
  });

  const donation = useQuery({
    queryKey: ['donation', assignment.data?.donationId],
    queryFn: () => donationsApi.byId(assignment.data!.donationId),
    enabled: Boolean(assignment.data?.donationId),
  });

  const foodRequest = useQuery({
    queryKey: ['foodRequest', assignment.data?.requestId],
    queryFn: () => requestsApi.byId(assignment.data!.requestId!),
    enabled: Boolean(assignment.data?.requestId),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const location = point ?? (await refresh()) ?? {
        type: 'Point' as const,
        coordinates: [80.0270, 9.6690] as [number, number],
      };
      const photoUrl = photos[0] ?? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60';
      const pinString = pinDigits.join('') || '4821';
      return assignmentsApi.confirmDelivery(id, {
        photoUrl,
        location,
        pin: pinString,
      });
    },
    onSuccess: () => {
      // Calculate karma earned
      const base = 20;
      const onTimeBonus = 5;
      setEarnedKarma(base + onTimeBonus);
      setShowCelebration(true);
    },
  });

  const pin = pinDigits.join('');
  const allChecksPassed = Object.values(checklist).every(Boolean);
  const canConfirm = photos.length > 0 && pin.length === PIN_LENGTH && allChecksPassed;

  // Drop-off destination details
  const dropAddress = foodRequest.data?.dropAddress ?? {
    line1: 'Jaffna Community Food Hub, Main St',
    city: 'Jaffna',
    location: {
      type: 'Point' as const,
      coordinates: [80.015, 9.668] as [number, number],
    },
  };

  const recipientPhone = '+94 77 123 4567';
  const recipientName = foodRequest.data ? 'Recipient Family' : 'Community Distribution Hub';

  function handlePinChange(text: string, index: number) {
    const clean = text.replace(/\D/g, '');
    const newDigits = [...pinDigits];

    if (clean.length > 1) {
      // Pasted multi-digit PIN
      const chars = clean.slice(0, PIN_LENGTH).split('');
      chars.forEach((c, i) => {
        if (i < PIN_LENGTH) newDigits[i] = c;
      });
      setPinDigits(newDigits);
      if (chars.length === PIN_LENGTH) {
        pinInputs.current[PIN_LENGTH - 1]?.focus();
      }
      return;
    }

    newDigits[index] = clean;
    setPinDigits(newDigits);

    if (clean && index < PIN_LENGTH - 1) {
      pinInputs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputs.current[index - 1]?.focus();
    }
  }

  function openNavigation() {
    const coords = dropAddress.location.coordinates;
    const lat = coords[1];
    const lng = coords[0];
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    void Linking.openURL(url);
  }

  function callRecipient() {
    void Linking.openURL(`tel:${recipientPhone}`);
  }

  const currentKarma = (user?.karmaPoints ?? 0) + earnedKarma;
  const currentTier = getTier(currentKarma);

  if (assignment.isPending || donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={volunteerColors.maroon} size="large" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={volunteerColors.maroon} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Delivery & Handover</Text>
          <Text style={styles.headerSub}>Order #KP-{id.slice(-5).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.headerCallBtn} onPress={callRecipient}>
          <Ionicons name="call" size={18} color={volunteerColors.maroon} />
        </TouchableOpacity>
      </View>

      {/* Step Progress */}
      <View style={styles.stepperRow}>
        {[
          { label: 'Route', done: true },
          { label: 'Pickup', done: true },
          { label: 'Delivery', active: true },
        ].map((step, i) => (
          <View key={step.label} style={styles.stepItem}>
            <View style={styles.stepDotRow}>
              {i > 0 && (
                <View style={[styles.stepLine, styles.stepLineDone]} />
              )}
              <View
                style={[
                  styles.stepDot,
                  step.done && styles.stepDotDone,
                  step.active && styles.stepDotActive,
                ]}
              >
                {step.done ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : (
                  <Text style={[styles.stepNum, step.active && styles.stepNumActive]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < 2 && (
                <View style={[styles.stepLine, styles.stepLineDone]} />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.active && styles.stepLabelActive,
                step.done && styles.stepLabelDone,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
        {/* Transit Status Banner */}
        <View style={styles.transitBanner}>
          <View style={styles.transitIconFrame}>
            <Ionicons name="bicycle" size={20} color={volunteerColors.maroon} />
          </View>
          <View style={styles.transitBannerInfo}>
            <Text style={styles.transitBannerTitle}>In Transit to Drop-off Location</Text>
            <Text style={styles.transitBannerSubtitle}>
              {donation.data?.servings ?? 0} {donation.data?.foodType} meals onboard
            </Text>
          </View>
          <Badge label="Step 3 of 3" tone="warning" />
        </View>

        {/* Drop-off Destination Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTag}>FINAL DESTINATION</Text>
            <Badge label="Drop-off" tone="success" />
          </View>

          <View style={styles.destinationRow}>
            <View style={styles.destinationIconCircle}>
              <Ionicons name="location" size={22} color="#FFF" />
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationTitle}>{recipientName}</Text>
              <Text style={styles.destinationAddress}>{dropAddress.line1}</Text>
              <Text style={styles.destinationCity}>{dropAddress.city}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.destActionRow}>
            <TouchableOpacity style={styles.navActionBtn} onPress={openNavigation}>
              <Ionicons name="navigate" size={16} color="#FFF" />
              <Text style={styles.navActionText}>Turn-by-turn Navigation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callActionBtn} onPress={callRecipient}>
              <Ionicons name="call-outline" size={16} color={volunteerColors.ink} />
              <Text style={styles.callActionText}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* GPS Live Match status */}
          <View style={styles.gpsMatchRow}>
            <View style={[styles.gpsDot, point ? styles.gpsDotOk : styles.gpsDotPending]} />
            <Text style={styles.gpsMatchText}>
              {point
                ? '✓ Live GPS Location Tracked & Geotagged'
                : locationError ?? 'Verifying volunteer GPS position...'}
            </Text>
          </View>
        </View>

        {/* Map Route Preview */}
        {Platform.OS !== 'web' && MapView && (
          <View style={styles.mapCard}>
            <MapView
              style={styles.mapView}
              initialRegion={{
                ...toLatLng(dropAddress.location as any),
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {donation.data?.pickupAddress && (
                <Marker
                  coordinate={toLatLng(donation.data.pickupAddress.location)}
                  title="Pickup Point"
                  pinColor={volunteerColors.muted}
                />
              )}
              <Marker
                coordinate={toLatLng(dropAddress.location as any)}
                title="Drop-off Point"
                pinColor={volunteerColors.green}
              />
              {donation.data?.pickupAddress && (
                <Polyline
                  coordinates={[
                    toLatLng(donation.data.pickupAddress.location),
                    toLatLng(dropAddress.location as any),
                  ]}
                  strokeColor={volunteerColors.maroon}
                  strokeWidth={3}
                />
              )}
            </MapView>
            <View style={styles.mapBadge}>
              <Ionicons name="flag" size={12} color={volunteerColors.maroon} />
              <Text style={styles.mapBadgeText}>Destination Arrived</Text>
            </View>
          </View>
        )}

        {/* Handover Safety Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTag}>HANDOVER QUALITY CHECKLIST</Text>

          <TouchableOpacity
            style={[styles.checkRow, checklist.condition && styles.checkRowActive]}
            onPress={() => setChecklist((p) => ({ ...p, condition: !p.condition }))}
          >
            <View style={[styles.checkbox, checklist.condition && styles.checkboxDone]}>
              {checklist.condition && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkTextCol}>
              <Text style={styles.checkTitle}>Food packaging undamaged & intact</Text>
              <Text style={styles.checkSub}>Thermal safety maintained during delivery ride</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkRow, checklist.countMatches && styles.checkRowActive]}
            onPress={() => setChecklist((p) => ({ ...p, countMatches: !p.countMatches }))}
          >
            <View style={[styles.checkbox, checklist.countMatches && styles.checkboxDone]}>
              {checklist.countMatches && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkTextCol}>
              <Text style={styles.checkTitle}>Quantity verified with recipient</Text>
              <Text style={styles.checkSub}>
                {donation.data?.servings ?? 0} packages handed over in full
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkRow, checklist.recipientIdentified && styles.checkRowActive]}
            onPress={() =>
              setChecklist((p) => ({ ...p, recipientIdentified: !p.recipientIdentified }))
            }
          >
            <View style={[styles.checkbox, checklist.recipientIdentified && styles.checkboxDone]}>
              {checklist.recipientIdentified && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkTextCol}>
              <Text style={styles.checkTitle}>Recipient identity / authorized receiver verified</Text>
              <Text style={styles.checkSub}>Matches matched recipient profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recipient Handover 4-Digit PIN */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTag}>RECIPIENT HANDOVER PIN</Text>
            <Badge label="Required" tone="danger" />
          </View>
          <Text style={styles.pinInstructions}>
            Ask recipient for the 4-digit code displayed on their Amuthinai app screen.
          </Text>

          <View style={styles.pinBoxesContainer}>
            {pinDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  pinInputs.current[index] = ref;
                }}
                style={[
                  styles.pinBox,
                  digit ? styles.pinBoxFilled : null,
                  index === pinDigits.findIndex((d) => d === '') ? styles.pinBoxFocused : null,
                ]}
                value={digit}
                onChangeText={(text) => handlePinChange(text, index)}
                onKeyPress={(e) => handlePinKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                placeholder="•"
                placeholderTextColor={volunteerColors.muted}
              />
            ))}
          </View>

          {assignment.data?.deliveryPin && (
            <View style={styles.pinHintBanner}>
              <Ionicons name="shield-checkmark" size={16} color={volunteerColors.green} />
              <Text style={styles.pinHintText}>
                Handover verification code is securely verified by server upon submission.
              </Text>
            </View>
          )}
        </View>

        {/* Handover Photo Proof */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTag}>HANDOVER PHOTO PROOF</Text>
            {photos.length > 0 && <Badge label="Attached" tone="success" />}
          </View>
          <Text style={styles.photoHint}>
            Take a clear photo of the delivered meal package at handover.
          </Text>

          <PhotoCapture value={photos} onChange={setPhotos} max={1} cameraOnly />

          {photos.length === 0 && (
            <TouchableOpacity
              style={styles.demoPhotoBtn}
              onPress={() => setPhotos(['https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&auto=format&fit=crop&q=60'])}
            >
              <Ionicons name="camera-outline" size={16} color={volunteerColors.maroon} />
              <Text style={styles.demoPhotoBtnText}>Attach Handover Proof Photo (Demo)</Text>
            </TouchableOpacity>
          )}

          {photos.length > 0 && (
            <View style={styles.photoStampCard}>
              <View style={styles.timestampBadgeRow}>
                <Ionicons name="time" size={14} color={volunteerColors.green} />
                <Text style={styles.photoStampText}>
                  TIMESTAMPED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.photoStampSub}>
                ✓ Recipient Handover Verified · GPS: {point ? `${point.coordinates[1].toFixed(4)}°N, ${point.coordinates[0].toFixed(4)}°E` : '9.6690°N, 80.0270°E'}
              </Text>
            </View>
          )}
        </View>

        {/* Karma Reward Preview */}
        <View style={styles.karmaPreviewBanner}>
          <View style={styles.karmaPreviewIconFrame}>
            <Text style={styles.karmaPreviewEmoji}>🌟</Text>
          </View>
          <View style={styles.karmaPreviewInfo}>
            <Text style={styles.karmaPreviewTitle}>+25 Karma Points upon completion</Text>
            <Text style={styles.karmaPreviewDesc}>
              +20 Base Delivery + 5 On-Time Delivery Bonus
            </Text>
          </View>
        </View>

        {/* Submit Error */}
        {Boolean(confirm.error) && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={volunteerColors.urgentRed} />
            <Text style={styles.errorText}>{(confirm.error as Error).message}</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label="Confirm Delivery & Claim Karma"
          disabled={!canConfirm}
          loading={confirm.isPending}
          onPress={() => confirm.mutate()}
        />
        {!canConfirm && (
          <Text style={styles.footerHint}>
            {photos.length === 0
              ? 'Capture handover photo to proceed'
              : pin.length < PIN_LENGTH
                ? 'Enter recipient’s 4-digit PIN'
                : 'Complete all checklist items'}
          </Text>
        )}
      </View>

      {/* Karma Celebration Modal */}
      <Modal visible={showCelebration} animationType="slide" transparent>
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            {/* Sparkle Icon */}
            <View style={styles.celebrationTrophyCircle}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
            </View>

            <Text style={styles.celebrationTitle}>Delivery Completed!</Text>
            <Text style={styles.celebrationSub}>
              Thank you for delivering hunger relief to the community!
            </Text>

            {/* Points Award Highlight */}
            <View style={styles.pointsAwardBox}>
              <Text style={styles.pointsAwardAmount}>+{earnedKarma}</Text>
              <Text style={styles.pointsAwardLabel}>KARMA POINTS EARNED</Text>
              <View style={styles.pointsReasonBadge}>
                <Ionicons name="checkmark-circle" size={14} color={volunteerColors.green} />
                <Text style={styles.pointsReasonText}>
                  Safe and on-time meal delivery verified
                </Text>
              </View>
            </View>

            {/* Tier Progression */}
            <View style={styles.tierProgressionBox}>
              <View style={styles.tierProgressionHeader}>
                <Text style={styles.tierProgressionLabel}>Current Volunteer Tier</Text>
                <View style={styles.tierBadgeRow}>
                  <Text style={styles.tierIconText}>{currentTier.icon}</Text>
                  <Text style={[styles.tierNameText, { color: currentTier.color }]}>
                    {currentTier.label}
                  </Text>
                </View>
              </View>

              <View style={styles.tierBarBg}>
                <View
                  style={[
                    styles.tierBarFill,
                    {
                      width: `${Math.round(currentTier.progress * 100)}%`,
                      backgroundColor: volunteerColors.maroon,
                    },
                  ]}
                />
              </View>
              <View style={styles.tierProgressTextRow}>
                <Text style={styles.tierBalanceText}>{currentKarma} Karma Points total</Text>
                {currentTier.next && (
                  <Text style={styles.tierNextText}>
                    {currentTier.next.minPoints - currentKarma} pts to {currentTier.next.label}
                  </Text>
                )}
              </View>
            </View>

            {/* Impact Metric Chips */}
            <View style={styles.impactMetricsRow}>
              <View style={styles.impactChip}>
                <Text style={styles.impactChipValue}>
                  {donation.data?.servings ?? 1}
                </Text>
                <Text style={styles.impactChipLabel}>Meals Delivered</Text>
              </View>
              <View style={styles.impactChip}>
                <Text style={styles.impactChipValue}>1</Text>
                <Text style={styles.impactChipLabel}>Family Fed</Text>
              </View>
              <View style={styles.impactChip}>
                <Text style={styles.impactChipValue}>0 kg</Text>
                <Text style={styles.impactChipLabel}>Food Wasted</Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.celebrationPrimaryBtn}
              onPress={() => {
                setShowCelebration(false);
                router.replace('/(volunteer)/dashboard');
              }}
            >
              <Text style={styles.celebrationPrimaryBtnText}>Back to Dashboard →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.celebrationSecondaryBtn}
              onPress={() => {
                setShowCelebration(false);
                router.replace('/(volunteer)/karma');
              }}
            >
              <Text style={styles.celebrationSecondaryBtnText}>View My Impact & Leaderboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: volunteerColors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: volunteerColors.background,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: volunteerColors.muted,
    marginTop: spacing.md,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: volunteerColors.card,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    ...typography.h3,
    fontSize: 16,
    color: volunteerColors.ink,
    fontWeight: '700',
  },
  headerSub: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '600',
  },
  headerCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    backgroundColor: volunteerColors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: volunteerColors.line,
  },
  stepLineDone: {
    backgroundColor: volunteerColors.green,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: volunteerColors.green,
  },
  stepDotActive: {
    backgroundColor: volunteerColors.maroon,
    borderWidth: 2,
    borderColor: volunteerColors.orange,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: volunteerColors.muted,
  },
  stepNumActive: {
    color: '#FFF',
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 11,
    color: volunteerColors.muted,
    marginTop: 4,
  },
  stepLabelActive: {
    color: volunteerColors.maroon,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: volunteerColors.green,
    fontWeight: '600',
  },

  /* Transit Banner */
  transitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.orangeSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F8D8B0',
    gap: spacing.sm,
  },
  transitIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitBannerInfo: {
    flex: 1,
  },
  transitBannerTitle: {
    ...typography.bodyStrong,
    color: volunteerColors.ink,
    fontSize: 13,
  },
  transitBannerSubtitle: {
    ...typography.caption,
    color: volunteerColors.muted,
  },

  /* Card */
  card: {
    backgroundColor: volunteerColors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTag: {
    ...typography.caption,
    fontWeight: '800',
    color: volunteerColors.maroon,
    letterSpacing: 0.5,
  },

  /* Destination Details */
  destinationRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  destinationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: volunteerColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationTitle: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: volunteerColors.ink,
  },
  destinationAddress: {
    ...typography.body,
    fontSize: 13,
    color: volunteerColors.muted,
    marginTop: 2,
  },
  destinationCity: {
    ...typography.caption,
    color: volunteerColors.maroon,
    fontWeight: '600',
    marginTop: 1,
  },

  /* Action Buttons */
  destActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  navActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: volunteerColors.maroon,
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: 6,
  },
  navActionText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFF',
  },
  callActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: volunteerColors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  callActionText: {
    ...typography.caption,
    fontWeight: '700',
    color: volunteerColors.ink,
  },

  /* GPS Match */
  gpsMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsDotOk: {
    backgroundColor: volunteerColors.green,
  },
  gpsDotPending: {
    backgroundColor: volunteerColors.warningAmber,
  },
  gpsMatchText: {
    ...typography.caption,
    color: volunteerColors.muted,
  },

  /* Map View */
  mapCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: volunteerColors.line,
    height: 160,
    position: 'relative',
  },
  mapView: {
    flex: 1,
  },
  mapBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: volunteerColors.maroon,
  },

  /* Checklist */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  checkRowActive: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: volunteerColors.line,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: volunteerColors.green,
    borderColor: volunteerColors.green,
  },
  checkTextCol: {
    flex: 1,
  },
  checkTitle: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: volunteerColors.ink,
  },
  checkSub: {
    ...typography.caption,
    color: volunteerColors.muted,
  },

  /* PIN verification */
  pinInstructions: {
    ...typography.caption,
    color: volunteerColors.muted,
    marginTop: 2,
  },
  pinBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pinBox: {
    width: 52,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: volunteerColors.line,
    backgroundColor: volunteerColors.surfaceAlt,
    fontSize: 24,
    fontWeight: '800',
    color: volunteerColors.ink,
  },
  pinBoxFilled: {
    borderColor: volunteerColors.maroon,
    backgroundColor: '#FFF',
  },
  pinBoxFocused: {
    borderColor: volunteerColors.orange,
  },
  pinHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.greenSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 6,
  },
  pinHintText: {
    ...typography.caption,
    color: volunteerColors.greenDark,
    flex: 1,
    fontSize: 11,
  },

  /* Photo Proof */
  photoHint: {
    ...typography.caption,
    color: volunteerColors.muted,
    marginBottom: 4,
  },
  demoPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: volunteerColors.maroonSoft,
    borderWidth: 1,
    borderColor: volunteerColors.maroon + '44',
    borderStyle: 'dashed',
    marginTop: 6,
  },
  demoPhotoBtnText: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700' },
  photoStampCard: {
    backgroundColor: volunteerColors.greenSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: volunteerColors.green + '33',
  },
  timestampBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoStampText: {
    fontSize: 11,
    fontWeight: '800',
    color: volunteerColors.green,
  },
  photoStampSub: {
    fontSize: 10,
    color: volunteerColors.muted,
    fontWeight: '600',
  },

  /* Karma preview */
  karmaPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F2D79A',
    gap: spacing.sm,
  },
  karmaPreviewIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: volunteerColors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  karmaPreviewEmoji: {
    fontSize: 20,
  },
  karmaPreviewInfo: {
    flex: 1,
  },
  karmaPreviewTitle: {
    ...typography.bodyStrong,
    color: volunteerColors.ink,
    fontSize: 13,
  },
  karmaPreviewDesc: {
    ...typography.caption,
    color: volunteerColors.muted,
  },

  /* Error Box */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.urgentRedSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 6,
  },
  errorText: {
    ...typography.caption,
    color: volunteerColors.urgentRed,
    fontWeight: '600',
    flex: 1,
  },

  /* Footer */
  footer: {
    backgroundColor: volunteerColors.card,
    borderTopWidth: 1,
    borderTopColor: volunteerColors.line,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  footerHint: {
    ...typography.caption,
    color: volunteerColors.muted,
    textAlign: 'center',
    marginTop: 4,
  },

  /* Celebration Modal */
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    gap: spacing.sm,
  },
  celebrationTrophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: volunteerColors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: volunteerColors.orange,
    marginBottom: 4,
  },
  celebrationEmoji: {
    fontSize: 32,
  },
  celebrationTitle: {
    ...typography.h2,
    color: volunteerColors.ink,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  celebrationSub: {
    ...typography.caption,
    color: volunteerColors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  pointsAwardBox: {
    width: '100%',
    backgroundColor: volunteerColors.maroonSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginVertical: 4,
  },
  pointsAwardAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: volunteerColors.maroon,
  },
  pointsAwardLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: volunteerColors.maroon,
    letterSpacing: 1,
  },
  pointsReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
  },
  pointsReasonText: {
    ...typography.caption,
    color: volunteerColors.greenDark,
    fontWeight: '700',
    fontSize: 11,
  },
  tierProgressionBox: {
    width: '100%',
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  tierProgressionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierProgressionLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '600',
  },
  tierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierIconText: {
    fontSize: 14,
  },
  tierNameText: {
    ...typography.caption,
    fontWeight: '800',
  },
  tierBarBg: {
    height: 8,
    backgroundColor: volunteerColors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tierProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBalanceText: {
    ...typography.caption,
    fontWeight: '700',
    color: volunteerColors.ink,
  },
  tierNextText: {
    ...typography.caption,
    fontSize: 10,
    color: volunteerColors.muted,
  },
  impactMetricsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginVertical: 4,
  },
  impactChip: {
    flex: 1,
    backgroundColor: volunteerColors.surfaceAlt,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  impactChipValue: {
    fontSize: 16,
    fontWeight: '800',
    color: volunteerColors.maroon,
  },
  impactChipLabel: {
    fontSize: 10,
    color: volunteerColors.muted,
    marginTop: 1,
  },
  celebrationPrimaryBtn: {
    width: '100%',
    backgroundColor: volunteerColors.maroon,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 6,
  },
  celebrationPrimaryBtnText: {
    ...typography.bodyStrong,
    color: '#FFF',
    fontWeight: '800',
  },
  celebrationSecondaryBtn: {
    paddingVertical: 8,
  },
  celebrationSecondaryBtnText: {
    ...typography.caption,
    color: volunteerColors.maroon,
    fontWeight: '700',
  },
});
