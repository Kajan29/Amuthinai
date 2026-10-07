import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi, type NearbyTask } from '@/api/assignments.api';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Badge } from '@/components/ui';
import { URGENT_THRESHOLD_MINUTES } from '@/constants';
import { MOCK_DROP_OFFS } from '@/constants/mockVolunteerData';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { radius, typography } from '@/theme';
import { volunteerColors } from '@/theme/volunteer';

type TabFilter = 'all' | 'urgent' | 'active' | 'completed';

/** Tasks tab — filterable list of all volunteer tasks */
export default function VolunteerTasks() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const tasks = useOfflineQuery('volunteer.nearby', () => assignmentsApi.nearby());
  const items = tasks.data ?? [];

  // Filter logic
  const filtered = items.filter((task) => {
    switch (activeTab) {
      case 'urgent':
        return task.minutesLeft <= URGENT_THRESHOLD_MINUTES;
      case 'active':
        return task.assignment.status === 'accepted';
      case 'completed':
        return task.assignment.status === 'completed';
      default:
        return true;
    }
  });

  // Sort: urgent first, then by distance
  const sorted = [...filtered].sort((a, b) => {
    if (a.minutesLeft <= URGENT_THRESHOLD_MINUTES && b.minutesLeft > URGENT_THRESHOLD_MINUTES) return -1;
    if (b.minutesLeft <= URGENT_THRESHOLD_MINUTES && a.minutesLeft > URGENT_THRESHOLD_MINUTES) return 1;
    return a.distanceKm - b.distanceKm;
  });

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Tasks', count: items.length },
    {
      key: 'urgent',
      label: 'Urgent',
      count: items.filter((t) => t.minutesLeft <= URGENT_THRESHOLD_MINUTES).length,
    },
    {
      key: 'active',
      label: 'Active',
      count: items.filter((t) => t.assignment.status === 'accepted').length,
    },
    {
      key: 'completed',
      label: 'Done',
      count: items.filter((t) => t.assignment.status === 'completed').length,
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Delivery Tasks</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter" size={18} color={volunteerColors.maroon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBtn}>
            <Ionicons name="search" size={18} color={volunteerColors.maroon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Task list */}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={sorted}
        keyExtractor={(task) => task.assignment.id}
        refreshing={tasks.isFetching}
        onRefresh={() => void tasks.refetch()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'completed' ? 'checkmark-done-circle-outline' : 'search-outline'}
              size={48}
              color={volunteerColors.muted}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'urgent'
                ? 'No urgent tasks nearby right now'
                : 'Pull down to refresh'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DetailedTaskCard
            task={item}
            isUrgent={item.minutesLeft <= URGENT_THRESHOLD_MINUTES}
          />
        )}
      />
    </View>
  );
}

