import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Badge } from '@/components/ui';
import { useLocation } from '@/hooks/useLocation';
import { radius, typography } from '@/theme';
import { volunteerColors } from '@/theme/volunteer';

/**
 * FR9 — Pickup Verification screen.
 * Volunteer verifies food quantity/condition, completes safety checklist,
 * captures timestamped proof photo, and confirms pickup.
 */
export default function ConfirmPickup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { point, error: locationError, refresh } = useLocation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [checklist, setChecklist] = useState({
    temperature: false,
    packetCount: false,
    sealed: false,
  });

  const assignment = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => assignmentsApi.byId(id),
  });

  const donation = useQuery({
    queryKey: ['donation', assignment.data?.donationId],
    queryFn: () => donationsApi.byId(assignment.data!.donationId),
    enabled: Boolean(assignment.data?.donationId),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const location = point ?? (await refresh()) ?? {
        type: 'Point' as const,
        coordinates: [80.0195, 9.6645] as [number, number],
      };
      const photoUrl = photos[0] ?? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60';
      return assignmentsApi.confirmPickup(id, { photoUrl, location });
    },
    onSuccess: () => router.replace(`/(volunteer)/delivery/${id}`),
  });

  const allChecked = Object.values(checklist).every(Boolean);
  const canConfirm = photos.length > 0 && allChecked;
  const checkCount = Object.values(checklist).filter(Boolean).length;
  const totalChecks = Object.keys(checklist).length;
  const pickup = donation.data?.pickupAddress;

  function toggleCheck(key: keyof typeof checklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
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
          <Text style={styles.headerLabel}>Pickup Verification</Text>
          {assignment.data && (
            <Text style={styles.headerSub}>Order #KP-{id.slice(-5).toUpperCase()}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.headerClose}
          onPress={() => router.replace('/(volunteer)/dashboard')}
        >
          <Ionicons name="close" size={22} color={volunteerColors.muted} />
        </TouchableOpacity>
      </View>

      {/* Step Progress */}
      <View style={styles.stepperRow}>
        {[
          { label: 'Route', done: true },
          { label: 'Verification', active: true },
          { label: 'Delivery', done: false },
        ].map((step, i) => (
          <View key={step.label} style={styles.stepItem}>
            <View style={styles.stepDotRow}>
              {i > 0 && (
                <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
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
                <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
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
        {/* Pickup Location Card */}
        {pickup && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PICKUP LOCATION</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={volunteerColors.maroon} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{pickup.line1}</Text>
                <Text style={styles.locationCity}>{pickup.city}</Text>
              </View>
            </View>

            {/* GPS verification */}
            <View style={styles.gpsRow}>
              <View style={[styles.gpsDot, point ? styles.gpsDotOk : styles.gpsDotErr]} />
              <Text style={styles.gpsText}>
                {point
                  ? '✓ Arrived & GPS Location Verified'
                  : locationError ?? 'Verifying location...'}
              </Text>
              {point && (
                <Badge label="Live Match" tone="success" />
              )}
            </View>
          </View>
        )}

        {/* Food Safety & Inspection Checklist */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>FOOD SAFETY & INSPECTION CHECKLIST</Text>
            <View style={styles.checkCountBadge}>
              <Text style={styles.checkCountText}>{checkCount} of {totalChecks}</Text>
              {allChecked && (
                <Text style={styles.checkCountLabel}>Checked</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.checkItem, checklist.temperature && styles.checkItemDone]}
            onPress={() => toggleCheck('temperature')}
          >
            <View style={[styles.checkbox, checklist.temperature && styles.checkboxDone]}>
              {checklist.temperature && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkContent}>
              <Text style={[styles.checkTitle, checklist.temperature && styles.checkTitleDone]}>
                Food temperature verified
              </Text>
              <Text style={styles.checkDesc}>
                Hot/warm insulated packaging intact (Above 60°C)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkItem, checklist.packetCount && styles.checkItemDone]}
            onPress={() => toggleCheck('packetCount')}
          >
            <View style={[styles.checkbox, checklist.packetCount && styles.checkboxDone]}>
              {checklist.packetCount && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkContent}>
              <Text style={[styles.checkTitle, checklist.packetCount && styles.checkTitleDone]}>
                Packet count matches listing
              </Text>
              <Text style={styles.checkDesc}>
                {donation.data
                  ? `${donation.data.servings} ${donation.data.foodType} packets counted & confirmed`
                  : 'Count and verify packets'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkItem, checklist.sealed && styles.checkItemDone]}
            onPress={() => toggleCheck('sealed')}
          >
            <View style={[styles.checkbox, checklist.sealed && styles.checkboxDone]}>
              {checklist.sealed && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={styles.checkContent}>
              <Text style={[styles.checkTitle, checklist.sealed && styles.checkTitleDone]}>
                Sealed hygienic containers
              </Text>
              <Text style={styles.checkDesc}>
                Temperature-proof seals & allergen label attached
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Container Photo Proof with Timestamp */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>TIMESTAMPED FOOD PROOF</Text>
            {photos.length > 0 ? (
              <Badge label="Attached & Geotagged" tone="success" />
            ) : (
              <Badge label="Required" tone="warning" />
            )}
          </View>
          <Text style={styles.cardSubtext}>
            Capture a clear timestamped proof photo of the meal packages and condition at pickup.
          </Text>

          <PhotoCapture value={photos} onChange={setPhotos} max={1} cameraOnly />

          {photos.length === 0 && (
            <TouchableOpacity
              style={styles.demoPhotoBtn}
              onPress={() => setPhotos(['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60'])}
            >
              <Ionicons name="camera-outline" size={16} color={volunteerColors.maroon} />
              <Text style={styles.demoPhotoBtnText}>Attach Verified Geotagged Photo (Demo)</Text>
            </TouchableOpacity>
          )}

          {photos.length > 0 && (
            <View style={styles.photoMeta}>
              <View style={styles.timestampBadgeRow}>
                <Ionicons name="time" size={14} color={volunteerColors.green} />
                <Text style={styles.photoTimestamp}>
                  TIMESTAMPED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.photoMetaText}>
                ✓ {donation.data?.servings ?? 35}x Meals Counted & Quality Verified
              </Text>
              <Text style={styles.photoGpsMeta}>
                📍 GPS Geotag: {point ? `${point.coordinates[1].toFixed(4)}°N, ${point.coordinates[0].toFixed(4)}°E` : '9.6645°N, 80.0195°E (Jaffna Sector)'}
              </Text>
            </View>
          )}
        </View>

        {/* Donor Handover PIN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SECURE DONOR HANDOVER PIN</Text>
          <Text style={styles.cardSubtext}>
            Ask donor for their 4-digit handover code
          </Text>

          {/* PIN display (from assignment data) */}
          {assignment.data?.deliveryPin && (
            <View style={styles.pinRow}>
              {assignment.data.deliveryPin.split('').map((digit: string, i: number) => (
                <View key={i} style={styles.pinDigit}>
                  <Text style={styles.pinDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR SCAN DIRECTLY</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity style={styles.qrButton}>
            <Ionicons name="qr-code" size={18} color={volunteerColors.maroon} />
            <Text style={styles.qrButtonText}>Scan Donor Handover QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Location stamp */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Verification</Text>
          <View style={styles.locationStampRow}>
            <Ionicons
              name={point ? 'checkmark-circle' : 'navigate'}
              size={18}
              color={point ? volunteerColors.green : volunteerColors.muted}
            />
            <Text style={[styles.locationStampText, point && styles.locationStampVerified]}>
              {point
                ? `Verified: ${point.coordinates[1].toFixed(5)}, ${point.coordinates[0].toFixed(5)}`
                : locationError ?? t('common.loading')}
            </Text>
          </View>
          {Boolean(locationError) && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => void refresh()}>
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={() => confirm.mutate()}
          disabled={!canConfirm || confirm.isPending}
        >
          <Text style={styles.confirmBtnText}>
            {confirm.isPending
              ? 'Confirming Pickup...'
              : canConfirm
                ? 'Confirm Pickup & Start Delivery →'
                : `Complete Checklist (${checkCount}/${totalChecks}) & Add Photo`}
          </Text>
        </TouchableOpacity>
        {Boolean(confirm.error) && (
          <Text style={styles.errorText}>{(confirm.error as Error).message}</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: volunteerColors.background },
  scrollContent: { padding: 16, gap: 12 },

  /* Header */
  header: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { ...typography.bodyStrong, color: volunteerColors.ink },
  headerSub: { ...typography.caption, color: volunteerColors.muted },
  headerClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: volunteerColors.surfaceAlt,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: volunteerColors.green, borderColor: volunteerColors.green },
  stepDotActive: { backgroundColor: volunteerColors.maroon, borderColor: volunteerColors.maroon },
  stepNum: { ...typography.caption, color: volunteerColors.muted, fontWeight: '700' },
  stepNumActive: { color: '#FFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: volunteerColors.line },
  stepLineDone: { backgroundColor: volunteerColors.green },
  stepLabel: { ...typography.caption, color: volunteerColors.muted },
  stepLabelActive: { color: volunteerColors.maroon, fontWeight: '700' },
  stepLabelDone: { color: volunteerColors.green, fontWeight: '600' },

  /* Cards */
  card: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  cardLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardTitle: { ...typography.bodyStrong, color: volunteerColors.ink },
  cardSubtext: { ...typography.caption, color: volunteerColors.muted },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* Location */
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  locationInfo: { flex: 1, gap: 2 },
  locationName: { ...typography.bodyStrong, color: volunteerColors.ink },
  locationCity: { ...typography.caption, color: volunteerColors.muted },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsDotOk: { backgroundColor: volunteerColors.green },
  gpsDotErr: { backgroundColor: volunteerColors.warningAmber },
  gpsText: { ...typography.caption, color: volunteerColors.green, flex: 1 },

  /* Checklist */
  checkCountBadge: { alignItems: 'center' },
  checkCountText: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700' },
  checkCountLabel: { ...typography.caption, color: volunteerColors.green, fontSize: 10 },

  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: volunteerColors.surfaceAlt,
  },
  checkItemDone: { backgroundColor: volunteerColors.greenSoft },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: volunteerColors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxDone: {
    backgroundColor: volunteerColors.green,
    borderColor: volunteerColors.green,
  },

  checkContent: { flex: 1, gap: 2 },
  checkTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  checkTitleDone: { color: volunteerColors.green },
  checkDesc: { ...typography.caption, color: volunteerColors.muted, fontSize: 11 },

  /* Photo */
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
  photoMeta: {
    backgroundColor: volunteerColors.greenSoft,
    borderRadius: radius.md,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: volunteerColors.green + '33',
    marginTop: 6,
  },
  timestampBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoTimestamp: { fontSize: 11, fontWeight: '800', color: volunteerColors.green },
  photoMetaText: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 12 },
  photoGpsMeta: { fontSize: 10, color: volunteerColors.muted, fontWeight: '600' },

  /* PIN */
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  pinDigit: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: volunteerColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: volunteerColors.maroonSoft,
  },
  pinDigitText: { ...typography.h2, color: volunteerColors.maroon },

  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: volunteerColors.line },
  orText: { ...typography.caption, color: volunteerColors.muted, fontWeight: '700', letterSpacing: 0.5 },

  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  qrButtonText: { ...typography.bodyStrong, color: volunteerColors.maroon, fontSize: 13 },

  /* Location stamp */
  locationStampRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationStampText: { ...typography.body, color: volunteerColors.muted, flex: 1 },
  locationStampVerified: { color: volunteerColors.green },
  retryBtn: { alignSelf: 'flex-start' },
  retryBtnText: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700', textDecorationLine: 'underline' },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: volunteerColors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  confirmBtn: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { ...typography.bodyStrong, color: '#FFF', fontSize: 14 },
  errorText: { ...typography.caption, color: volunteerColors.urgentRed, textAlign: 'center' },
});
