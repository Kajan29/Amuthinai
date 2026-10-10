import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapView, Marker, Polyline } from '@/utils/maps';

import { notificationsApi } from '@/api/notifications.api';
import { queryClient } from '@/api/queryClient';
import { requestsApi, type CreateRequestPayload } from '@/api/requests.api';
import { usersApi } from '@/api/users.api';
import { MAPBOX_ACCESS_TOKEN } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import type { FoodRequest } from '@/types';
import {
  registerForPushNotifications,
  markNotificationsAsRead,
  notifyMealDonationRequested,
  type AppNotificationItem,
} from '@/services/notifications';
import { DeliveryPinCard } from '@/components/DeliveryPinCard';
import { colors, spacing, typography } from '@/theme';

const logoImage = require('../../assets/images/logo.png');

interface DistributionItem {
  id: string;
  foodType: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeBg: string;
  actionText: string;
  imageUrl: string;
  donorName?: string;
  servings?: number;
}

export default function RecipientDashboard() {
  const { t } = useTranslation();
  const { user: authUser, confirmLogout } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Modals state
  const [isDistributionDetailsModalOpen, setIsDistributionDetailsModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<DistributionItem | null>(null);
  const [requestedPortions, setRequestedPortions] = useState(2);
  const [requestNotes, setRequestNotes] = useState('');

  // Notifications State & Badge
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notificationsList, setNotificationsList] = useState<AppNotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Fetch fresh user profile
  const { data: profileUser } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.me(),
  });

  const currentUser = profileUser || authUser;
  // Whoever logs in, their dynamic name is displayed!
  const displayName = currentUser?.name || 'Recipient';
  const hubCity = currentUser?.address?.city || 'Nallur';
  const hubDistrict = currentUser?.address?.district || 'Jaffna';

  // Fetch requests & stats
  const requests = useOfflineQuery('recipient.requests', () => requestsApi.mine());
  const { data: stats } = useQuery({
    queryKey: ['recipient', 'stats'],
    queryFn: () => requestsApi.stats(),
  });

  // Fetch available distributions
  const { data: distributions } = useQuery({
    queryKey: ['recipient', 'distributions'],
    queryFn: () => requestsApi.availableDistributions({ pageSize: 10 }),
  });

  // Real requests from database
  const allRequests: FoodRequest[] = requests.data?.items || [];

  // 1. Real current active request ('matched' or 'open')
  const activeRequest = allRequests.find((r) => ['matched', 'open'].includes(r.status));

  // 2. Real past activity ('fulfilled' or 'cancelled')
  const pastRequests = allRequests.filter((r) => ['fulfilled', 'cancelled'].includes(r.status));
  const latestPastRequest = pastRequests[0] || null;

  // Selected request to track in the modal (defaults to activeRequest, or falls back to latestPastRequest)
  const [selectedTrackingRequest, setSelectedTrackingRequest] = useState<FoodRequest | null>(null);

  // Target request currently being tracked
  const currentTargetRequest = selectedTrackingRequest || activeRequest || latestPastRequest || null;
  const isTargetCurrentActive = currentTargetRequest
    ? ['matched', 'open'].includes(currentTargetRequest.status)
    : false;

  // Fetch live backend tracking data for current target request
  const { data: liveTrackingData } = useQuery({
    queryKey: ['recipient', 'tracking', currentTargetRequest?.id],
    queryFn: () => (currentTargetRequest ? requestsApi.tracking(currentTargetRequest.id) : null),
    enabled: Boolean(currentTargetRequest && (isTrackingModalOpen || isDistributionDetailsModalOpen)),
  });

  const active = activeRequest;

  // Request Food from an Available Distribution Mutation
  const requestFoodMutation = useMutation({
    mutationFn: (dist: DistributionItem) => {
      const payload: CreateRequestPayload = {
        servingsNeeded: requestedPortions,
        familySize: requestedPortions,
        neededBy: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        notes: requestNotes.trim() || undefined,
        foodCategory: dist.foodType || dist.title,
        contactPreference: 'in_app',
        deliveryMethod: 'doorstep',
        dropAddress: {
          line1: currentUser?.address?.line1 || 'Hospital Road',
          city: hubCity,
          district: hubDistrict,
          location: { type: 'Point', coordinates: [80.0167, 9.6615] },
        },
      };
      return requestsApi.create(payload);
    },
    async onSuccess() {
      const distTitle = selectedDistribution?.title || 'Hot Meals';
      const donorName = selectedDistribution?.donorName || 'Community Donor';
      setSelectedDistribution(null);
      setRequestNotes('');
      await queryClient.invalidateQueries({ queryKey: ['recipient', 'requests'] });
      await queryClient.invalidateQueries({ queryKey: ['recipient.requests'] });

      // Immediate phone notification
      await notifyMealDonationRequested(donorName, distTitle);
      await loadNotifications();

      Alert.alert(
        'Request Sent to Donor!',
        'The donor and nearby volunteers have been notified. Once approved, live tracking will appear on your dashboard.',
        [{ text: 'OK' }],
      );
    },
    onError(err: any) {
      Alert.alert(
        'Request Notice',
        err?.message || 'You already have an active meal request in progress.',
        [{ text: 'OK' }],
      );
    },
  });

  // Setup push notifications & sync history
  useEffect(() => {
    registerForPushNotifications();
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const page = await notificationsApi.list({ pageSize: 30 });
    const list: AppNotificationItem[] = page.items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      type: 'system',
      timestamp: item.createdAt,
      read: item.read,
      data: item.data,
    }));
    setNotificationsList(list);
    setUnreadNotifCount(page.unread);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleNotifications = async () => {
    await loadNotifications();
    setNotificationsModalVisible(true);
    await notificationsApi.markAllRead().catch(() => markNotificationsAsRead());
    setUnreadNotifCount(0);
  };

  // Combine real backend distributions with UI cards
  const displayDistributions: DistributionItem[] = (distributions?.items ?? []).map((item, idx) => ({
    id: item.id,
    foodType: item.title,
    title: item.title,
    subtitle: `${item.servings} Servings Available`,
    badge: `${item.servings} ready`,
    badgeBg: idx % 2 === 0 ? '#F59E0B' : '#16A34A',
    actionText: 'Request',
    servings: item.servings,
    imageUrl: item.photoUrls?.[0] || '',
  }));

  // Dynamic Mapbox Tracking URL centered on real pinned coordinates
  const dropLng = currentTargetRequest?.dropAddress?.location?.coordinates?.[0] || 80.0167;
  const dropLat = currentTargetRequest?.dropAddress?.location?.coordinates?.[1] || 9.6615;
  const volunteerLng = dropLng + 0.0078;
  const volunteerLat = dropLat + 0.0057;
  const hubLng = dropLng + 0.0169;
  const hubLat = dropLat + 0.0123;

  const mapboxTrackingUrl = isTargetCurrentActive
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-restaurant+5A1626(${hubLng},${hubLat}),pin-s-bicycle+0F7B4F(${volunteerLng},${volunteerLat}),pin-s-home+F59E0B(${dropLng},${dropLat})/${dropLng},${dropLat},13.5,0/600x420@2x?access_token=${MAPBOX_ACCESS_TOKEN}`
    : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-home+0F7B4F(${dropLng},${dropLat})/${dropLng},${dropLat},14,0/600x420@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Sidebar Overlay */}
        {sidebarVisible && (
          <Pressable style={styles.overlay} onPress={() => setSidebarVisible(false)} />
        )}

        {/* Sidebar */}
        <Animated.View style={[styles.sidebar, sidebarVisible && styles.sidebarVisible]}>
          <View style={styles.sidebarHeader}>
            <Image source={logoImage} style={styles.sidebarLogo} resizeMode="contain" />
            <Text style={styles.sidebarUserName}>{displayName}</Text>
            <Text style={styles.sidebarUserRole}>Recipient</Text>
          </View>

          <View style={styles.sidebarContent}>
            <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
              <Ionicons name="home" size={22} color={colors.primary} />
              <Text style={[styles.sidebarItemText, { color: colors.primary, fontWeight: '700' }]}>
                {t('recipient.dashboard') || 'Home'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/request/step1-location');
              }}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>{t('recipient.newRequest') || 'Post Request'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/requests');
              }}
            >
              <Ionicons name="restaurant-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>My Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/hub-map');
              }}
            >
              <Ionicons name="map-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>Hub Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/impact');
              }}
            >
              <Ionicons name="pie-chart-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>Community Impact</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/profile');
              }}
            >
              <Ionicons name="person-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                router.push('/(recipient)/raise-concern');
              }}
            >
              <Ionicons name="alert-circle-outline" size={22} color={colors.text} />
              <Text style={styles.sidebarItemText}>{t('recipient.raiseConcern') || 'Raise Concern'}</Text>
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
              <Text style={[styles.sidebarItemText, { color: colors.danger }]}>
                {t('common.logout') || 'Logout'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={styles.circularHeaderButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={22} color="#1F2937" />
          </TouchableOpacity>

          <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />

          <TouchableOpacity
            style={styles.circularHeaderButton}
            onPress={handleNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#1F2937" />
            {unreadNotifCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* Greeting & Sub-header Section with user's name & Vanakkam */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingLeft}>
            {/* Pill: Motif bars + வணக்கம் (Vanakkam) */}
            <View style={styles.vanakkamBadge}>
              <View style={styles.barsContainer}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={styles.badgeBar} />
                ))}
              </View>
              <Text style={styles.vanakkamText}>{t('recipient.greeting')}</Text>
            </View>

            {/* Dynamic logged-in user name with welcoming greeting */}
            <Text style={styles.userNameText}>வணக்கம், {displayName}!</Text>
          </View>
        </View>

        <View style={styles.headerSeparator} />

        {/* Scrollable Dashboard Body */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 3 Stats in a clean container */}
          <View style={styles.statsCardContainer}>
            {/* Stat 1: Active Needs */}
            <View style={styles.statColumn}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FEF3E2' }]}>
                <Ionicons name="timer-outline" size={20} color="#C2671A" />
              </View>
              <Text style={styles.statNumber}>
                {String(stats?.activeNeeds ?? (active ? 1 : 2)).padStart(2, '0')}
              </Text>
              <Text style={styles.statLabel}>Active Needs</Text>
              <View style={[styles.statUnderline, { backgroundColor: '#EAA339' }]} />
            </View>

            {/* Stat 2: Nearby Hubs */}
            <View style={styles.statColumn}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E3F5EC' }]}>
                <Ionicons name="location-sharp" size={18} color="#0F7B4F" />
              </View>
              <Text style={styles.statNumber}>
                {String(stats?.nearbyHubs ?? 4).padStart(2, '0')}
              </Text>
              <Text style={styles.statLabel}>{t('recipient.nearbyHubs')}</Text>
              <View style={[styles.statUnderline, { backgroundColor: '#0F7B4F' }]} />
            </View>

            {/* Stat 3: Meals Shared */}
            <View style={styles.statColumn}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FCE8EE' }]}>
                <Ionicons name="restaurant-outline" size={18} color="#7A1D34" />
              </View>
              <Text style={styles.statNumber}>
                {String(stats?.mealsShared ?? 18).padStart(2, '0')}
              </Text>
              <Text style={styles.statLabel}>{t('recipient.mealsShared')}</Text>
              <View style={[styles.statUnderline, { backgroundColor: '#5B1527' }]} />
            </View>
          </View>

          {/* HERO COMPONENT: Real Current Activity or Real Past Activity */}
          <TouchableOpacity
            style={styles.heroCardWrapper}
            activeOpacity={0.95}
            onPress={() => {
              if (activeRequest) {
                setSelectedTrackingRequest(activeRequest);
                setIsDistributionDetailsModalOpen(true);
              } else if (latestPastRequest) {
                setSelectedTrackingRequest(latestPastRequest);
                setIsDistributionDetailsModalOpen(true);
              } else {
                router.push('/(recipient)/request/step1-location');
              }
            }}
          >
            <ImageBackground
              source={{
                uri: activeRequest
                  ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
                  : latestPastRequest
                  ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
                  : 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.heroBackground}
              imageStyle={styles.heroBackgroundImage}
            >
              <View style={styles.heroDarkOverlay}>
                {/* Badges Row */}
                <View style={styles.heroBadgesRow}>
                  <View style={styles.diningActivePill}>
                    {activeRequest ? (
                      <View style={styles.greenPulseDot} />
                    ) : (
                      <Ionicons
                        name={latestPastRequest ? 'checkmark-circle' : 'heart'}
                        size={13}
                        color={latestPastRequest ? '#10B981' : '#F59E0B'}
                      />
                    )}
                    <View>
                      <Text style={styles.diningSubText}>
                        {activeRequest
                          ? activeRequest.status === 'matched'
                            ? 'VOLUNTEER ASSIGNED'
                            : 'CURRENT ACTIVITY'
                          : latestPastRequest
                          ? 'PAST ACTIVITY'
                          : 'AMUTHINAI RELIEF'}
                      </Text>
                      <Text style={styles.diningMainText}>
                        {activeRequest
                          ? activeRequest.status === 'matched'
                            ? 'In Transit • On The Way'
                            : 'Request Placed • Finding Volunteer'
                          : latestPastRequest
                          ? latestPastRequest.status === 'fulfilled'
                            ? 'Delivered & Completed'
                            : 'Past Request (Cancelled)'
                          : 'No Active Requests'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.freshPreparedPill,
                      !activeRequest &&
                        latestPastRequest && { backgroundColor: 'rgba(16, 185, 129, 0.85)' },
                    ]}
                  >
                    <Ionicons
                      name={
                        activeRequest
                          ? 'pulse'
                          : latestPastRequest
                          ? 'checkmark-done'
                          : 'add-circle-outline'
                      }
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.freshPreparedText}>
                      {activeRequest
                        ? 'LIVE TRACKING'
                        : latestPastRequest
                        ? 'COMPLETED ORDER'
                        : 'POST REQUEST'}
                    </Text>
                  </View>
                </View>

                {/* Hero Title */}
                <Text style={styles.heroTitle}>
                  {activeRequest
                    ? `Delivery of ${activeRequest.servingsNeeded} Portions In Progress`
                    : latestPastRequest
                    ? `${latestPastRequest.servingsNeeded} Portions Delivered to ${latestPastRequest.dropAddress.city}`
                    : `Need Food Assistance in ${hubCity}?`}
                </Text>

                {/* Distance / Destination Row */}
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location" size={15} color="#F59E0B" />
                  <Text style={styles.heroLocationText}>
                    {activeRequest?.dropAddress?.line1
                      ? `Dropoff: ${activeRequest.dropAddress.line1}, ${activeRequest.dropAddress.city}`
                      : latestPastRequest?.dropAddress?.line1
                      ? `Delivered to: ${latestPastRequest.dropAddress.line1}, ${latestPastRequest.dropAddress.city}`
                      : `Doorstep delivery available across ${hubCity}, ${hubDistrict}`}
                  </Text>
                </View>

                {/* Time & Info Pill Bar */}
                <View style={styles.heroInfoPill}>
                  <View style={styles.heroInfoLeft}>
                    <Ionicons
                      name={activeRequest ? 'time-outline' : 'calendar-outline'}
                      size={14}
                      color="#FEF3C7"
                    />
                    <Text style={styles.heroInfoText}>
                      {activeRequest ? (
                        activeRequest.status === 'matched' ? (
                          <>
                            Arriving in{' '}
                            <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>~15 mins</Text>
                          </>
                        ) : (
                          <>
                            Needed by{' '}
                            <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                              {new Date(activeRequest.neededBy).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </>
                        )
                      ) : latestPastRequest ? (
                        <>
                          Delivered on{' '}
                          <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                            {new Date(latestPastRequest.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </>
                      ) : (
                        'Free cooked meals & groceries'
                      )}
                    </Text>
                  </View>
                  <Text style={styles.heroInfoDot}>•</Text>
                  <View style={styles.heroInfoRight}>
                    <Ionicons
                      name={
                        activeRequest
                          ? 'bicycle-outline'
                          : latestPastRequest
                          ? 'checkmark-circle-outline'
                          : 'flash-outline'
                      }
                      size={14}
                      color="#34D399"
                    />
                    <Text style={[styles.heroInfoText, { color: '#34D399' }]}>
                      {activeRequest
                        ? activeRequest.status === 'matched'
                          ? 'Volunteer on the way'
                          : 'Matching with Hub'
                        : latestPastRequest
                        ? `${latestPastRequest.servingsNeeded} Portions Received`
                        : 'Instant volunteer matching'}
                    </Text>
                  </View>
                </View>

                {/* Buttons Row */}
                <View style={styles.heroActionsRow}>
                  <TouchableOpacity
                    style={styles.reserveButton}
                    onPress={() => {
                      if (activeRequest) {
                        setSelectedTrackingRequest(activeRequest);
                        setIsDistributionDetailsModalOpen(true);
                      } else if (latestPastRequest) {
                        setSelectedTrackingRequest(latestPastRequest);
                        setIsDistributionDetailsModalOpen(true);
                      } else {
                        router.push('/(recipient)/request/step1-location');
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={
                        activeRequest
                          ? 'receipt'
                          : latestPastRequest
                          ? 'receipt-outline'
                          : 'add-circle'
                      }
                      size={16}
                      color="#3B1900"
                    />
                    <Text style={styles.reserveButtonText}>
                      {activeRequest
                        ? 'View Food & Delivery Details'
                        : latestPastRequest
                        ? 'View Past Delivery Details'
                        : 'Post a Food Request'}
                    </Text>
                  </TouchableOpacity>

                  {latestPastRequest && !activeRequest && (
                    <TouchableOpacity
                      style={[styles.reserveButton, { backgroundColor: '#0F7B4F', flex: 0.8 }]}
                      onPress={() => router.push('/(recipient)/request/step1-location')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={[styles.reserveButtonText, { color: '#FFFFFF' }]}>
                        New Request
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Section: Available Distributions */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Available Distributions</Text>
              <Text style={styles.sectionSubheading}>
                Pick up today or request direct drop-off
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(recipient)/requests')}>
              <Text style={styles.viewAllText}>View All ›</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Food Distribution Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.distributionCardsScroll}
          >
            {displayDistributions.length === 0 ? (
              <Text style={styles.sectionSubheading}>No approved donations are available right now.</Text>
            ) : null}
            {displayDistributions.map((dist) => (
              <TouchableOpacity
                key={dist.id}
                style={styles.distCard}
                activeOpacity={0.9}
                onPress={() => setSelectedDistribution(dist)}
              >
                <View style={styles.distImageWrapper}>
                  {dist.imageUrl ? (
                    <Image source={{ uri: dist.imageUrl }} style={styles.distImage} />
                  ) : (
                    <View style={[styles.distImage, { backgroundColor: '#F3E8E2' }]} />
                  )}
                  <View style={[styles.distBadge, { backgroundColor: dist.badgeBg }]}>
                    <Text style={styles.distBadgeText}>{dist.badge}</Text>
                  </View>
                </View>

                <View style={styles.distContent}>
                  <Text style={styles.distTitle}>{dist.title}</Text>
                  <Text style={styles.distSubtitle} numberOfLines={1}>
                    {dist.subtitle}
                  </Text>
                  <View style={styles.distLinkRow}>
                    <Text style={styles.distLinkText}>{t('recipient.requestMeal')}</Text>
                    <Ionicons name="arrow-forward-circle-outline" size={15} color="#70192F" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Immediate Assistance Banner */}
          <TouchableOpacity
            style={styles.assistanceCard}
            onPress={() => router.push('/(recipient)/request/step1-location')}
            activeOpacity={0.9}
          >
            <View style={styles.assistanceIconCircle}>
              <Ionicons name="add-circle-outline" size={28} color="#F59E0B" />
            </View>

            <View style={styles.assistanceTextWrap}>
              <Text style={styles.assistanceLabel}>IMMEDIATE ASSISTANCE</Text>
              <Text style={styles.assistanceMainText}>Post a Meal Request for Family</Text>
            </View>

            <View style={styles.assistanceArrowCircle}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* POPUP 1: Food Distribution Details Popup (Food details, Hub details, Volunteer details, Status, Tracking options) */}
      <Modal visible={isDistributionDetailsModalOpen} transparent animationType="slide">
        <View style={styles.trackingModalContainer}>
          <View style={styles.trackingModalCard}>
            {/* Modal Header */}
            <View style={styles.trackingModalHeader}>
              <View>
                <Text style={styles.trackingModalTitle}>
                  {isTargetCurrentActive ? 'Current Food Distribution Details' : 'Past Distribution Details'}
                </Text>
                <Text style={styles.trackingModalSubtitle}>
                  Order #{currentTargetRequest?.id?.slice(-5)?.toUpperCase() || 'REQ'} •{' '}
                  {currentTargetRequest?.servingsNeeded || 2} Portions •{' '}
                  {currentTargetRequest?.dropAddress?.city || hubCity}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDistributionDetailsModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Status Header Pill */}
              <View
                style={[
                  styles.distributionStatusPill,
                  isTargetCurrentActive
                    ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                    : { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
                ]}
              >
                <Ionicons
                  name={
                    isTargetCurrentActive
                      ? currentTargetRequest?.status === 'matched'
                        ? 'bicycle'
                        : 'hourglass-outline'
                      : 'checkmark-circle'
                  }
                  size={20}
                  color={isTargetCurrentActive ? '#0F7B4F' : '#4B5563'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.distributionStatusTitle,
                      { color: isTargetCurrentActive ? '#065F46' : '#1F2937' },
                    ]}
                  >
                    {isTargetCurrentActive
                      ? currentTargetRequest?.status === 'matched'
                        ? 'OUT FOR DOORSTEP DELIVERY • EN ROUTE'
                        : 'REQUEST RECEIVED • MATCHING VOLUNTEER'
                      : 'DELIVERY COMPLETED & VERIFIED'}
                  </Text>
                  <Text style={styles.distributionStatusSub}>
                    {isTargetCurrentActive
                      ? currentTargetRequest?.status === 'matched'
                        ? `${liveTrackingData?.volunteer?.name || 'Your volunteer'} is on the way with your meal.`
                        : 'Your meal request is being matched with the closest available relief hub.'
                      : 'This food delivery was successfully completed to your doorstep.'}
                  </Text>
                </View>
              </View>

              {/* 1. Food Details Card */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="restaurant" size={16} color="#5A1626" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Food & Portion Details</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Meal Package:</Text>
                  <Text style={styles.infoValue}>
                    {liveTrackingData?.donation?.title || 'Fresh Cooked Meals (Rice & Curry Parcels)'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Servings Quantity:</Text>
                  <Text style={styles.infoValue}>
                    {currentTargetRequest?.servingsNeeded || 2} Family Servings
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Destination:</Text>
                  <Text style={styles.infoValue}>
                    {currentTargetRequest?.dropAddress?.line1 || 'Hospital Road'},{' '}
                    {currentTargetRequest?.dropAddress?.city || hubCity}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Needed Time:</Text>
                  <Text style={styles.infoValue}>
                    {currentTargetRequest
                      ? new Date(currentTargetRequest.neededBy).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Prompt Delivery'}
                  </Text>
                </View>

                {currentTargetRequest?.notes ? (
                  <View style={styles.notesInnerBox}>
                    <Text style={styles.notesInnerLabel}>Dietary Notes / Instructions:</Text>
                    <Text style={styles.notesInnerText}>“{currentTargetRequest.notes}”</Text>
                  </View>
                ) : null}
              </View>

              {/* 2. Hub Details Card */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="business" size={16} color="#0F7B4F" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Relief Hub Details</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hub Name:</Text>
                  <Text style={styles.infoValue}>
                    {liveTrackingData?.donation?.pickupAddress?.city ||
                      currentTargetRequest?.dropAddress?.city ||
                      'Pickup pending'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hub Address:</Text>
                  <Text style={styles.infoValue}>
                    {[
                      liveTrackingData?.donation?.pickupAddress?.city,
                      liveTrackingData?.donation?.pickupAddress?.district,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Address shared after assignment'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hub Coordinator:</Text>
                  <Text style={styles.infoValue}>
                    {liveTrackingData?.volunteer?.name || 'Assigned after matching'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hub Operating Status:</Text>
                  <Text style={styles.infoValue}>Open Today • Active Dispatch</Text>
                </View>

                <View style={styles.contactActionRow}>
                  <TouchableOpacity
                    style={styles.callHubBtn}
                    onPress={() => Linking.openURL('tel:+94212224589')}
                  >
                    <Ionicons name="call" size={14} color="#0F7B4F" />
                    <Text style={styles.callHubBtnText}>Call Hub Coordinator (+94 21 222 4589)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Volunteer Details Card */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="bicycle" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Assigned Volunteer Courier</Text>
                </View>

                <View style={styles.volunteerPreviewRow}>
                  <View style={styles.volunteerAvatarWrap}>
                    <Text style={styles.volunteerAvatarInitial}>
                      {liveTrackingData?.volunteer?.name?.[0] || (isTargetCurrentActive ? 'R' : 'V')}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.volunteerName}>
                        {liveTrackingData?.volunteer?.name || 'Waiting for a volunteer'}
                      </Text>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#0F7B4F" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    </View>
                    <Text style={styles.volunteerVehicle}>
                      {liveTrackingData?.volunteer?.vehicleType || 'Vehicle not set'}
                      {liveTrackingData?.volunteer?.completedDeliveries
                        ? ` • ${liveTrackingData.volunteer.completedDeliveries} deliveries`
                        : ''}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.callVolunteerBtn}
                    onPress={() =>
                      Linking.openURL(
                        `tel:${liveTrackingData?.volunteer?.phone || ''}`,
                      )
                    }
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <DeliveryPinCard pin={liveTrackingData?.assignment?.deliveryPin} />

                {/* 4. Delivery Status & Timeline */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Current Status & Timeline</Text>
                </View>

                <View style={styles.stagesContainer}>
                  {[
                    {
                      title: 'Meal Request Placed',
                      time: new Date(currentTargetRequest?.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' },
                      ),
                      done: true,
                    },
                    {
                      title: 'Food Prepared at Relief Hub',
                      time: 'Hub Ready',
                      done: true,
                    },
                    {
                      title: 'Courier Picked Up Food',
                      time: isTargetCurrentActive ? 'En Route' : 'Completed',
                      done: !isTargetCurrentActive || currentTargetRequest?.status === 'matched',
                      active: isTargetCurrentActive && currentTargetRequest?.status === 'open',
                    },
                    {
                      title: 'Out for Doorstep Delivery',
                      time: isTargetCurrentActive ? 'Current Stage' : 'Completed',
                      done: !isTargetCurrentActive,
                      active: isTargetCurrentActive && currentTargetRequest?.status === 'matched',
                    },
                    {
                      title: 'Delivered Safely to Doorstep',
                      time: isTargetCurrentActive ? 'Arriving in ~15 mins' : 'Delivered',
                      done: !isTargetCurrentActive,
                    },
                  ].map((stage, idx) => (
                    <View key={idx} style={styles.stageItem}>
                      <View
                        style={[
                          styles.stageBadge,
                          stage.done
                            ? styles.stageDone
                            : stage.active
                            ? styles.stageActive
                            : styles.stagePending,
                        ]}
                      >
                        <Ionicons
                          name={
                            stage.done
                              ? 'checkmark'
                              : stage.active
                              ? 'bicycle'
                              : 'ellipse-outline'
                          }
                          size={14}
                          color={stage.done || stage.active ? '#FFFFFF' : '#9CA3AF'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stageItemTitle,
                            stage.active && { color: '#0F7B4F', fontWeight: '800' },
                          ]}
                        >
                          {stage.title}
                        </Text>
                        <Text style={styles.stageItemTime}>{stage.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 5. Tracking Options & Actions */}
              <View style={styles.detailsModalActionButtons}>
                <TouchableOpacity
                  style={styles.trackDeliveryPrimaryBtn}
                  onPress={() => {
                    setIsDistributionDetailsModalOpen(false);
                    setIsTrackingModalOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                  <Text style={styles.trackDeliveryPrimaryBtnText}>Track Delivery on Live Map</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeDetailsBtn}
                  onPress={() => setIsDistributionDetailsModalOpen(false)}
                >
                  <Text style={styles.closeDetailsBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUP 2: Live Food Tracking Map Modal (Start Point, Destination, Volunteer location, Route, ETA) */}
      <Modal visible={isTrackingModalOpen} transparent animationType="slide">
        <View style={styles.trackingModalContainer}>
          <View style={styles.trackingModalCard}>
            {/* Modal Header */}
            <View style={styles.trackingModalHeader}>
              <View>
                <Text style={styles.trackingModalTitle}>Track Food Delivery</Text>
                <Text style={styles.trackingModalSubtitle}>
                  Order #{currentTargetRequest?.id?.slice(-5)?.toUpperCase() || 'REQ'} •{' '}
                  {isTargetCurrentActive
                    ? `${currentTargetRequest?.dropAddress?.city || hubCity} Sector`
                    : `${currentTargetRequest?.servingsNeeded || 1} Portions Delivered`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsTrackingModalOpen(false);
                  setSelectedTrackingRequest(null);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Activity Switcher Tabs (when both active and past requests exist) */}
            {activeRequest && pastRequests.length > 0 && (
              <View style={styles.trackingTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.trackingTabBtn,
                    isTargetCurrentActive && styles.trackingTabBtnActive,
                  ]}
                  onPress={() => setSelectedTrackingRequest(activeRequest)}
                >
                  <View style={styles.tabPulseDot} />
                  <Text
                    style={[
                      styles.trackingTabBtnText,
                      isTargetCurrentActive && styles.trackingTabBtnTextActive,
                    ]}
                  >
                    Current Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.trackingTabBtn,
                    !isTargetCurrentActive && styles.trackingTabBtnActive,
                  ]}
                  onPress={() => setSelectedTrackingRequest(latestPastRequest)}
                >
                  <Ionicons
                    name="time"
                    size={13}
                    color={!isTargetCurrentActive ? '#0F7B4F' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.trackingTabBtnText,
                      !isTargetCurrentActive && styles.trackingTabBtnTextActive,
                    ]}
                  >
                    Past Activity ({pastRequests.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Live Map Display with Route & Markers */}
              <View style={styles.mapboxContainer}>
                {Platform.OS !== 'web' && MapView ? (
                  <MapView
                    style={styles.trackingMapView}
                    initialRegion={{
                      latitude: (dropLat + hubLat) / 2,
                      longitude: (dropLng + hubLng) / 2,
                      latitudeDelta: 0.04,
                      longitudeDelta: 0.04,
                    }}
                  >
                    {/* Start Point (Hub) */}
                    <Marker
                      coordinate={{ latitude: hubLat, longitude: hubLng }}
                      title="Start Point: Nallur Relief Hub"
                      description="Food Prepared & Dispatched Here"
                    >
                      <View style={styles.mapMarkerHub}>
                        <Ionicons name="business" size={14} color="#FFFFFF" />
                      </View>
                    </Marker>

                    {/* Volunteer Current Position */}
                    {isTargetCurrentActive && (
                      <Marker
                        coordinate={{ latitude: volunteerLat, longitude: volunteerLng }}
                        title={`Volunteer: ${liveTrackingData?.volunteer?.name || 'Waiting'}`}
                        description="Courier In Transit (~15 mins away)"
                      >
                        <View style={styles.mapMarkerVolunteer}>
                          <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                        </View>
                      </Marker>
                    )}

                    {/* Destination (Doorstep Delivery) */}
                    <Marker
                      coordinate={{ latitude: dropLat, longitude: dropLng }}
                      title="Destination: Doorstep Delivery"
                      description={`${currentTargetRequest?.dropAddress?.line1 || 'Hospital Road'}`}
                    >
                      <View style={styles.mapMarkerDestination}>
                        <Ionicons name="home" size={14} color="#FFFFFF" />
                      </View>
                    </Marker>

                    {/* Route Line connecting Start Point -> Volunteer -> Destination */}
                    {Polyline && (
                      <Polyline
                        coordinates={[
                          { latitude: hubLat, longitude: hubLng },
                          { latitude: volunteerLat, longitude: volunteerLng },
                          { latitude: dropLat, longitude: dropLng },
                        ]}
                        strokeColor="#5A1626"
                        strokeWidth={4}
                      />
                    )}
                  </MapView>
                ) : (
                  <Image
                    source={{ uri: mapboxTrackingUrl }}
                    style={styles.mapboxImage}
                    resizeMode="cover"
                  />
                )}

                {/* Floating Live ETA Banner on Map */}
                <View style={styles.mapEtaFloatingPill}>
                  <View
                    style={[
                      styles.greenPulseDot,
                      !isTargetCurrentActive && { backgroundColor: '#10B981' },
                    ]}
                  />
                  <Text style={styles.mapEtaText}>
                    {isTargetCurrentActive
                      ? currentTargetRequest?.status === 'matched'
                        ? liveTrackingData?.etaMinutes
                          ? `En Route • Arriving in ~${liveTrackingData.etaMinutes} mins${
                              liveTrackingData.routeKm
                                ? ` (${liveTrackingData.routeKm.toFixed(1)} km remaining)`
                                : ''
                            }`
                          : 'En Route • Volunteer assigned'
                        : 'Matching • Locating nearest volunteer'
                      : `Delivered Successfully on ${new Date(
                          currentTargetRequest?.createdAt || Date.now(),
                        ).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                  </Text>
                </View>
              </View>

              {/* Volunteer Info Card with Direct Call Option */}
              <View style={styles.volunteerInfoCard}>
                <View style={styles.volunteerAvatarWrap}>
                  <Text style={styles.volunteerAvatarInitial}>
                    {liveTrackingData?.volunteer?.name?.[0] || (isTargetCurrentActive ? 'R' : 'V')}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.volunteerName}>
                      {liveTrackingData?.volunteer?.name ||
                        (currentTargetRequest?.status === 'matched'
                          ? 'Volunteer assigned'
                          : 'Matching a volunteer...')}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#0F7B4F" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.volunteerVehicle}>
                    {liveTrackingData?.volunteer?.vehicleType || 'Vehicle not set'}
                    {liveTrackingData?.volunteer?.completedDeliveries
                      ? ` • ${liveTrackingData.volunteer.completedDeliveries} deliveries`
                      : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.callVolunteerBtn}
                  onPress={() =>
                    Linking.openURL(
                      `tel:${liveTrackingData?.volunteer?.phone || ''}`,
                    )
                  }
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <DeliveryPinCard pin={liveTrackingData?.assignment?.deliveryPin} />

              {/* Route Endpoints Breakdown (Start, Volunteer, Destination) */}
              <View style={styles.locationTraceCard}>
                <View style={styles.traceRow}>
                  <View style={[styles.traceDot, { backgroundColor: '#5A1626' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.traceLabel}>START POINT (PICKED UP FROM)</Text>
                    <Text style={styles.traceValue}>
                      {liveTrackingData?.donation?.title || 'Nallur Community Relief Hub (Point Pedro Road)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.traceLine} />

                <View style={styles.traceRow}>
                  <View
                    style={[
                      styles.traceDot,
                      { backgroundColor: isTargetCurrentActive ? '#0F7B4F' : '#6B7280' },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.traceLabel}>
                      {isTargetCurrentActive ? 'VOLUNTEER CURRENT LOCATION' : 'DELIVERY STATUS'}
                    </Text>
                    <Text style={styles.traceValue}>
                      {isTargetCurrentActive
                        ? currentTargetRequest?.status === 'matched'
                          ? 'Near Jaffna Clock Tower (Hospital Rd Junction • 1.4 km away)'
                          : 'Assigning nearest volunteer in Jaffna Sector'
                        : 'Completed & Verified at Doorstep'}
                    </Text>
                  </View>
                </View>

                <View style={styles.traceLine} />

                <View style={styles.traceRow}>
                  <View style={[styles.traceDot, { backgroundColor: '#F59E0B' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.traceLabel}>DESTINATION (YOUR DOORSTEP)</Text>
                    <Text style={styles.traceValue}>
                      {currentTargetRequest?.dropAddress?.line1 || 'Hospital Road'},{' '}
                      {currentTargetRequest?.dropAddress?.city || hubCity}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons: Switch back to food details or close */}
              <TouchableOpacity
                style={[styles.doneTrackingBtn, { backgroundColor: '#5A1626', marginBottom: 10 }]}
                onPress={() => {
                  setIsTrackingModalOpen(false);
                  setIsDistributionDetailsModalOpen(true);
                }}
              >
                <Text style={styles.doneTrackingBtnText}>📋 View Food & Hub Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneTrackingBtn}
                onPress={() => {
                  setIsTrackingModalOpen(false);
                  setSelectedTrackingRequest(null);
                }}
              >
                <Text style={styles.doneTrackingBtnText}>Close Tracking</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUP 2: Request Available Distribution Modal (Notify Donor) */}
      <Modal visible={selectedDistribution !== null} transparent animationType="slide">
        <View style={styles.trackingModalContainer}>
          <View style={styles.trackingModalCard}>
            <View style={styles.trackingModalHeader}>
              <View>
                <Text style={styles.trackingModalTitle}>Request from Donation</Text>
                <Text style={styles.trackingModalSubtitle}>
                  {selectedDistribution?.title} • {selectedDistribution?.donorName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDistribution(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDistribution?.imageUrl ? (
                <Image
                  source={{ uri: selectedDistribution.imageUrl }}
                  style={styles.donationModalImage}
                />
              ) : null}

              <Text style={styles.donationModalTitle}>{selectedDistribution?.title}</Text>
              <Text style={styles.donationModalSubtitle}>{selectedDistribution?.subtitle}</Text>

              {/* Servings counter */}
              <Text style={styles.modalInputLabel}>Number of Portions Needed</Text>
              <View style={styles.portionsCounterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => requestedPortions > 1 && setRequestedPortions(requestedPortions - 1)}
                >
                  <Ionicons name="remove" size={18} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.counterVal}>{requestedPortions}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() =>
                    requestedPortions < (selectedDistribution?.servings || 10) &&
                    setRequestedPortions(requestedPortions + 1)
                  }
                >
                  <Ionicons name="add" size={18} color="#1A1A1A" />
                </TouchableOpacity>
              </View>

              {/* Delivery destination */}
              <Text style={styles.modalInputLabel}>Delivery Dropoff Address</Text>
              <View style={styles.addressDisplayBox}>
                <Ionicons name="location" size={18} color="#4A1521" />
                <Text style={styles.addressDisplayText}>
                  {currentUser?.address?.line1 || 'Hospital Road'}, {hubCity}, {hubDistrict}
                </Text>
              </View>

              {/* Special notes */}
              <Text style={styles.modalInputLabel}>Note for Donor / Dietary Instructions</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. For elderly family members, low spice please..."
                placeholderTextColor="#9CA3AF"
                value={requestNotes}
                onChangeText={setRequestNotes}
                multiline
                numberOfLines={3}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.confirmRequestBtn,
                  requestFoodMutation.isPending && { opacity: 0.7 },
                ]}
                onPress={() =>
                  selectedDistribution && requestFoodMutation.mutate(selectedDistribution)
                }
                disabled={requestFoodMutation.isPending}
              >
                {requestFoodMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.confirmRequestBtnText}>
                      Confirm Request & Notify Donor
                    </Text>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUP 3: Notifications Center Modal */}
      <Modal visible={notificationsModalVisible} transparent animationType="slide">
        <View style={styles.trackingModalContainer}>
          <View style={[styles.trackingModalCard, { maxHeight: '85%' }]}>
            {/* Modal Header */}
            <View style={styles.trackingModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.notifIconCircle}>
                  <Ionicons name="notifications" size={18} color="#0F7B4F" />
                </View>
                <View>
                  <Text style={styles.trackingModalTitle}>App Notifications</Text>
                  <Text style={styles.trackingModalSubtitle}>
                    {notificationsList.length} total alerts & delivery updates
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setNotificationsModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Notification Items List */}
              {notificationsList.length === 0 ? (
                <View style={styles.emptyNotifBox}>
                  <Ionicons name="notifications-off-outline" size={44} color="#D1D5DB" />
                  <Text style={styles.emptyNotifTitle}>No Notifications Yet</Text>
                  <Text style={styles.emptyNotifSubtitle}>
                    When a volunteer is assigned to your request or tracking status changes, you will receive instant alerts on your phone!
                  </Text>
                </View>
              ) : (
                <View style={styles.notifListWrap}>
                  {notificationsList.map((item) => {
                    const iconName =
                      item.type === 'volunteer_assigned'
                        ? 'bicycle'
                        : item.type === 'tracking_update'
                        ? 'location'
                        : item.type === 'request_created'
                        ? 'restaurant'
                        : item.type === 'meal_requested'
                        ? 'mail'
                        : 'information-circle';

                    const iconColor =
                      item.type === 'volunteer_assigned'
                        ? '#0284C7'
                        : item.type === 'tracking_update'
                        ? '#059669'
                        : item.type === 'request_created'
                        ? '#D97706'
                        : '#7C3AED';

                    const timeStr = item.timestamp
                      ? new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now';

                    return (
                      <View key={item.id} style={styles.notifItemCard}>
                        <View style={[styles.notifBadgeCircle, { backgroundColor: `${iconColor}15` }]}>
                          <Ionicons name={iconName as any} size={18} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.notifHeaderLine}>
                            <Text style={styles.notifItemTitle}>{item.title}</Text>
                            <Text style={styles.notifItemTime}>{timeStr}</Text>
                          </View>
                          <Text style={styles.notifItemBody}>{item.body}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={styles.doneTrackingBtn}
                onPress={() => setNotificationsModalVisible(false)}
              >
                <Text style={styles.doneTrackingBtnText}>Close Notifications</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    backgroundColor: '#FBF9F6',
  },
  sidebarLogo: {
    width: 140,
    height: 44,
    marginBottom: 8,
  },
  sidebarUserName: {
    ...typography.bodyStrong,
    color: '#1A1A1A',
    fontSize: 16,
  },
  sidebarUserRole: {
    ...typography.caption,
    color: colors.primary,
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
  sidebarItemText: {
    ...typography.body,
    color: '#374151',
    fontSize: 15,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#F0ECE4',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },

  /* Top Navigation Bar */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
  },
  circularHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE6DE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  logoImage: {
    width: 140,
    height: 42,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* Greeting & User Subheader */
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  greetingLeft: {
    flex: 1,
  },
  vanakkamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D7F3E3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 5,
    gap: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  badgeBar: {
    width: 2.2,
    height: 9,
    backgroundColor: '#0F7B4F',
    borderRadius: 1,
  },
  vanakkamText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F7B4F',
  },
  userNameText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#EFEAE2',
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 6,
  },

  /* Scrollable Content */
  scrollContent: {
    flex: 1,
  },

  /* Stats Container */
  statsCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statUnderline: {
    width: 30,
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
  },

  /* Hero Community Dining Card */
  heroCardWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  heroBackground: {
    width: '100%',
  },
  heroBackgroundImage: {
    borderRadius: 22,
  },
  heroDarkOverlay: {
    backgroundColor: 'rgba(26, 20, 16, 0.82)',
    padding: 16,
    borderRadius: 22,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diningActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  diningSubText: {
    fontSize: 9,
    color: '#FCD34D',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diningMainText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  freshPreparedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D7A57',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  freshPreparedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 8,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  heroLocationText: {
    fontSize: 12,
    color: '#E5E7EB',
  },
  heroInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  heroInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInfoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInfoDot: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  heroInfoText: {
    fontSize: 11,
    color: '#E5E7EB',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reserveButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  reserveButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3B1900',
  },
  navigateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  /* Available Distributions Section */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70192F',
  },
  distributionCardsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  distCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  distImageWrapper: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3EFEA',
    position: 'relative',
  },
  distImage: {
    width: '100%',
    height: '100%',
  },
  distBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  distContent: {
    padding: 10,
  },
  distTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  distSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  distLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#70192F',
  },

  /* Immediate Assistance Banner */
  assistanceCard: {
    backgroundColor: '#42121E',
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#42121E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  assistanceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceTextWrap: {
    flex: 1,
  },
  assistanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  assistanceMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  assistanceArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSpacer: {
    height: 90,
  },

  /* Tracking Modal Styles */
  trackingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  trackingModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '90%',
  },
  trackingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trackingModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  trackingModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Distribution Details Popup Styles */
  distributionStatusPill: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  distributionStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  distributionStatusSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionCard: {
    backgroundColor: '#FDFBF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: 14,
    marginBottom: 12,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
    paddingBottom: 6,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    maxWidth: '60%',
    textAlign: 'right',
  },
  notesInnerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ECE7E1',
  },
  notesInnerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  notesInnerText: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 2,
    fontStyle: 'italic',
  },
  contactActionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECE7E1',
  },
  callHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  callHubBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  volunteerPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  detailsModalActionButtons: {
    gap: 10,
    marginTop: 8,
  },
  trackDeliveryPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5A1626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  trackDeliveryPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeDetailsBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  closeDetailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  trackingMapView: {
    width: '100%',
    height: '100%',
  },
  mapMarkerHub: {
    backgroundColor: '#5A1626',
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapMarkerVolunteer: {
    backgroundColor: '#0F7B4F',
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapMarkerDestination: {
    backgroundColor: '#F59E0B',
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* Mapbox Preview in Modal */
  mapboxContainer: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  mapboxImage: {
    width: '100%',
    height: '100%',
  },
  mapEtaFloatingPill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(26, 20, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapEtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Volunteer Info */
  volunteerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7F8',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F8DCE2',
    gap: 12,
    marginBottom: 14,
  },
  volunteerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A1521',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  volunteerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: '#0F7B4F',
    fontWeight: '700',
  },
  volunteerVehicle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  callVolunteerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Route Locations Trace */
  locationTraceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    marginBottom: 14,
  },
  traceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  traceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  traceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  traceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 1,
  },
  traceLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
    marginVertical: 2,
  },

  /* Stages */
  stageSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  stagesContainer: {
    gap: 10,
    marginBottom: 16,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stageBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDone: {
    backgroundColor: '#10B981',
  },
  stageActive: {
    backgroundColor: '#0F7B4F',
  },
  stagePending: {
    backgroundColor: '#F3F4F6',
  },
  stageItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  stageItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  doneTrackingBtn: {
    backgroundColor: '#4A1521',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  doneTrackingBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Donation Request Modal */
  donationModalImage: {
    width: '100%',
    height: 130,
    borderRadius: 16,
    marginBottom: 12,
  },
  donationModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  donationModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 6,
  },
  portionsCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    minWidth: 24,
    textAlign: 'center',
  },
  addressDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    marginBottom: 12,
  },
  addressDisplayText: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  modalTextInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE7E1',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: '#1A1A1A',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  confirmRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A1521',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  confirmRequestBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Notifications & Simulator Styles */
  notifIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D7F3E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyNotifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyNotifSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  notifListWrap: {
    gap: 10,
    marginBottom: 16,
  },
  notifItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    gap: 12,
  },
  notifBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  notifItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  notifItemBody: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  testNotifSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 14,
    marginBottom: 16,
  },
  testNotifSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  testNotifSectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  testBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  testActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Activity Switcher Tabs Styles */
  trackingTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  trackingTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  trackingTabBtnActive: {
    borderColor: '#0F7B4F',
    backgroundColor: '#E8F5EE',
  },
  trackingTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  trackingTabBtnTextActive: {
    color: '#0F7B4F',
    fontWeight: '800',
  },
  tabPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0F7B4F',
  },
});
