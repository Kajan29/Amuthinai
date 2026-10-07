import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { logo } from '@/constants';
import { getRouteTransitMapUrl } from '@/services/mapbox';

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const mapboxRouteUrl = getRouteTransitMapUrl({
    origin: { latitude: 9.6740, longitude: 80.0290 },
    destination: { latitude: 9.6630, longitude: 80.0245 },
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

  const accept = useMutation({
    mutationFn: () => assignmentsApi.accept(id),
    onSuccess: () => {
      router.push(`/(volunteer)/pickup/${id}`);
    },
  });

  if (assignment.isPending || donation.isPending) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color="#5A1626" size="large" />
        <Text style={styles.loadingText}>Loading assignment...</Text>
      </SafeAreaView>
    );
  }

  // Get data or fallback
  const donationData = donation.data;

  const taskId = id === 'asgn-vol-402' ? 'VOL-402' : id.slice(-4).toUpperCase();
  const title = donationData?.title?.includes('Biryani')
    ? '25 Fresh Veg Biryani Packets'
    : donationData?.title || '25 Fresh Veg Biryani Packets';

  const pickupDonor = donationData?.pickupAddress?.line1 || 'Nallur Community Hall Kitchen';
  const instructions =
    donationData?.description || 'Side gate entrance, ask for Master Chef Murugan.';

  function handleStartRide() {
    accept.mutate();
  }

  function handleCallDonor() {
    void Linking.openURL('tel:+94772345678');
  }

  function handleChatDonor() {
    Alert.alert('Donor Direct Chat', `Connected to ${pickupDonor}. Message sent: "I am en route for pickup."`);
  }

  function handleReportDelay() {
    Alert.alert(
      'Dispatch Support',
      'Need help or running late? Our volunteer coordinator is available at +94 21 222 3456',
      [{ text: 'Call Dispatch', onPress: () => void Linking.openURL('tel:+94212223456') }, { text: 'Cancel' }]
    );
  }

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
          <Text style={styles.headerTitle}>ACTIVE ASSIGNMENT</Text>
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
            {/* Step 1: Route (Active - Maroon Paper Plane) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleActive}>
                <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <Text style={styles.stepLabelActive}>Route</Text>
            </View>

            {/* Connecting Line: Step 1 -> Step 2 */}
            <View style={styles.stepLineMaroon} />

            {/* Step 2: Pickup (Inactive) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleInactive}>
                <Text style={styles.stepNumInactive}>2</Text>
              </View>
              <Text style={styles.stepLabelInactive}>Pickup</Text>
            </View>

            {/* Connecting Line: Step 2 -> Step 3 */}
            <View style={styles.stepLineGray} />

            {/* Step 3: Delivered (Inactive) */}
            <View style={styles.stepperItem}>
              <View style={styles.stepCircleInactive}>
                <Text style={styles.stepNumInactive}>3</Text>
              </View>
              <Text style={styles.stepLabelInactive}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* ─── STATUS BANNER ─── */}
        <View style={styles.statusBanner}>
          <View style={styles.statusLeft}>
            <View style={styles.greenStatusDot} />
            <Text style={styles.statusAssignedText}>Assigned to You</Text>
          </View>
          <View style={styles.statusRight}>
            <Ionicons name="time-outline" size={15} color="#1F2937" />
            <Text style={styles.statusTimeText}>12:45 PM – 1:15 PM</Text>
          </View>
        </View>

        {/* ─── FOOD DETAILS CARD ─── */}
        <View style={styles.card}>
          {/* Top Food Row */}
          <View style={styles.foodRow}>
            <View style={styles.foodIconBox}>
              <Ionicons name="cube-outline" size={26} color="#701A2B" />
            </View>
            <View style={styles.foodInfoCol}>
              <View style={styles.foodTitleRow}>
                <Text style={styles.foodTitle}>{title}</Text>
                <View style={styles.hotFoodBadge}>
                  <Text style={styles.hotFoodText}>Hot Food</Text>
                </View>
              </View>
              <View style={styles.foodSubtitleRow}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.foodSubtitle}>Insulated Hot Thermal Boxes</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Pickup Donor Info */}
          <View style={styles.donorSection}>
            <View style={styles.donorInfoCol}>
              <Text style={styles.donorSubLabel}>PICKUP DONOR</Text>
              <Text style={styles.donorName}>{pickupDonor}</Text>
            </View>

            {/* Call & Chat Circular Buttons */}
            <View style={styles.donorActionButtons}>
              <TouchableOpacity
                style={styles.donorCallButton}
                onPress={handleCallDonor}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.donorChatButton}
                onPress={handleChatDonor}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble" size={16} color="#701A2B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions Box */}
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
            <Text style={styles.transitMetricText}>3.8 km total • ~14 mins</Text>
          </View>
        </View>

        {/* Transit Route Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapCanvas}>
            {/* Background Mapbox transit route canvas */}
            <View style={styles.transitMapBg}>
              <Image
                source={{ uri: mapboxRouteUrl }}
                style={styles.mapboxRouteImage}
                resizeMode="cover"
              />
              <View style={styles.transitDashedPath} />

              {/* Point A Marker & Callout */}
              <View style={styles.markerAPosition}>
                <View style={styles.markerACircle}>
                  <Text style={styles.markerLetter}>A</Text>
                </View>
                <View style={styles.calloutBoxA}>
                  <Text style={styles.calloutSubLabel}>PICKUP POINT</Text>
                  <Text style={styles.calloutTitle}>Nallur Temple Road</Text>
                </View>
              </View>

              {/* Moving Scooter Icon */}
              <View style={styles.scooterBadge}>
                <Text style={styles.scooterEmoji}>🛵</Text>
              </View>

              {/* Point B Marker & Callout */}
              <View style={styles.markerBPosition}>
                <View style={styles.calloutBoxB}>
                  <Text style={styles.calloutSubLabel}>DROPOFF HUB</Text>
                  <Text style={styles.calloutTitle}>St. John's Community Hub</Text>
                </View>
                <View style={styles.markerBCircle}>
                  <Text style={styles.markerLetter}>B</Text>
                </View>
              </View>

              {/* Compass / Locate Button */}
              <TouchableOpacity style={styles.compassButton} activeOpacity={0.8}>
                <Ionicons name="locate" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── BOTTOM ACTION FOOTER ─── */}
        <TouchableOpacity
          style={styles.startRideButton}
          onPress={handleStartRide}
          disabled={accept.isPending}
          activeOpacity={0.85}
        >
          {accept.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.startRideButtonText}>Start Ride to Pickup Point →</Text>
          )}
        </TouchableOpacity>

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
});
