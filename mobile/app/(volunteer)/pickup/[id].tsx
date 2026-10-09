import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { assignmentsApi } from '@/api/assignments.api';
import { logo } from '@/constants';
import { useLocation } from '@/hooks/useLocation';
import { cloudinaryService } from '@/services/cloudinary';
import { distanceKm } from '@/utils/geo';

/** Further than this from the pickup and the GPS check is shown as a warning. */
const ARRIVAL_RADIUS_KM = 0.5;

const UNIT_LABEL: Record<string, string> = {
  packets: 'packets',
  kg: 'kg',
  pieces: 'pieces',
  litres: 'litres',
  portions: 'portions',
};

export default function ConfirmPickup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const location = useLocation();
  const pinInputRef = useRef<TextInput>(null);

  const [checklist, setChecklist] = useState({
    temperature: false,
    packetCount: false,
    sealed: false,
  });

  const [pickupPhotoUrl, setPickupPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  const task = useQuery({
    queryKey: ['task', id],
    queryFn: () => assignmentsApi.details(id),
    enabled: Boolean(id),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const point = location.point ?? (await location.refresh());
      if (!point) throw new Error('Turn on location so we can stamp where the pickup happened.');
      if (!pickupPhotoUrl) throw new Error('Take a photo of the food containers first.');
      if (pin.length !== 4) throw new Error('Enter the 4-digit PIN from the donor.');
      return assignmentsApi.confirmPickup(id, {
        photoUrl: pickupPhotoUrl,
        location: point,
        pin,
        quantityConfirmed: task.data?.donation.servings,
      });
    },
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['volunteer.nearby'] }),
      ]);
      router.replace(`/(volunteer)/delivery/${id}`);
    },
    onError(error) {
      Alert.alert('Pickup not confirmed', (error as Error).message);
    },
  });

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  function toggleCheck(key: keyof typeof checklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCapturePhoto(source: 'camera' | 'gallery') {
    try {
      const uri = await cloudinaryService.pickOrCapture(source);
      if (!uri) return;

      setIsUploadingPhoto(true);
      const result = await cloudinaryService.uploadImage(uri, 'amuthinai/pickup-proof');
      setPickupPhotoUrl(result.url);
      setPhotoCapturedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload image to Cloudinary.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  if (task.isPending) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#5A1626" size="large" />
      </SafeAreaView>
    );
  }

  if (task.isError || !task.data) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#5A1626" />
        <Text style={styles.locationTitle}>
          {(task.error as Error | null)?.message ?? 'Task not found'}
        </Text>
        <TouchableOpacity style={styles.pickupConcernButton} onPress={() => router.back()}>
          <Text style={styles.pickupConcernText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { donation, donor } = task.data;
  const alreadyCollected = donation.status === 'picked_up' || donation.status === 'in_transit';

  const orderId = task.data.assignment.id.slice(-6).toUpperCase();
  const pickupLocationName = donation.pickupAddress.line1;
  const pickupAddressLine = [donation.pickupAddress.city, donation.pickupAddress.district]
    .filter(Boolean)
    .join(', ');
  const quantityLabel = `${donation.servings} ${UNIT_LABEL[donation.quantityUnit ?? 'portions'] ?? 'servings'}`;

  const kmFromPickup = location.point ? distanceKm(location.point, donation.pickupAddress.location) : null;
  const arrived = kmFromPickup !== null && kmFromPickup <= ARRIVAL_RADIUS_KM;
  const gpsText = location.isLoading
    ? 'Getting your GPS location…'
    : kmFromPickup === null
      ? location.error ?? 'Location unavailable'
      : arrived
        ? 'Arrived & GPS Location Verified'
        : `You are ${kmFromPickup} km from the pickup`;

  const canSubmit =
    checkedCount === totalCount && Boolean(pickupPhotoUrl) && pin.length === 4 && !isUploadingPhoto;

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
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── 3-STEP PROGRESS STEPPER ─── */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperLineRow}>
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleDone}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelDone}>Route</Text>
            </View>

            <View style={styles.stepLineMaroon} />

            <View style={styles.stepperItem}>
              <View style={styles.stepCircleActive}>
                <Text style={styles.stepNumActive}>2</Text>
              </View>
              <Text style={styles.stepLabelActive}>Verification</Text>
            </View>

            <View style={styles.stepLineGray} />

            <View style={styles.stepperItem}>
              <View style={styles.stepCircleInactive}>
                <Text style={styles.stepNumInactive}>3</Text>
              </View>
              <Text style={styles.stepLabelInactive}>Delivery</Text>
            </View>
          </View>
        </View>

        {alreadyCollected && (
          <TouchableOpacity
            style={styles.pickupConcernButton}
            onPress={() => router.replace(`/(volunteer)/delivery/${id}`)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
            <Text style={[styles.pickupConcernText, { color: '#0F766E' }]}>
              Pickup already confirmed — continue to delivery
            </Text>
          </TouchableOpacity>
        )}

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
            <Pressable style={styles.gpsMatchGroup} onPress={() => void location.refresh()}>
              <Ionicons
                name={arrived ? 'checkmark-circle' : 'navigate-circle-outline'}
                size={15}
                color={arrived ? '#0F766E' : '#B45309'}
              />
              <Text style={[styles.gpsMatchText, !arrived && { color: '#B45309' }]}>{gpsText}</Text>
            </Pressable>
            <View style={[styles.liveMatchBadge, !arrived && { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.liveMatchText, !arrived && { color: '#B45309' }]}>
                {arrived ? 'Live Match' : 'Tap to refresh'}
              </Text>
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
                <Text style={styles.checkItemSubtitle}>
                  {donation.foodType === 'cooked'
                    ? 'Hot/warm insulated packaging intact (Above 60°C)'
                    : 'Stored at a safe temperature for this food type'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkItemRow}
              onPress={() => toggleCheck('packetCount')}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxBox, checklist.packetCount && styles.checkboxBoxChecked]}>
                {checklist.packetCount && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.checkTextCol}>
                <Text style={styles.checkItemTitle}>Quantity matches listing</Text>
                <Text style={styles.checkItemSubtitle}>{quantityLabel} counted & confirmed</Text>
              </View>
            </TouchableOpacity>

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
                <Text style={styles.checkItemSubtitle}>
                  {donation.packagingType ? `${donation.packagingType} • ` : ''}Tamper-proof & labelled
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CONTAINER PHOTO PROOF CARD (CLOUDINARY STORAGE) ─── */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera" size={16} color="#701A2B" />
              <Text style={styles.proofTitle}>CONTAINER PHOTO PROOF</Text>
            </View>
            <View style={[styles.attachedPill, pickupPhotoUrl && styles.cloudinaryPill]}>
              <Text style={[styles.attachedText, pickupPhotoUrl && styles.cloudinaryPillText]}>
                {pickupPhotoUrl ? '☁️ Cloudinary Verified' : 'Required'}
              </Text>
            </View>
          </View>

          <View style={styles.proofPhotoWrapper}>
            {pickupPhotoUrl ? (
              <Image
                source={{ uri: pickupPhotoUrl }}
                style={styles.proofActualImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.proofActualImage, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="camera-outline" size={36} color="#9CA3AF" />
                <Text style={styles.checkItemSubtitle}>Photograph the food containers at handover</Text>
              </View>
            )}
            {isUploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.uploadingOverlayText}>Storing in Cloudinary...</Text>
              </View>
            )}
            {photoCapturedAt && (
              <View style={styles.photoInfoOverlay}>
                <View style={styles.photoMetaRow}>
                  <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.photoMetaText}>Captured: {photoCapturedAt}</Text>
                </View>
                <View style={styles.cloudBadgeSmall}>
                  <Ionicons name="cloud-done" size={12} color="#FFFFFF" />
                  <Text style={styles.cloudBadgeText}>Cloudinary Stored</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.photoActionsRow}>
            <TouchableOpacity
              style={styles.photoActionBtnPrimary}
              onPress={() => void handleCapturePhoto('camera')}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.photoActionBtnPrimaryText}>Take Live Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoActionBtnSecondary}
              onPress={() => void handleCapturePhoto('gallery')}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={16} color="#701A2B" />
              <Text style={styles.photoActionBtnSecondaryText}>From Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SECURE DONOR HANDOVER PIN CARD ─── */}
        <View style={styles.pinCard}>
          <View style={styles.pinHeaderRow}>
            <Text style={styles.pinTitle}>SECURE DONOR HANDOVER PIN</Text>
            <Ionicons name="lock-closed-outline" size={16} color="#701A2B" />
          </View>
          <Text style={styles.pinSubtitle}>Ask the donor for the 4-digit code shown in their app</Text>

          <Pressable style={styles.pinBoxesRow} onPress={() => pinInputRef.current?.focus()}>
            {[0, 1, 2, 3].map((idx) => (
              <View key={idx} style={styles.pinBox}>
                <Text style={styles.pinDigitText}>{pin[idx] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={pinInputRef}
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus={false}
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
          />

          <View style={styles.pinDividerRow}>
            <View style={styles.pinDividerLine} />
            <Text style={styles.pinDividerText}>DONOR CAN'T FIND IT?</Text>
            <View style={styles.pinDividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.scanQRButton, !donor?.phone && { opacity: 0.5 }]}
            onPress={() => donor?.phone && void Linking.openURL(`tel:${donor.phone}`)}
            disabled={!donor?.phone}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={17} color="#0D9488" />
            <Text style={styles.scanQRButtonText}>
              {donor ? `Call ${donor.name}` : 'Donor contact unavailable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── CONFIRM PICKUP ACTION ─── */}
        <TouchableOpacity
          style={[styles.confirmButton, (!canSubmit || alreadyCollected) && { opacity: 0.55 }]}
          onPress={() => confirm.mutate()}
          disabled={confirm.isPending || !canSubmit || alreadyCollected}
          activeOpacity={0.85}
        >
          {confirm.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {canSubmit ? 'Confirm Pickup & Start Delivery →' : 'Complete checklist, photo & PIN'}
            </Text>
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
  cloudinaryPill: {
    backgroundColor: '#0F7B4F',
  },
  cloudinaryPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  proofPhotoWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  proofActualImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  photoInfoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoMetaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cloudBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F7B4F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cloudBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5A1626',
    borderRadius: 12,
    paddingVertical: 11,
  },
  photoActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  photoActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EE',
    borderWidth: 1.5,
    borderColor: '#5A1626',
    borderRadius: 12,
    paddingVertical: 11,
  },
  photoActionBtnSecondaryText: {
    color: '#5A1626',
    fontSize: 12.5,
    fontWeight: '700',
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
