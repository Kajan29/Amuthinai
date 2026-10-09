import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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

interface DeliveryItem {
  id: string;
  donationTitle: string;
  servings: number;
  foodType: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed';
  donorName: string;
  pickupAddress: string;
  recipientName: string;
  dropAddress: string;
  volunteerName: string;
  volunteerPhone: string;
  volunteerVehicle: string;
  volunteerAvatar: string;
  deliveryPin: string;
  minutesElapsed: number;
  distanceKm: number;
  isDelayed?: boolean;
  delayReason?: string;
  pickupProofUrl?: string;
  deliveryProofUrl?: string;
}

const SAMPLE_DELIVERIES: DeliveryItem[] = [
  {
    id: 'del-101',
    donationTitle: '50 Pkts Hot Vegetable Rice & Sambar',
    servings: 50,
    foodType: 'Cooked',
    status: 'in_transit',
    donorName: 'Nallur Temple Kitchen',
    pickupAddress: 'Point Pedro Road, Nallur Kovil North Gate',
    recipientName: 'Ariyalai Community Centre',
    dropAddress: 'Ariyalai East, Jaffna',
    volunteerName: 'Kajan S.',
    volunteerPhone: '+94 77 123 4567',
    volunteerVehicle: 'Motorbike (125cc)',
    volunteerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    deliveryPin: '4829',
    minutesElapsed: 22,
    distanceKm: 4.8,
    pickupProofUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'del-102',
    donationTitle: '40 Fresh Buns & Loaves',
    servings: 40,
    foodType: 'Bakery',
    status: 'delayed',
    donorName: 'Hospital Road Bakery',
    pickupAddress: 'Hospital Road, Jaffna Town',
    recipientName: 'Grace Care Elderly Home',
    dropAddress: 'Navalar Road, Nallur',
    volunteerName: 'Murugan R.',
    volunteerPhone: '+94 77 345 6789',
    volunteerVehicle: 'Toyota HiAce Van',
    volunteerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    deliveryPin: '7712',
    minutesElapsed: 54,
    distanceKm: 8.2,
    isDelayed: true,
    delayReason: 'Traffic congestion near railway cross road; courier rerouting.',
    pickupProofUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'del-103',
    donationTitle: '30 Vegetable Biryani Packs',
    servings: 30,
    foodType: 'Cooked',
    status: 'picked_up',
    donorName: 'Kopay Community Kitchen',
    pickupAddress: 'Main Street, Kopay Central',
    recipientName: 'Chavakachcheri Children Home',
    dropAddress: 'Station Road, Chavakachcheri',
    volunteerName: 'Priya T.',
    volunteerPhone: '+94 77 234 8901',
    volunteerVehicle: 'Bicycle (Eco Carrier)',
    volunteerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    deliveryPin: '9301',
    minutesElapsed: 15,
    distanceKm: 3.5,
    pickupProofUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'del-104',
    donationTitle: '60 Pkts Dinner Rolls & Milk Breads',
    servings: 60,
    foodType: 'Bakery',
    status: 'delivered',
    donorName: 'Jaffna Central Caterers',
    pickupAddress: 'Stanely Road, Jaffna',
    recipientName: 'St. Anthony Relief Hostel',
    dropAddress: 'Beach Road, Jaffna Coastal',
    volunteerName: 'Sivaranjan K.',
    volunteerPhone: '+94 77 987 6543',
    volunteerVehicle: 'Three-Wheeler',
    volunteerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    deliveryPin: '5543',
    minutesElapsed: 38,
    distanceKm: 5.1,
    pickupProofUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    deliveryProofUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
  },
];

