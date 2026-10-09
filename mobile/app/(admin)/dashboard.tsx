import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi, FALLBACK_KPIS } from '@/api/admin.api';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';
import { Circle, MapView, Marker, Polyline } from '@/utils/maps';

// Central Jaffna coordinates for the Live Operations Map
const JAFFNA_REGION = {
  latitude: 9.6615,
  longitude: 80.0167,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const FOOD_HUBS = [
  {
    id: 'hub-1',
    name: 'Jaffna Central Hub • Operations',
    address: 'Hospital Road, Jaffna',
    latitude: 9.6615,
    longitude: 80.0167,
    type: 'central',
  },
  {
    id: 'hub-2',
    name: 'Nallur Community Relief Depot',
    address: 'Point Pedro Road, Nallur',
    latitude: 9.6744,
    longitude: 80.0286,
    type: 'depot',
  },
  {
    id: 'hub-3',
    name: 'Chavakachcheri Aid Centre',
    address: 'Kandy Road, Chavakachcheri',
    latitude: 9.6542,
    longitude: 80.1582,
    type: 'satellite',
  },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'donations' | 'volunteers' | 'recipients' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFilter, setMapFilter] = useState<'all' | 'hubs' | 'donations' | 'routes' | 'demand'>('all');

  // Backend queries with fallback
  const { data: kpis, refetch: refetchKpis, isRefetching } = useQuery({
    queryKey: ['admin.kpis'],
    queryFn: () => adminApi.kpis(),
    initialData: FALLBACK_KPIS,
  });

  const { data: demandCells } = useQuery({
    queryKey: ['admin.demand'],
    queryFn: () => adminApi.demandHeatmap(),
  });

  const onRefresh = () => {
    refetchKpis();
  };

  // Static/Fallback featured task cards matching Screenshot 1
  const featuredTaskCards = [
    {
      id: 'task-nallur',
      type: 'donation',
      title: 'Nallur Temple Kitchen',
      subtitle: '50 Veg Meals • Prep 11:30 AM',
      tag: 'Expires in 2h',
      tagTone: 'warning',
      statusText: 'Safety: 68°C Passed',
      statusIcon: 'checkmark-circle',
      statusColor: colors.mint,
      actionText: 'Review',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      urgent: true,
      onPress: () => router.push('/(admin)/approvals/donation/DN-8842' as any),
    },
    {
      id: 'task-karthik',
      type: 'volunteer',
      title: 'Karthik Rajan',
      subtitle: 'Motorbike • Jaffna Central',
      tag: 'Pending KYC',
      tagTone: 'mint',
      statusText: 'NIC & Driving License',
      statusIcon: 'id-card-outline',
      statusColor: colors.textMuted,
      actionText: 'Verify',
      isRiderKyc: true,
      onPress: () => router.push('/(admin)/approvals/volunteers' as any),
    },
    {
      id: 'task-grace',
      type: 'dispatch',
      title: 'Grace Care Elderly Home',
      subtitle: '40 Fresh Buns & Loaves',
      tag: 'Matched',
      tagTone: 'mint',
      statusText: 'Awaiting Dispatch',
      statusIcon: 'time-outline',
      statusColor: colors.amber,
      actionText: 'Dispatch',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
      onPress: () => router.push('/(admin)/deliveries' as any),
    },
  ];

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
              {String(kpis?.pendingApprovals ?? 14).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Approvals</Text>
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
              {String(kpis?.activeDeliveries ?? 38).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Dispatched</Text>
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
              {String(kpis?.totalVolunteers ?? 52).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Volunteers</Text>
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
              {String(kpis?.urgentDonations ?? 3).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Urgent</Text>
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
              All Tasks ({((kpis?.pendingApprovals ?? 14) + (kpis?.pendingVolunteerKyc ?? 6) + 4)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'donations' && styles.filterPillActive]}
            onPress={() => setActiveTab('donations')}
          >
            <Text style={[styles.filterPillText, activeTab === 'donations' && styles.filterPillTextActive]}>
              Donations ({kpis?.pendingApprovals ?? 8})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'volunteers' && styles.filterPillActive]}
            onPress={() => setActiveTab('volunteers')}
          >
            <Text style={[styles.filterPillText, activeTab === 'volunteers' && styles.filterPillTextActive]}>
              Volunteers ({kpis?.pendingVolunteerKyc ?? 6})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'recipients' && styles.filterPillActive]}
            onPress={() => setActiveTab('recipients')}
          >
            <Text style={[styles.filterPillText, activeTab === 'recipients' && styles.filterPillTextActive]}>
              Recipients ({kpis?.openRecipientRequests ?? 7})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeTab === 'urgent' && styles.filterPillActive]}
            onPress={() => setActiveTab('urgent')}
          >
            <Text style={[styles.filterPillText, activeTab === 'urgent' && styles.filterPillTextActive]}>
              Urgent ({kpis?.urgentDonations ?? 3})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Actionable Task Cards List (Screenshot 1 Exact Match) */}
        <View style={styles.taskList}>
          {filteredTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              {/* Left thumbnail / icon */}
              {task.isRiderKyc ? (
                <View style={styles.riderKycThumbnail}>
                  <Ionicons name="bicycle" size={32} color={colors.mint} />
                  <Text style={styles.riderKycThumbText}>RIDER KYC</Text>
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

        {/* Central Live Operations Map (Idea Paragraph Implementation) */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <View>
              <Text style={styles.mapCardTitle}>Jaffna Live Operations Map</Text>
              <Text style={styles.mapCardSubtitle}>
                Approved donations, active delivery routes & demand heat-zones
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapFullscreenBtn}
              onPress={() => router.push('/(admin)/map' as any)}
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

          {/* Map Container */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={styles.webMapFallback}>
                <Ionicons name="map-outline" size={38} color={colors.adminMaroon} />
                <Text style={styles.webMapFallbackTitle}>Northern Sri Lanka Field Network</Text>
                <Text style={styles.webMapFallbackDesc}>
                  4 Hubs · 38 Active Deliveries · 5 High-Demand Wards
                </Text>
                <TouchableOpacity
                  style={styles.openMapBtn}
                  onPress={() => router.push('/(admin)/map' as any)}
                >
                  <Text style={styles.openMapBtnText}>Open Full Operations Map</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MapView style={styles.map} initialRegion={JAFFNA_REGION}>
                {/* Food Hub Markers */}
                {(mapFilter === 'all' || mapFilter === 'hubs') &&
                  FOOD_HUBS.map((hub) => (
                    <Marker
                      key={hub.id}
                      coordinate={{ latitude: hub.latitude, longitude: hub.longitude }}
                      title={hub.name}
                      description={hub.address}
                      pinColor="#2B6CB0"
                    />
                  ))}

                {/* Approved Donation Marker */}
                {(mapFilter === 'all' || mapFilter === 'donations') && (
                  <Marker
                    coordinate={{ latitude: 9.6744, longitude: 80.0286 }}
                    title="Nallur Temple Kitchen (50 Meals)"
                    description="Safety Passed 72°C · Fresh Hot"
                    pinColor="#0F7B4F"
                  />
                )}

                {/* Active Delivery Route Polyline */}
                {(mapFilter === 'all' || mapFilter === 'routes') && (
                  <Polyline
                    coordinates={[
                      { latitude: 9.6744, longitude: 80.0286 },
                      { latitude: 9.668, longitude: 80.023 },
                      { latitude: 9.6615, longitude: 80.0167 },
                    ]}
                    strokeColor={colors.adminMaroon}
                    strokeWidth={4}
                  />
                )}

                {/* Demand Heat-Zones */}
                {(mapFilter === 'all' || mapFilter === 'demand') &&
                  (demandCells ?? []).map((cell) => (
                    <Circle
                      key={cell.district}
                      center={{ latitude: cell.latitude, longitude: cell.longitude }}
                      radius={1200}
                      fillColor="rgba(229, 62, 62, 0.22)"
                      strokeColor={colors.urgentRed}
                      strokeWidth={1}
                    />
                  ))}
              </MapView>
            )}
          </View>

          {/* Map Legend */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2B6CB0' }]} />
              <Text style={styles.legendText}>Hubs (4)</Text>
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
          <Text style={styles.overviewTitle}>Food Distribution System Overview</Text>
          <Text style={styles.overviewSubtitle}>
            Complete logistics pipeline from Jaffna donors to vulnerable families
          </Text>

          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{kpis?.totalDonations ?? 86}</Text>
              <Text style={styles.overviewLabel}>Total Donations</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.warning }]}>
                {kpis?.pendingApprovals ?? 14}
              </Text>
              <Text style={styles.overviewLabel}>Pending Approvals</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.mint }]}>
                {kpis?.activeDeliveries ?? 38}
              </Text>
              <Text style={styles.overviewLabel}>Active Deliveries</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.primary }]}>
                {kpis?.completedDistributions ?? 68}
              </Text>
              <Text style={styles.overviewLabel}>Completed Distributions</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.amber }]}>
                {kpis?.verifiedVolunteers ?? 46}
              </Text>
              <Text style={styles.overviewLabel}>Available Volunteers</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewNumber, { color: colors.danger }]}>
                {kpis?.openDisputes ?? 2}
              </Text>
              <Text style={styles.overviewLabel}>Unresolved Concerns</Text>
            </View>
          </View>

          <View style={styles.overviewActions}>
            <TouchableOpacity
              style={styles.overviewBtn}
              onPress={() => router.push('/(admin)/approvals')}
            >
              <Text style={styles.overviewBtnText}>Open Approvals & KYC Hub →</Text>
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
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#F3EFEA',
  },
  map: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: 6,
  },
  webMapFallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  webMapFallbackDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  openMapBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.adminMaroon,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  openMapBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