/** Detailed task card for the Tasks tab with full information */
function DetailedTaskCard({ task, isUrgent }: { task: NearbyTask; isUrgent: boolean }) {
  const pickup = task.donation.pickupAddress;
  const estTime = Math.round(task.distanceKm * 4);
  const karmaPoints = Math.round(task.distanceKm * 20 + task.donation.servings * 2);
  const dropOff = task.assignment.requestId ? MOCK_DROP_OFFS[task.assignment.requestId] : null;

  const foodIcons: Record<string, string> = {
    cooked: 'restaurant',
    raw: 'leaf',
    packaged: 'cube',
    bakery: 'pizza',
    dairy: 'water',
    beverage: 'cafe',
  };
  const iconName = (foodIcons[task.donation.foodType] ?? 'fast-food') as any;

  const isActive = task.assignment.status === 'accepted';

  return (
    <Pressable
      style={[styles.detailCard, isUrgent && styles.detailCardUrgent, isActive && styles.detailCardActive]}
      onPress={() => router.push(`/(volunteer)/assignment/${task.assignment.id}`)}
    >
      {/* Status bar */}
      <View style={styles.detailTopRow}>
        <View style={styles.detailBadges}>
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={14} color={volunteerColors.urgentRed} />
              <Text style={styles.urgentBadgeText}>Urgent · {task.minutesLeft}m left</Text>
            </View>
          )}
          {isActive && (
            <View style={styles.activeBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
          {task.assignment.status === 'completed' && (
            <Badge label="Completed" tone="success" />
          )}
        </View>
        <Text style={styles.karmaText}>+{karmaPoints} Karma pts</Text>
      </View>

      {/* Main content */}
      <View style={styles.detailMainRow}>
        <View style={[styles.detailIcon, isUrgent && styles.detailIconUrgent]}>
          <Ionicons name={iconName} size={22} color={isUrgent ? volunteerColors.urgentRed : volunteerColors.maroon} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailTitle} numberOfLines={1}>{task.donation.title}</Text>
          <Text style={styles.detailMeta}>
            {task.donation.servings} servings · {task.donation.foodType}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.detailRouteContainer}>
        <View style={styles.detailRouteStep}>
          <View style={styles.routeStepDotGreen} />
          <View style={styles.routeStepInfo}>
            <Text style={styles.routeStepLabel}>PICKUP</Text>
            <Text style={styles.routeStepAddress} numberOfLines={1}>
              {pickup.line1}, {pickup.city}
            </Text>
          </View>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.detailRouteStep}>
          <View style={styles.routeStepDotRed} />
          <View style={styles.routeStepInfo}>
            <Text style={styles.routeStepLabel}>DROP-OFF DESTINATION</Text>
            <Text style={styles.routeStepAddress} numberOfLines={1}>
              {dropOff ? `${dropOff.name} · ${dropOff.address}` : `Community Hub · ${pickup.city}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.detailStatsRow}>
        <View style={styles.detailStat}>
          <Ionicons name="navigate-outline" size={14} color={volunteerColors.green} />
          <Text style={styles.detailStatText}>{task.distanceKm} km</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.detailStat}>
          <Ionicons name="time-outline" size={14} color={volunteerColors.green} />
          <Text style={styles.detailStatText}>~{estTime} min</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.detailStat}>
          <Ionicons name="leaf-outline" size={14} color={volunteerColors.orange} />
          <Text style={styles.detailStatText}>+{karmaPoints} pts</Text>
        </View>
      </View>

      {/* Urgency countdown */}
      <UrgentCountdown
        cookedAt={task.donation.cookedAt}
        safeForHours={task.donation.safeForHours}
      />

      {/* CTA */}
      {task.assignment.status === 'offered' && (
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => router.push(`/(volunteer)/assignment/${task.assignment.id}`)}
        >
          <Text style={styles.acceptBtnText}>Accept Task</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      )}
      {isActive && (
        <TouchableOpacity
          style={[styles.acceptBtn, styles.continueBtn]}
          onPress={() => router.push(`/(volunteer)/pickup/${task.assignment.id}`)}
        >
          <Text style={styles.acceptBtnText}>Continue Delivery</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: volunteerColors.background, flex: 1 },

  /* Header */
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.h2, color: volunteerColors.ink },
  headerRight: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: volunteerColors.surfaceAlt,
  },
  tabActive: { backgroundColor: volunteerColors.maroon },
  tabText: { ...typography.caption, color: volunteerColors.muted, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  tabBadge: {
    backgroundColor: volunteerColors.line,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { ...typography.caption, color: volunteerColors.muted, fontSize: 10, fontWeight: '700' },
  tabBadgeTextActive: { color: '#FFF' },

  /* List */
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },

  /* Empty state */
  emptyContainer: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { ...typography.h3, color: volunteerColors.ink },
  emptySubtext: { ...typography.body, color: volunteerColors.muted },

  /* Detailed task card */
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    padding: 14,
    gap: 10,
  },
  detailCardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: volunteerColors.urgentRed,
  },
  detailCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: volunteerColors.green,
    borderColor: volunteerColors.greenSoft,
  },

  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.urgentRedSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  urgentBadgeText: { ...typography.caption, color: volunteerColors.urgentRed, fontWeight: '700' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: volunteerColors.green,
  },
  activeBadgeText: { ...typography.caption, color: volunteerColors.green, fontWeight: '700' },
  karmaText: { ...typography.caption, color: volunteerColors.orange, fontWeight: '700' },

  detailMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconUrgent: { backgroundColor: volunteerColors.urgentRedSoft },
  detailContent: { flex: 1, gap: 2 },
  detailTitle: { ...typography.bodyStrong, color: volunteerColors.ink },
  detailMeta: { ...typography.caption, color: volunteerColors.muted },

  /* Route */
  detailRouteContainer: {
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: 10,
  },
  detailRouteStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeStepDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: volunteerColors.green,
  },
  routeStepDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: volunteerColors.urgentRed,
  },
  routeStepInfo: { flex: 1 },
  routeStepLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  routeStepAddress: { ...typography.caption, color: volunteerColors.ink, fontSize: 12 },
  routeConnector: {
    width: 2,
    height: 10,
    backgroundColor: volunteerColors.line,
    marginLeft: 4,
    marginVertical: 2,
  },

  /* Stats */
  detailStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailStatText: { ...typography.caption, color: volunteerColors.muted, fontWeight: '600' },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: volunteerColors.line,
  },

  /* CTA buttons */
  acceptBtn: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  continueBtn: { backgroundColor: volunteerColors.green },
  acceptBtnText: { ...typography.bodyStrong, color: '#FFF', fontSize: 14 },
});
