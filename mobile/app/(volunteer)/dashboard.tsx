import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi, type NearbyTask } from '@/api/assignments.api';
import { pointsApi } from '@/api/points.api';
import { Badge } from '@/components/ui';
import { URGENT_THRESHOLD_MINUTES, logo } from '@/constants';
import { MOCK_DROP_OFFS, type TaskDropOffDestination } from '@/constants/mockVolunteerData';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { radius, typography } from '@/theme';
import { volunteerColors, getTier } from '@/theme/volunteer';
import { toLatLng } from '@/utils/geo';
import { MapView, Marker, Polyline } from '@/utils/maps';

// Default Jaffna center fallback if GPS is pending
const JAFFNA_DEFAULT = { latitude: 9.6645, longitude: 80.0200 };

/** Helper to get destination details for a task */
function getDropOffInfo(task: NearbyTask): TaskDropOffDestination {
  const reqId = task.assignment.requestId;
  if (reqId && MOCK_DROP_OFFS[reqId]) {
    return MOCK_DROP_OFFS[reqId]!;
  }
  return {
    name: 'Jaffna Community Food Hub',
    address: '45 Main Street, Jaffna',
    city: task.donation.pickupAddress.city || 'Jaffna',
    latitude: 9.6690,
    longitude: 80.0270,
    contactPerson: 'Hub Coordinator',
    phone: '+94 77 234 5678',
  };
}

/**
 * FR8 — Amuthinai Volunteer Dashboard
 * Features:
 * 1. Live GPS Location & Proximity Matching
 * 2. Prominent Active Delivery Route (Starting Point -> Current Location -> Pickup -> Drop-off)
 * 3. Urgent Tasks First (red urgency indicator) followed by Nearest Available Tasks
 * 4. Rich Card-based layout with food type, quantity, locations, distance, time, urgency, karma & Accept button
 */
