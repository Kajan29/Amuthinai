import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { assignmentsApi, isOpenTask } from '@/api/assignments.api';
import { logo } from '@/constants';
import { cloudinaryService } from '@/services/cloudinary';
import { getMapboxStaticMapUrl, getRouteTransitMapUrl } from '@/services/mapbox';
import { toLatLng } from '@/utils/geo';
import { etaMinutes, formatKm, nextStepHref } from '@/utils/tasks';

const FOOD_LABEL: Record<string, string> = {
  cooked: 'Hot Food',
  raw: 'Fresh Produce',
  packaged: 'Packaged',
  bakery: 'Bakery',
  dairy: 'Dairy',
  beverage: 'Beverage',
};

const HANDLING_LABEL: Record<string, string> = {
  keep_warm: 'Keep warm',
  requires_refrigeration: 'Keep refrigerated',
  individually_packed: 'Individually packed',
  fragile_liquid: 'Fragile / liquid',
};

const formatClock = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [readinessPhotoUrl, setReadinessPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const task = useQuery({
    queryKey: ['task', id],
    queryFn: () => assignmentsApi.details(id),
    enabled: Boolean(id),
  });

  const refreshLists = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['volunteer.nearby'] }),
      queryClient.invalidateQueries({ queryKey: ['volunteer.history'] }),
    ]);

  const accept = useMutation({
    mutationFn: () => assignmentsApi.accept(id),
    async onSuccess(assignment) {
      await refreshLists();
      router.replace(`/(volunteer)/pickup/${assignment.id}`);
    },
    onError(error) {
      Alert.alert('Could not accept task', (error as Error).message);
      void task.refetch();
      void refreshLists();
    },
  });

  const decline = useMutation({
    mutationFn: () => assignmentsApi.decline(id),
    async onSuccess() {
      await refreshLists();
      router.replace('/(volunteer)/dashboard');
    },
    onError(error) {
      Alert.alert('Could not decline task', (error as Error).message);
    },
  });

  if (task.isPending) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color="#5A1626" size="large" />
        <Text style={styles.loadingText}>Loading assignment...</Text>
      </SafeAreaView>
    );
  }

  if (task.isError || !task.data) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={40} color="#5A1626" />
        <Text style={styles.loadingText}>
          {(task.error as Error | null)?.message ?? 'This task is no longer available.'}
        </Text>
        <TouchableOpacity style={styles.supportLink} onPress={() => router.back()}>
          <Text style={styles.supportLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const view = task.data;
  const { donation, assignment } = view;
  const status = assignment.status;
  const isOffered = status === 'offered';
  const isAccepted = status === 'accepted';
  const isCompleted = status === 'completed';
  const pickedUp = donation.status === 'picked_up' || donation.status === 'in_transit';
  const stepIndex = isCompleted || donation.status === 'delivered' ? 2 : pickedUp ? 1 : 0;

  const taskId = (isOpenTask(id) ? donation.id : assignment.id).slice(-6).toUpperCase();
  const title = donation.title;
  const foodBadge = FOOD_LABEL[donation.foodType] ?? donation.foodType;
  const packaging =
    donation.packagingType ||
    (donation.handling ?? []).map((h) => HANDLING_LABEL[h] ?? h).join(' • ') ||
    `${donation.servings} servings`;

  const pickupName = donation.pickupAddress.line1;
  const donorName = view.donor?.name ?? 'Shown after you accept';
  const donorPhone = view.donor?.phone ?? null;
  const instructions =
    donation.handoverInstructions || donation.description || 'No special handover instructions.';

  const pickupCoords = toLatLng(donation.pickupAddress.location);
  const drop = view.request?.dropAddress;
  const dropCoords = drop ? toLatLng(drop.location) : null;
  const totalKm = view.distanceKm + (view.routeKm ?? 0);
  const mapboxRouteUrl = dropCoords
    ? getRouteTransitMapUrl({ origin: pickupCoords, destination: dropCoords })
    : getMapboxStaticMapUrl({
        center: pickupCoords,
        zoom: 14,
        width: 600,
        height: 440,
        markers: [{ ...pickupCoords, label: 'a', color: '5A1626' }],
      });

  const statusLabel = isCompleted
    ? 'Delivered & Verified'
    : pickedUp
      ? 'Picked Up • In Transit'
      : isAccepted
        ? 'Assigned to You'
        : view.isOpen
          ? 'Open • Available to Claim'
          : 'Offered to You';

  async function handleCaptureReadinessPhoto(source: 'camera' | 'gallery') {
    try {
      const uri = await cloudinaryService.pickOrCapture(source);
      if (!uri) return;

      setIsUploadingPhoto(true);
      const result = await cloudinaryService.uploadImage(uri, 'amuthinai/assignment-readiness');
      setReadinessPhotoUrl(result.url);
      Alert.alert('Inspection photo saved', 'Your bag and vehicle check photo was uploaded.');
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload photo to Cloudinary.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handlePrimary() {
    if (isOffered) {
      accept.mutate();
      return;
    }
    if (isAccepted) router.push(nextStepHref(view));
  }

  function handleDecline() {
    Alert.alert('Decline this task?', 'It will be offered to other volunteers.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => decline.mutate() },
    ]);
  }

  function handleCallDonor() {
    if (!donorPhone) {
      Alert.alert('Contact hidden', 'The donor’s phone number is shown once you accept the task.');
      return;
    }
    void Linking.openURL(`tel:${donorPhone}`);
  }

  function handleChatDonor() {
    if (!donorPhone) {
      Alert.alert('Contact hidden', 'You can message the donor once you accept the task.');
      return;
    }
    void Linking.openURL(`sms:${donorPhone}`);
  }

  function handleReportDelay() {
    router.push({
      pathname: '/(volunteer)/raise-concern',
      params: isOpenTask(id) ? { donationId: donation.id } : { assignmentId: assignment.id },
    });
  }

  const primaryLabel = isOffered
    ? 'Accept Task & Start Ride →'
    : isAccepted
      ? pickedUp
        ? 'Continue to Drop-off →'
        : 'Start Ride to Pickup Point →'
      : isCompleted
        ? 'Delivery Completed ✓'
        : 'Task Closed';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── SCREEN 2: TOP HEADER ─── */}
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
          <Text style={styles.headerTitle}>{isOffered ? 'TASK DETAILS' : 'ACTIVE ASSIGNMENT'}</Text>
          <Text style={styles.headerSubtitle}>Task #{taskId}</Text>
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
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleActive}>
                <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <Text style={styles.stepLabelActive}>Route</Text>
            </View>

            <View style={stepIndex >= 1 ? styles.stepLineMaroon : styles.stepLineGray} />

            <View style={styles.stepperItem}>
              {stepIndex >= 1 ? (
                <View style={styles.stepCircleActive}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.stepCircleInactive}>
                  <Text style={styles.stepNumInactive}>2</Text>
                </View>
              )}
              <Text style={stepIndex >= 1 ? styles.stepLabelActive : styles.stepLabelInactive}>Pickup</Text>
            </View>

            <View style={stepIndex >= 2 ? styles.stepLineMaroon : styles.stepLineGray} />

            <View style={styles.stepperItem}>
              {stepIndex >= 2 ? (
                <View style={styles.stepCircleActive}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.stepCircleInactive}>
                  <Text style={styles.stepNumInactive}>3</Text>
                </View>
              )}
              <Text style={stepIndex >= 2 ? styles.stepLabelActive : styles.stepLabelInactive}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* ─── STATUS BANNER ─── */}
        <View style={styles.statusBanner}>
          <View style={styles.statusLeft}>
            <View style={styles.greenStatusDot} />
            <Text style={styles.statusAssignedText}>{statusLabel}</Text>
          </View>
          <View style={styles.statusRight}>
            <Ionicons name="time-outline" size={15} color="#1F2937" />
            <Text style={styles.statusTimeText}>
              {formatClock(donation.readyFrom ?? donation.cookedAt)} – {formatClock(donation.expiresAt)}
            </Text>
          </View>
        </View>

        {/* ─── FOOD DETAILS CARD ─── */}
        <View style={styles.card}>
          <View style={styles.foodRow}>
            <View style={styles.foodIconBox}>
              <Ionicons name="cube-outline" size={26} color="#701A2B" />
            </View>
            <View style={styles.foodInfoCol}>
              <View style={styles.foodTitleRow}>
                <Text style={styles.foodTitle}>{title}</Text>
                <View style={styles.hotFoodBadge}>
                  <Text style={styles.hotFoodText}>{foodBadge}</Text>
                </View>
              </View>
              <View style={styles.foodSubtitleRow}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.foodSubtitle}>
                  {donation.servings} servings • {packaging}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.donorSection}>
            <View style={styles.donorInfoCol}>
              <Text style={styles.donorSubLabel}>PICKUP DONOR</Text>
              <Text style={styles.donorName}>{donorName}</Text>
              <Text style={styles.donorSubLabel}>{pickupName}</Text>
            </View>

            <View style={styles.donorActionButtons}>
              <TouchableOpacity
                style={[styles.donorCallButton, !donorPhone && { opacity: 0.5 }]}
                onPress={handleCallDonor}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.donorChatButton, !donorPhone && { opacity: 0.5 }]}
                onPress={handleChatDonor}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble" size={16} color="#701A2B" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.instructionsBox}>
            <Ionicons name="information-circle-outline" size={17} color="#701A2B" style={styles.infoIcon} />
            <Text style={styles.instructionsText}>
              <Text style={styles.instructionsBold}>Instructions: </Text>
              {instructions}
            </Text>
          </View>
        </View>

        {/* ─── TRANSIT PATH SECTION ─── */}
        <View style={styles.transitHeaderRow}>
          <Text style={styles.transitTitle}>Transit Path</Text>
          <View style={styles.transitMetricRow}>
            <Ionicons name="location-sharp" size={13} color="#1F2937" />
            <Text style={styles.transitMetricText}>
              {formatKm(totalKm)} total • ~{etaMinutes(totalKm)} mins
            </Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapCanvas}>
            <View style={styles.transitMapBg}>
              <Image
                source={{ uri: mapboxRouteUrl }}
                style={styles.mapboxRouteImage}
                resizeMode="cover"
              />

              <View style={styles.markerAPosition}>
                <View style={styles.markerACircle}>
                  <Text style={styles.markerLetter}>A</Text>
                </View>
                <View style={styles.calloutBoxA}>
                  <Text style={styles.calloutSubLabel}>PICKUP POINT</Text>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{pickupName}</Text>
                </View>
              </View>

              <View style={styles.markerBPosition}>
                <View style={styles.calloutBoxB}>
                  <Text style={styles.calloutSubLabel}>DROPOFF</Text>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {drop ? (view.recipient?.name ?? drop.line1) : 'Matched on acceptance'}
                  </Text>
                </View>
                <View style={styles.markerBCircle}>
                  <Text style={styles.markerLetter}>B</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.compassButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(volunteer)/map')}
              >
                <Ionicons name="locate" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {view.request && (
          <View style={styles.instructionsBox}>
            <Ionicons name="people-outline" size={17} color="#701A2B" style={styles.infoIcon} />
            <Text style={styles.instructionsText}>
              <Text style={styles.instructionsBold}>Recipient: </Text>
              {view.request.servingsNeeded} servings needed
              {view.request.familySize ? ` • family of ${view.request.familySize}` : ''}
              {view.request.dietaryRequirements.length
                ? ` • ${view.request.dietaryRequirements.join(', ')}`
                : ''}
              {view.request.notes ? `\n${view.request.notes}` : ''}
              {view.recipient?.phone ? `\nContact: ${view.recipient.phone}` : ''}
            </Text>
          </View>
        )}

        {/* ─── PRE-RIDE READINESS & GEAR PHOTO (CLOUDINARY) ─── */}
        {!isCompleted && (
        <View style={styles.readinessCard}>
          <View style={styles.readinessHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="shield-checkmark" size={17} color="#5A1626" />
              <Text style={styles.readinessTitle}>PRE-RIDE GEAR & BAG INSPECTION</Text>
            </View>
            <View style={[styles.readinessPill, readinessPhotoUrl && styles.readinessPillActive]}>
              <Text
                style={[
                  styles.readinessPillText,
                  readinessPhotoUrl && styles.readinessPillTextActive,
                ]}
              >
                {readinessPhotoUrl ? '☁️ Cloudinary Verified' : 'Optional Check'}
              </Text>
            </View>
          </View>
          <Text style={styles.readinessDesc}>
            Verify your thermal food transport bag and vehicle readiness before departing.
          </Text>

          {readinessPhotoUrl ? (
            <View style={styles.readinessPreviewBox}>
              <Image
                source={{ uri: readinessPhotoUrl }}
                style={styles.readinessImage}
                resizeMode="cover"
              />
              <View style={styles.readinessOverlay}>
                <View style={styles.readinessCloudBadge}>
                  <Ionicons name="cloud-done" size={12} color="#FFFFFF" />
                  <Text style={styles.readinessCloudText}>Stored in Cloudinary</Text>
                </View>
                <TouchableOpacity
                  style={styles.retakeBtnSmall}
                  onPress={() => void handleCaptureReadinessPhoto('camera')}
                >
                  <Ionicons name="camera-reverse" size={13} color="#FFFFFF" />
                  <Text style={styles.retakeBtnSmallText}>Retake</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.readinessActionsRow}>
              <TouchableOpacity
                style={styles.readinessBtnPrimary}
                onPress={() => void handleCaptureReadinessPhoto('camera')}
                disabled={isUploadingPhoto}
                activeOpacity={0.8}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.readinessBtnPrimaryText}>Take Photo with Camera</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.readinessBtnSecondary}
                onPress={() => void handleCaptureReadinessPhoto('gallery')}
                disabled={isUploadingPhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color="#5A1626" />
                <Text style={styles.readinessBtnSecondaryText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* ─── BOTTOM ACTION FOOTER ─── */}
        <TouchableOpacity
          style={[styles.startRideButton, !(isOffered || isAccepted) && { opacity: 0.6 }]}
          onPress={handlePrimary}
          disabled={accept.isPending || !(isOffered || isAccepted)}
          activeOpacity={0.85}
        >
          {accept.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.startRideButtonText}>{primaryLabel}</Text>
          )}
        </TouchableOpacity>

        {isOffered && (
          <TouchableOpacity
            style={styles.supportLink}
            onPress={handleDecline}
            disabled={decline.isPending}
            activeOpacity={0.7}
          >
            <Text style={[styles.supportLinkText, { color: '#B91C1C' }]}>
              {decline.isPending ? 'Declining…' : 'Decline this task'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.supportLink}
          onPress={handleReportDelay}
          activeOpacity={0.7}
        >
          <Text style={styles.supportLinkText}>Need Support / Report Delay</Text>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
  },
  loadingText: {
    fontSize: 14,
    color: '#5A1626',
    fontWeight: '600',
    marginTop: 12,
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
    fontSize: 12.5,
    fontWeight: '800',
    color: '#5A1626',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
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
  stepLabelActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A1626',
    marginTop: 5,
  },
  stepLineMaroon: {
    flex: 1,
    height: 2,
    backgroundColor: '#5A1626',
    marginHorizontal: 8,
    marginBottom: 16,
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

  /* ─── STATUS BANNER ─── */
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D1F0E4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  greenStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F766E',
  },
  statusAssignedText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },

  /* ─── FOOD DETAILS CARD ─── */
  card: {
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
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FCE8EE',
    borderWidth: 1,
    borderColor: '#F8D1DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodInfoCol: {
    flex: 1,
  },
  foodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
  },
  hotFoodBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  hotFoodText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  foodSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  foodSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFE9',
    marginVertical: 14,
  },

  /* Donor Section */
  donorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donorInfoCol: {
    flex: 1,
  },
  donorSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  donorName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
  },
  donorActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  donorCallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorChatButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FCE8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Instructions */
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  infoIcon: {
    marginTop: 1,
  },
  instructionsText: {
    fontSize: 11.5,
    color: '#4B5563',
    lineHeight: 16,
    flex: 1,
  },
  instructionsBold: {
    fontWeight: '800',
    color: '#9A3412',
  },

  /* ─── TRANSIT PATH SECTION ─── */
  transitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  transitMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transitMetricText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  /* Transit Map Card */
  mapCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECE7DF',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  mapCanvas: {
    width: '100%',
    height: 220,
    backgroundColor: '#E8EFF4',
    position: 'relative',
  },
  transitMapBg: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  mapboxRouteImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  transitRoadCurve: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 280,
    height: 160,
    borderWidth: 14,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 100,
    borderBottomRightRadius: 100,
    transform: [{ rotate: '-10deg' }],
  },
  transitDashedPath: {
    position: 'absolute',
    top: 44,
    left: 36,
    width: 250,
    height: 130,
    borderStyle: 'dashed',
    borderWidth: 3,
    borderColor: '#0F766E',
    borderTopLeftRadius: 90,
    borderBottomRightRadius: 90,
    transform: [{ rotate: '-10deg' }],
  },

  /* Point A Marker */
  markerAPosition: {
    position: 'absolute',
    top: 18,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markerACircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerLetter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  calloutBoxA: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  calloutSubLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  calloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  /* Scooter Icon on route */
  scooterBadge: {
    position: 'absolute',
    top: 96,
    left: 140,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scooterEmoji: {
    fontSize: 16,
  },

  /* Point B Marker */
  markerBPosition: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markerBCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E3A4B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  calloutBoxB: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },

  compassButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  /* ─── BOTTOM ACTION BUTTONS ─── */
  startRideButton: {
    backgroundColor: '#5A1626',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 12,
  },
  startRideButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  supportLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  readinessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  readinessHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  readinessTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  readinessPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  readinessPillActive: {
    backgroundColor: '#E3F3EB',
  },
  readinessPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  readinessPillTextActive: {
    color: '#0F7B4F',
    fontWeight: '800',
  },
  readinessDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  readinessPreviewBox: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  readinessImage: {
    width: '100%',
    height: '100%',
  },
  readinessOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readinessCloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F7B4F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readinessCloudText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  retakeBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  retakeBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  readinessActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readinessBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5A1626',
    borderRadius: 12,
    paddingVertical: 10,
  },
  readinessBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  readinessBtnSecondary: {
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
  readinessBtnSecondaryText: {
    color: '#5A1626',
    fontSize: 12,
    fontWeight: '700',
  },
});