export default function DeliveriesMonitor() {
  const [filter, setFilter] = useState<'all' | 'in_transit' | 'picked_up' | 'delayed' | 'delivered'>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Query backend
  const { data: assignmentsData, refetch, isRefetching } = useQuery({
    queryKey: ['admin.assignments', filter],
    queryFn: () => adminApi.assignments({ status: filter === 'all' ? undefined : filter }),
  });

  const deliveriesList: DeliveryItem[] = useMemo(() => {
    if (assignmentsData?.items && assignmentsData.items.length > 0) {
      return assignmentsData.items.map((a: any) => ({
        id: a._id,
        donationTitle: a.donation?.foodName || 'Cooked Meals',
        servings: a.donation?.servings || 40,
        foodType: a.donation?.foodCategory || 'Cooked',
        status: (a.status as any) || 'in_transit',
        donorName: a.donation?.donor?.name || 'Local Donor',
        pickupAddress: a.donation?.pickupLocation?.address || 'Jaffna',
        recipientName: a.recipientRequest?.recipient?.name || 'Community Centre',
        dropAddress: a.recipientRequest?.deliveryLocation?.address || 'Jaffna',
        volunteerName: a.volunteer?.name || 'Assigned Courier',
        volunteerPhone: a.volunteer?.phone || '+94 77 123 4567',
        volunteerVehicle: a.volunteer?.vehicleType || 'Motorbike',
        volunteerAvatar: a.volunteer?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
        deliveryPin: a.deliveryPin || '4821',
        minutesElapsed: 15,
        distanceKm: 2.8,
        isDelayed: a.status === 'delayed',
        delayReason: a.status === 'delayed' ? 'Vehicle technical issue' : undefined,
        pickupProofUrl: a.pickupProofPhoto || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
        deliveryProofUrl: a.deliveryProofPhoto || undefined,
      }));
    }
    return SAMPLE_DELIVERIES;
  }, [assignmentsData]);

  const filteredDeliveries = deliveriesList.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'delayed') return item.isDelayed;
    return item.status === filter;
  });

  const openDeliveryDetail = (item: DeliveryItem) => {
    setSelectedDelivery(item);
    setDetailModalVisible(true);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleReassign = () => {
    Alert.alert(
      'Reassign Courier',
      'Select a replacement volunteer rider from Jaffna Central pool.',
      [
        {
          text: 'Find Nearest Rider',
          onPress: () => {
            setDetailModalVisible(false);
            router.push('/(admin)/approvals/volunteers' as any);
          },
        },
        {
          text: 'Confirm Donor Self-Delivery',
          onPress: () => {
            setDetailModalVisible(false);
            Alert.alert('Donor Self-Delivery Confirmed', 'Donor notified to transport meals directly to drop location.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="ACTIVE DELIVERIES & LOGISTICS"
        rightAction={{
          icon: 'map-outline',
          onPress: () => router.push('/(admin)/map' as any),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Active Deliveries</Text>
          <Text style={styles.screenSubheading}>
            Live route tracking, delivery PIN verification & delayed logistics management
          </Text>
        </View>

        {/* Quick Operational Metrics */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>38</Text>
            <Text style={styles.metricLbl}>Dispatched</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.urgentRed }]}>04</Text>
            <Text style={styles.metricLbl}>Delayed</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.mint }]}>98.4%</Text>
            <Text style={styles.metricLbl}>On-Time</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>4.8km</Text>
            <Text style={styles.metricLbl}>Avg Route</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {(['all', 'in_transit', 'picked_up', 'delayed', 'delivered'] as const).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.filterChip, filter === tabKey && styles.filterChipActive]}
              onPress={() => setFilter(tabKey)}
            >
              <Text style={[styles.filterChipText, filter === tabKey && styles.filterChipTextActive]}>
                {tabKey.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Deliveries List */}
        <View style={styles.deliveriesList}>
          {filteredDeliveries.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.deliveryCard, item.isDelayed && styles.deliveryCardDelayed]}
              onPress={() => openDeliveryDetail(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.donationTitle}</Text>
                  <Text style={styles.cardMeta}>
                    {item.servings} Servings · {item.distanceKm} km · PIN: #{item.deliveryPin}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    item.isDelayed
                      ? { backgroundColor: colors.urgentRedLight }
                      : item.status === 'delivered'
                      ? { backgroundColor: colors.mintLight }
                      : { backgroundColor: '#FBEFF2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.isDelayed
                        ? { color: colors.urgentRed }
                        : item.status === 'delivered'
                        ? { color: colors.mint }
                        : { color: colors.adminMaroon },
                    ]}
                  >
                    {item.isDelayed ? 'DELAYED' : item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.isDelayed && (
                <View style={styles.delayAlertRow}>
                  <Ionicons name="warning" size={14} color={colors.urgentRed} />
                  <Text style={styles.delayAlertText}>{item.delayReason}</Text>
                </View>
              )}

              {/* Waypoints */}
              <View style={styles.waypointsContainer}>
                <View style={styles.waypointRow}>
                  <Ionicons name="radio-button-on" size={14} color="#C45A2C" />
                  <Text style={styles.waypointLabel}>Pickup:</Text>
                  <Text style={styles.waypointText} numberOfLines={1}>
                    {item.donorName} ({item.pickupAddress})
                  </Text>
                </View>
                <View style={styles.waypointLine} />
                <View style={styles.waypointRow}>
                  <Ionicons name="location" size={14} color={colors.mint} />
                  <Text style={styles.waypointLabel}>Drop:</Text>
                  <Text style={styles.waypointText} numberOfLines={1}>
                    {item.recipientName} ({item.dropAddress})
                  </Text>
                </View>
              </View>

              {/* Volunteer Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.volunteerFooterInfo}>
                  <Image source={{ uri: item.volunteerAvatar }} style={styles.miniAvatar} />
                  <View>
                    <Text style={styles.volFooterName}>{item.volunteerName}</Text>
                    <Text style={styles.volFooterVehicle}>{item.volunteerVehicle}</Text>
                  </View>
                </View>

                <View style={styles.inspectBtn}>
                  <Text style={styles.inspectBtnText}>Timeline &amp; Proof →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detailed Delivery Timeline & Proof Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailModalVisible(false)}>
          <View style={styles.modalSheet}>
            {selectedDelivery && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalSheetHeader}>
                  <View>
                    <Text style={styles.modalSheetTitle}>Delivery Status &amp; Timeline</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      Tracking #{selectedDelivery.id} · PIN: {selectedDelivery.deliveryPin}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Status Timeline */}
                <View style={styles.timelineCard}>
                  <Text style={styles.timelineHeading}>VERIFIED STATUS TIMELINE</Text>

                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.dotPassed]} />
                    <View style={styles.timelineTextWrap}>
                      <Text style={styles.timelineStepTitle}>Donation Submitted</Text>
                      <Text style={styles.timelineStepDesc}>
                        Cooked and sealed by {selectedDelivery.donorName}
                      </Text>
                    </View>
                    <Text style={styles.timelineTime}>11:30 AM</Text>
                  </View>

                  <View style={styles.timelineLine} />

                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.dotPassed]} />
                    <View style={styles.timelineTextWrap}>
                      <Text style={styles.timelineStepTitle}>Admin Safety Inspection Approved</Text>
                      <Text style={styles.timelineStepDesc}>72°C Thermal Check Passed</Text>
                    </View>
                    <Text style={styles.timelineTime}>11:42 AM</Text>
                  </View>

                  <View style={styles.timelineLine} />

                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.dotPassed]} />
                    <View style={styles.timelineTextWrap}>
                      <Text style={styles.timelineStepTitle}>Volunteer Picked Up Food</Text>
                      <Text style={styles.timelineStepDesc}>
                        Collected by {selectedDelivery.volunteerName}
                      </Text>
                    </View>
                    <Text style={styles.timelineTime}>11:58 AM</Text>
                  </View>

                  <View style={styles.timelineLine} />

                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        selectedDelivery.status === 'delivered' ? styles.dotPassed : styles.dotActive,
                      ]}
                    />
                    <View style={styles.timelineTextWrap}>
                      <Text style={styles.timelineStepTitle}>
                        {selectedDelivery.status === 'delivered'
                          ? 'Delivered to Recipient'
                          : 'In Transit on Jaffna Route'}
                      </Text>
                      <Text style={styles.timelineStepDesc}>
                        Heading to {selectedDelivery.recipientName}
                      </Text>
                    </View>
                    <Text style={styles.timelineTime}>Live</Text>
                  </View>
                </View>

                {/* Proof Photos */}
                <View style={styles.proofCard}>
                  <Text style={styles.timelineHeading}>PROOF OF COLLECTION &amp; DELIVERY</Text>
                  <View style={styles.proofPhotosRow}>
                    {selectedDelivery.pickupProofUrl && (
                      <View style={styles.proofPhotoWrap}>
                        <Image
                          source={{ uri: selectedDelivery.pickupProofUrl }}
                          style={styles.proofPhoto}
                        />
                        <View style={styles.proofTag}>
                          <Text style={styles.proofTagText}>Pickup Verified</Text>
                        </View>
                      </View>
                    )}
                    {selectedDelivery.deliveryProofUrl ? (
                      <View style={styles.proofPhotoWrap}>
                        <Image
                          source={{ uri: selectedDelivery.deliveryProofUrl }}
                          style={styles.proofPhoto}
                        />
                        <View style={[styles.proofTag, { backgroundColor: colors.mint }]}>
                          <Text style={styles.proofTagText}>Delivery PIN Verified</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.proofPlaceholder}>
                        <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                        <Text style={styles.proofPlaceholderText}>
                          Awaiting recipient PIN confirmation
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Volunteer & Logistics Actions */}
                <View style={styles.modalActionsSection}>
                  <TouchableOpacity
                    style={styles.callCourierBtn}
                    onPress={() => handleCall(selectedDelivery.volunteerPhone)}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.callCourierText}>
                      Call Courier ({selectedDelivery.volunteerName})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.reassignBtn} onPress={handleReassign}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.adminMaroon} />
                    <Text style={styles.reassignBtnText}>
                      Reassign Courier / Confirm Self-Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
    paddingBottom: 80,
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
    lineHeight: 16,
  },
  metricsBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F0ECE8',
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  deliveriesList: {
    gap: spacing.md,
  },
  deliveryCard: {
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
  deliveryCardDelayed: {
    borderColor: '#F8B4B4',
    backgroundColor: '#FFFDFD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  delayAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.urgentRedLight,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  delayAlertText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.urgentRed,
    flex: 1,
  },
  waypointsContainer: {
    paddingVertical: spacing.xs,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waypointLine: {
    width: 2,
    height: 12,
    backgroundColor: '#E0D8D4',
    marginLeft: 6,
    marginVertical: 2,
  },
  waypointLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  waypointText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5ECEE',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  volunteerFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEE',
  },
  volFooterName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  volFooterVehicle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  inspectBtn: {
    backgroundColor: '#FAF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  timelineHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6E4852',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  dotPassed: {
    backgroundColor: colors.mint,
  },
  dotActive: {
    backgroundColor: colors.adminMaroon,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: '#DCD4D0',
    marginLeft: 5,
    marginVertical: 2,
  },
  proofCard: {
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  proofPhotosRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  proofPhotoWrap: {
    flex: 1,
    height: 110,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  proofPhoto: {
    width: '100%',
    height: '100%',
  },
  proofTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  proofTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  proofPlaceholder: {
    flex: 1,
    height: 110,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E0D8D4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: 4,
  },
  proofPlaceholderText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalActionsSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  callCourierBtn: {
    backgroundColor: colors.adminMaroon,
    paddingVertical: 13,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callCourierText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reassignBtn: {
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reassignBtnText: {
    color: colors.adminMaroon,
    fontSize: 13,
    fontWeight: '700',
  },
});
