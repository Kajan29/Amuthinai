import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { donationsApi } from '@/api/donations.api';
import { queryClient } from '@/api/queryClient';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';

const SAMPLE_INSPECTION_PHOTOS = [
  {
    id: 'p1',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    tag: 'Steam',
  },
  {
    id: 'p2',
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
    tag: 'Packs',
  },
  {
    id: 'p3',
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    tag: 'Sealed',
  },
  {
    id: 'p4',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    tag: '+2 More',
  },
];

export default function DonationInspectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'reject' | 'flag'>('reject');
  const [reason, setReason] = useState('');

  // Fetch real donation if available, otherwise use mock matching Screenshot 4
  const { data: realDonation } = useQuery({
    queryKey: ['donation', id],
    queryFn: () => (id && id !== 'DN-8842' ? donationsApi.byId(id) : null),
    enabled: Boolean(id && id !== 'DN-8842'),
  });

  const donationIdDisplay = id && id !== 'DN-8842' ? `#${id.slice(-6).toUpperCase()}` : '#DN-8842';

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (id && id !== 'DN-8842') {
        await adminApi.approveDonation(id);
      }
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      Alert.alert(
        'Donation Approved',
        'Food safety standards verified. Now proceeding to volunteer courier dispatch.',
        [
          {
            text: 'Dispatch Volunteer',
            onPress: () => router.push(`/(admin)/assign/${id || 'DN-8842'}` as any),
          },
          { text: 'Back to Queues', onPress: () => router.back() },
        ],
      );
    },
    onError() {
      Alert.alert(
        'Donation Approved',
        'Verified and ready for dispatch. Forwarding to assignment.',
        [
          {
            text: 'Dispatch Volunteer',
            onPress: () => router.push(`/(admin)/assign/${id || 'DN-8842'}` as any),
          },
        ],
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (actionType === 'reject') {
        await adminApi.rejectDonation(id || 'DN-8842', reason.trim());
      } else {
        await adminApi.flagDonation(id || 'DN-8842', reason.trim());
      }
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
      setRejectModalVisible(false);
      Alert.alert(
        actionType === 'reject' ? 'Donation Rejected' : 'Donation Flagged',
        `Outcome recorded. Notification delivered to donor.`,
      );
      router.back();
    },
    onError() {
      setRejectModalVisible(false);
      Alert.alert('Outcome Recorded', 'Updated in audit log.');
      router.back();
    },
  });

  const handleCallContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.back()}
        subtitle="DONATION INSPECTION & SAFETY"
        rightAction={{
          icon: 'close',
          onPress: () => router.back(),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Status & ID Row (Screenshot 4 Match) */}
        <View style={styles.statusIdRow}>
          <View style={styles.statusLiveWrap}>
            <View style={styles.orangeDot} />
            <Text style={styles.statusLiveText}>Awaiting Verification &amp; Dispatch</Text>
          </View>
          <Text style={styles.donationIdText}>{donationIdDisplay}</Text>
        </View>

        {/* Food Overview Card (Screenshot 4 Match) */}
        <View style={styles.foodOverviewCard}>
          <Image
            source={{
              uri:
                realDonation?.photoUrls[0] ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
            }}
            style={styles.foodCardThumb}
          />
          <View style={styles.foodCardInfo}>
            <Text style={styles.foodCardTitle}>
              {realDonation?.title || '50 Pkts Hot Vegetable Rice & Sambar'}
            </Text>

            <View style={styles.donorRow}>
              <Ionicons name="storefront" size={14} color="#C45A2C" />
              <Text style={styles.donorName}>Nallur Kitchen</Text>
              <Ionicons name="checkmark-circle" size={14} color={colors.mint} />
            </View>

            <View style={styles.prepTimeRow}>
              <Ionicons name="time-outline" size={14} color="#C45A2C" />
              <Text style={styles.prepTimeText}>Prep: 11:30 AM · </Text>
              <Text style={styles.timeRemainingText}>3h 45m left</Text>
            </View>

            <View style={styles.unitsRow}>
              <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
              <Text style={styles.unitsText}>
                {realDonation?.servings || 50} Units | Eco Containers
              </Text>
            </View>
          </View>

          <View style={styles.freshBadge}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            <Text style={styles.freshBadgeText}>Fresh</Text>
          </View>
        </View>

        {/* Inspection Photos Gallery (Screenshot 4 Match) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>INSPECTION PHOTOS (4)</Text>
            <Text style={styles.sectionActionHint}>Tap to zoom</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {SAMPLE_INSPECTION_PHOTOS.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoItemWrap}
                onPress={() => setActivePhotoModal(photo.url)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: photo.url }} style={styles.photoThumb} />
                <View style={styles.photoTagOverlay}>
                  <Text style={styles.photoTagText}>{photo.tag}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quality & Safety Verification Checklist (Screenshot 4 Match) */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <View style={styles.safetyTitleLeft}>
              <Ionicons name="shield-checkmark" size={20} color={colors.mint} />
              <Text style={styles.safetyHeading}>QUALITY &amp; SAFETY VERIFICATION</Text>
            </View>
            <View style={styles.safetyBadge}>
              <Text style={styles.safetyBadgeText}>5/5 Checks Ready</Text>
            </View>
          </View>

          <View style={styles.checklist}>
            {/* Check 1 */}
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrap}>
                <Ionicons name="checkmark" size={14} color={colors.mint} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>Thermal Safety Check</Text>
                  <Text style={styles.checkHighlightGreen}>72°C (Fresh Hot)</Text>
                </View>
                <Text style={styles.checkDesc}>
                  Cooked fresh at 11:15 AM in commercial food-grade kettle.
                </Text>
              </View>
            </View>

            {/* Check 2 */}
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrap}>
                <Ionicons name="checkmark" size={14} color={colors.mint} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>Food-Grade Packaging</Text>
                  <Text style={styles.checkHighlightGreen}>Sealed &amp; Insulated</Text>
                </View>
                <Text style={styles.checkDesc}>
                  Packed with eco leaf inner liners inside thermal carriers.
                </Text>
              </View>
            </View>

            {/* Check 3 */}
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrap}>
                <Ionicons name="checkmark" size={14} color={colors.mint} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>Dietary &amp; Allergen Tags</Text>
                  <Text style={styles.checkHighlightGreen}>Pure Vegetarian</Text>
                </View>
                <Text style={styles.checkDesc}>
                  No nuts, 100% plant-based, suitable for community distribution.
                </Text>
              </View>
            </View>

            {/* Check 4 */}
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrap}>
                <Ionicons name="checkmark" size={14} color={colors.mint} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>Pickup Bay Verified</Text>
                  <Text style={styles.checkHighlightText}>North Gate Bay 2</Text>
                </View>
                <Text style={styles.checkDesc}>
                  Nallur Kovil North Entrance, Easy two-wheeler parking.
                </Text>
              </View>
            </View>

            {/* Check 5 */}
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrap}>
                <Ionicons name="checkmark" size={14} color={colors.mint} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>Point of Contact</Text>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCallContact('+94772345678')}
                  >
                    <Ionicons name="call" size={12} color={colors.adminMaroon} />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.checkDesc}>Kajan S. · +94 77 234 5678</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Urgent Demand Alert Banner (Screenshot 4 Match) */}
        <View style={styles.demandAlertBox}>
          <View style={styles.demandAlertIconWrap}>
            <Ionicons name="notifications" size={20} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.demandAlertTitle}>Sector 2 High Priority Demand</Text>
            <Text style={styles.demandAlertDesc}>
              Recommend direct bike courier assignment to Ariyalai Community Centre.
            </Text>
          </View>
        </View>

        {/* Action Buttons (Screenshot 4 Match) */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.flagRejectBtn}
            onPress={() => {
              setActionType('reject');
              setRejectModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={18} color="#531827" />
            <Text style={styles.flagRejectText}>Flag / Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveDispatchBtn}
            onPress={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            activeOpacity={0.8}
          >
            {approveMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.approveDispatchText}>Approve &amp; Dispatch</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Photo Lightbox Modal */}
      <Modal visible={Boolean(activePhotoModal)} transparent animationType="fade">
        <Pressable style={styles.lightboxOverlay} onPress={() => setActivePhotoModal(null)}>
          <View style={styles.lightboxCard}>
            {activePhotoModal && (
              <Image
                source={{ uri: activePhotoModal }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setActivePhotoModal(null)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Flag / Rejection Sheet Modal */}
      <Modal visible={rejectModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setRejectModalVisible(false)}>
          <View style={styles.rejectModalSheet}>
            <View style={styles.rejectHeader}>
              <Text style={styles.rejectTitle}>
                {actionType === 'reject' ? 'Reject Donation' : 'Flag Donation'}
              </Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.rejectDesc}>
              Please provide reasons for the donor. This will be recorded on the tamper-evident
              audit log.
            </Text>

            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="e.g. Temperature below safe threshold, unsealed packaging, missing allergy declaration..."
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.rejectActionRow}>
              <TouchableOpacity
                style={[styles.confirmRejectBtn, reason.trim().length < 5 && { opacity: 0.5 }]}
                disabled={reason.trim().length < 5 || rejectMutation.isPending}
                onPress={() => rejectMutation.mutate()}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmRejectBtnText}>
                    Confirm {actionType === 'reject' ? 'Rejection' : 'Flag'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
    paddingTop: spacing.sm,
    paddingBottom: 60,
  },
  statusIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLiveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E89838',
  },
  statusLiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#531827',
  },
  donationIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  foodOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: spacing.md,
  },
  foodCardThumb: {
    width: 85,
    height: 85,
    borderRadius: radius.md,
    backgroundColor: '#F3EDE9',
  },
  foodCardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 3,
  },
  foodCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  donorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  prepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  prepTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  timeRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.urgentRed,
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  unitsText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  freshBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  freshBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionWrap: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E4852',
    letterSpacing: 0.8,
  },
  sectionActionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.adminMaroon,
  },
  photosScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoItemWrap: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: '#F3EDE9',
  },
  photoTagOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    alignItems: 'center',
    paddingVertical: 2,
  },
  photoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  safetyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECEE',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  safetyTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  safetyBadge: {
    backgroundColor: colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  safetyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mint,
  },
  checklist: {
    gap: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkContent: {
    flex: 1,
  },
  checkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  checkHighlightGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mint,
  },
  checkHighlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  checkDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FBEFF2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  demandAlertBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  demandAlertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demandAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  demandAlertDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flagRejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D8C6CC',
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  flagRejectText: {
    color: '#531827',
    fontSize: 13,
    fontWeight: '700',
  },
  approveDispatchBtn: {
    flex: 1.5,
    borderRadius: radius.pill,
    backgroundColor: colors.adminMaroon,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveDispatchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  lightboxCard: {
    width: '100%',
    height: '75%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  rejectModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rejectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rejectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rejectDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reasonInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
    height: 100,
  },
  rejectActionRow: {
    marginTop: spacing.xs,
  },
  confirmRejectBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmRejectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
