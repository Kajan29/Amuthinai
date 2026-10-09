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
import { initials, KARMA_PER_DELIVERY } from '@/utils/tasks';

const ARRIVAL_RADIUS_KM = 0.5;

export default function ConfirmDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const location = useLocation();
  const pinInputRef = useRef<TextInput>(null);

  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  const task = useQuery({
    queryKey: ['task', id],
    queryFn: () => assignmentsApi.details(id),
    enabled: Boolean(id),
  });

  const completeTask = useMutation({
    mutationFn: async () => {
      const point = location.point ?? (await location.refresh());
      if (!point) throw new Error('Turn on location so we can stamp where the delivery happened.');
      if (!deliveryPhotoUrl) throw new Error('Take a handover photo first.');
      if (pin.length !== 4) throw new Error('Enter the 4-digit PIN from the recipient.');
      return assignmentsApi.confirmDelivery(id, {
        photoUrl: deliveryPhotoUrl,
        location: point,
        pin,
        quantityConfirmed: task.data?.donation.servings,
      });
    },
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volunteer.nearby'] }),
        queryClient.invalidateQueries({ queryKey: ['volunteer.history'] }),
        queryClient.invalidateQueries({ queryKey: ['volunteer.points'] }),
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
      ]);
      const servings = task.data?.donation.servings ?? 0;
      Alert.alert(
        'Delivery Complete! 🎉',
        `You delivered ${servings} servings. +${KARMA_PER_DELIVERY} Karma Points added to your profile.`,
        [{ text: 'Return to Dashboard', onPress: () => router.replace('/(volunteer)/dashboard') }],
      );
    },
    onError(error) {
      Alert.alert('Delivery not confirmed', (error as Error).message);
    },
  });

  async function handleCapturePhoto(source: 'camera' | 'gallery') {
    try {
      const uri = await cloudinaryService.pickOrCapture(source);
      if (!uri) return;

      setIsUploadingPhoto(true);
      const result = await cloudinaryService.uploadImage(uri, 'amuthinai/delivery-proof');
      setDeliveryPhotoUrl(result.url);
      setPhotoCapturedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload handover image to Cloudinary.');
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
        <Text style={styles.shelterTitle}>{(task.error as Error | null)?.message ?? 'Task not found'}</Text>
        <TouchableOpacity style={styles.receiptLink} onPress={() => router.back()}>
          <Text style={styles.receiptLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { donation, request, recipient, assignment } = task.data;
  const delivered = assignment.status === 'completed' || donation.status === 'delivered';
  const inTransit = donation.status === 'in_transit' || donation.status === 'picked_up';

  const refId = assignment.id.slice(-6).toUpperCase();
  const drop = request?.dropAddress;
  const shelterName = recipient?.name ?? drop?.line1 ?? 'Recipient';
  const shelterAddress = drop ? [drop.line1, drop.city, drop.district].filter(Boolean).join(', ') : 'No drop-off linked';
  const recipientPhone = recipient?.phone ?? null;

  const kmFromDrop = location.point && drop ? distanceKm(location.point, drop.location) : null;
  const arrived = kmFromDrop !== null && kmFromDrop <= ARRIVAL_RADIUS_KM;

  function handleCallCoordinator() {
    if (recipientPhone) void Linking.openURL(`tel:${recipientPhone}`);
  }

  function handleWhatsAppCoordinator() {
    if (!recipientPhone) return;
    const digits = recipientPhone.replace(/\D/g, '').replace(/^0/, '94');
    const message = encodeURIComponent(`Hello ${shelterName}, I have arrived with your food delivery.`);
    void Linking.openURL(
      request?.contactPreference === 'sms'
        ? `sms:${recipientPhone}`
        : `https://wa.me/${digits}?text=${message}`,
    );
  }

  function handleHelp() {
    Alert.alert(
      'Need Assistance?',
      `Recipient: ${shelterName}${recipientPhone ? ` (${recipientPhone})` : ''}\n\nAsk the recipient for the 4-digit delivery PIN shown in their app. If something is wrong, raise a concern and an admin will help.`,
    );
  }

  function handleShareImpact() {
    Alert.alert(
      'Route Receipt',
      `Task Ref #${refId}\nRoute: ${donation.pickupAddress.line1} → ${shelterName}\nFood: ${donation.title} (${donation.servings} servings)\nKarma: +${KARMA_PER_DELIVERY} pts on completion`,
    );
  }

  const canSubmit = inTransit && !delivered && Boolean(deliveryPhotoUrl) && pin.length === 4 && !isUploadingPhoto;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── SCREEN 4: TOP HEADER BAR ─── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circularHeaderButton}
          onPress={() => router.replace('/(volunteer)/dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Delivery Handover</Text>
          <Text style={styles.headerSubtitle}>Ref #{refId}</Text>
        </View>

        <TouchableOpacity
          style={styles.circularHeaderButton}
          onPress={handleHelp}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={20} color="#1F2937" />
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
              <Text style={styles.stepLabelDone}>1. Route</Text>
            </View>

            <View style={styles.stepLineMaroon} />

            <View style={styles.stepperItem}>
              <View style={styles.stepCircleDone}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelDone}>2. Verification</Text>
            </View>

            <View style={styles.stepLineMaroon} />

            <View style={styles.stepperItem}>
              <View style={delivered ? styles.stepCircleDone : styles.stepCircleActive}>
                {delivered ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumActive}>3</Text>
                )}
              </View>
              <Text style={delivered ? styles.stepLabelDone : styles.stepLabelActive}>3. Delivered</Text>
            </View>
          </View>
        </View>

        {!inTransit && !delivered && (
          <TouchableOpacity
            style={styles.deliveryConcernButton}
            onPress={() => router.replace(`/(volunteer)/pickup/${id}`)}
          >
            <Ionicons name="arrow-back-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.deliveryConcernText}>Confirm the pickup first</Text>
          </TouchableOpacity>
        )}

        {/* ─── DESTINATION CARD ─── */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationTopRow}>
            <View style={[styles.arrivedBadge, !arrived && { backgroundColor: '#FEF3C7' }]}>
              <View style={[styles.arrivedDot, !arrived && { backgroundColor: '#B45309' }]} />
              <Text style={[styles.arrivedText, !arrived && { color: '#B45309' }]}>
                {delivered
                  ? 'Delivered'
                  : arrived
                    ? 'Arrived at Drop-off'
                    : kmFromDrop !== null
                      ? `${kmFromDrop} km to drop-off`
                      : location.isLoading
                        ? 'Locating…'
                        : 'En route'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.locationPinCircle}
              onPress={() => void location.refresh()}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={18} color="#0D9488" />
            </TouchableOpacity>
          </View>

          <Text style={styles.shelterTitle}>{shelterName}</Text>
          <Text style={styles.shelterAddress}>{shelterAddress}</Text>

          <View style={styles.coordinatorCard}>
            <View style={styles.coordinatorAvatar}>
              <Text style={styles.coordinatorAvatarText}>{initials(shelterName)}</Text>
            </View>
            <View style={styles.coordinatorInfo}>
              <Text style={styles.coordinatorName}>{recipient?.name ?? 'Recipient'}</Text>
              <Text style={styles.coordinatorRole}>
                {request
                  ? `${request.servingsNeeded} servings requested${request.familySize ? ` • family of ${request.familySize}` : ''}`
                  : 'Recipient'}
              </Text>
            </View>

            <View style={styles.coordinatorButtons}>
              <TouchableOpacity
                style={[styles.coordinatorActionBtn, !recipientPhone && { opacity: 0.4 }]}
                onPress={handleCallCoordinator}
                disabled={!recipientPhone}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={16} color="#1F2937" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.coordinatorActionBtn, !recipientPhone && { opacity: 0.4 }]}
                onPress={handleWhatsAppCoordinator}
                disabled={!recipientPhone}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── PROOF OF HANDOVER CARD ─── */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeaderRow}>
            <Text style={styles.proofTitle}>PROOF OF HANDOVER</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons
                name={deliveryPhotoUrl ? 'checkmark-circle' : 'ellipse-outline'}
                size={13}
                color="#0F766E"
              />
              <Text style={styles.verifiedText}>{deliveryPhotoUrl ? 'Photo Attached' : 'Photo Required'}</Text>
            </View>
          </View>

          <View style={styles.photoContainer}>
            {deliveryPhotoUrl ? (
              <Image source={{ uri: deliveryPhotoUrl }} style={styles.handoverPhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.handoverPhoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="camera-outline" size={36} color="#9CA3AF" />
                <Text style={styles.shelterAddress}>Photograph the food being handed over</Text>
              </View>
            )}
            {isUploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.uploadingOverlayText}>Storing in Cloudinary...</Text>
              </View>
            )}
            {photoCapturedAt && (
              <View style={styles.photoOverlayRow}>
                <View style={styles.livePhotoBadge}>
                  <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.livePhotoText}>Live Photo: {photoCapturedAt}</Text>
                </View>
                <View style={styles.cloudBadgeSmall}>
                  <Ionicons name="cloud-done" size={12} color="#FFFFFF" />
                  <Text style={styles.cloudBadgeText}>Cloudinary Verified</Text>
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
              <Text style={styles.photoActionBtnPrimaryText}>Take Live Handover Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoActionBtnSecondary}
              onPress={() => void handleCapturePhoto('gallery')}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={16} color="#5A1626" />
              <Text style={styles.photoActionBtnSecondaryText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Recipient delivery PIN */}
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.feedbackTitle}>Recipient Delivery PIN</Text>
              <Ionicons name="lock-closed-outline" size={14} color="#5A1626" />
            </View>
            <Text style={styles.feedbackQuote}>Ask the recipient for the 4-digit PIN in their app</Text>
            <Pressable style={pinStyles.row} onPress={() => pinInputRef.current?.focus()}>
              {[0, 1, 2, 3].map((idx) => (
                <View key={idx} style={pinStyles.box}>
                  <Text style={pinStyles.digit}>{pin[idx] ?? ''}</Text>
                </View>
              ))}
            </Pressable>
            <TextInput
              ref={pinInputRef}
              value={pin}
              onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              style={pinStyles.hiddenInput}
            />
          </View>
        </View>

        {/* ─── COMMUNITY IMPACT BANNER ─── */}
        <View style={styles.impactBanner}>
          <View style={styles.impactIconBox}>
            <Ionicons name="heart" size={22} color="#FBBF24" />
          </View>
          <View style={styles.impactTextCol}>
            <Text style={styles.impactTitle}>COMMUNITY IMPACT</Text>
            <Text style={styles.impactDescription}>
              You are delivering <Text style={styles.impactHighlight}>{donation.servings} servings</Text>
              {drop?.city ? ` in ${drop.city}` : ''}.{' '}
              <Text style={styles.impactKarma}>+{KARMA_PER_DELIVERY} Karma Points</Text> on completion.
            </Text>
          </View>
        </View>

        {/* ─── BOTTOM ACTION BUTTONS ─── */}
        <TouchableOpacity
          style={[styles.completeButton, !canSubmit && { opacity: 0.55 }]}
          onPress={() => completeTask.mutate()}
          disabled={completeTask.isPending || !canSubmit}
          activeOpacity={0.85}
        >
          {completeTask.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.completeButtonText}>
              {delivered ? 'Delivered ✓' : canSubmit ? 'Complete Task & Return →' : 'Add photo & PIN to complete'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.receiptLink}
          onPress={handleShareImpact}
          activeOpacity={0.7}
        >
          <Text style={styles.receiptLinkText}>View Route Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deliveryConcernButton}
          onPress={() =>
            router.push({
              pathname: '/(volunteer)/raise-concern',
              params: { assignmentId: id },
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.deliveryConcernText}>Issue at Drop-off Location? Raise Concern</Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const pinStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10 },
  box: {
    width: 54,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5A1626',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 22, fontWeight: '800', color: '#5A1626' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});

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
    height: 2.5,
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

  /* ─── SHELTER DESTINATION CARD ─── */
  destinationCard: {
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
  destinationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  arrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1F0E4',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  arrivedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F766E',
  },
  arrivedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  locationPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelterTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  shelterAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },

  /* Coordinator Box */
  coordinatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  coordinatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatorAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  coordinatorInfo: {
    flex: 1,
  },
  coordinatorName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  coordinatorRole: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  coordinatorButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinatorActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── PROOF OF HANDOVER CARD ─── */
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1F0E4',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  handoverPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlayRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  livePhotoText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pinVerifiedBadge: {
    backgroundColor: '#5A1626',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  pinVerifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  cloudBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F7B4F',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
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
    marginTop: 10,
  },
  photoActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5A1626',
    borderRadius: 12,
    paddingVertical: 10,
  },
  photoActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    paddingVertical: 10,
  },
  photoActionBtnSecondaryText: {
    color: '#5A1626',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Recipient Feedback */
  feedbackCard: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE7DF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  feedbackQuote: {
    fontSize: 11.5,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 4,
  },

  /* ─── COMMUNITY IMPACT BANNER ─── */
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5A1626',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 16,
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  impactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactTextCol: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.6,
  },
  impactDescription: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 17,
    marginTop: 2,
  },
  impactHighlight: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  impactKarma: {
    fontWeight: '800',
    color: '#FBBF24',
  },

  /* ─── BOTTOM ACTION BUTTONS ─── */
  completeButton: {
    backgroundColor: '#5A1626',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 10,
  },
  completeButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  receiptLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  deliveryConcernButton: {
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
  deliveryConcernText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
