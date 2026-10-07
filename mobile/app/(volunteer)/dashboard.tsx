import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi, type NearbyTask } from '@/api/assignments.api';
import { pointsApi } from '@/api/points.api';
import { logo } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, spacing } from '@/theme';
import { volunteerColors } from '@/theme/volunteer';
import { getVolunteerDashboardMapUrl } from '@/services/mapbox';
import { toLatLng } from '@/utils/geo';

const JAFFNA_DEFAULT = { latitude: 9.6645, longitude: 80.0200 };

export default function VolunteerDashboard() {
  const insets = useSafeAreaInsets();
  const { user, confirmLogout } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Live GPS Location
  const { point: currentLocation } = useLocation();

  // 2. Data Queries
  const tasks = useOfflineQuery('volunteer.nearby', () => assignmentsApi.nearby());
  const pointsSummary = useOfflineQuery('volunteer.points', () => pointsApi.summary());

  const items: NearbyTask[] = tasks.data ?? [];

  // Active task in progress
  const activeTask = items.find(
    (task) => task.assignment.status === 'accepted'
  );

  const karmaBalance = pointsSummary.data?.balance ?? user?.karmaPoints ?? 680;
  const displayName = user?.name || 'Volunteer Kajan';
  const initials = 'VK';

  const userCoords = currentLocation ? toLatLng(currentLocation) : JAFFNA_DEFAULT;
  const mapboxUrl = getVolunteerDashboardMapUrl(userCoords);

  function toggleSidebar() {
    setSidebarVisible((prev) => !prev);
  }

  function handleTaskSelect(taskId: string) {
    router.push(`/(volunteer)/assignment/${taskId}`);
  }

  function handleAcceptRide(taskId: string) {
    router.push(`/(volunteer)/assignment/${taskId}`);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ─── SIDEBAR OVERLAY ─── */}
        {sidebarVisible && (
          <Pressable style={styles.overlay} onPress={() => setSidebarVisible(false)} />
        )}

        {/* ─── SIDEBAR DRAWER ─── */}
        <Animated.View style={[styles.sidebar, sidebarVisible && styles.sidebarVisible]}>
          <View style={styles.sidebarHeader}>
            <Image source={logo} style={styles.sidebarLogo} resizeMode="contain" />
            <View style={styles.sidebarUserRow}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>{initials}</Text>
              </View>
              <View style={styles.sidebarUserInfo}>
                <Text style={styles.sidebarUserName}>{displayName}</Text>
                <View style={styles.sidebarRoleBadge}>
                  <View style={styles.sidebarRoleDot} />
                  <Text style={styles.sidebarUserRole}>Active Volunteer • {karmaBalance} KP</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.sidebarItem, styles.sidebarItemActive]}
              onPress={() => setSidebarVisible(false)}
            >
              <Ionicons name="home" size={22} color={volunteerColors.maroon} />
              <Text style={[styles.sidebarItemText, styles.sidebarItemTextActive]}>Home Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(volunteer)/tasks');
              }}
            >
              <Ionicons name="clipboard-outline" size={22} color="#374151" />
              <Text style={styles.sidebarItemText}>Available Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(volunteer)/map');
              }}
            >
              <Ionicons name="map-outline" size={22} color="#374151" />
              <Text style={styles.sidebarItemText}>Hub Map & Routes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(volunteer)/karma');
              }}
            >
              <Ionicons name="heart-outline" size={22} color="#374151" />
              <Text style={styles.sidebarItemText}>Community Impact</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(volunteer)/profile');
              }}
            >
              <Ionicons name="person-outline" size={22} color="#374151" />
              <Text style={styles.sidebarItemText}>Volunteer Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                Alert.alert(
                  'Food Safety Guidelines',
                  '1. Maintain food containers above 60°C or refrigerated below 5°C.\n2. Ensure tamper-proof seals are intact.\n3. Verify donor & recipient identity before handover.',
                  [{ text: 'Understood' }]
                );
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#374151" />
              <Text style={styles.sidebarItemText}>Food Safety Guidelines</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(volunteer)/raise-concern');
              }}
            >
              <Ionicons name="alert-circle-outline" size={22} color={volunteerColors.maroon} />
              <Text style={styles.sidebarItemText}>Raise Concern / Report Issue</Text>
            </TouchableOpacity>

            <View style={styles.sidebarDivider} />

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                confirmLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={[styles.sidebarItemText, { color: colors.danger, fontWeight: '700' }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* ─── SCREEN 1: TOP HEADER BAR ─── */}
        <View style={styles.headerBar}>
          {/* Hamburger Menu Button */}
          <TouchableOpacity
            onPress={toggleSidebar}
            style={styles.circularHeaderButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={22} color="#1F2937" />
          </TouchableOpacity>

          {/* Center Logo */}
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />

          {/* Right: Notifications & User Avatar */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.circularHeaderButton}
              onPress={() => router.push('/(volunteer)/tasks')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color="#1F2937" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/(volunteer)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{initials}</Text>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SCROLLABLE DASHBOARD BODY ─── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 36) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── SEARCH BAR ─── */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={19} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks by area, shelter, food type..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              onPress={() => {
                if (searchQuery) setSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ─── HERO MAP CARD ─── */}
          <View style={styles.mapCard}>
            {/* Visual Map Background with real Mapbox Streets API */}
            <View style={styles.mapCanvas}>
              <Image
                source={{ uri: mapboxUrl }}
                style={styles.mapboxImage}
                resizeMode="cover"
              />

              {/* Floating Pill: Ready for Deliveries & Switch */}
              <View style={styles.readyFloatingPill}>
                <View style={styles.readyTextGroup}>
                  <View style={styles.readyTitleRow}>
                    <View style={styles.greenLiveDot} />
                    <Text style={styles.readyTitleText}>Ready for Deliveries</Text>
                  </View>
                  <Text style={styles.readySubText}>3 Tasks Available Nearby</Text>
                </View>
                <Switch
                  value={isReady}
                  onValueChange={setIsReady}
                  trackColor={{ false: '#D1D5DB', true: '#42121E' }}
                  thumbColor="#FFFFFF"
                  style={styles.switchControl}
                />
              </View>

              {/* Floating Map Pin 1: 'You' */}
              <View style={styles.pinYouContainer}>
                <View style={styles.pinYouBadge}>
                  <Ionicons name="location" size={14} color="#0D9488" />
                  <Text style={styles.pinYouText}>You</Text>
                </View>
                <View style={styles.pinTriangle} />
              </View>

              {/* Floating Map Pin 2: 'D1 Nallur Zone' */}
              <View style={styles.pinZoneContainer}>
                <View style={styles.pinZoneBadge}>
                  <Text style={styles.pinZoneText}>D1</Text>
                </View>
                <Text style={styles.pinZoneLabel}>Nallur Zone</Text>
              </View>

              {/* Bottom Right Expand Button */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => router.push('/(volunteer)/map')}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── ACTIVE ASSIGNMENT BANNER (If Active Task in Progress) ─── */}
          {activeTask && (
            <View style={styles.activeBannerWrapper}>
              <TouchableOpacity
                style={styles.activeRouteBanner}
                onPress={() => router.push(`/(volunteer)/assignment/${activeTask.assignment.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.activeRouteLeft}>
                  <View style={styles.activeRouteIconBox}>
                    <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activeRouteInfo}>
                    <Text style={styles.activeRouteTitle}>ACTIVE TASK IN PROGRESS</Text>
                    <Text style={styles.activeRouteFood}>{activeTask.donation.title}</Text>
                    <Text style={styles.activeRouteSubtitle}>Tap to resume route navigation →</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#5A1626" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activeRouteConcernBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(volunteer)/raise-concern',
                    params: { assignmentId: activeTask.assignment.id },
                  })
                }
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.activeRouteConcernText}>
                  Road Obstacle or Delay? Raise Concern for this Order
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Support & Concern Desk Strip */}
          <TouchableOpacity
            style={styles.dispatchQuickStrip}
            onPress={() => router.push('/(volunteer)/raise-concern')}
            activeOpacity={0.85}
          >
            <View style={styles.dispatchQuickLeft}>
              <View style={styles.dispatchQuickIcon}>
                <Ionicons name="headset-outline" size={18} color={volunteerColors.maroon} />
              </View>
              <View>
                <Text style={styles.dispatchQuickTitle}>Volunteer Dispatch & Concern Desk</Text>
                <Text style={styles.dispatchQuickSubtitle}>
                  Report road obstacles, current or past delivery issues
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8A8178" />
          </TouchableOpacity>

          {/* ─── SECTION TITLE HEADER ─── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitles}>
              <Text style={styles.sectionSubtitle}>LIVE DELIVERIES & TASKS</Text>
              <Text style={styles.sectionTitle}>Active Community Requests</Text>
            </View>
            <View style={styles.hubBadge}>
              <Text style={styles.hubBadgeText}>Jaffna Hub</Text>
            </View>
          </View>

          {/* ─── TASK CARDS LIST ─── */}
          <View style={styles.cardsContainer}>
            {/* ═══ CARD 1: 25 Veg Biryani Lunch Packets (Urgent) ═══ */}
            {(!searchQuery || '25 veg biryani lunch packets nallur st johns cooked'.includes(searchQuery.toLowerCase())) && (
              <View style={styles.taskCard}>
              {/* Top Tag Row */}
              <View style={styles.cardTagRow}>
                <View style={styles.urgentPill}>
                  <View style={styles.urgentDot} />
                  <Text style={styles.urgentPillText}>Urgent Pickup • 20 mins left</Text>
                </View>
                <View style={styles.karmaPill}>
                  <Text style={styles.karmaPillText}>+120 Karma pts</Text>
                </View>
              </View>

              {/* Body Row: Icon + Details */}
              <TouchableOpacity
                style={styles.cardBodyRow}
                onPress={() => handleTaskSelect('asgn-vol-402')}
                activeOpacity={0.7}
              >
                {/* Food Type Icon Frame: Cooked */}
                <View style={styles.cookedIconBox}>
                  <Ionicons name="book-outline" size={24} color="#701A2B" />
                  <Text style={styles.cookedIconLabel}>COOKED</Text>
                </View>

                {/* Details */}
                <View style={styles.cardDetailsCol}>
                  <View style={styles.cardTitleLine}>
                    <Text style={styles.cardTitle}>25 Veg Biryani Lunch Packets</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>

                  {/* Pickup Line */}
                  <View style={styles.locationStepLine}>
                    <View style={styles.greenStepDot} />
                    <Text style={styles.locationStepText}>
                      Nallur Temple Hall <Text style={styles.distanceSpan}>(1.2 km away)</Text>
                    </Text>
                  </View>

                  {/* Dropoff Line */}
                  <View style={styles.locationStepLine}>
                    <View style={styles.maroonStepDot} />
                    <Text style={styles.locationStepText}>
                      St. John's Shelter <Text style={styles.distanceSpan}>(3.5 km ride)</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card Footer */}
              <View style={styles.cardFooterRow}>
                <Text style={styles.footerEstimateText}>Estimated 18 min ride</Text>
                <TouchableOpacity
                  style={styles.maroonSolidButton}
                  onPress={() => handleAcceptRide('asgn-vol-402')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.maroonSolidButtonText}>Accept Delivery Ride</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

            {/* ═══ CARD 2: 40 Fresh Bread & Buns Baskets (Scheduled) ═══ */}
            {(!searchQuery || '40 fresh bread buns baskets jaffna town bakery grace care elderly bakery'.includes(searchQuery.toLowerCase())) && (
              <View style={styles.taskCard}>
                {/* Top Tag Row */}
                <View style={styles.cardTagRow}>
                  <View style={styles.scheduledPill}>
                    <Ionicons name="time-outline" size={13} color="#0D9488" />
                    <Text style={styles.scheduledPillText}>Scheduled • 2:30 PM Today</Text>
                  </View>
                  <View style={styles.karmaPill}>
                    <Text style={styles.karmaPillText}>+95 Karma pts</Text>
                  </View>
                </View>

                {/* Body Row: Icon + Details */}
                <TouchableOpacity
                  style={styles.cardBodyRow}
                  onPress={() => handleTaskSelect('asgn-bakery-101')}
                  activeOpacity={0.7}
                >
                  {/* Food Type Icon Frame: Bakery */}
                  <View style={styles.bakeryIconBox}>
                    <Ionicons name="archive-outline" size={24} color="#B45309" />
                    <Text style={styles.bakeryIconLabel}>BAKERY</Text>
                  </View>

                  {/* Details */}
                  <View style={styles.cardDetailsCol}>
                    <View style={styles.cardTitleLine}>
                      <Text style={styles.cardTitle}>40 Fresh Bread & Buns Baskets</Text>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>

                    {/* Pickup Line */}
                    <View style={styles.locationStepLine}>
                      <View style={styles.greenStepDot} />
                      <Text style={styles.locationStepText}>
                        Jaffna Town Bakery <Text style={styles.distanceSpan}>(800m away)</Text>
                      </Text>
                    </View>

                    {/* Dropoff Line */}
                    <View style={styles.locationStepLine}>
                      <View style={styles.maroonStepDot} />
                      <Text style={styles.locationStepText}>Grace Care Elderly Home</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Card Footer */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.footerEstimateText}>Auto-assigned vehicle: Bike</Text>
                  <TouchableOpacity
                    style={styles.maroonOutlineButton}
                    onPress={() => handleAcceptRide('asgn-bakery-101')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.maroonOutlineButtonText}>Accept Task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ═══ CARD 3: 15kg Fresh Vegetables Hub (Standard) ═══ */}
            {(!searchQuery || '15kg fresh vegetables hub chavakachcheri nallur produce'.includes(searchQuery.toLowerCase())) && (
              <View style={styles.taskCard}>
                {/* Top Tag Row */}
                <View style={styles.cardTagRow}>
                  <View style={styles.standardPill}>
                    <Text style={styles.standardPillText}>Standard Drop • Before 5:00 PM</Text>
                  </View>
                  <View style={styles.karmaPill}>
                    <Text style={styles.karmaPillText}>+150 Karma pts</Text>
                  </View>
                </View>

                {/* Body Row: Icon + Details */}
                <TouchableOpacity
                  style={styles.cardBodyRow}
                  onPress={() => handleTaskSelect('asgn-produce-102')}
                  activeOpacity={0.7}
                >
                  {/* Food Type Icon Frame: Produce */}
                  <View style={styles.produceIconBox}>
                    <Ionicons name="flash-outline" size={24} color="#059669" />
                    <Text style={styles.produceIconLabel}>PRODUCE</Text>
                  </View>

                  {/* Details */}
                  <View style={styles.cardDetailsCol}>
                    <View style={styles.cardTitleLine}>
                      <Text style={styles.cardTitle}>15kg Fresh Vegetables Hub</Text>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>

                    {/* Pickup Line */}
                    <View style={styles.locationStepLine}>
                      <View style={styles.greenStepDot} />
                      <Text style={styles.locationStepText}>
                        Chavakachcheri Hub <Text style={styles.distanceSpan}>(4.8 km)</Text>
                      </Text>
                    </View>

                    {/* Dropoff Line */}
                    <View style={styles.locationStepLine}>
                      <View style={styles.maroonStepDot} />
                      <Text style={styles.locationStepText}>Nallur Relief Community Kitchen</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Card Footer */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.footerEstimateText}>Car or Tuk-tuk recommended</Text>
                  <TouchableOpacity
                    style={styles.maroonOutlineButton}
                    onPress={() => handleAcceptRide('asgn-produce-102')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.maroonOutlineButtonText}>Accept Task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 28 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },

  /* ─── SIDEBAR OVERLAY & DRAWER ─── */
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    left: -280,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  sidebarVisible: {
    left: 0,
  },
  sidebarHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
    backgroundColor: '#FDFBF7',
    alignItems: 'flex-start',
  },
  sidebarLogo: {
    width: 140,
    height: 40,
    marginBottom: 14,
  },
  sidebarUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FCE8EE',
    borderWidth: 1.5,
    borderColor: '#F3D2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#701A2B',
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  sidebarRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sidebarRoleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sidebarUserRole: {
    fontSize: 12,
    color: '#701A2B',
    fontWeight: '600',
  },
  sidebarContent: {
    flex: 1,
    paddingTop: spacing.md,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sidebarItemActive: {
    backgroundColor: '#FDF2F4',
  },
  sidebarItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#701A2B',
    fontWeight: '800',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#F0ECE4',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },

  /* ─── SCREEN 1: TOP HEADER BAR ─── */
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
  logoImage: {
    width: 135,
    height: 38,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCE8EE',
    borderWidth: 1,
    borderColor: '#F5CDD7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#701A2B',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* ─── SCROLLABLE CONTENT ─── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* ─── SEARCH INPUT BAR ─── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },

  /* ─── MAP CARD ─── */
  mapCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECE7DF',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mapCanvas: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#E6EFF4',
  },
  mapboxImage: {
    width: '100%',
    height: '100%',
  },
  stylizedMapBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E4EFF5',
    overflow: 'hidden',
    position: 'relative',
  },
  mapWaterway: {
    position: 'absolute',
    top: -20,
    right: 30,
    width: 70,
    height: 200,
    backgroundColor: '#D1E6F0',
    transform: [{ rotate: '35deg' }],
    borderRadius: 30,
  },
  mapRoad1: {
    position: 'absolute',
    top: 60,
    left: -20,
    right: -20,
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-8deg' }],
    borderColor: '#D7E2E8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  mapRoad2: {
    position: 'absolute',
    top: -10,
    left: 80,
    width: 22,
    height: 190,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '15deg' }],
    borderColor: '#D7E2E8',
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  mapRoadDashed: {
    position: 'absolute',
    top: 90,
    left: 40,
    width: 140,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#10B981',
    transform: [{ rotate: '-18deg' }],
  },

  /* Floating Pill inside map */
  readyFloatingPill: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  readyTextGroup: {
    flex: 1,
  },
  readyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  readyTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  readySubText: {
    fontSize: 10.5,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 1,
    marginLeft: 14,
  },
  switchControl: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },

  /* Map Markers on Canvas */
  pinYouContainer: {
    position: 'absolute',
    top: 76,
    left: 120,
    alignItems: 'center',
  },
  pinYouBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinYouText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  pinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },

  pinZoneContainer: {
    position: 'absolute',
    bottom: 22,
    right: 56,
    alignItems: 'center',
  },
  pinZoneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pinZoneText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pinZoneLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 1,
  },

  expandButton: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  /* Active In-Progress Banner */
  activeRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDF2F4',
    borderWidth: 1.5,
    borderColor: '#F3D2DC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  activeRouteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeRouteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#701A2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRouteInfo: {
    flex: 1,
  },
  activeRouteTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#701A2B',
    letterSpacing: 0.5,
  },
  activeRouteFood: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 1,
  },
  activeRouteSubtitle: {
    fontSize: 11,
    color: '#701A2B',
    marginTop: 2,
    fontWeight: '600',
  },
  activeBannerWrapper: {
    marginBottom: 16,
  },
  activeRouteConcernBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FDF2F4',
    borderRadius: 10,
    marginTop: -8,
    borderWidth: 1,
    borderColor: '#F8B4C0',
  },
  activeRouteConcernText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  dispatchQuickStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  dispatchQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dispatchQuickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchQuickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1614',
  },
  dispatchQuickSubtitle: {
    fontSize: 11,
    color: '#8A8178',
    marginTop: 1,
  },

  /* ─── SECTION HEADER ─── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitles: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#5A1626',
    marginTop: 2,
  },
  hubBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  hubBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F766E',
  },

  /* ─── TASK CARDS CONTAINER ─── */
  cardsContainer: {
    gap: 14,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  /* Tag Row (Top) */
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  urgentPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  scheduledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  scheduledPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  standardPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  standardPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  karmaPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  karmaPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0D9488',
  },

  /* Body Row */
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  /* Food Icon Frames */
  cookedIconBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FCE8EE',
    borderWidth: 1,
    borderColor: '#F8D1DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookedIconLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#701A2B',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  bakeryIconBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#FDE1BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bakeryIconLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  produceIconBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#E3F5EC',
    borderWidth: 1,
    borderColor: '#C7EBD9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  produceIconLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  /* Details Column */
  cardDetailsCol: {
    flex: 1,
  },
  cardTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 6,
  },
  locationStepLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  greenStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  maroonStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#701A2B',
  },
  locationStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  distanceSpan: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '400',
  },

  /* Card Footer */
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F0E8',
  },
  footerEstimateText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  maroonSolidButton: {
    backgroundColor: '#5A1626',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#5A1626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  maroonSolidButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  maroonOutlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#5A1626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  maroonOutlineButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#5A1626',
  },
});
