import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
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

import { adminApi, FALLBACK_KPIS } from '@/api/admin.api';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';

export default function ApprovalsHub() {
  const [karmaModalVisible, setKarmaModalVisible] = useState(false);
  const [releasingPoints, setReleasingPoints] = useState(false);

  // Queries
  const { data: kpis, refetch: refetchKpis, isRefetching } = useQuery({
    queryKey: ['admin.kpis'],
    queryFn: () => adminApi.kpis(),
    initialData: FALLBACK_KPIS,
  });

  const { data: pendingDonationsData, refetch: refetchDonations } = useQuery({
    queryKey: ['admin.pendingDonations'],
    queryFn: () => adminApi.pendingDonations(),
  });

  const pendingList = pendingDonationsData?.items ?? [];

  const onRefresh = () => {
    refetchKpis();
    refetchDonations();
  };

  const handleReleaseKarma = () => {
    setReleasingPoints(true);
    setTimeout(() => {
      setReleasingPoints(false);
      setKarmaModalVisible(false);
      Alert.alert('Karma Credited', '750 Karma reward points released to 3 volunteer riders successfully.');
    }, 800);
  };

  const totalPendingReview =
    (kpis?.pendingApprovals ?? 8) +
    (kpis?.pendingVolunteerKyc ?? 6) +
    (kpis?.openRecipientRequests ?? 7) +
    (kpis?.pendingKarmaClaims ?? 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader showBack onBack={() => router.push('/(admin)/dashboard')} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        {/* Title Header with Admin Live Hub Tag and Pending Review Badge (Screenshot 2 Match) */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTextBlock}>
            <View style={styles.liveHubTag}>
              <View style={styles.greenLiveDot} />
              <Text style={styles.liveHubTagText}>Admin Live Hub</Text>
            </View>
            <Text style={styles.screenTitle}>Approvals & Verification</Text>
            <Text style={styles.screenSubtitle}>
              Review quality, verify Northern Sri Lanka field submissions, and route items across
              departments.
            </Text>
          </View>

          <View style={styles.pendingBadgeBox}>
            <Text style={styles.pendingBadgeLabel}>Pending Review</Text>
            <Text style={styles.pendingBadgeNumber}>{totalPendingReview}</Text>
          </View>
        </View>

        {/* High Priority Expiry Alert Banner (Screenshot 2 Match) */}
        <View style={styles.highPriorityBanner}>
          <View style={styles.highPriorityIconWrap}>
            <Ionicons name="time-outline" size={24} color={colors.urgentRed} />
          </View>
          <View style={styles.highPriorityContent}>
            <Text style={styles.highPriorityTitle}>2 High Priority Items</Text>
            <Text style={styles.highPrioritySubtitle}>Meals close to expiry threshold</Text>
          </View>
          <TouchableOpacity
            style={styles.reviewNextBtn}
            onPress={() => router.push('/(admin)/approvals/donation/DN-8842' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewNextText}>Review Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header: Verification Queues */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>VERIFICATION QUEUES</Text>
          <Text style={styles.activeQueuesCount}>4 Active Queues</Text>
        </View>

        {/* 4 Active Queue Cards (Screenshot 2 Exact Match) */}
        <View style={styles.queuesList}>
          {/* Queue 1: Donation Approvals */}
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <View style={styles.queueIconBox}>
                <Ionicons name="basket-outline" size={24} color={colors.mint} />
              </View>
              <View style={styles.queueTitles}>
                <Text style={styles.queueTitle}>Donation Approvals</Text>
                <Text style={styles.queueSubtitle}>Food safety & dispatch readiness</Text>
              </View>
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>
                  {kpis?.pendingApprovals ?? 8} Pending
                </Text>
              </View>
            </View>

            <Text style={styles.queueDesc}>
              Inspect food safety, thermal temperature logs & dispatch ready cooked meals from Jaffna partners.
            </Text>

            <View style={styles.queueFooter}>
              <View style={styles.queueAlertTag}>
                <Text style={styles.urgentRedStar}>✻</Text>
                <Text style={styles.urgentAlertText}>2 Urgent (Expires &lt; 2h)</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/approvals/donation/DN-8842' as any)}
                style={styles.openQueueLink}
              >
                <Text style={styles.openQueueText}>Open Donations Queue →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Queue 2: Volunteer KYC & Approvals */}
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <View style={styles.queueIconBox}>
                <Ionicons name="bicycle-outline" size={24} color={colors.mint} />
              </View>
              <View style={styles.queueTitles}>
                <Text style={styles.queueTitle}>Volunteer KYC & Approvals</Text>
                <Text style={styles.queueSubtitle}>Identity verification & logistics vetting</Text>
              </View>
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>
                  {kpis?.pendingVolunteerKyc ?? 6} Pending
                </Text>
              </View>
            </View>

            <Text style={styles.queueDesc}>
              Verify NIC, Sri Lankan Driving Licenses, vehicle suitability, and community rider onboarding.
            </Text>

            <View style={styles.queueFooter}>
              <View style={styles.queueTagMint}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.mint} />
                <Text style={styles.tagMintText}>3 New Submissions</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/approvals/volunteers')}
                style={styles.openQueueLink}
              >
                <Text style={styles.openQueueText}>Open Volunteers Queue →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Queue 3: Recipient Aid Requests */}
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <View style={styles.queueIconBox}>
                <Ionicons name="heart-outline" size={24} color={colors.mint} />
              </View>
              <View style={styles.queueTitles}>
                <Text style={styles.queueTitle}>Recipient Aid Requests</Text>
                <Text style={styles.queueSubtitle}>Vulnerable households & rations</Text>
              </View>
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>
                  {kpis?.openRecipientRequests ?? 7} Pending
                </Text>
              </View>
            </View>

            <Text style={styles.queueDesc}>
              Review household welfare profiles, Samurdhi cards, and direct emergency ration distribution.
            </Text>

            <View style={styles.queueFooter}>
              <View style={styles.queueTagAmber}>
                <Ionicons name="people-outline" size={14} color={colors.amber} />
                <Text style={styles.tagAmberText}>4 Priority Families</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/recipients' as any)}
                style={styles.openQueueLink}
              >
                <Text style={styles.openQueueText}>Open Recipients Queue →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Queue 4: Karma Rewards Claims */}
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <View style={styles.queueIconBox}>
                <Ionicons name="medal-outline" size={24} color={colors.mint} />
              </View>
              <View style={styles.queueTitles}>
                <Text style={styles.queueTitle}>Karma Rewards Claims</Text>
                <Text style={styles.queueSubtitle}>Volunteer credit audits</Text>
              </View>
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>
                  {kpis?.pendingKarmaClaims ?? 3} Pending
                </Text>
              </View>
            </View>

            <Text style={styles.queueDesc}>
              Verify volunteer delivery logs, kilometer tracking & release Karma credits to rider profiles.
            </Text>

            <View style={styles.queueFooter}>
              <View style={styles.queueTagMint}>
                <Ionicons name="gift-outline" size={14} color={colors.mint} />
                <Text style={styles.tagMintText}>+750 Pts to be credited</Text>
              </View>
              <TouchableOpacity
                onPress={() => setKarmaModalVisible(true)}
                style={styles.openQueueLink}
              >
                <Text style={styles.openQueueText}>Audit & Release Points →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Pending Donations List */}
        <View style={styles.pendingDonationsSection}>
          <Text style={styles.sectionHeading}>RECENT DONATIONS IN QUEUE</Text>
          {pendingList.length === 0 ? (
            <View style={styles.sampleDonationCard}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
                }}
                style={styles.sampleDonationThumb}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.tagRow}>
                  <View style={[styles.pillBadge, { backgroundColor: '#FEF3D6' }]}>
                    <Text style={[styles.pillBadgeText, { color: '#B45309' }]}>Expires in 2h</Text>
                  </View>
                </View>
                <Text style={styles.sampleDonationTitle}>Nallur Temple Kitchen</Text>
                <Text style={styles.sampleDonationSubtitle}>50 Veg Meals • Prep 11:30 AM</Text>
                <Text style={styles.sampleDonationStatus}>✓ Safety: 68°C Passed</Text>
              </View>
              <TouchableOpacity
                style={styles.sampleDonationBtn}
                onPress={() => router.push('/(admin)/approvals/donation/DN-8842' as any)}
              >
                <Text style={styles.sampleDonationBtnText}>Review →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pendingList.map((item) => (
              <View key={item.id} style={styles.sampleDonationCard}>
                <Image
                  source={{
                    uri:
                      item.photoUrls[0] ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
                  }}
                  style={styles.sampleDonationThumb}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.sampleDonationTitle}>{item.title}</Text>
                  <Text style={styles.sampleDonationSubtitle}>
                    {item.servings} servings · {item.foodType}
                  </Text>
                  <Text style={styles.sampleDonationStatus}>
                    Expires in {item.safeForHours}h
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sampleDonationBtn}
                  onPress={() => router.push(`/(admin)/approvals/donation/${item.id}` as any)}
                >
                  <Text style={styles.sampleDonationBtnText}>Review →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Karma Audit Modal */}
      <Modal visible={karmaModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setKarmaModalVisible(false)}>
          <View style={styles.karmaModalContent}>
            <View style={styles.karmaModalHeader}>
              <Text style={styles.karmaModalTitle}>Karma Rewards Audit & Release</Text>
              <TouchableOpacity onPress={() => setKarmaModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.karmaModalDesc}>
              Auditing 3 completed volunteer distribution routes in Northern Sri Lanka. Releasing Karma points will credit the riders’ public profiles immediately.
            </Text>

            <View style={styles.karmaItem}>
              <Text style={styles.karmaItemName}>Kajan S. (Motorbike)</Text>
              <Text style={styles.karmaItemPoints}>+300 Pts (14.2 km)</Text>
            </View>
            <View style={styles.karmaItem}>
              <Text style={styles.karmaItemName}>Priya T. (Bicycle)</Text>
              <Text style={styles.karmaItemPoints}>+250 Pts (6.5 km)</Text>
            </View>
            <View style={styles.karmaItem}>
              <Text style={styles.karmaItemName}>Murugan R. (Van)</Text>
              <Text style={styles.karmaItemPoints}>+200 Pts (28.0 km)</Text>
            </View>

            <TouchableOpacity
              style={styles.confirmReleaseBtn}
              onPress={handleReleaseKarma}
              disabled={releasingPoints}
            >
              {releasingPoints ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmReleaseText}>Release 750 Karma Credits</Text>
              )}
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
    paddingBottom: 80,
  },
  headerBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  liveHubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mintLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  liveHubTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  pendingBadgeBox: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  pendingBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F4DDE2',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pendingBadgeNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  highPriorityBanner: {
    backgroundColor: '#FBF0F2',
    borderColor: '#F3D6DD',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  highPriorityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDECEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  highPriorityContent: {
    flex: 1,
  },
  highPriorityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  highPrioritySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  reviewNextBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewNextText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E4852',
    letterSpacing: 0.8,
  },
  activeQueuesCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  queuesList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  queueCard: {
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
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  queueIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  queueTitles: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  queueSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  pendingPill: {
    backgroundColor: colors.mintLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
  },
  queueDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  queueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5ECEE',
    paddingTop: spacing.xs,
  },
  queueAlertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentRedStar: {
    color: colors.urgentRed,
    fontSize: 14,
    fontWeight: '900',
  },
  urgentAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.urgentRed,
  },
  queueTagMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagMintText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mint,
  },
  queueTagAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagAmberText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber,
  },
  openQueueLink: {
    paddingVertical: 4,
  },
  openQueueText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  pendingDonationsSection: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  sampleDonationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sampleDonationThumb: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: '#F2EDE9',
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
  sampleDonationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sampleDonationSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sampleDonationStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mint,
  },
  sampleDonationBtn: {
    backgroundColor: '#FAF5F5',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  sampleDonationBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  karmaModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  karmaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  karmaModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  karmaModalDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  karmaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  karmaItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  karmaItemPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mint,
  },
  confirmReleaseBtn: {
    backgroundColor: colors.adminMaroon,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  confirmReleaseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
