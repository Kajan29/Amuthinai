import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Badge } from '@/components/ui';
import { MOCK_DROP_OFFS } from '@/constants/mockVolunteerData';
import { useLocation } from '@/hooks/useLocation';
import { radius, typography } from '@/theme';
import { volunteerColors } from '@/theme/volunteer';
import { toLatLng } from '@/utils/geo';
import { MapView, Marker, Polyline } from '@/utils/maps';

/**
 * Active Assignment screen — detailed task view with full route map,
 * Route → Pickup → Delivery step process, donor details, and accept/decline actions.
 */
export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const assignment = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => assignmentsApi.byId(id),
  });

  const donation = useQuery({
    queryKey: ['donation', assignment.data?.donationId],
    queryFn: () => donationsApi.byId(assignment.data!.donationId),
    enabled: Boolean(assignment.data?.donationId),
  });

  const accept = useMutation({
    mutationFn: () => assignmentsApi.accept(id),
    onSuccess: () => router.replace(`/(volunteer)/pickup/${id}`),
  });

  const decline = useMutation({
    mutationFn: () => assignmentsApi.decline(id),
    onSuccess: () => router.replace('/(volunteer)/dashboard'),
  });

  if (assignment.isPending || donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={volunteerColors.maroon} size="large" />
        <Text style={styles.loadingText}>Loading assignment...</Text>
      </View>
    );
  }

  if (!assignment.data || !donation.data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={volunteerColors.urgentRed} />
        <Text style={styles.error}>Assignment not found</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(volunteer)/dashboard')}
        >
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { point: userLocation } = useLocation();
  const isOffered = assignment.data.status === 'offered';
  const isAccepted = assignment.data.status === 'accepted';
  const pickup = donation.data.pickupAddress;
  const estTime = Math.round(assignment.data.distanceKm * 4);
  const karmaPoints = Math.round(assignment.data.distanceKm * 20 + donation.data.servings * 2);

  // Retrieve matched drop-off destination
  const reqId = assignment.data.requestId;
  const dropOff = (reqId && MOCK_DROP_OFFS[reqId]) || {
    name: 'Jaffna Community Food Hub',
    address: '45 Main Street, Jaffna',
    city: pickup.city || 'Jaffna',
    latitude: 9.6690,
    longitude: 80.0270,
    contactPerson: 'Hub Coordinator',
    phone: '+94 77 234 5678',
  };

  const volunteerCoords = userLocation ? toLatLng(userLocation) : { latitude: 9.6645, longitude: 80.0200 };
  const pickupCoords = toLatLng(pickup.location);
  const dropOffCoords = { latitude: dropOff.latitude, longitude: dropOff.longitude };

  // Step progress
  const currentStep = isOffered ? 0 : isAccepted ? 1 : 2;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={volunteerColors.maroon} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>TASK ASSIGNMENT</Text>
          <Text style={styles.headerTaskId}>Task #VOL-{id.slice(-4).toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerCloseBtn}
          onPress={() => router.replace('/(volunteer)/dashboard')}
        >
          <Ionicons name="close" size={22} color={volunteerColors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
        {/* Step Progress: Route -> Pickup -> Delivery */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {['Route', 'Pickup', 'Delivery'].map((label, i) => {
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              return (
                <View key={label} style={styles.stepItem}>
                  <View style={styles.stepDotRow}>
                    {i > 0 && (
                      <View
                        style={[
                          styles.stepLine,
                          isDone && styles.stepLineDone,
                          isActive && styles.stepLineActive,
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isActive && styles.stepDotActive,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : (
                        <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    {i < 2 && (
                      <View
                        style={[
                          styles.stepLine,
                          (isDone || (isActive && i === 0)) && styles.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isDone && styles.stepLabelDone]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Assignment status */}
          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <View style={[styles.statusIndicator, {
                backgroundColor: isOffered ? volunteerColors.orange : volunteerColors.green,
              }]} />
              <Text style={styles.statusText}>
                {isOffered ? 'Offered to You · Ready to Accept' : 'Assigned to You · Active Route'}
              </Text>
            </View>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={14} color={volunteerColors.muted} />
              <Text style={styles.timeText}>~{estTime} min total</Text>
            </View>
          </View>
        </View>

        {/* Food Info Card */}
        <View style={styles.card}>
          <View style={styles.foodInfoRow}>
            <View style={styles.foodIconFrame}>
              <Ionicons name="fast-food" size={22} color={volunteerColors.maroon} />
            </View>
            <View style={styles.foodInfoText}>
              <Text style={styles.foodTitle}>{donation.data.title}</Text>
              <Text style={styles.foodMeta}>
                <Ionicons name="cube-outline" size={12} /> {donation.data.servings} Servings · {donation.data.foodType.toUpperCase()}
              </Text>
            </View>
            <Badge
              label={donation.data.foodType === 'cooked' ? 'Hot Food' : donation.data.foodType}
              tone="warning"
            />
          </View>

          {/* Donor info */}
          <View style={styles.donorRow}>
            <Text style={styles.donorLabel}>PICKUP DONOR</Text>
            <Text style={styles.donorName}>{pickup.line1}</Text>
          </View>

          {donation.data.description && (
            <View style={styles.instructionsRow}>
              <Ionicons name="information-circle" size={16} color={volunteerColors.infoBlue} />
              <Text style={styles.instructionsText}>
                Instructions: {donation.data.description}
              </Text>
            </View>
          )}

          {/* Urgency countdown */}
          <UrgentCountdown
            cookedAt={donation.data.cookedAt}
            safeForHours={donation.data.safeForHours}
          />
        </View>

        {/* Transit Path Card — Full Route */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Complete Delivery Route Guidance</Text>

          <View style={styles.transitMetrics}>
            <View style={styles.transitMetric}>
              <Ionicons name="navigate" size={14} color={volunteerColors.green} />
              <Text style={styles.transitMetricText}>
                {assignment.data.distanceKm} km total distance
              </Text>
            </View>
            <Text style={styles.transitDot}>·</Text>
            <View style={styles.transitMetric}>
              <Ionicons name="time" size={14} color={volunteerColors.green} />
              <Text style={styles.transitMetricText}>~{estTime} mins travel</Text>
            </View>
          </View>

          {/* Map with Start -> Pickup -> Drop-off */}
          {Platform.OS !== 'web' && MapView && (
            <View style={styles.routeMapFrame}>
              <MapView
                style={styles.routeMap}
                initialRegion={{
                  ...pickupCoords,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {/* 1. Start marker */}
                <Marker
                  coordinate={volunteerCoords}
                  title="Starting Point"
                  description="Your Current Location"
                  pinColor="#2B6CB0"
                />
                {/* 2. Pickup marker */}
                <Marker
                  coordinate={pickupCoords}
                  title="Pickup Point"
                  description={`${pickup.line1}, ${pickup.city}`}
                  pinColor={volunteerColors.green}
                />
                {/* 3. Drop-off marker */}
                <Marker
                  coordinate={dropOffCoords}
                  title="Drop-off Destination"
                  description={dropOff.name}
                  pinColor={volunteerColors.maroon}
                />
                {/* Polyline connecting all 3 */}
                <Polyline
                  coordinates={[volunteerCoords, pickupCoords, dropOffCoords]}
                  strokeColor={volunteerColors.maroon}
                  strokeWidth={4}
                />
              </MapView>

              {/* Map floating labels */}
              <View style={styles.mapLabelA}>
                <Text style={styles.mapLabelText}>1. START</Text>
              </View>
              <View style={styles.mapLabelB}>
                <Text style={styles.mapLabelBText}>2. PICKUP</Text>
              </View>
            </View>
          )}

          {/* Detailed 3-Step Route Breakdown */}
          <View style={styles.routeDetails}>
            {/* Step 1: Start Point */}
            <View style={styles.routePoint}>
              <View style={styles.routePointDotBlue} />
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointLabel}>1. STARTING POINT / CURRENT POSITION</Text>
                <Text style={styles.routePointAddress}>Volunteer Live Location · Jaffna</Text>
              </View>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.routeConnectorLine} />
            </View>

            {/* Step 2: Pickup Point */}
            <View style={styles.routePoint}>
              <View style={styles.routePointDotGreen} />
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointLabel}>2. PICKUP POINT (FOOD DONOR)</Text>
                <Text style={styles.routePointAddress}>{pickup.line1}, {pickup.city}</Text>
              </View>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.routeConnectorLine} />
            </View>

            {/* Step 3: Final Drop-off */}
            <View style={styles.routePoint}>
              <View style={styles.routePointDotRed} />
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointLabel}>3. FINAL DROP-OFF DESTINATION</Text>
                <Text style={styles.routePointAddress}>
                  {dropOff.name} · {dropOff.address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Karma Preview */}
        <View style={[styles.card, styles.karmaCard]}>
          <View style={styles.karmaPreviewRow}>
            <Ionicons name="leaf" size={20} color={volunteerColors.green} />
            <View style={styles.karmaPreviewInfo}>
              <Text style={styles.karmaPreviewTitle}>Karma Points Reward</Text>
              <Text style={styles.karmaPreviewSub}>
                Earn +{karmaPoints} points on completion
              </Text>
            </View>
            <View style={styles.karmaPreviewBadge}>
              <Text style={styles.karmaPreviewPoints}>+{karmaPoints}</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isOffered ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => accept.mutate()}
              disabled={accept.isPending}
            >
              {accept.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Start Ride to Pickup Point →</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => decline.mutate()}
              disabled={decline.isPending}
            >
              <Text style={styles.declineBtnText}>
                {decline.isPending ? 'Declining...' : 'Need Support / Report Delay'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push(`/(volunteer)/pickup/${id}`)}
          >
            <Text style={styles.primaryBtnText}>Proceed to Pickup →</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: volunteerColors.background },
  loadingText: { ...typography.body, color: volunteerColors.muted },
  error: { ...typography.h3, color: volunteerColors.urgentRed },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: volunteerColors.maroon,
  },
  backBtnText: { ...typography.bodyStrong, color: '#FFF' },

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
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerTaskId: { ...typography.bodyStrong, color: volunteerColors.ink },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Stepper */
  stepperCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  stepperRow: { flexDirection: 'row' },
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
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: volunteerColors.line,
  },
  stepLineDone: { backgroundColor: volunteerColors.green },
  stepLineActive: { backgroundColor: volunteerColors.maroon },
  stepLabel: { ...typography.caption, color: volunteerColors.muted },
  stepLabelActive: { color: volunteerColors.maroon, fontWeight: '700' },
  stepLabelDone: { color: volunteerColors.green, fontWeight: '600' },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  timeText: { ...typography.caption, color: volunteerColors.muted },

  /* Cards */
  card: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  cardTitle: { ...typography.bodyStrong, color: volunteerColors.ink },

  /* Food info */
  foodInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foodIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodInfoText: { flex: 1, gap: 2 },
  foodTitle: { ...typography.bodyStrong, color: volunteerColors.ink },
  foodMeta: { ...typography.caption, color: volunteerColors.muted },

  donorRow: {
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: 10,
    gap: 2,
  },
  donorLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  donorName: { ...typography.body, color: volunteerColors.ink, fontSize: 13 },

  instructionsRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: volunteerColors.infoBlueSoft,
    borderRadius: radius.md,
    padding: 10,
  },
  instructionsText: { ...typography.caption, color: volunteerColors.infoBlue, flex: 1 },

  /* Transit */
  transitMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transitMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transitMetricText: { ...typography.caption, color: volunteerColors.green, fontWeight: '600' },
  transitDot: { color: volunteerColors.muted },

  routeMapFrame: {
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  routeMap: { flex: 1 },
  mapLabelA: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: volunteerColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLabelText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  mapLabelB: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: volunteerColors.urgentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLabelBText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  routeDetails: { gap: 0 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routePointDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2B6CB0',
  },
  routePointDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: volunteerColors.green,
  },
  routePointDotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: volunteerColors.urgentRed,
  },
  routePointInfo: { flex: 1 },
  routePointLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  routePointAddress: { ...typography.body, color: volunteerColors.ink, fontSize: 13 },
  routeConnector: { paddingLeft: 5, paddingVertical: 2 },
  routeConnectorLine: {
    width: 2,
    height: 16,
    backgroundColor: volunteerColors.line,
  },

  /* Karma */
  karmaCard: { backgroundColor: volunteerColors.greenSoft, borderColor: volunteerColors.green + '33' },
  karmaPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  karmaPreviewInfo: { flex: 1, gap: 2 },
  karmaPreviewTitle: { ...typography.bodyStrong, color: volunteerColors.green },
  karmaPreviewSub: { ...typography.caption, color: volunteerColors.muted },
  karmaPreviewBadge: {
    backgroundColor: volunteerColors.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  karmaPreviewPoints: { ...typography.bodyStrong, color: '#FFF', fontSize: 16 },

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
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.bodyStrong, color: '#FFF' },
  declineBtn: { alignItems: 'center', paddingVertical: 8 },
  declineBtnText: { ...typography.caption, color: volunteerColors.muted, textDecorationLine: 'underline' },
});
