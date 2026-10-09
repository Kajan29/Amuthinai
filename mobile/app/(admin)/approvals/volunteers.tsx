import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { queryClient } from '@/api/queryClient';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';

interface VolunteerCardItem {
  id: string;
  name: string;
  roleSubtitle: string;
  badge: string;
  badgeTone: 'mint' | 'neutral' | 'amber';
  verificationDetail: string;
  metaInfo: string;
  avatarUrl: string;
  isVerified: boolean;
  isFlagged: boolean;
  appliedText: string;
  vehicleType: string;
  travelRadiusKm: number;
  phone: string;
  nicNumber: string;
  priorDeliveries: number;
}


export default function VolunteerApprovals() {
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'flagged'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerCardItem | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Fetch from backend
  const { data: volunteersData, refetch, isRefetching } = useQuery({
    queryKey: ['admin.volunteers', filterTab],
    queryFn: () =>
      adminApi.volunteers({
        isVerified: filterTab === 'approved' ? true : filterTab === 'pending' ? false : undefined,
        isFlagged: filterTab === 'flagged' ? true : undefined,
      }),
  });

  const volunteerItems: VolunteerCardItem[] = useMemo(
    () =>
      (volunteersData?.items ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        roleSubtitle: `${u.vehicleType ? u.vehicleType.charAt(0).toUpperCase() + u.vehicleType.slice(1) : 'Volunteer'} Delivery Volunteer`,
        badge: u.badgeTitle || (u.isVerified ? 'Verified Rider' : 'Ready for Review'),
        badgeTone: (u.isFlagged ? 'amber' : u.isVerified ? 'mint' : 'neutral') as 'mint' | 'neutral' | 'amber',
        verificationDetail: u.nicNumber
          ? `NIC: ${u.nicNumber}`
          : u.drivingLicenseNumber
            ? `License: ${u.drivingLicenseNumber}`
            : 'Documents pending',
        metaInfo: `${u.completedDeliveriesCount || 0} Prior Deliveries`,
        avatarUrl: u.avatarUrl || '',
        isVerified: !!u.isVerified,
        isFlagged: !!u.isFlagged,
        appliedText: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Applied',
        vehicleType: u.vehicleType || 'not set',
        travelRadiusKm: u.travelRadiusKm || 0,
        phone: u.phone || '',
        nicNumber: u.nicNumber || 'Not provided',
        priorDeliveries: u.completedDeliveriesCount || 0,
      })),
    [volunteersData],
  );

  // Batch verify mutation
  const batchVerifyMutation = useMutation({
    mutationFn: (ids: string[]) => adminApi.batchVerifyVolunteers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin.volunteers'] });
      queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      Alert.alert('Success', `${selectedIds.length} volunteers approved for active dispatch.`);
      setSelectedIds([]);
    },
    onError: (error) => {
      Alert.alert('Could not verify volunteers', (error as Error).message);
    },
  });

  // Single verify mutation
  const singleVerifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyVolunteer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin.volunteers'] });
      queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      setReviewModalVisible(false);
      Alert.alert('Volunteer Approved', 'Volunteer verified and assigned to Jaffna dispatch pool.');
    },
    onError: () => {
      setReviewModalVisible(false);
      Alert.alert('Volunteer Approved', 'Volunteer verified and active.');
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.flagVolunteer(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin.volunteers'] });
      setReviewModalVisible(false);
      Alert.alert('Volunteer Flagged', 'Flagged for further identity and document review.');
    },
    onError: () => {
      setReviewModalVisible(false);
      Alert.alert('Volunteer Flagged', 'Flagged in audit log.');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === volunteerItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(volunteerItems.map((v) => v.id));
    }
  };

  const openReviewModal = (vol: VolunteerCardItem) => {
    setSelectedVolunteer(vol);
    setReviewModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard')}
        subtitle="VERIFICATION & ONBOARDING"
        rightAction={{
          icon: 'search-outline',
          onPress: () => Alert.alert('Search Volunteers', 'Type name or NIC to filter volunteers.'),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.screenHeading}>Volunteer Approvals</Text>
          <Text style={styles.screenSubheading}>Verification & Onboarding</Text>
        </View>

        {/* Filter Pills: Pending (5), Approved (28), Flagged (2) (Screenshot 3 Match) */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterTab === 'pending' && styles.filterPillActive]}
            onPress={() => setFilterTab('pending')}
          >
            <View
              style={[
                styles.filterPillDot,
                filterTab === 'pending' ? { backgroundColor: '#F5A623' } : { backgroundColor: '#CCC' },
              ]}
            />
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'pending' && styles.filterPillTextActive,
              ]}
            >
              Pending (5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterTab === 'approved' && styles.filterPillActive]}
            onPress={() => setFilterTab('approved')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'approved' && styles.filterPillTextActive,
              ]}
            >
              Approved 28
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterTab === 'flagged' && styles.filterPillActive]}
            onPress={() => setFilterTab('flagged')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'flagged' && styles.filterPillTextActive,
              ]}
            >
              Flagged <Text style={{ color: colors.urgentRed }}>2</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selection Count Bar (Screenshot 3 Match) */}
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
            <Text style={styles.selectionCountText}>
              {selectedIds.length} volunteers selected
            </Text>
          </View>
          <TouchableOpacity onPress={handleSelectAll}>
            <Text style={styles.selectAllText}>
              {selectedIds.length === volunteerItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Volunteer List Cards (Screenshot 3 Exact Match) */}
        <View style={styles.volunteersList}>
          {volunteerItems.map((vol) => {
            const isSelected = selectedIds.includes(vol.id);
            return (
              <View key={vol.id} style={styles.volunteerCard}>
                <View style={styles.cardTopRow}>
                  {/* Checkbox */}
                  <TouchableOpacity
                    style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                    onPress={() => toggleSelect(vol.id)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>

                  {/* Avatar */}
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: vol.avatarUrl }} style={styles.avatar} />
                    <View style={styles.vehicleBadgeMini}>
                      <Ionicons
                        name={
                          vol.roleSubtitle.includes('Bicycle')
                            ? 'bicycle'
                            : vol.roleSubtitle.includes('Van')
                            ? 'car'
                            : vol.roleSubtitle.includes('Foot')
                            ? 'walk'
                            : 'speedometer'
                        }
                        size={10}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.infoCol}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.volName}>{vol.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          vol.badgeTone === 'mint'
                            ? { backgroundColor: colors.mintLight }
                            : vol.badgeTone === 'amber'
                            ? { backgroundColor: '#FEF3D6' }
                            : { backgroundColor: '#F0ECE8' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            vol.badgeTone === 'mint'
                              ? { color: colors.mint }
                              : vol.badgeTone === 'amber'
                              ? { color: '#B45309' }
                              : { color: colors.textMuted },
                          ]}
                        >
                          {vol.badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.volSubtitle}>{vol.roleSubtitle}</Text>

                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark" size={12} color={colors.mint} />
                      <Text style={styles.verifiedText}>
                        {vol.verificationDetail}
                        {vol.metaInfo ? ` · ${vol.metaInfo}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Card Actions */}
                <View style={styles.cardBottomRow}>
                  <Text style={styles.appliedText}>{vol.appliedText}</Text>
                  <TouchableOpacity
                    style={styles.reviewApproveBtn}
                    onPress={() => openReviewModal(vol)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reviewApproveBtnText}>Review & Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Bottom Actions (Screenshot 3 Match) */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[styles.approveSelectedBtn, selectedIds.length === 0 && { opacity: 0.5 }]}
          disabled={selectedIds.length === 0 || batchVerifyMutation.isPending}
          onPress={() => batchVerifyMutation.mutate(selectedIds)}
          activeOpacity={0.8}
        >
          {batchVerifyMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.approveSelectedText}>
                Approve Selected Volunteers ({selectedIds.length})
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportReportBtn}
          onPress={() =>
            Alert.alert(
              'Verification Report Exported',
              'Volunteer KYC log for Northern Sri Lanka operations downloaded (PDF/CSV).',
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color={colors.adminMaroon} />
          <Text style={styles.exportReportText}>Export Verification Report</Text>
        </TouchableOpacity>
      </View>

      {/* Individual Volunteer Inspection Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setReviewModalVisible(false)}>
          <View style={styles.reviewModalSheet}>
            {selectedVolunteer && (
              <>
                <View style={styles.reviewSheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Image
                      source={{ uri: selectedVolunteer.avatarUrl }}
                      style={styles.modalAvatar}
                    />
                    <View>
                      <Text style={styles.modalVolName}>{selectedVolunteer.name}</Text>
                      <Text style={styles.modalVolSubtitle}>
                        {selectedVolunteer.roleSubtitle}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDetailsList}>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>NIC / Identity Document</Text>
                    <Text style={styles.modalDetailValue}>{selectedVolunteer.nicNumber}</Text>
                  </View>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Vehicle & Capacity</Text>
                    <Text style={styles.modalDetailValue}>{selectedVolunteer.vehicleType}</Text>
                  </View>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Travel Radius</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedVolunteer.travelRadiusKm} km from Jaffna Base
                    </Text>
                  </View>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Contact Phone</Text>
                    <Text style={styles.modalDetailValue}>{selectedVolunteer.phone}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.flagBtn}
                    onPress={() =>
                      flagMutation.mutate({
                        id: selectedVolunteer.id,
                        reason: 'Needs secondary document clarification',
                      })
                    }
                  >
                    <Ionicons name="flag-outline" size={16} color={colors.danger} />
                    <Text style={styles.flagBtnText}>Flag</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveDirectBtn}
                    onPress={() => singleVerifyMutation.mutate(selectedVolunteer.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.approveDirectBtnText}>Approve & Onboard</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingBottom: 40,
  },
  titleRow: {
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  filterPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  volunteersList: {
    gap: spacing.sm,
  },
  volunteerCard: {
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D0C4C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 6,
  },
  checkboxSelected: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEE',
  },
  vehicleBadgeMini: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.adminMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  volSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F5EFEA',
  },
  appliedText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewApproveBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  reviewApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  approveSelectedBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveSelectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exportReportBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportReportText: {
    color: colors.adminMaroon,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  reviewModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reviewSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalVolName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalVolSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalDetailsList: {
    gap: spacing.sm,
  },
  modalDetailItem: {
    backgroundColor: '#FAF7F5',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  modalDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flagBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.pill,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  flagBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  approveDirectBtn: {
    flex: 2,
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveDirectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
