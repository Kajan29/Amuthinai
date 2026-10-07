import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { logo } from '@/constants';
import { useLocation } from '@/hooks/useLocation';

export default function ConfirmPickup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { point } = useLocation();

  const [checklist, setChecklist] = useState({
    temperature: true,
    packetCount: true,
    sealed: true,
  });

  const pinDigits = ['4', '9', '1', '2'];

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
      const location = point ?? {
        type: 'Point' as const,
        coordinates: [80.0290, 9.6740] as [number, number],
      };
      return assignmentsApi.confirmPickup(id, {
        photoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
        location,
      });
    },
    onSuccess: () => {
      router.push(`/(volunteer)/delivery/${id}`);
    },
  });

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  function toggleCheck(key: keyof typeof checklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleRetakePhoto() {
    Alert.alert('Camera Attached', 'Photo proof timestamped and validated with location tag.');
  }

  function handleScanQR() {
    Alert.alert('Donor QR Scanner', 'Scanning donor proof QR code. PIN verified: 4912');
  }

  const orderId = 'KP-84920';
  const pickupLocationName = donation.data?.pickupAddress?.line1 || 'Nallur Community Hall';
  const pickupAddressLine = donation.data?.pickupAddress?.city || 'Block 4B, South Gate Entrance, Jaffna';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── SCREEN 3: TOP HEADER BAR ─── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circularHeaderButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Pickup Verification</Text>
          <Text style={styles.headerSubtitle}>Order #{orderId}</Text>
        </View>

        <TouchableOpacity
          style={styles.circularHeaderButton}
          onPress={() => router.replace('/(volunteer)/dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 3-STEP PROGRESS STEPPER ─── */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperLineRow}>
            {/* Step 1: Route (Done - Teal Checkmark) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleDone}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelDone}>Route</Text>
            </View>

            {/* Connecting Line: Step 1 -> Step 2 (Maroon) */}
            <View style={styles.stepLineMaroon} />

            {/* Step 2: Verification (Active - Maroon 2) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleActive}>
                <Text style={styles.stepNumActive}>2</Text>
              </View>
              <Text style={styles.stepLabelActive}>Verification</Text>
            </View>

            {/* Connecting Line: Step 2 -> Step 3 (Gray) */}
            <View style={styles.stepLineGray} />

            {/* Step 3: Delivery (Inactive) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleInactive}>
                <Text style={styles.stepNumInactive}>3</Text>
              </View>
              <Text style={styles.stepLabelInactive}>Delivery</Text>
            </View>
          </View>
        </View>

        {/* ─── PICKUP LOCATION CARD ─── */}
        <View style={styles.locationCard}>
          <View style={styles.locationTopRow}>
            <View style={styles.locationPinBox}>
              <Ionicons name="location-outline" size={20} color="#0D9488" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationSubLabel}>PICKUP LOCATION</Text>
              <Text style={styles.locationTitle}>{pickupLocationName}</Text>
              <Text style={styles.locationAddress}>{pickupAddressLine}</Text>
            </View>
          </View>

          <View style={styles.locationStatusRow}>
            <View style={styles.gpsMatchGroup}>
              <Ionicons name="checkmark-circle" size={15} color="#0F766E" />
              <Text style={styles.gpsMatchText}>Arrived & GPS Location Verified</Text>
            </View>
            <View style={styles.liveMatchBadge}>
              <Text style={styles.liveMatchText}>Live Match</Text>
            </View>
          </View>
        </View>

        {/* ─── FOOD SAFETY & INSPECTION CHECKLIST ─── */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeaderRow}>
            <View style={styles.checklistTitleRow}>
              <View style={styles.checklistDot} />
              <Text style={styles.checklistTitle}>FOOD SAFETY & INSPECTION CHECKLIST</Text>
            </View>
            <View style={styles.checklistCountPill}>
              <Text style={styles.checklistCountText}>
                {checkedCount} of {totalCount} Checked
              </Text>
            </View>
          </View>

          <View style={styles.checklistItemsList}>
            {/* Item 1 */}
            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleCheck('temperature')}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxBox, checklist.temperature && styles.checkboxBoxChecked]}>
                {checklist.temperature && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.checkTextCol}>
                <Text style={styles.checkItemTitle}>Food temperature verified</Text>
                <Text style={styles.checkItemSubtitle}>Hot/warm insulated packaging intact (Above 60°C)</Text>
              </View>
            </TouchableOpacity>

            {/* Item 2 */}
            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleCheck('packetCount')}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxBox, checklist.packetCount && styles.checkboxBoxChecked]}>
                {checklist.packetCount && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.checkTextCol}>
                <Text style={styles.checkItemTitle}>Packet count matches listing</Text>
                <Text style={styles.checkItemSubtitle}>25 fresh veg meal packets counted & confirmed</Text>
              </View>
            </TouchableOpacity>

            {/* Item 3 */}
            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleCheck('sealed')}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxBox, checklist.sealed && styles.checkboxBoxChecked]}>
                {checklist.sealed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.checkTextCol}>
                <Text style={styles.checkItemTitle}>Sealed hygienic containers</Text>
                <Text style={styles.checkItemSubtitle}>Tamper-proof seals & allergen label attached</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CONTAINER PHOTO PROOF CARD ─── */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeaderRow}>
            <Text style={styles.proofTitle}>CONTAINER PHOTO PROOF</Text>
            <View style={styles.attachedPill}>
              <Text style={styles.attachedText}>Attached</Text>
            </View>
          </View>

          <View style={styles.proofPhotoBox}>
            <View style={styles.proofBoxIconFrame}>
              <Ionicons name="cube-outline" size={32} color="#78350F" />
            </View>
            <Text style={styles.proofBoxTitle}>25x Stacked Meal Containers</Text>
            <Text style={styles.proofBoxSubtitle}>Captured at 09:38 AM • Hall Counter 2</Text>

            <TouchableOpacity
              style={styles.retakePhotoButton}
              onPress={handleRetakePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={14} color="#1F2937" />
              <Text style={styles.retakePhotoText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SECURE DONOR HANDOVER PIN CARD ─── */}
        <View style={styles.pinCard}>
          <View style={styles.pinHeaderRow}>
            <Text style={styles.pinTitle}>SECURE DONOR HANDOVER PIN</Text>
            <Ionicons name="lock-closed-outline" size={16} color="#701A2B" />
          </View>
          <Text style={styles.pinSubtitle}>Ask donor for their 4-digit handover code</Text>

          {/* 4 Digit Boxes: 4 - 9 - 1 - 2 */}
          <View style={styles.pinBoxesRow}>
            {pinDigits.map((digit, idx) => (
              <View key={idx} style={styles.pinBox}>
                <Text style={styles.pinDigitText}>{digit}</Text>
              </View>
            ))}
          </View>

          {/* Divider with text */}
          <View style={styles.pinDividerRow}>
            <View style={styles.pinDividerLine} />
            <Text style={styles.pinDividerText}>OR SCAN DIRECTLY</Text>
            <View style={styles.pinDividerLine} />
          </View>

          {/* Scan QR Code Outline Button */}
          <TouchableOpacity
            style={styles.scanQRButton}
            onPress={handleScanQR}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={17} color="#0D9488" />
            <Text style={styles.scanQRButtonText}>Scan Donor Handover QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* ─── CONFIRM PICKUP ACTION ─── */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => confirm.mutate()}
          disabled={confirm.isPending}
          activeOpacity={0.85}
        >
          {confirm.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Pickup & Start Delivery →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickupConcernButton}
          onPress={() =>
            router.push({
              pathname: '/(volunteer)/raise-concern',
              params: { assignmentId: id },
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.pickupConcernText}>Issue at Pickup Point? Raise Concern / Delay</Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },

  /* ─── TOP HEADER BAR ─── */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
  },
  circularHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE6DE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLogo: {
    width: 95,
    height: 24,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5A1626',
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 1,
  },

  /* ─── SCROLLABLE CONTENT ─── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* ─── 3-STEP STEPPER ─── */
  stepperContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  stepperItem: {
    alignItems: 'center',
  },
  stepCircleDone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabelDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    marginTop: 5,
  },
  stepLineMaroon: {
    flex: 1,
    height: 2,
    backgroundColor: '#5A1626',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepCircleActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  stepNumActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabelActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A1626',
    marginTop: 5,
  },
  stepCircleInactive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepLabelInactive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 5,
  },
  stepLineGray: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    marginBottom: 16,
  },

  /* ─── LOCATION CARD ─── */
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  locationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationPinBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDetails: {
    flex: 1,
  },
  locationSubLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 1,
  },
  locationAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
  },
  gpsMatchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsMatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  liveMatchBadge: {
    backgroundColor: '#D1F0E4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveMatchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },

  /* ─── CHECKLIST CARD ─── */
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  checklistDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#701A2B',
  },
  checklistTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  checklistCountPill: {
    backgroundColor: '#FCE8EE',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  checklistCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#701A2B',
  },
  checklistItemsList: {
    gap: 10,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7DF',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: '#5A1626',
    borderColor: '#5A1626',
  },
  checkTextCol: {
    flex: 1,
  },
  checkItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  checkItemSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  /* ─── CONTAINER PHOTO PROOF CARD ─── */
  proofCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  proofHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  proofTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  attachedPill: {
    backgroundColor: '#D1F0E4',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  attachedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  proofPhotoBox: {
    backgroundColor: '#FEF8EE',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  proofBoxIconFrame: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  proofBoxTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#78350F',
  },
  proofBoxSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    marginBottom: 10,
  },
  retakePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  retakePhotoText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F2937',
  },

  /* ─── SECURE DONOR HANDOVER PIN CARD ─── */
  pinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  pinSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 3,
    marginBottom: 14,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  pinBox: {
    width: 60,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5A1626',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pinDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5A1626',
  },
  pinDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  pinDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  pinDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  scanQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  scanQRButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },

  /* ─── CONFIRM BUTTON ─── */
  confirmButton: {
    backgroundColor: '#5A1626',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pickupConcernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#F8B4C0',
    borderRadius: 14,
  },
  pickupConcernText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