export default function VolunteerDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(true);

  // 1. Volunteer Live GPS Location
  const { point: currentLocation, isLoading: locationLoading, refresh: refreshLocation } = useLocation();

  // Queries
  const tasks = useOfflineQuery('volunteer.nearby', () => assignmentsApi.nearby());
  const pointsSummary = useOfflineQuery('volunteer.points', () => pointsApi.summary());

  const items = tasks.data ?? [];

  // Active task (in progress)
  const activeTask = items.find(
    (task) => task.assignment.status === 'accepted'
  );

  // Filter available tasks (excluding current active)
  const availableTasks = items.filter((task) => task.assignment.id !== activeTask?.assignment.id);

  // Urgent tasks: <= 30 mins threshold
  const urgentTasks = useMemo(
    () => availableTasks.filter((task) => task.minutesLeft <= URGENT_THRESHOLD_MINUTES),
    [availableTasks]
  );

  // Normal tasks sorted by distance
  const normalTasks = useMemo(
    () =>
      availableTasks
        .filter((task) => task.minutesLeft > URGENT_THRESHOLD_MINUTES)
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [availableTasks]
  );

  const karmaBalance = pointsSummary.data?.balance ?? user?.karmaPoints ?? 680;
  const tier = getTier(karmaBalance);

  // User coordinate
  const userCoords = currentLocation
    ? toLatLng(currentLocation)
    : JAFFNA_DEFAULT;

  // Render Dashboard Header & Map
  function renderHeader() {
    // Dropoff for active task
    const activeDropOff = activeTask ? getDropOffInfo(activeTask) : null;
    const activePickupCoords = activeTask
      ? toLatLng(activeTask.donation.pickupAddress.location)
      : null;
    const activeDropCoords = activeDropOff
      ? { latitude: activeDropOff.latitude, longitude: activeDropOff.longitude }
      : null;

    return (
      <View>
        {/* — Brand Header Bar — */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.karmaBadgeHeader}
              onPress={() => router.push('/(volunteer)/karma')}
              activeOpacity={0.8}
            >
              <Text style={styles.karmaBadgeHeaderIcon}>{tier.icon}</Text>
              <Text style={styles.karmaBadgeHeaderText}>{karmaBalance} KP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/(volunteer)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'V'}
                {user?.name?.split(' ')[1]?.charAt(0)?.toUpperCase() ?? ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* — Live GPS Location Bar — */}
        <View style={styles.locationBar}>
          <View style={styles.locationBarLeft}>
            <View style={styles.gpsPulseDot} />
            <View style={styles.locationTextGroup}>
              <Text style={styles.locationTitle}>
                {locationLoading ? 'Detecting GPS position...' : 'Current Location: Jaffna Hub Area'}
              </Text>
              <Text style={styles.locationSubtitle}>
                {currentLocation
                  ? `${currentLocation.coordinates[1].toFixed(4)}°N, ${currentLocation.coordinates[0].toFixed(4)}°E · 5km Radius`
                  : 'GPS calibrated · Showing nearest tasks'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.locationRefreshBtn}
            onPress={() => void refreshLocation()}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={volunteerColors.maroon} />
            ) : (
              <Ionicons name="locate" size={16} color={volunteerColors.maroon} />
            )}
            <Text style={styles.locationRefreshText}>Calibrate</Text>
          </TouchableOpacity>
        </View>

        {/* — Availability Toggle Banner — */}
        <View style={styles.readyBanner}>
          <View style={styles.readyRow}>
            <View style={styles.readyLabelRow}>
              <View style={[styles.statusDot, isReady ? styles.statusDotOn : styles.statusDotOff]} />
              <View>
                <Text style={styles.readyLabel}>
                  {isReady ? 'Ready for Deliveries' : 'Status: Paused'}
                </Text>
                <Text style={styles.readySubtext}>
                  {isReady
                    ? 'Receiving urgent pickups & community rescue requests'
                    : 'Turn on to receive nearby tasks'}
                </Text>
              </View>
            </View>
            <Switch
              value={isReady}
              onValueChange={setIsReady}
              trackColor={{ false: volunteerColors.line, true: volunteerColors.green }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* — Interactive Map Section — */}
        {Platform.OS !== 'web' && MapView && (
          <View style={styles.mapFrame}>
            <MapView
              style={styles.map}
              initialRegion={{
                ...userCoords,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {/* Volunteer's Live Location Marker */}
              <Marker
                coordinate={userCoords}
                title="Your Current Location"
                description="Volunteer Live Position"
                pinColor="#2B6CB0"
              />

              {/* Task Markers */}
              {items.map((task) => {
                const isTaskActive = task.assignment.id === activeTask?.assignment.id;
                const isUrgent = task.minutesLeft <= URGENT_THRESHOLD_MINUTES;
                return (
                  <Marker
                    key={task.assignment.id}
                    coordinate={toLatLng(task.donation.pickupAddress.location)}
                    title={task.donation.title}
                    description={`${task.distanceKm} km away · ${task.donation.servings} servings`}
                    pinColor={
                      isTaskActive
                        ? volunteerColors.orange
                        : isUrgent
                          ? volunteerColors.urgentRed
                          : volunteerColors.green
                    }
                  />
                );
              })}

              {/* Active Route Polyline: User -> Pickup -> Drop-off */}
              {activeTask && activePickupCoords && activeDropCoords && (
                <>
                  <Marker
                    coordinate={activeDropCoords}
                    title={activeDropOff?.name ?? 'Drop-off'}
                    description="Final Destination"
                    pinColor={volunteerColors.maroon}
                  />
                  <Polyline
                    coordinates={[userCoords, activePickupCoords, activeDropCoords]}
                    strokeColor={volunteerColors.maroon}
                    strokeWidth={4}
                  />
                </>
              )}
            </MapView>

            {/* Floating zone chip */}
            <View style={styles.zoneChip}>
              <Ionicons name="shield-checkmark" size={14} color={volunteerColors.green} />
              <Text style={styles.zoneText}>Jaffna Relief Sector</Text>
            </View>
          </View>
        )}

        {/* — PROMINENT ACTIVE DELIVERY ROUTE CARD (When Active Task Exists) — */}
        {activeTask && (
          <View style={styles.activeSection}>
            <ActiveDeliveryRouteCard
              task={activeTask}
              currentLocationCoords={userCoords}
              dropOff={getDropOffInfo(activeTask)}
            />
          </View>
        )}

        {/* — Section Header for Urgent Tasks — */}
        {urgentTasks.length > 0 && (
          <View style={styles.sectionHeaderUrgent}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.urgentHeaderBadge}>
                <Ionicons name="flame" size={16} color="#FFF" />
              </View>
              <View>
                <Text style={styles.urgentSectionTitle}>URGENT TASKS (Expires Soon)</Text>
                <Text style={styles.urgentSectionSubtitle}>
                  Critical safe consumption window · Immediate pickup requested
                </Text>
              </View>
            </View>
            <View style={styles.urgentCountBadge}>
              <Text style={styles.urgentCountText}>{urgentTasks.length} Urgent</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Combine urgent tasks first, then nearest available tasks
  const combinedTasks = useMemo(() => {
    return [...urgentTasks, ...normalTasks];
  }, [urgentTasks, normalTasks]);

  return (
    <View style={styles.root}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={combinedTasks}
        keyExtractor={(task) => task.assignment.id}
        refreshing={tasks.isFetching}
        onRefresh={() => {
          void tasks.refetch();
          void refreshLocation();
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={54} color={volunteerColors.muted} />
            <Text style={styles.emptyTitle}>All deliveries caught up!</Text>
            <Text style={styles.emptySubtext}>
              New food donations and community distribution requests will appear automatically based on your location.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isUrgent = item.minutesLeft <= URGENT_THRESHOLD_MINUTES;
          const dropOff = getDropOffInfo(item);
          const showNormalHeader = index === urgentTasks.length && normalTasks.length > 0;

          return (
            <View>
              {showNormalHeader && (
                <View style={styles.sectionHeaderNormal}>
                  <View>
                    <Text style={styles.normalSectionTitle}>NEAREST AVAILABLE TASKS</Text>
                    <Text style={styles.normalSectionSubtitle}>
                      Sorted by distance from your current location
                    </Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Ionicons name="navigate" size={12} color={volunteerColors.green} />
                    <Text style={styles.distanceBadgeText}>Nearby First</Text>
                  </View>
                </View>
              )}
              <TaskCard
                task={item}
                isUrgent={isUrgent}
                dropOff={dropOff}
                karmaPoints={Math.round(item.distanceKm * 20 + item.donation.servings * 2)}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Active Delivery Route Card — Prominently shows:
 * 1. Starting Point / Volunteer Current Location
 * 2. Pickup Point (Donor)
 * 3. Final Drop-off Location (Community Food Hub / Recipient)
 * 4. Estimated Distance and Travel Time
 * 5. Route Stepper (Route -> Pickup -> Delivery)
 * ═══════════════════════════════════════════════════════════════════ */
function ActiveDeliveryRouteCard({
  task,
  dropOff,
}: {
  task: NearbyTask;
  currentLocationCoords: { latitude: number; longitude: number };
  dropOff: TaskDropOffDestination;
}) {
  const pickup = task.donation.pickupAddress;
  const estTime = Math.round(task.distanceKm * 4); // ~4 min per km in Jaffna traffic
  const karmaReward = Math.round(task.distanceKm * 20 + task.donation.servings * 2);

  return (
    <Pressable
      style={styles.activeCard}
      onPress={() => router.push(`/(volunteer)/assignment/${task.assignment.id}`)}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
    >
      {/* Top Banner */}
      <View style={styles.activeTopBanner}>
        <View style={styles.activeBadgeRow}>
          <View style={styles.activeLivePill}>
            <View style={styles.activeLiveDot} />
            <Text style={styles.activeLiveText}>ACTIVE DELIVERY ROUTE</Text>
          </View>
          <Badge label="In Progress" tone="warning" />
        </View>
        <Text style={styles.activeKarmaPreview}>+{karmaReward} KP Reward</Text>
      </View>

      {/* Route Stepper: Route -> Pickup -> Delivery */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {/* Step 1: Route */}
          <View style={styles.stepperItem}>
            <View style={[styles.stepCircle, styles.stepCircleDone]}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </View>
            <Text style={[styles.stepText, styles.stepTextDone]}>Route</Text>
          </View>
          <View style={[styles.stepperLine, styles.stepperLineActive]} />

          {/* Step 2: Pickup */}
          <View style={styles.stepperItem}>
            <View style={[styles.stepCircle, styles.stepCircleCurrent]}>
              <Ionicons name="fast-food" size={11} color={volunteerColors.maroon} />
            </View>
            <Text style={[styles.stepText, styles.stepTextCurrent]}>Pickup</Text>
          </View>
          <View style={styles.stepperLine} />

          {/* Step 3: Delivery */}
          <View style={styles.stepperItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleNum}>3</Text>
            </View>
            <Text style={styles.stepText}>Delivery</Text>
          </View>
        </View>
      </View>

      {/* Task Summary Header */}
      <View style={styles.activeFoodHeader}>
        <View style={styles.activeFoodIconBox}>
          <Ionicons name="restaurant" size={22} color={volunteerColors.maroon} />
        </View>
        <View style={styles.activeFoodDetails}>
          <Text style={styles.activeFoodTitle} numberOfLines={1}>
            {task.donation.title}
          </Text>
          <Text style={styles.activeFoodMeta}>
            {task.donation.servings} Servings · {task.donation.foodType === 'cooked' ? 'Hot Cooked Meals' : task.donation.foodType}
          </Text>
        </View>
      </View>

      {/* 3-Point Route Guidance Display */}
      <View style={styles.routeTimelineContainer}>
        {/* Point 1: Starting Point / Volunteer Current Location */}
        <View style={styles.routeItemRow}>
          <View style={styles.routeItemLeft}>
            <View style={styles.routeDotStart}>
              <Ionicons name="navigate" size={10} color="#FFF" />
            </View>
            <View style={styles.routeItemStem} />
          </View>
          <View style={styles.routeItemContent}>
            <Text style={styles.routePointTag}>STARTING POINT / CURRENT LOCATION</Text>
            <Text style={styles.routePointTitle}>Volunteer Live GPS Position</Text>
            <Text style={styles.routePointAddress}>Near Nallur / Jaffna City Centre</Text>
          </View>
        </View>

        {/* Point 2: Pickup Point (Donor) */}
        <View style={styles.routeItemRow}>
          <View style={styles.routeItemLeft}>
            <View style={styles.routeDotPickup}>
              <Ionicons name="arrow-down" size={10} color="#FFF" />
            </View>
            <View style={styles.routeItemStem} />
          </View>
          <View style={styles.routeItemContent}>
            <Text style={styles.routePointTag}>PICKUP POINT (FOOD DONOR)</Text>
            <Text style={styles.routePointTitle}>{task.donation.title.split('-')[0]?.trim() || pickup.line1}</Text>
            <Text style={styles.routePointAddress}>{pickup.line1}, {pickup.city}</Text>
          </View>
        </View>

        {/* Point 3: Final Drop-off Location (Food Hub / Recipient) */}
        <View style={styles.routeItemRow}>
          <View style={styles.routeItemLeft}>
            <View style={styles.routeDotDrop}>
              <Ionicons name="location" size={10} color="#FFF" />
            </View>
          </View>
          <View style={styles.routeItemContent}>
            <Text style={styles.routePointTag}>FINAL DROP-OFF LOCATION</Text>
            <Text style={styles.routePointTitle}>{dropOff.name}</Text>
            <Text style={styles.routePointAddress}>{dropOff.address}</Text>
          </View>
        </View>
      </View>

      {/* Estimated Metrics: Distance & Travel Time */}
      <View style={styles.metricsPillRow}>
        <View style={styles.metricItemPill}>
          <Ionicons name="speedometer-outline" size={14} color={volunteerColors.green} />
          <Text style={styles.metricItemText}>{task.distanceKm} km total route</Text>
        </View>
        <View style={styles.metricItemPill}>
          <Ionicons name="time-outline" size={14} color={volunteerColors.green} />
          <Text style={styles.metricItemText}>~{estTime} mins travel time</Text>
        </View>
        <View style={[styles.metricItemPill, styles.metricItemPillUrgent]}>
          <Ionicons name="hourglass-outline" size={14} color={volunteerColors.maroon} />
          <Text style={styles.metricItemTextUrgent}>{task.minutesLeft}m safe left</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.activeActionsRow}>
        <TouchableOpacity
          style={styles.activePrimaryBtn}
          onPress={() => router.push(`/(volunteer)/pickup/${task.assignment.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.activePrimaryBtnText}>Proceed to Pickup Verification →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activeSecondaryBtn}
          onPress={() => router.push(`/(volunteer)/assignment/${task.assignment.id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.activeSecondaryBtnText}>View Full Route & Details</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Task Card — Requirements:
 * Shows:
 * 1. Food type
 * 2. Quantity
 * 3. Pickup location
 * 4. Drop-off location
 * 5. Distance
 * 6. Estimated time
 * 7. Urgency (red urgent indicator)
 * 8. Karma points
 * 9. Clear Accept Task button
 * ═══════════════════════════════════════════════════════════════════ */
function TaskCard({
  task,
  isUrgent,
  dropOff,
  karmaPoints,
}: {
  task: NearbyTask;
  isUrgent: boolean;
  dropOff: TaskDropOffDestination;
  karmaPoints: number;
}) {
  const pickup = task.donation.pickupAddress;
  const estTime = Math.round(task.distanceKm * 4);

  // Food type icon map
  const foodIcons: Record<string, string> = {
    cooked: 'restaurant',
    raw: 'leaf',
    packaged: 'cube',
    bakery: 'pizza',
    dairy: 'water',
    beverage: 'cafe',
  };
  const iconName = (foodIcons[task.donation.foodType] ?? 'fast-food') as any;

  return (
    <View style={[styles.taskCard, isUrgent && styles.taskCardUrgent]}>
      {/* 1. Urgency & Karma Points Row */}
      <View style={styles.taskCardTop}>
        <View style={styles.taskBadgeGroup}>
          {isUrgent ? (
            <View style={styles.urgentAlertPill}>
              <View style={styles.urgentDotPulse} />
              <Ionicons name="warning" size={12} color="#FFF" />
              <Text style={styles.urgentAlertText}>
                URGENT PICKUP · {task.minutesLeft} MINS LEFT
              </Text>
            </View>
          ) : (
            <View style={styles.scheduledPill}>
              <Ionicons name="time" size={12} color={volunteerColors.green} />
              <Text style={styles.scheduledPillText}>Available for Pickup</Text>
            </View>
          )}
        </View>

        <View style={styles.karmaPointPill}>
          <Text style={styles.karmaPointEmoji}>🌟</Text>
          <Text style={styles.karmaPointText}>+{karmaPoints} KP</Text>
        </View>
      </View>

      {/* 2. Food Title & Quantity */}
      <View style={styles.taskFoodHeader}>
        <View style={[styles.foodIconFrame, isUrgent && styles.foodIconFrameUrgent]}>
          <Ionicons name={iconName} size={20} color={isUrgent ? volunteerColors.urgentRed : volunteerColors.maroon} />
        </View>
        <View style={styles.foodTitleGroup}>
          <Text style={styles.taskFoodTitle} numberOfLines={1}>
            {task.donation.title}
          </Text>
          <View style={styles.foodTagRow}>
            <View style={styles.quantityChip}>
              <Text style={styles.quantityChipText}>
                {task.donation.servings} Servings / Packs
              </Text>
            </View>
            <View style={styles.foodTypeChip}>
              <Text style={styles.foodTypeChipText}>
                {task.donation.foodType.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Pickup & Drop-off Locations */}
      <View style={styles.locationsCard}>
        {/* Pickup */}
        <View style={styles.locationLineRow}>
          <View style={styles.locationPinCircleGreen}>
            <Ionicons name="arrow-up" size={10} color="#FFF" />
          </View>
          <View style={styles.locationTexts}>
            <Text style={styles.locationRoleLabel}>PICKUP LOCATION</Text>
            <Text style={styles.locationAddressText} numberOfLines={1}>
              {pickup.line1}, {pickup.city}
            </Text>
          </View>
        </View>

        <View style={styles.locationConnector} />

        {/* Drop-off */}
        <View style={styles.locationLineRow}>
          <View style={styles.locationPinCircleRed}>
            <Ionicons name="location" size={10} color="#FFF" />
          </View>
          <View style={styles.locationTexts}>
            <Text style={styles.locationRoleLabel}>DROP-OFF DESTINATION</Text>
            <Text style={styles.locationAddressText} numberOfLines={1}>
              {dropOff.name} · {dropOff.address}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Travel Distance & Estimated Time + Clear Accept Task Button */}
      <View style={styles.taskCardFooter}>
        <View style={styles.travelMetricsCol}>
          <View style={styles.travelMetricRow}>
            <Ionicons name="navigate-outline" size={13} color={volunteerColors.green} />
            <Text style={styles.travelMetricVal}>{task.distanceKm} km away</Text>
          </View>
          <View style={styles.travelMetricRow}>
            <Ionicons name="time-outline" size={13} color={volunteerColors.muted} />
            <Text style={styles.travelMetricTime}>~{estTime} mins ride</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.acceptTaskBtn, isUrgent && styles.acceptTaskBtnUrgent]}
          onPress={() => router.push(`/(volunteer)/assignment/${task.assignment.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptTaskBtnText}>Accept Task</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Styles
 * ═══════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: volunteerColors.background },
  list: { flex: 1 },
  listContent: { paddingBottom: 110 },

  /* — Header Bar — */
  headerBar: {
    backgroundColor: volunteerColors.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 124, height: 38 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  karmaBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  karmaBadgeHeaderIcon: { fontSize: 13 },
  karmaBadgeHeaderText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  /* — Location Bar — */
  locationBar: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  locationBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gpsPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: volunteerColors.green,
    borderWidth: 2,
    borderColor: volunteerColors.greenSoft,
  },
  locationTextGroup: { flex: 1 },
  locationTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  locationSubtitle: { ...typography.caption, color: volunteerColors.muted, fontSize: 11, marginTop: 1 },
  locationRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.maroonSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  locationRefreshText: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700', fontSize: 11 },

  /* — Ready Banner — */
  readyBanner: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  readyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotOn: { backgroundColor: volunteerColors.green },
  statusDotOff: { backgroundColor: volunteerColors.muted },
  readyLabel: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  readySubtext: { ...typography.caption, color: volunteerColors.muted, fontSize: 11, marginTop: 2 },

  /* — Map Frame — */
  mapFrame: {
    height: 210,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
    position: 'relative',
  },
  map: { flex: 1 },
  zoneChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  zoneText: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700', fontSize: 11 },

  /* — Active Route Section & Card — */
  activeSection: { paddingHorizontal: 16, paddingTop: 14 },
  activeCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: volunteerColors.maroon,
    padding: 16,
    gap: 12,
    shadowColor: volunteerColors.maroon,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
    paddingBottom: 10,
  },
  activeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.maroonSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 5,
  },
  activeLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: volunteerColors.maroon },
  activeLiveText: { fontSize: 10, fontWeight: '800', color: volunteerColors.maroon, letterSpacing: 0.5 },
  activeKarmaPreview: { fontSize: 12, fontWeight: '800', color: volunteerColors.orange },

  /* Stepper */
  stepperContainer: { paddingVertical: 4 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  stepperItem: { alignItems: 'center', gap: 3 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: volunteerColors.surfaceAlt,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: volunteerColors.green, borderColor: volunteerColors.green },
  stepCircleCurrent: {
    backgroundColor: volunteerColors.maroonSoft,
    borderWidth: 2,
    borderColor: volunteerColors.maroon,
  },
  stepCircleNum: { fontSize: 11, fontWeight: '700', color: volunteerColors.muted },
  stepText: { ...typography.caption, fontSize: 11, color: volunteerColors.muted },
  stepTextDone: { color: volunteerColors.green, fontWeight: '700' },
  stepTextCurrent: { color: volunteerColors.maroon, fontWeight: '800' },
  stepperLine: { flex: 1, height: 2, backgroundColor: volunteerColors.line, marginHorizontal: 6, marginBottom: 16 },
  stepperLineActive: { backgroundColor: volunteerColors.green },

  /* Active Food Info */
  activeFoodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: volunteerColors.surfaceAlt,
    padding: 10,
    borderRadius: radius.md,
  },
  activeFoodIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFoodDetails: { flex: 1 },
  activeFoodTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 14 },
  activeFoodMeta: { ...typography.caption, color: volunteerColors.muted, fontSize: 12, marginTop: 1 },

  /* 3-Point Route Timeline */
  routeTimelineContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: volunteerColors.line,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  routeItemRow: { flexDirection: 'row', gap: 10 },
  routeItemLeft: { width: 20, alignItems: 'center' },
  routeDotStart: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2B6CB0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDotPickup: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: volunteerColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDotDrop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: volunteerColors.urgentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeItemStem: {
    width: 2,
    height: 34,
    backgroundColor: volunteerColors.line,
    marginVertical: 2,
  },
  routeItemContent: { flex: 1, paddingBottom: 8 },
  routePointTag: { fontSize: 9, fontWeight: '800', color: volunteerColors.muted, letterSpacing: 0.6 },
  routePointTitle: { ...typography.bodyStrong, fontSize: 13, color: volunteerColors.ink },
  routePointAddress: { ...typography.caption, fontSize: 11, color: volunteerColors.muted },

  /* Metrics Pills */
  metricsPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  metricItemText: { ...typography.caption, color: volunteerColors.green, fontWeight: '700', fontSize: 11 },
  metricItemPillUrgent: { backgroundColor: volunteerColors.maroonSoft },
  metricItemTextUrgent: { ...typography.caption, color: volunteerColors.maroon, fontWeight: '700', fontSize: 11 },

  /* Active Action Buttons */
  activeActionsRow: { gap: 8, marginTop: 4 },
  activePrimaryBtn: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activePrimaryBtnText: { ...typography.bodyStrong, color: '#FFF', fontSize: 14 },
  activeSecondaryBtn: {
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeSecondaryBtnText: { ...typography.caption, color: volunteerColors.ink, fontWeight: '700', fontSize: 12 },

  /* — Urgent Section Header — */
  sectionHeaderUrgent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  urgentHeaderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: volunteerColors.urgentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: volunteerColors.urgentRed,
    letterSpacing: 0.8,
  },
  urgentSectionSubtitle: { ...typography.caption, color: volunteerColors.muted, fontSize: 11 },
  urgentCountBadge: {
    backgroundColor: volunteerColors.urgentRedSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  urgentCountText: { fontSize: 11, fontWeight: '800', color: volunteerColors.urgentRed },

  /* — Normal Section Header — */
  sectionHeaderNormal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  normalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: volunteerColors.ink,
    letterSpacing: 0.6,
  },
  normalSectionSubtitle: { ...typography.caption, color: volunteerColors.muted, fontSize: 11 },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  distanceBadgeText: { fontSize: 10, fontWeight: '700', color: volunteerColors.green },

  /* — Task Card — */
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  taskCardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: volunteerColors.urgentRed,
    backgroundColor: '#FFFDFD',
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskBadgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.urgentRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 5,
  },
  urgentDotPulse: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFF' },
  urgentAlertText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.4 },
  scheduledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
  },
  scheduledPillText: { fontSize: 11, fontWeight: '700', color: volunteerColors.green },
  karmaPointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.orangeSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  karmaPointEmoji: { fontSize: 11 },
  karmaPointText: { fontSize: 11, fontWeight: '800', color: volunteerColors.orange },

  /* Food header in task card */
  taskFoodHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foodIconFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodIconFrameUrgent: {
    backgroundColor: volunteerColors.urgentRedSoft,
  },
  foodTitleGroup: { flex: 1, gap: 3 },
  taskFoodTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 14 },
  foodTagRow: { flexDirection: 'row', gap: 6 },
  quantityChip: {
    backgroundColor: volunteerColors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  quantityChipText: { fontSize: 11, color: volunteerColors.muted, fontWeight: '600' },
  foodTypeChip: {
    backgroundColor: volunteerColors.orangeSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  foodTypeChipText: { fontSize: 10, color: volunteerColors.orange, fontWeight: '700' },

  /* Locations card */
  locationsCard: {
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  locationLineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationPinCircleGreen: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: volunteerColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinCircleRed: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: volunteerColors.urgentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTexts: { flex: 1 },
  locationRoleLabel: { fontSize: 9, fontWeight: '800', color: volunteerColors.muted, letterSpacing: 0.5 },
  locationAddressText: { ...typography.body, fontSize: 12, color: volunteerColors.ink, fontWeight: '600' },
  locationConnector: {
    width: 2,
    height: 10,
    backgroundColor: volunteerColors.line,
    marginLeft: 7,
  },

  /* Task Card Footer */
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: volunteerColors.line,
  },
  travelMetricsCol: { gap: 2 },
  travelMetricRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  travelMetricVal: { fontSize: 12, fontWeight: '700', color: volunteerColors.green },
  travelMetricTime: { fontSize: 11, color: volunteerColors.muted },

  acceptTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: volunteerColors.maroon,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    shadowColor: volunteerColors.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptTaskBtnUrgent: {
    backgroundColor: volunteerColors.urgentRed,
  },
  acceptTaskBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  /* — Empty State — */
  emptyContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyTitle: { ...typography.h3, color: volunteerColors.ink },
  emptySubtext: { ...typography.body, color: volunteerColors.muted, textAlign: 'center' },
});
