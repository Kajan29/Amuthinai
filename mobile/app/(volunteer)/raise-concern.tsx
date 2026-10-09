import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { assignmentsApi, isOpenTask, type NearbyTask } from '@/api/assignments.api';
import { enquiriesApi, type CreateEnquiryPayload } from '@/api/enquiries.api';
import { useAuth } from '@/hooks/useAuth';
import type { EnquiryCategory } from '@/types';
import { cloudinaryService } from '@/services/cloudinary';
import { volunteerColors } from '@/theme/volunteer';
import type { Enquiry } from '@/types';

export const VOLUNTEER_CONCERN_REASONS = [
  {
    id: 'donor_closed',
    label: 'Donor Closed / Unavailable',
    icon: 'storefront-outline' as const,
    defaultUrgency: 'urgent' as const,
    description: 'No one at pickup location or kitchen is closed.',
  },
  {
    id: 'food_damaged',
    label: 'Food Damaged / Spilled',
    icon: 'nutrition-outline' as const,
    defaultUrgency: 'urgent' as const,
    description: 'Packaging leak, temperature issue, or spoiled meals.',
  },
  {
    id: 'breakdown_delay',
    label: 'Vehicle Breakdown / Delay',
    icon: 'speedometer-outline' as const,
    defaultUrgency: 'moderate' as const,
    description: 'Flat tyre, mechanical failure, or severe road congestion.',
  },
  {
    id: 'dropoff_inaccessible',
    label: 'Dropoff Inaccessible / Wrong Pin',
    icon: 'location-outline' as const,
    defaultUrgency: 'moderate' as const,
    description: 'Shelter gate locked, flooded road, or invalid coordinates.',
  },
  {
    id: 'recipient_unreachable',
    label: 'Recipient Not Answering',
    icon: 'call-outline' as const,
    defaultUrgency: 'moderate' as const,
    description: 'Recipient phone ringing out or person missing at doorstep.',
  },
  {
    id: 'quantity_mismatch',
    label: 'Portions Mismatch',
    icon: 'scale-outline' as const,
    defaultUrgency: 'normal' as const,
    description: 'Number of meal packets differs from assignment specs.',
  },
  {
    id: 'safety_hazard',
    label: 'Safety Hazard / Emergency',
    icon: 'warning-outline' as const,
    defaultUrgency: 'urgent' as const,
    description: 'Dog menace, adverse weather, or personal safety concern.',
  },
  {
    id: 'other',
    label: 'Other Operational Issue',
    icon: 'chatbubble-ellipses-outline' as const,
    defaultUrgency: 'normal' as const,
    description: 'Any other question or operational concern for dispatch.',
  },
];

const REASON_CATEGORY: Record<string, EnquiryCategory> = {
  donor_closed: 'other',
  food_damaged: 'food_quality',
  breakdown_delay: 'late_delivery',
  dropoff_inaccessible: 'wrong_location',
  recipient_unreachable: 'not_delivered',
  quantity_mismatch: 'wrong_quantity',
  safety_hazard: 'road_issue',
  other: 'other',
};

/** Sri Lanka Police emergency line — for safety emergencies only; everything else goes to admins. */
const EMERGENCY_NUMBER = '119';

type OrderCategoryFilter = 'all' | 'current' | 'past';
type UrgencyLevel = 'normal' | 'moderate' | 'urgent';

interface UnifiedVolunteerTask {
  assignmentId: string;
  orderNumber: string;
  title: string;
  servings: number;
  pickupLine: string;
  dropoffLine: string;
  status: string;
  isCurrent: boolean;
  rawTask?: NearbyTask;
}

export default function VolunteerRaiseConcernScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ assignmentId?: string; donationId?: string }>();

  // Screen Tabs: 'submit' (Submit Concern) | 'history' (My Raised Concerns)
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Form State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    params.assignmentId || (params.donationId ? `open-${params.donationId}` : '')
  );
  const [orderFilter, setOrderFilter] = useState<OrderCategoryFilter>('all');
  const [selectedReasonId, setSelectedReasonId] = useState<string>(
    VOLUNTEER_CONCERN_REASONS[0]!.id
  );
  const [urgency, setUrgency] = useState<UrgencyLevel>('moderate');
  const [details, setDetails] = useState('');
  const [attachmentPhotoUrl, setAttachmentPhotoUrl] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // 1. Fetch the volunteer's live tasks and delivery history
  const nearbyQuery = useQuery({
    queryKey: ['volunteer.nearby'],
    queryFn: () => assignmentsApi.nearby(),
  });

  const historyQuery = useQuery({
    queryKey: ['volunteer.history'],
    queryFn: () => assignmentsApi.history({ pageSize: 30 }),
  });

  // 2. Fetch Volunteer Concerns History
  const concernsQuery = useQuery({
    queryKey: ['volunteer', 'concerns', 'mine'],
    queryFn: () => enquiriesApi.mine(),
  });

  // Current orders are the volunteer's own live tasks; past orders come from history.
  const unifiedTasks = useMemo<UnifiedVolunteerTask[]>(() => {
    const map = new Map<string, UnifiedVolunteerTask>();
    const add = (t: NearbyTask) => {
      const isCurr = t.assignment.status === 'offered' || t.assignment.status === 'accepted';
      map.set(t.assignment.id, {
        assignmentId: t.assignment.id,
        orderNumber: `#${(isOpenTask(t.assignment.id) ? t.donation.id : t.assignment.id).slice(-6).toUpperCase()}`,
        title: t.donation.title,
        servings: t.donation.servings,
        pickupLine: t.donation.pickupAddress.line1,
        dropoffLine: t.recipient?.name ?? t.request?.dropAddress.line1 ?? 'Drop-off not matched yet',
        status: t.assignment.status,
        isCurrent: isCurr,
        rawTask: t,
      });
    };

    for (const t of nearbyQuery.data ?? []) {
      if (!t.isOpen || t.assignment.id === selectedAssignmentId) add(t);
    }
    for (const t of historyQuery.data?.items ?? []) {
      if (!map.has(t.assignment.id)) add(t);
    }

    return Array.from(map.values());
  }, [nearbyQuery.data, historyQuery.data, selectedAssignmentId]);

  // Filter tasks according to order category toggle
  const filteredTasks = useMemo(() => {
    if (orderFilter === 'current') return unifiedTasks.filter((t) => t.isCurrent);
    if (orderFilter === 'past') return unifiedTasks.filter((t) => !t.isCurrent);
    return unifiedTasks;
  }, [unifiedTasks, orderFilter]);

  // Selected Order Object
  const currentSelectedTask = useMemo(
    () => unifiedTasks.find((t) => t.assignmentId === selectedAssignmentId),
    [unifiedTasks, selectedAssignmentId]
  );

  // Selected Reason Object
  const currentReason = useMemo(
    () => VOLUNTEER_CONCERN_REASONS.find((r) => r.id === selectedReasonId) || VOLUNTEER_CONCERN_REASONS[0]!,
    [selectedReasonId]
  );

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const orderTag = currentSelectedTask
        ? `[Order ${currentSelectedTask.orderNumber}]`
        : '[General Dispatch]';
      const reasonLabel = currentReason.label;

      const subject = `${orderTag} [${urgency.toUpperCase()}] ${reasonLabel}`;

      const body =
        `=== VOLUNTEER CONCERN REPORT ===\n` +
        `Volunteer: ${user?.name ?? 'Volunteer'}${user?.phone ? ` (${user.phone})` : ''}\n` +
        `Order Ref: ${currentSelectedTask ? currentSelectedTask.orderNumber : 'No Specific Order'}\n` +
        `Order Status: ${currentSelectedTask ? (currentSelectedTask.isCurrent ? 'CURRENT / ACTIVE' : 'PAST / DELIVERED') : 'General'}\n` +
        `Food: ${currentSelectedTask ? `${currentSelectedTask.title} (${currentSelectedTask.servings} portions)` : 'N/A'}\n` +
        `Pickup Point: ${currentSelectedTask?.pickupLine || 'N/A'}\n` +
        `Dropoff Point: ${currentSelectedTask?.dropoffLine || 'N/A'}\n` +
        `Issue Category: ${reasonLabel}\n` +
        `Urgency Level: ${urgency.toUpperCase()}\n` +
        (attachmentPhotoUrl ? `Attached Proof (Cloudinary): ${attachmentPhotoUrl}\n\n` : '\n') +
        `--- DETAILED REPORT ---\n` +
        `${details.trim()}`;

      const linkedAssignment =
        selectedAssignmentId && !isOpenTask(selectedAssignmentId) ? selectedAssignmentId : undefined;
      const payload: CreateEnquiryPayload = {
        subject: subject.slice(0, 120),
        body,
        category: REASON_CATEGORY[currentReason.id] ?? 'other',
        assignmentId: linkedAssignment,
        donationId: currentSelectedTask?.rawTask?.donation.id,
      };

      return enquiriesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer', 'concerns', 'mine'] });
      setDetails('');
      setAttachmentPhotoUrl(null);
      Alert.alert(
        'Concern Dispatched ✅',
        'Your concern has been submitted to Amuthinai central dispatch. An admin coordinator will review this immediately.',
        [
          {
            text: 'View My Concerns',
            onPress: () => setActiveTab('history'),
          },
          {
            text: 'Back to Tasks',
            onPress: () => router.push('/(volunteer)/tasks'),
          },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Submission Notice',
        err?.message || 'Could not send concern to server. Please try calling dispatch directly.'
      );
    },
  });

  const canSubmit = details.trim().length >= 10;

  function handleCallDispatch() {
    void Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  }

  function handleSelectReason(reason: (typeof VOLUNTEER_CONCERN_REASONS)[0]) {
    setSelectedReasonId(reason.id);
    setUrgency(reason.defaultUrgency);
  }

  async function handleCaptureAttachment(source: 'camera' | 'gallery') {
    try {
      const uri = await cloudinaryService.pickOrCapture(source);
      if (!uri) return;

      setIsUploadingAttachment(true);
      const result = await cloudinaryService.uploadImage(uri, 'amuthinai/volunteer-concerns');
      setAttachmentPhotoUrl(result.url);
      Alert.alert(
        'Photo Stored in Cloudinary! ☁️',
        'Proof photo has been uploaded and stored securely in Cloudinary.'
      );
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload photo to Cloudinary.');
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  const myConcerns: Enquiry[] = concernsQuery.data?.items ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ─── TOP NAVIGATION HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={volunteerColors.ink} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Volunteer Support</Text>
          <Text style={styles.headerSubtitle}>Raise Concern & Dispatch Help</Text>
        </View>

        <TouchableOpacity
          onPress={handleCallDispatch}
          style={styles.hotlineHeaderButton}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={styles.hotlineHeaderText}>{EMERGENCY_NUMBER}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB SWITCHER: SUBMIT CONCERN vs CONCERNS HISTORY ─── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'submit' && styles.tabButtonActive]}
          onPress={() => setActiveTab('submit')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="alert-circle"
            size={18}
            color={activeTab === 'submit' ? volunteerColors.maroon : volunteerColors.muted}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'submit' && styles.tabButtonTextActive,
            ]}
          >
            Raise Concern
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="list-circle"
            size={18}
            color={activeTab === 'history' ? volunteerColors.maroon : volunteerColors.muted}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'history' && styles.tabButtonTextActive,
            ]}
          >
            Submitted Logs
          </Text>
          {myConcerns.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{myConcerns.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── BODY CONTENT ─── */}
      {activeTab === 'submit' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Banner with Hotline */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerTopRow}>
              <View style={styles.bannerIconBadge}>
                <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Route Obstacle or Delivery Issue?</Text>
                <Text style={styles.bannerDesc}>
                  Whether it is an active order obstacle or an issue with a past delivery, report it
                  directly to the Jaffna central relief team.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.emergencyCallPill}
              onPress={handleCallDispatch}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={15} color="#FFFFFF" />
              <Text style={styles.emergencyCallText}>
                Personal safety emergency? Call Police {EMERGENCY_NUMBER}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── STEP 1: SELECT ORDER (CURRENT vs PAST vs GENERAL) ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.sectionHeading}>Link to Current or Past Order</Text>
            </View>
            <Text style={styles.sectionHelper}>
              Select the affected delivery assignment or choose general if not order-related:
            </Text>

            {/* Filter Selector */}
            <View style={styles.categoryFilterRow}>
              {(['all', 'current', 'past'] as OrderCategoryFilter[]).map((cat) => {
                const isActive = orderFilter === cat;
                const label =
                  cat === 'all'
                    ? 'All Orders'
                    : cat === 'current'
                    ? '🟢 Current / Active'
                    : '⚪ Past Delivered';
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryFilterChip, isActive && styles.categoryFilterChipActive]}
                    onPress={() => setOrderFilter(cat)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryFilterChipText,
                        isActive && styles.categoryFilterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* General Issue Option */}
            <TouchableOpacity
              style={[
                styles.generalOrderCard,
                selectedAssignmentId === '' && styles.orderCardSelected,
              ]}
              onPress={() => setSelectedAssignmentId('')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {selectedAssignmentId === '' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.generalOrderTitle}>General Volunteer Inquiry / Issue</Text>
                <Text style={styles.generalOrderSubtitle}>
                  Vehicle badge, volunteer profile, app trouble, or general community question
                </Text>
              </View>
              <Ionicons name="information-circle-outline" size={20} color={volunteerColors.muted} />
            </TouchableOpacity>

            {/* Order Chips List */}
            {nearbyQuery.isLoading ? (
              <ActivityIndicator color={volunteerColors.maroon} style={{ marginVertical: 15 }} />
            ) : filteredTasks.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ordersScrollContainer}
              >
                {filteredTasks.map((t) => {
                  const isSelected = selectedAssignmentId === t.assignmentId;
                  return (
                    <TouchableOpacity
                      key={t.assignmentId}
                      style={[styles.orderCard, isSelected && styles.orderCardSelected]}
                      onPress={() => setSelectedAssignmentId(t.assignmentId)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.orderCardHeader}>
                        <View style={styles.orderIdPill}>
                          <Text style={styles.orderIdText}>{t.orderNumber}</Text>
                        </View>
                        <View
                          style={[
                            styles.orderStatusPill,
                            t.isCurrent
                              ? { backgroundColor: '#E3F3EB' }
                              : { backgroundColor: '#F3F4F6' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.orderStatusText,
                              t.isCurrent ? { color: '#0F7B4F' } : { color: '#6B7280' },
                            ]}
                          >
                            {t.isCurrent ? 'CURRENT ACTIVE' : 'PAST DELIVERED'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.orderTitle} numberOfLines={2}>
                        {t.title}
                      </Text>
                      <Text style={styles.orderServings}>{t.servings} Servings</Text>

                      <View style={styles.orderRouteRow}>
                        <Ionicons name="location-sharp" size={13} color={volunteerColors.maroon} />
                        <Text style={styles.orderRouteText} numberOfLines={1}>
                          {t.dropoffLine}
                        </Text>
                      </View>

                      <View style={styles.orderSelectionIndicator}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? volunteerColors.maroon : volunteerColors.muted}
                        />
                        <Text
                          style={[
                            styles.orderSelectLabel,
                            isSelected && { color: volunteerColors.maroon, fontWeight: '700' },
                          ]}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyTasksBox}>
                <Text style={styles.emptyTasksText}>
                  No {orderFilter === 'current' ? 'active' : orderFilter === 'past' ? 'past' : ''}{' '}
                  orders found. You can submit a General Volunteer Concern.
                </Text>
              </View>
            )}
          </View>

          {/* ─── STEP 2: SELECT CONCERN CATEGORY ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.sectionHeading}>Select Issue Category</Text>
            </View>

            <View style={styles.reasonsGrid}>
              {VOLUNTEER_CONCERN_REASONS.map((reason) => {
                const isSelected = selectedReasonId === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonCard, isSelected && styles.reasonCardSelected]}
                    onPress={() => handleSelectReason(reason)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.reasonIconBox,
                        isSelected && { backgroundColor: volunteerColors.maroon },
                      ]}
                    >
                      <Ionicons
                        name={reason.icon}
                        size={20}
                        color={isSelected ? '#FFFFFF' : volunteerColors.maroon}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.reasonLabel,
                          isSelected && { color: volunteerColors.maroon, fontWeight: '700' },
                        ]}
                      >
                        {reason.label}
                      </Text>
                      <Text style={styles.reasonDesc} numberOfLines={2}>
                        {reason.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={volunteerColors.maroon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── STEP 3: SELECT URGENCY LEVEL ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.sectionHeading}>Urgency Level</Text>
            </View>

            <View style={styles.urgencyRow}>
              {[
                {
                  key: 'normal' as UrgencyLevel,
                  label: 'Normal',
                  sub: 'Routine feedback',
                  color: '#0F7B4F',
                  bg: '#E3F3EB',
                },
                {
                  key: 'moderate' as UrgencyLevel,
                  label: 'Moderate',
                  sub: 'Delay / Guidance',
                  color: '#D97706',
                  bg: '#FEF3C7',
                },
                {
                  key: 'urgent' as UrgencyLevel,
                  label: 'Critical / Urgent',
                  sub: 'Delivery blocked',
                  color: '#DC2626',
                  bg: '#FEE2E2',
                },
              ].map((lvl) => {
                const isSelected = urgency === lvl.key;
                return (
                  <TouchableOpacity
                    key={lvl.key}
                    style={[
                      styles.urgencyChip,
                      isSelected && { borderColor: lvl.color, borderWidth: 2, backgroundColor: lvl.bg },
                    ]}
                    onPress={() => setUrgency(lvl.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.urgencyDot, { backgroundColor: lvl.color }]} />
                    <Text
                      style={[
                        styles.urgencyLabel,
                        isSelected && { color: lvl.color, fontWeight: '700' },
                      ]}
                    >
                      {lvl.label}
                    </Text>
                    <Text style={styles.urgencySub}>{lvl.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── STEP 4: DETAILED EXPLANATION ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.sectionHeading}>Explain the Situation in Detail</Text>
            </View>

            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={6}
              placeholder="State what went wrong, your current location, recipient/donor situation, and any action you require dispatch to take..."
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.charCountRow}>
              <Text style={styles.charCountText}>
                {details.trim().length < 10
                  ? `Min 10 characters required (${10 - details.trim().length} more)`
                  : `${details.trim().length} characters`}
              </Text>
            </View>
          </View>

          {/* ─── STEP 5: OPTIONAL PHOTO PROOF (CLOUDINARY) ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.sectionHeading}>Proof / Photo Attachment (Cloudinary)</Text>
            </View>
            <Text style={styles.sectionHelper}>
              Optional: Attach a live camera photo or screenshot of the obstacle, spoiled meals, or road condition.
            </Text>

            {attachmentPhotoUrl ? (
              <View style={styles.attachmentPreviewCard}>
                <Image
                  source={{ uri: attachmentPhotoUrl }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
                <View style={styles.attachmentOverlay}>
                  <View style={styles.cloudinaryBadge}>
                    <Ionicons name="cloud-done" size={13} color="#FFFFFF" />
                    <Text style={styles.cloudinaryBadgeText}>Stored in Cloudinary</Text>
                  </View>
                  <View style={styles.attachmentBtnsRow}>
                    <TouchableOpacity
                      style={styles.retakeAttachmentBtn}
                      onPress={() => void handleCaptureAttachment('camera')}
                      disabled={isUploadingAttachment}
                    >
                      <Ionicons name="camera-reverse" size={13} color="#FFFFFF" />
                      <Text style={styles.retakeAttachmentText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeAttachmentBtn}
                      onPress={() => setAttachmentPhotoUrl(null)}
                    >
                      <Ionicons name="trash-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.removeAttachmentText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.attachmentUploadActions}>
                <TouchableOpacity
                  style={styles.attachmentPrimaryBtn}
                  onPress={() => void handleCaptureAttachment('camera')}
                  disabled={isUploadingAttachment}
                  activeOpacity={0.8}
                >
                  {isUploadingAttachment ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                      <Text style={styles.attachmentPrimaryBtnText}>Take Live Photo</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachmentSecondaryBtn}
                  onPress={() => void handleCaptureAttachment('gallery')}
                  disabled={isUploadingAttachment}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={16} color={volunteerColors.maroon} />
                  <Text style={styles.attachmentSecondaryBtnText}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ─── VOLUNTEER CONTACT DISPATCH BADGE ─── */}
          <View style={styles.contactVerificationCard}>
            <Ionicons name="person-circle-outline" size={26} color={volunteerColors.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactVerificationName}>
                Reporting as: {user?.name ?? 'Volunteer'}
              </Text>
              <Text style={styles.contactVerificationPhone}>
                Callback Phone: {user?.phone || 'Not set — add one in your profile'}
              </Text>
            </View>
          </View>

          {/* ─── SUBMIT BUTTON ─── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!canSubmit || submitMutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            activeOpacity={0.85}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Concern to Administration</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ─── TAB 2: MY CONCERNS HISTORY ─── */
        <FlatList
          data={myConcerns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyListContent}
          refreshControl={
            <RefreshControl
              refreshing={concernsQuery.isFetching}
              onRefresh={() => void concernsQuery.refetch()}
              tintColor={volunteerColors.maroon}
            />
          }
          ListHeaderComponent={
            <View style={styles.historyHeaderBox}>
              <Text style={styles.historyTitle}>Submitted Volunteer Logs</Text>
              <Text style={styles.historySubtitle}>
                Track response times and admin resolutions for issues you reported.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyHistoryCard}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#0F7B4F" />
              <Text style={styles.emptyHistoryTitle}>No Active Concerns</Text>
              <Text style={styles.emptyHistoryDesc}>
                You have not raised any concerns yet. All your routes are clean!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isResolved = item.status === 'resolved';
            const isInReview = item.status === 'in_review';
            const statusLabel = isResolved
              ? 'RESOLVED'
              : isInReview
              ? 'IN REVIEW'
              : 'PENDING DISPATCH';
            const statusColor = isResolved
              ? '#0F7B4F'
              : isInReview
              ? '#2563EB'
              : '#D97706';
            const statusBg = isResolved
              ? '#E3F3EB'
              : isInReview
              ? '#EFF6FF'
              : '#FEF3C7';

            return (
              <View style={styles.historyCard}>
                <View style={styles.historyCardTopRow}>
                  <View style={[styles.historyStatusBadge, { backgroundColor: statusBg }]}>
                    <View style={[styles.historyStatusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.historyStatusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.historySubject}>{item.subject}</Text>
                <Text style={styles.historyBody} numberOfLines={4}>
                  {item.body}
                </Text>

                {(() => {
                  const match = item.body?.match(/https:\/\/res\.cloudinary\.com[^\s\n]+/i);
                  if (!match) return null;
                  return (
                    <View style={styles.historyPhotoBox}>
                      <Image source={{ uri: match[0] }} style={styles.historyThumb} resizeMode="cover" />
                      <View style={styles.historyPhotoBadge}>
                        <Ionicons name="cloud-done" size={11} color="#FFFFFF" />
                        <Text style={styles.historyPhotoBadgeText}>Cloudinary Photo Proof</Text>
                      </View>
                    </View>
                  );
                })()}

                {(item.responses ?? []).map((reply, index) => (
                  <View key={`${item.id}-reply-${index}`} style={styles.resolutionBox}>
                    <View style={styles.resolutionHeaderRow}>
                      <Ionicons
                        name={reply.authorRole === 'admin' ? 'shield-outline' : 'person-outline'}
                        size={16}
                        color="#2563EB"
                      />
                      <Text style={styles.resolutionTitle}>
                        {reply.authorRole === 'admin' ? 'Admin reply' : reply.authorName} ·{' '}
                        {new Date(reply.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.resolutionText}>{reply.message}</Text>
                  </View>
                ))}

                {item.resolution && (
                  <View style={styles.resolutionBox}>
                    <View style={styles.resolutionHeaderRow}>
                      <Ionicons name="shield-checkmark" size={16} color="#0F7B4F" />
                      <Text style={styles.resolutionTitle}>Admin Team Resolution</Text>
                    </View>
                    <Text style={styles.resolutionText}>{item.resolution}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1614',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8A8178',
    marginTop: 1,
  },
  hotlineHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  hotlineHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: volunteerColors.maroon,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8178',
  },
  tabButtonTextActive: {
    color: volunteerColors.maroon,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  bannerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#FBEFF2',
    marginTop: 4,
    lineHeight: 17,
  },
  emergencyCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: volunteerColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1614',
  },
  sectionHelper: {
    fontSize: 12,
    color: '#8A8178',
    marginBottom: 12,
    marginLeft: 30,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryFilterChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterChipActive: {
    backgroundColor: volunteerColors.maroonSoft,
    borderColor: volunteerColors.maroon,
    borderWidth: 1,
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryFilterChipTextActive: {
    color: volunteerColors.maroon,
    fontWeight: '700',
  },
  generalOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: volunteerColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: volunteerColors.maroon,
  },
  generalOrderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1614',
  },
  generalOrderSubtitle: {
    fontSize: 11,
    color: '#8A8178',
    marginTop: 2,
  },
  ordersScrollContainer: {
    gap: 12,
    paddingBottom: 4,
  },
  orderCard: {
    width: 230,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    padding: 12,
  },
  orderCardSelected: {
    borderColor: volunteerColors.maroon,
    backgroundColor: '#FDF7F8',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdPill: {
    backgroundColor: '#1C1614',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderIdText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  orderStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1614',
    minHeight: 34,
  },
  orderServings: {
    fontSize: 11.5,
    color: '#8A8178',
    marginBottom: 6,
  },
  orderRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  orderRouteText: {
    fontSize: 11,
    color: '#5A1626',
    flex: 1,
    fontWeight: '500',
  },
  orderSelectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    paddingTop: 8,
  },
  orderSelectLabel: {
    fontSize: 12,
    color: '#8A8178',
  },
  emptyTasksBox: {
    backgroundColor: '#FAF8F5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyTasksText: {
    fontSize: 12,
    color: '#8A8178',
    textAlign: 'center',
  },
  reasonsGrid: {
    gap: 8,
    marginTop: 6,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  reasonCardSelected: {
    borderColor: volunteerColors.maroon,
    backgroundColor: '#FDF7F8',
  },
  reasonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1614',
  },
  reasonDesc: {
    fontSize: 11,
    color: '#8A8178',
    marginTop: 2,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  urgencyChip: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  urgencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1614',
    textAlign: 'center',
  },
  urgencySub: {
    fontSize: 10,
    color: '#8A8178',
    marginTop: 2,
    textAlign: 'center',
  },
  detailsInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1C1614',
    textAlignVertical: 'top',
    minHeight: 120,
    marginTop: 6,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  charCountText: {
    fontSize: 11,
    color: '#8A8178',
  },
  contactVerificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3D2D9',
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  contactVerificationName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A1626',
  },
  contactVerificationPhone: {
    fontSize: 11.5,
    color: '#8A8178',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: volunteerColors.maroon,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#B5A5A9',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyListContent: {
    padding: 16,
  },
  historyHeaderBox: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1614',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#8A8178',
    marginTop: 2,
  },
  emptyHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginTop: 20,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1614',
    marginTop: 12,
  },
  emptyHistoryDesc: {
    fontSize: 12.5,
    color: '#8A8178',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  historyCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  historyStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    color: '#8A8178',
  },
  historySubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1614',
    marginBottom: 6,
  },
  historyBody: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  resolutionBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#0F7B4F',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  resolutionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F7B4F',
  },
  resolutionText: {
    fontSize: 12,
    color: '#1F2937',
    lineHeight: 16,
  },
  /* Attachment card and preview styles */
  attachmentPreviewCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: '#000000',
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: 180,
  },
  attachmentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cloudinaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 123, 79, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cloudinaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  attachmentBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retakeAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retakeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  removeAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  removeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  attachmentUploadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  attachmentPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: volunteerColors.maroon,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  attachmentPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  attachmentSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: volunteerColors.maroon,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  attachmentSecondaryBtnText: {
    color: volunteerColors.maroon,
    fontSize: 13,
    fontWeight: '700',
  },
  historyPhotoBox: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
    height: 120,
    backgroundColor: '#E5E7EB',
  },
  historyThumb: {
    width: '100%',
    height: '100%',
  },
  historyPhotoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 123, 79, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
