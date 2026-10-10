import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import type { AdminDonation } from '@/api/donations.api';
import { AdminHeader } from '@/components/AdminHeader';
import { getAdminDashboardMapUrl } from '@/services/mapbox';
import { colors, radius, spacing } from '@/theme';
import {
  coordsOf,
  formatClock,
  padMetric,
  populatedName,
  remainingLabel,
  remainingMinutes,
  titleCase,
} from '@/utils/format';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'donations' | 'volunteers' | 'recipients' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFilter, setMapFilter] = useState<'all' | 'hubs' | 'donations' | 'routes' | 'demand'>('all');

  const { data: kpis, refetch: refetchKpis, isRefetching } = useQuery({
    queryKey: ['admin.kpis'],
    queryFn: () => adminApi.kpis(),
  });

  const { data: pendingDonations, refetch: refetchDonations } = useQuery({
    queryKey: ['admin.pendingDonations'],
    queryFn: () => adminApi.pendingDonations(),
  });

  const { data: pendingVolunteers, refetch: refetchVolunteers } = useQuery({
    queryKey: ['admin.unverifiedVolunteers'],
    queryFn: () => adminApi.unverifiedVolunteers(),
  });

  const { data: liveAssignments, refetch: refetchMonitor } = useQuery({
    queryKey: ['admin.monitor'],
    queryFn: () => adminApi.monitor(),
  });

  const { data: openRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['admin.foodRequests', 'open'],
    queryFn: () => adminApi.foodRequests({ status: 'open', pageSize: 20 }),
  });

  const { data: liveDonations } = useQuery({
    queryKey: ['admin.allDonations', 'live'],
    queryFn: () => adminApi.allDonations({ pageSize: 50 }),
  });

  const { data: demandCells } = useQuery({
    queryKey: ['admin.demand'],
    queryFn: () => adminApi.demandHeatmap(),
  });

  const { data: ngos } = useQuery({
    queryKey: ['admin.ngos'],
    queryFn: () => adminApi.ngos({ pageSize: 20 }),
  });

  const onRefresh = () => {
    void refetchKpis();
    void refetchDonations();
    void refetchVolunteers();
    void refetchMonitor();
    void refetchRequests();
  };

  const featuredTaskCards = useMemo(() => {
    const cards: {
      id: string;
      type: 'donation' | 'volunteer' | 'dispatch';
      title: string;
      subtitle: string;
      tag: string;
      tagTone: 'warning' | 'mint';
      statusText: string;
      statusIcon: string;
      statusColor: string;
      actionText: string;
      imageUrl?: string;
      urgent?: boolean;
      isRiderKyc?: boolean;
      onPress: () => void;
    }[] = [];

    for (const donation of pendingDonations?.items ?? []) {
      const minutes = remainingMinutes(donation.expiresAt);
      cards.push({
        id: donation.id,
        type: 'donation',
        title: donation.donor?.name || donation.title,
        subtitle: `${donation.servings} ${titleCase(donation.foodType)} • Prep ${formatClock(donation.cookedAt) || '—'}`,
        tag: remainingLabel(donation.expiresAt),
        tagTone: minutes !== null && minutes < 120 ? 'warning' : 'mint',
        statusText: donation.packagingType
          ? `Packaging: ${donation.packagingType}`
          : donation.foodSafetyVerified
            ? 'Safety check recorded'
            : 'Awaiting safety review',
        statusIcon: 'checkmark-circle',
        statusColor: colors.mint,
        actionText: 'Review',
        imageUrl: donation.photoUrls?.[0],
        urgent: minutes !== null && minutes < 90,
        onPress: () => router.push(`/(admin)/approvals/donation/${donation.id}` as any),
      });
    }

    for (const volunteer of pendingVolunteers?.items ?? []) {
      cards.push({
        id: volunteer.id,
        type: 'volunteer',
        title: volunteer.name,
        subtitle: `${titleCase(volunteer.vehicleType) || 'Volunteer'} • ${volunteer.address?.city || volunteer.address?.district || 'Area not set'}`,
        tag: volunteer.isVerified ? 'Verified' : 'Pending KYC',
        tagTone: 'mint',
        statusText: volunteer.nicNumber ? `NIC ${volunteer.nicNumber}` : 'Identity documents pending',
        statusIcon: 'id-card-outline',
        statusColor: colors.textMuted,
        actionText: 'Verify',
        isRiderKyc: true,
        onPress: () => router.push('/(admin)/approvals/volunteers' as any),
      });
    }

    for (const request of openRequests?.items ?? []) {
      cards.push({
        id: request.id,
        type: 'dispatch',
        title: populatedName(request.recipientId) || request.dropAddress?.city || 'Food request',
        subtitle: `${request.servingsNeeded} servings needed • ${request.foodCategory || 'Any food'}`,
        tag: request.status === 'matched' ? 'Matched' : 'Open',
        tagTone: 'mint',
        statusText: `Needed by ${formatClock(request.neededBy) || 'today'}`,
        statusIcon: 'time-outline',
        statusColor: colors.amber,
        actionText: 'Match',
        imageUrl: undefined,
        onPress: () => router.push('/(admin)/recipients' as any),
      });
    }

    for (const task of liveAssignments ?? []) {
      if (task.assignment.status === 'completed' || task.assignment.status === 'cancelled') continue;
      cards.push({
        id: task.assignment.id,
        type: 'dispatch',
        title: task.request?.dropAddress.city || task.donation.title,
        subtitle: `${task.donation.servings} ${task.donation.title}`,
        tag: task.isDelayed ? 'Delayed' : titleCase(task.assignment.status) || 'Assigned',
        tagTone: task.isDelayed ? 'warning' : 'mint',
        statusText: task.volunteer?.name ? `Courier: ${task.volunteer.name}` : 'Awaiting courier',
        statusIcon: task.isDelayed ? 'alert-circle' : 'bicycle-outline',
        statusColor: task.isDelayed ? colors.urgentRed : colors.mint,
        actionText: 'Monitor',
        imageUrl: task.donation.photoUrls?.[0],
        urgent: task.isUrgent || task.isDelayed,
        onPress: () => router.push('/(admin)/deliveries' as any),
      });
    }

    return cards;
  }, [liveAssignments, openRequests?.items, pendingDonations?.items, pendingVolunteers?.items]);

  const mapPoints = useMemo(() => {
    const donationPoints = (liveDonations?.items ?? [])
      .map((donation: AdminDonation) => coordsOf(donation.pickupAddress))
      .filter((point): point is { latitude: number; longitude: number } => Boolean(point));
    const deliveryPoints = (liveAssignments ?? [])
      .map((task) => {
        const point = coordsOf(task.donation.pickupAddress);
        return point ? { ...point, delayed: task.isDelayed } : null;
      })
      .filter((point): point is { latitude: number; longitude: number; delayed: boolean } => Boolean(point));
    return {
      hubs: (ngos?.items ?? [])
        .map((ngo) => coordsOf(ngo.address))
        .filter((point): point is { latitude: number; longitude: number } => Boolean(point)),
      donations: donationPoints,
      deliveries: deliveryPoints,
      demand: (demandCells ?? []).map((cell) => ({
        latitude: cell.latitude,
        longitude: cell.longitude,
      })),
    };
  }, [demandCells, liveAssignments, liveDonations?.items, ngos?.items]);

  const mapboxUrl = useMemo(
    () => getAdminDashboardMapUrl({ layer: mapFilter, points: mapPoints, width: 700, height: 380, zoom: 12.8 }),
    [mapFilter, mapPoints],
  );

  const hubCount = ngos?.items?.length ?? 0;
  const donationPinCount = mapPoints.donations.length;
  const routeCount = (liveAssignments ?? []).filter(
    (task) => task.assignment.status !== 'completed' && task.assignment.status !== 'cancelled',
  ).length;
  const demandCount = demandCells?.length ?? 0;

  // Dynamic filter
  const filteredTasks = featuredTaskCards.filter((task) => {
    if (activeTab === 'urgent' && !task.urgent) return false;
    if (activeTab === 'donations' && task.type !== 'donation') return false;
    if (activeTab === 'volunteers' && task.type !== 'volunteer') return false;
    if (activeTab === 'recipients' && task.type !== 'dispatch') return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || task.subtitle.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        {/* Top Metric Counters Card (Screenshot 1 Exact Match) */}
        <View style={styles.metricsCard}>
          <TouchableOpacity
            style={styles.metricColumn}
            onPress={() => router.push('/(admin)/approvals')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#FBEFF2' }]}>
              <Ionicons name="clipboard-outline" size={18} color={colors.adminMaroon} />
            </View>
            <Text style={styles.metricValue}>
              {padMetric(kpis?.pendingApprovals)}
            </Text>
            <Text style={styles.metricLabel}>{t('admin.approvalsLabel')}</Text>
            <View style={[styles.metricUnderline, { backgroundColor: colors.adminMaroon }]} />
          </TouchableOpacity>

          <View style={styles.metricDivider} />

          <TouchableOpacity
            style={styles.metricColumn}
            onPress={() => router.push('/(admin)/deliveries' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: colors.mintLight }]}>
              <Ionicons name="fast-food-outline" size={18} color={colors.mint} />
            </View>
            <Text style={styles.metricValue}>
              {padMetric(kpis?.activeDeliveries)}
            </Text>
            <Text style={styles.metricLabel}>{t('admin.dispatched')}</Text>
            <View style={[styles.metricUnderline, { backgroundColor: colors.mint }]} />
          </TouchableOpacity>

          <View style={styles.metricDivider} />

          <TouchableOpacity
            style={styles.metricColumn}
            onPress={() => router.push('/(admin)/approvals/volunteers')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="bicycle-outline" size={18} color={colors.amber} />
            </View>
            <Text style={styles.metricValue}>
              {padMetric(kpis?.totalVolunteers)}
            </Text>
            <Text style={styles.metricLabel}>{t('admin.volunteers')}</Text>
            <View style={[styles.metricUnderline, { backgroundColor: colors.amber }]} />
          </TouchableOpacity>

          <View style={styles.metricDivider} />

          <TouchableOpacity
            style={styles.metricColumn}
            onPress={() => setActiveTab('urgent')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: colors.urgentRedLight }]}>
              <Ionicons name="alert-outline" size={18} color={colors.urgentRed} />
            </View>
            <Text style={styles.metricValue}>
              {padMetric(kpis?.urgentDonations)}
            </Text>
            <Text style={styles.metricLabel}>{t('admin.urgent')}</Text>
            <View style={[styles.metricUnderline, { backgroundColor: colors.urgentRed }]} />
          </TouchableOpacity>
        </View>

        {/* Search Input Bar (Screenshot 1 Exact Match) */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#9E8D92" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donations, volunteers, aid..."
            placeholderTextColor="#9E8D92"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchDivider} />
          <TouchableOpacity
            style={styles.searchFilterBtn}
            onPress={() => setActiveTab(activeTab === 'urgent' ? 'all' : 'urgent')}
          >
            <Ionicons name="options-outline" size={20} color="#7E6C72" />
          </TouchableOpacity>
        </View>

        {/* Filter Pill Tabs (Screenshot 1 Exact Match) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'all' && styles.filterPillActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.filterPillText, activeTab === 'all' && styles.filterPillTextActive]}>
              {t('admin.allTasks')} ({(kpis?.pendingApprovals ?? 0) + (kpis?.pendingVolunteerKyc ?? 0) + (kpis?.openRecipientRequests ?? 0)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'donations' && styles.filterPillActive]}
            onPress={() => setActiveTab('donations')}
          >
            <Text style={[styles.filterPillText, activeTab === 'donations' && styles.filterPillTextActive]}>
              {t('nav.donations')} ({kpis?.pendingApprovals ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'volunteers' && styles.filterPillActive]}
            onPress={() => setActiveTab('volunteers')}
          >
            <Text style={[styles.filterPillText, activeTab === 'volunteers' && styles.filterPillTextActive]}>
              {t('admin.volunteers')} ({kpis?.pendingVolunteerKyc ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'recipients' && styles.filterPillActive]}
            onPress={() => setActiveTab('recipients')}
          >
            <Text style={[styles.filterPillText, activeTab === 'recipients' && styles.filterPillTextActive]}>
              {t('admin.recipients')} ({kpis?.openRecipientRequests ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'urgent' && styles.filterPillActive]}
            onPress={() => setActiveTab('urgent')}
          >
            <Text style={[styles.filterPillText, activeTab === 'urgent' && styles.filterPillTextActive]}>
              {t('admin.urgent')} ({kpis?.urgentDonations ?? 0})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Actionable Task Cards List (Screenshot 1 Exact Match) */}
        <View style={styles.taskList}>
          {filteredTasks.length === 0 ? (
            <View style={styles.taskCard}>
              <View style={styles.riderKycThumbnail}>
                <Ionicons name="checkmark-done-outline" size={32} color={colors.mint} />
                <Text style={styles.riderKycThumbText}>QUEUE CLEAR</Text>
              </View>
              <View style={styles.taskBody}>
                <Text style={styles.taskTitle}>No matching tasks</Text>
                <Text style={styles.taskSubtitle}>New donations, KYC and requests will appear here.</Text>
              </View>
            </View>
          ) : null}
          {filteredTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              {/* Left thumbnail / icon */}
              {task.isRiderKyc || !task.imageUrl ? (
                <View style={styles.riderKycThumbnail}>
                  <Ionicons
                    name={task.isRiderKyc ? 'bicycle' : task.type === 'dispatch' ? 'heart' : 'restaurant'}
                    size={32}
                    color={colors.mint}
                  />
                  <Text style={styles.riderKycThumbText}>
                    {task.isRiderKyc ? 'RIDER KYC' : task.type === 'dispatch' ? 'REQUEST' : 'DONATION'}
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: task.imageUrl }}
                  style={styles.taskThumbnail}
                  resizeMode="cover"
                />
              )}

              {/* Middle details */}
              <View style={styles.taskBody}>
                <View style={styles.tagRow}>
                  <View
                    style={[
                      styles.pillBadge,
                      task.tagTone === 'warning'
                        ? { backgroundColor: '#FEF3D6' }
                        : { backgroundColor: colors.mintLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBadgeText,
                        task.tagTone === 'warning'
                          ? { color: '#B45309' }
                          : { color: colors.mint },
                      ]}
                    >
                      {task.tag}
                    </Text>
                  </View>
                </View>

                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.taskSubtitle} numberOfLines={1}>
                  {task.subtitle}
                </Text>

                <View style={styles.taskStatusRow}>
                  <Ionicons
                    name={task.statusIcon as any}
                    size={14}
                    color={task.statusColor}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.taskStatusText, { color: task.statusColor }]}>
                    {task.statusText}
                  </Text>
                </View>
              </View>

              {/* Right Action Button */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={task.onPress}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>{task.actionText}</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Central Live Operations Map (Mapbox Streets API) */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <View>
              <View style={styles.mapTitleRow}>
                <Text style={styles.mapCardTitle}>Jaffna Live Operations Map</Text>
                <View style={styles.mapboxBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.mapboxBadgeText}>Mapbox Live</Text>
                </View>
              </View>
              <Text style={styles.mapCardSubtitle}>
                Live surplus pickups, courier routes & field hubs via Mapbox API
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapFullscreenBtn}
              onPress={() => router.push('/(admin)/map' as any)}
              accessibilityLabel="Open Full Operations Map"
            >
              <Ionicons name="expand-outline" size={18} color={colors.adminMaroon} />
            </TouchableOpacity>
          </View>

          {/* Map Layer Filter Pills */}
          <View style={styles.mapFilterRow}>
            {(['all', 'hubs', 'donations', 'routes', 'demand'] as const).map((filterKey) => (
              <TouchableOpacity
                key={filterKey}
                style={[
                  styles.mapFilterChip,
                  mapFilter === filterKey && styles.mapFilterChipActive,
                ]}
                onPress={() => setMapFilter(filterKey)}
              >
                <Text
                  style={[
                    styles.mapFilterChipText,
                    mapFilter === filterKey && styles.mapFilterChipTextActive,
                  ]}
                >
                  {filterKey.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mapbox Live Canvas */}
          <TouchableOpacity
            style={styles.mapContainer}
            activeOpacity={0.92}
            onPress={() => router.push('/(admin)/map' as any)}
          >
            <Image
              source={{ uri: mapboxUrl }}
              style={styles.mapboxMapImage}
              resizeMode="cover"
            />

            {/* Floating Top Indicators */}
            <View style={styles.mapFloatingHeader}>
              <View style={styles.mapChip}>
                <Ionicons name="location-sharp" size={12} color="#0D9488" />
                <Text style={styles.mapChipText}>Jaffna Field Network</Text>
              </View>
              <View style={styles.mapChipStats}>
                <Text style={styles.mapChipStatsText}>
                  {mapFilter === 'hubs'
                    ? `${hubCount} Operational Hubs`
                    : mapFilter === 'donations'
                    ? `${donationPinCount} Verified Pickups`
                    : mapFilter === 'routes'
                    ? `${routeCount} Active Deliveries`
                    : mapFilter === 'demand'
                    ? `${demandCount} High-Demand Zones`
                    : `${hubCount + donationPinCount + routeCount + demandCount} Active Coordinates`}
                </Text>
              </View>
            </View>

            {/* Bottom Overlay Link */}
            <View style={styles.mapTapOverlay}>
              <Text style={styles.mapTapOverlayText}>Tap to open full GPS dispatch map</Text>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Map Legend */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2B6CB0' }]} />
              <Text style={styles.legendText}>Hubs ({hubCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0F7B4F' }]} />
              <Text style={styles.legendText}>Donations</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.adminMaroon }]} />
              <Text style={styles.legendText}>Active Routes</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.urgentRed }]} />
              <Text style={styles.legendText}>High Demand</Text>
            </View>
          </View>
        </View>

        {/* System Overview Section (Idea Paragraph Implementation) */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>{t('admin.overviewTitle')}</Text>
          <Text style={styles.overviewSubtitle}>
            Complete logistics pipeline from Jaffna donors to vulnerable families
          </Text>

          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{kpis?.totalDonations ?? 0}</Text>
              <Text style={styles.overviewLabel}>Total Donations</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.warning }]}>
                {kpis?.pendingApprovals ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>{t('admin.pendingApprovals')}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.mint }]}>
                {kpis?.activeDeliveries ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>{t('admin.activeDeliveries')}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.primary }]}>
                {kpis?.completedDistributions ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>{t('admin.completedDistributions')}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.amber }]}>
                {kpis?.verifiedVolunteers ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>{t('admin.availableVolunteers')}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.danger }]}>
                {kpis?.openDisputes ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>{t('admin.unresolvedConcerns')}</Text>
            </View>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={() => router.push('/(admin)/recipients' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.overviewNumber, { color: colors.urgentRed }]}>
                {kpis?.unmetServings ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>Unmet Demand (servings)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={() => router.push('/(admin)/deliveries' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.overviewNumber, { color: colors.warning }]}>
                {kpis?.activePickups ?? 0}
              </Text>
              <Text style={styles.overviewLabel}>Active Pickups</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.overviewActions}>
            <TouchableOpacity
              style={styles.overviewBtn}
              onPress={() => router.push('/(admin)/approvals')}
            >
              <Text style={styles.overviewBtnText}>{t('admin.openApprovals')} →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: colors.creamBg,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    shadowColor: '#3E101E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.md,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  metricUnderline: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#F0EAE6',
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.cardBorder,
    marginHorizontal: spacing.xs,
  },
  searchFilterBtn: {
    padding: 6,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  filterPillActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  taskList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  taskThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: '#F2EDE9',
  },
  riderKycThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: '#E6F8F3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  riderKycThumbText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.mint,
    letterSpacing: 0.5,
  },
  taskBody: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  taskSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  taskStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  mapboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F766E',
  },
  mapboxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  mapCardSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  mapFullscreenBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: '#FAF5F5',
  },
  mapFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  mapFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#F5ECEE',
  },
  mapFilterChipActive: {
    backgroundColor: colors.adminMaroon,
  },
  mapFilterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  mapFilterChipTextActive: {
    color: '#FFFFFF',
  },
  mapContainer: {
    height: 230,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#F3EFEA',
    position: 'relative',
  },
  mapboxMapImage: {
    width: '100%',
    height: '100%',
  },
  mapFloatingHeader: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mapChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  mapChipStats: {
    backgroundColor: 'rgba(90, 22, 38, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  mapChipStatsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapTapOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapTapOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F5EFEA',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  overviewSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overviewItem: {
    width: '48%',
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F2EBE7',
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  overviewLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  overviewActions: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  overviewBtn: {
    paddingVertical: 6,
  },
  overviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
});
