import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';
import { formatAddress, formatClock, populatedName } from '@/utils/format';
import type { FoodRequest } from '@/types';

interface RecipientAidItem {
  id: string;
  recipientName: string;
  category: string;
  servingsNeeded: number;
  neededBy: string;
  dropAddress: string;
  district: string;
  welfareProfile: string;
  priorityLevel: 'emergency' | 'high' | 'standard';
  status: 'open' | 'matched' | 'fulfilled';
  notes: string;
}

function mapRequest(request: FoodRequest): RecipientAidItem {
  const hoursLeft = (new Date(request.neededBy).getTime() - Date.now()) / 36e5;
  return {
    id: request.id,
    recipientName: populatedName(request.recipientId) || request.dropAddress?.city || 'Recipient',
    category: request.foodCategory || request.dietaryRequirements?.join(', ') || 'Food request',
    servingsNeeded: request.servingsNeeded,
    neededBy: formatClock(request.neededBy) || '—',
    dropAddress: formatAddress(request.dropAddress),
    district: request.dropAddress?.district || request.dropAddress?.city || '—',
    welfareProfile: `Family size ${request.familySize ?? '—'} · ${request.contactPreference || 'in-app'}`,
    priorityLevel: hoursLeft <= 3 ? 'emergency' : hoursLeft <= 8 ? 'high' : 'standard',
    status:
      request.status === 'fulfilled' ? 'fulfilled' : request.status === 'matched' ? 'matched' : 'open',
    notes: request.notes || 'No additional notes',
  };
}

export default function RecipientsQueue() {
  const [filter, setFilter] = useState<'all' | 'open' | 'matched' | 'fulfilled'>('all');
  const [selectedReq, setSelectedReq] = useState<RecipientAidItem | null>(null);
  const [matchModalVisible, setMatchModalVisible] = useState(false);

  const { data: foodRequestsData, refetch, isRefetching } = useQuery({
    queryKey: ['admin.foodRequests', filter],
    queryFn: () => adminApi.foodRequests({ status: filter === 'all' ? undefined : filter }),
  });

  const itemsList = useMemo(
    () => (foodRequestsData?.items ?? []).filter((item) => item.status !== 'cancelled').map(mapRequest),
    [foodRequestsData],
  );

  const filteredItems = itemsList.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const handleMatchDonation = (req: RecipientAidItem) => {
    setSelectedReq(req);
    setMatchModalVisible(true);
  };

  const confirmMatch = () => {
    setMatchModalVisible(false);
    Alert.alert(
      'Match from approvals',
      `Open an approved donation and assign a volunteer to ${selectedReq?.recipientName}. Nearby open requests are attached automatically.`,
      [
        {
          text: 'Open donations queue',
          onPress: () => router.push('/(admin)/approvals' as any),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="RECIPIENT AID & WELFARE REQUESTS"
        rightAction={{
          icon: 'filter-outline',
          onPress: () => setFilter(filter === 'open' ? 'all' : 'open'),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Recipient Aid Requests</Text>
          <Text style={styles.screenSubheading}>
            Review household welfare profiles, Samurdhi cards, and match with approved donations
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterPillsRow}>
          {(['all', 'open', 'matched', 'fulfilled'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterPillText, filter === tab && styles.filterPillTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Requests List */}
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.priorityRow}>
                    {item.priorityLevel === 'emergency' && (
                      <View style={styles.emergencyTag}>
                        <Ionicons name="flash" size={10} color="#FFFFFF" />
                        <Text style={styles.emergencyTagText}>EMERGENCY DEMAND</Text>
                      </View>
                    )}
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  <Text style={styles.recipientName}>{item.recipientName}</Text>
                </View>

                <View style={styles.servingsPill}>
                  <Text style={styles.servingsNumber}>{item.servingsNeeded}</Text>
                  <Text style={styles.servingsLabel}>Portions</Text>
                </View>
              </View>

              <Text style={styles.notesText}>{item.notes}</Text>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color={colors.mint} />
                  <Text style={styles.detailText}>{item.dropAddress}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={colors.amber} />
                  <Text style={styles.detailText}>Needed By: {item.neededBy}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>{item.welfareProfile}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.statusIndicator}>
                  <View
                    style={[
                      styles.statusDot,
                      item.status === 'open'
                        ? { backgroundColor: colors.warning }
                        : { backgroundColor: colors.mint },
                    ]}
                  />
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>

                {item.status === 'open' ? (
                  <TouchableOpacity
                    style={styles.matchBtn}
                    onPress={() => handleMatchDonation(item)}
                  >
                    <Ionicons name="git-merge-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.matchBtnText}>Match with Donation →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.matchedViewBtn}
                    onPress={() => router.push('/(admin)/deliveries' as any)}
                  >
                    <Text style={styles.matchedViewBtnText}>View Delivery Route →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Match Donation Sheet */}
      <Modal visible={matchModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setMatchModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Match Available Food Donation</Text>
              <TouchableOpacity onPress={() => setMatchModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Available surplus donation recommended for {selectedReq?.recipientName} ({selectedReq?.servingsNeeded} servings needed):
            </Text>

            <View style={styles.matchSuggestionCard}>
              <Text style={styles.matchSuggestionTitle}>
                Match from the approvals queue
              </Text>
              <Text style={styles.matchSuggestionMeta}>
                Approve a donation, then assign a volunteer. Nearby open requests are attached automatically.
              </Text>
              <Text style={styles.matchSuggestionDistance}>
                {selectedReq?.dropAddress}
              </Text>
            </View>

            <TouchableOpacity style={styles.confirmMatchBtn} onPress={confirmMatch}>
              <Text style={styles.confirmMatchText}>Confirm Match &amp; Dispatch</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingBottom: 60,
  },
  headerBlock: {
    marginBottom: spacing.md,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emergencyTag: {
    backgroundColor: colors.urgentRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emergencyTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  categoryText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  servingsPill: {
    backgroundColor: '#FBEFF2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  servingsNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.adminMaroon,
  },
  servingsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.adminMaroon,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  detailsBox: {
    backgroundColor: '#FAF7F5',
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5ECEE',
    paddingTop: spacing.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  matchBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  matchedViewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchedViewBtnText: {
    color: colors.adminMaroon,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  matchSuggestionCard: {
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  matchSuggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  matchSuggestionMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  matchSuggestionDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mint,
    marginTop: 2,
  },
  confirmMatchBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  confirmMatchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
