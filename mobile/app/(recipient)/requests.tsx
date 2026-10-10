import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { requestsApi } from '@/api/requests.api';
import { DeliveryPinCard } from '@/components/DeliveryPinCard';
import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { Badge, Card, EmptyState } from '@/components/ui';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { colors, radius, spacing, typography } from '@/theme';
import type { FoodRequest } from '@/types';
import { formatDateTime } from '@/utils/date';
import { MapView, Marker, Polyline } from '@/utils/maps';

type RequestTab = 'current' | 'past';

const CONCERN_REASONS = [
  'Food not arrived',
  'Delivery delay',
  'Wrong quantity',
  'Food quality issue',
  'Other issue',
];

export default function RecipientRequestsScreen() {
  const insets = useSafeAreaInsets();
  // 1. Separate into Current Requests and Past Requests
  const [activeTab, setActiveTab] = useState<RequestTab>('current');

  // Selected request for full details modal
  const [selectedRequest, setSelectedRequest] = useState<FoodRequest | null>(null);

  // Tracking modal state
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  // Raise concern modal state (linked to selected request)
  const [concernModalVisible, setConcernModalVisible] = useState(false);
  const [selectedConcernReason, setSelectedConcernReason] = useState(CONCERN_REASONS[0]!);
  const [concernNotes, setConcernNotes] = useState('');

  // Edit modal state
  const [editingRequest, setEditingRequest] = useState<FoodRequest | null>(null);
  const [editServings, setEditServings] = useState<number>(1);
  const [editNotes, setEditNotes] = useState<string>('');

  // Cancel confirmation state
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['recipient', 'requests', 'mine'],
    queryFn: () => requestsApi.mine(),
  });

  const allRequests = data?.items ?? [];

  // Filter into Current (Active / Open / Matched) vs Past (Fulfilled / Cancelled)
  const currentRequests = allRequests.filter((req) => ['open', 'matched'].includes(req.status));
  const pastRequests = allRequests.filter((req) => ['fulfilled', 'cancelled'].includes(req.status));

  const displayedRequests = activeTab === 'current' ? currentRequests : pastRequests;

  // Live tracking data for selected request if tracking is open
  const { data: liveTrackingData } = useQuery({
    queryKey: ['recipient', 'tracking', selectedRequest?.id],
    queryFn: () => (selectedRequest ? requestsApi.tracking(selectedRequest.id) : null),
    enabled: Boolean(selectedRequest && trackingModalVisible),
  });

  // Cancel / Delete Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => requestsApi.cancel(id),
    async onSuccess() {
      setDeletingRequestId(null);
      setSelectedRequest(null);
      await queryClient.invalidateQueries({ queryKey: ['recipient', 'requests'] });
      await queryClient.invalidateQueries({ queryKey: ['recipient.requests'] });
      Alert.alert('Request Cancelled', 'Your food request has been successfully cancelled.');
    },
    onError(err: any) {
      Alert.alert('Error', err?.message || 'Failed to cancel request');
    },
  });

  // Update / Edit Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, servings, notes }: { id: string; servings: number; notes: string }) =>
      requestsApi.update(id, {
        servingsNeeded: servings,
        notes,
      }),
    async onSuccess() {
      setEditingRequest(null);
      await queryClient.invalidateQueries({ queryKey: ['recipient', 'requests'] });
      await queryClient.invalidateQueries({ queryKey: ['recipient.requests'] });
      Alert.alert('Success', 'Your food request details have been updated.');
    },
    onError(err: any) {
      Alert.alert('Error', err?.message || 'Failed to update request');
    },
  });

  // Raise a Concern Mutation
  const raiseConcernMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) return;
      const orderId = selectedRequest.id.slice(-6).toUpperCase();
      const subject = `[${selectedConcernReason}] Order #${orderId}`;
      const body = `Order Reference: #${orderId} (${selectedRequest.id})\n` +
        `Servings: ${selectedRequest.servingsNeeded}\n` +
        `Delivery Drop Address: ${selectedRequest.dropAddress?.line1}, ${selectedRequest.dropAddress?.city}\n` +
        `Concern Issue: ${selectedConcernReason}\n` +
        `Details / Notes: ${concernNotes.trim() || 'No additional note provided'}`;

      return requestsApi.raiseConcern({ subject, body });
    },
    onSuccess() {
      setConcernModalVisible(false);
      setConcernNotes('');
      Alert.alert(
        'Concern Submitted',
        'Your concern has been forwarded to the relief administration team. A volunteer supervisor will review and contact you shortly.',
        [{ text: 'OK' }],
      );
    },
    onError(err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit concern. Please try again.');
    },
  });

  const openEditModal = (req: FoodRequest) => {
    setEditingRequest(req);
    setEditServings(req.servingsNeeded);
    setEditNotes(req.notes || '');
  };

  const handleSaveEdit = () => {
    if (!editingRequest) return;
    updateMutation.mutate({
      id: editingRequest.id,
      servings: editServings,
      notes: editNotes,
    });
  };

  const handleConfirmDelete = () => {
    if (deletingRequestId) {
      cancelMutation.mutate(deletingRequestId);
    }
  };

  // Map Coordinates for tracking modal
  const dropLng = selectedRequest?.dropAddress?.location?.coordinates?.[0] || 80.0167;
  const dropLat = selectedRequest?.dropAddress?.location?.coordinates?.[1] || 9.6615;
  const hubLng = dropLng + 0.0169;
  const hubLat = dropLat + 0.0123;
  const volunteerLng = (dropLng + hubLng) / 2 + 0.002;
  const volunteerLat = (dropLat + hubLat) / 2 - 0.001;

  const mapboxTrackingUrl = getMapboxStaticMapUrl({
    center: { latitude: dropLat, longitude: dropLng },
    zoom: 13.5,
    width: 600,
    height: 420,
    markers: [
      { latitude: hubLat, longitude: hubLng, label: 'restaurant', color: '5A1626' },
      { latitude: volunteerLat, longitude: volunteerLng, label: 'bicycle', color: '0F7B4F' },
      { latitude: dropLat, longitude: dropLng, label: 'home', color: 'F59E0B' },
    ],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Food Requests</Text>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/request/step1-location')}
          style={styles.newBtn}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Segmented Tabs: Current Requests vs Past Requests */}
      <View style={styles.segmentedTabBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'current' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('current')}
          activeOpacity={0.8}
        >
          <View style={styles.tabContentRow}>
            {activeTab === 'current' && <View style={styles.activeDot} />}
            <Text style={[styles.segmentBtnText, activeTab === 'current' && styles.segmentBtnTextActive]}>
              Current Requests
            </Text>
            <View style={[styles.tabBadge, activeTab === 'current' ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'current' && styles.tabBadgeTextActive]}>
                {currentRequests.length}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'past' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <View style={styles.tabContentRow}>
            {activeTab === 'past' && <View style={styles.activeDot} />}
            <Text style={[styles.segmentBtnText, activeTab === 'past' && styles.segmentBtnTextActive]}>
              Past Requests
            </Text>
            <View style={[styles.tabBadge, activeTab === 'past' ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'past' && styles.tabBadgeTextActive]}>
                {pastRequests.length}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* List of Requests */}
      <FlatList
        data={displayedRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#5A1626" />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#5A1626" style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              title={activeTab === 'current' ? 'No Current Requests' : 'No Past Requests'}
              description={
                activeTab === 'current'
                  ? 'You have no active food requests in progress. Tap below to submit a new meal request.'
                  : 'You do not have any past fulfilled or completed meal requests yet.'
              }
              actionLabel={activeTab === 'current' ? 'Request Food Now' : undefined}
              onAction={
                activeTab === 'current'
                  ? () => router.push('/(recipient)/request/step1-location')
                  : undefined
              }
            />
          )
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'open';
          const isMatched = item.status === 'matched';
          const isFulfilled = item.status === 'fulfilled';

          const tone = isFulfilled
            ? 'success'
            : isMatched
            ? 'info'
            : isPending
            ? 'warning'
            : 'danger';

          const statusLabel = isMatched
            ? 'VOLUNTEER ASSIGNED'
            : isPending
            ? 'SEARCHING VOLUNTEER'
            : isFulfilled
            ? 'DELIVERED'
            : 'CANCELLED';

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedRequest(item)}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.servingsBadge}>
                    <Ionicons name="restaurant" size={14} color="#5A1626" />
                    <Text style={styles.servingsText}>{item.servingsNeeded} Servings</Text>
                  </View>
                  <Badge label={statusLabel} tone={tone} />
                </View>

                <Text style={styles.addressText} numberOfLines={1}>
                  📍 {item.dropAddress?.line1}, {item.dropAddress?.city}
                </Text>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {isFulfilled
                      ? `Delivered on ${new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : `Needed by: ${formatDateTime(item.neededBy)}`}
                  </Text>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText} numberOfLines={2}>“{item.notes}”</Text>
                  </View>
                ) : null}

                {/* Footer hint */}
                <View style={styles.cardTapHintRow}>
                  <Text style={styles.cardTapHintText}>Tap to view details, tracking & concerns</Text>
                  <Ionicons name="chevron-forward" size={14} color="#5A1626" />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom + 20, 24) }]}
        onPress={() => router.push('/(recipient)/request/step1-location')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>New Request</Text>
      </TouchableOpacity>

      {/* POPUP 1: Full Request Details Modal */}
      <Modal visible={selectedRequest !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.requestDetailsCard, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Order #{selectedRequest?.id?.slice(-6)?.toUpperCase()}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Placed on {selectedRequest ? new Date(selectedRequest.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Status Banner */}
              <View
                style={[
                  styles.statusBanner,
                  selectedRequest?.status === 'fulfilled'
                    ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                    : selectedRequest?.status === 'matched'
                    ? { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }
                    : selectedRequest?.status === 'open'
                    ? { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }
                    : { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                ]}
              >
                <Ionicons
                  name={
                    selectedRequest?.status === 'fulfilled'
                      ? 'checkmark-circle'
                      : selectedRequest?.status === 'matched'
                      ? 'bicycle'
                      : selectedRequest?.status === 'open'
                      ? 'hourglass-outline'
                      : 'close-circle'
                  }
                  size={20}
                  color={
                    selectedRequest?.status === 'fulfilled'
                      ? '#059669'
                      : selectedRequest?.status === 'matched'
                      ? '#2563EB'
                      : selectedRequest?.status === 'open'
                      ? '#D97706'
                      : '#DC2626'
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.statusBannerTitle,
                      {
                        color:
                          selectedRequest?.status === 'fulfilled'
                            ? '#065F46'
                            : selectedRequest?.status === 'matched'
                            ? '#1E40AF'
                            : selectedRequest?.status === 'open'
                            ? '#92400E'
                            : '#991B1B',
                      },
                    ]}
                  >
                    {selectedRequest?.status === 'matched'
                      ? 'Volunteer Assigned • In Transit'
                      : selectedRequest?.status === 'open'
                      ? 'Request Placed • Matching with Hub'
                      : selectedRequest?.status === 'fulfilled'
                      ? 'Delivered Safely to Doorstep'
                      : 'Request Cancelled'}
                  </Text>
                  <Text style={styles.statusBannerSub}>
                    {selectedRequest?.status === 'matched'
                      ? 'A verified courier has accepted this delivery and is en route.'
                      : selectedRequest?.status === 'open'
                      ? 'Your request is in the matching queue for nearby relief hubs.'
                      : selectedRequest?.status === 'fulfilled'
                      ? 'This delivery was successfully completed.'
                      : 'This order was cancelled.'}
                  </Text>
                </View>
              </View>

              {/* Food Details Section */}
              <View style={styles.detailSectionBox}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="restaurant" size={16} color="#5A1626" />
                  <Text style={styles.detailSectionTitle}>Food & Portion Details</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Requested Quantity:</Text>
                  <Text style={styles.infoValue}>{selectedRequest?.servingsNeeded} Portions</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Dropoff:</Text>
                  <Text style={styles.infoValue}>
                    {selectedRequest?.dropAddress?.line1}, {selectedRequest?.dropAddress?.city}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Needed By:</Text>
                  <Text style={styles.infoValue}>
                    {selectedRequest ? formatDateTime(selectedRequest.neededBy) : ''}
                  </Text>
                </View>

                {selectedRequest?.notes ? (
                  <View style={styles.detailNotesCard}>
                    <Text style={styles.detailNotesLabel}>Dietary Instructions / Notes:</Text>
                    <Text style={styles.detailNotesText}>{selectedRequest.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Delivery History & Progress Timeline */}
              <View style={styles.detailSectionBox}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="time" size={16} color="#5A1626" />
                  <Text style={styles.detailSectionTitle}>Delivery Timeline & History</Text>
                </View>

                <View style={styles.timelineList}>
                  {[
                    {
                      title: 'Request Placed by Recipient',
                      time: selectedRequest ? new Date(selectedRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                      done: true,
                    },
                    {
                      title: 'Hub Verified & Food Prepared',
                      time: selectedRequest?.status !== 'open' ? 'Completed' : 'Hub Queue',
                      done: selectedRequest?.status !== 'open',
                      active: selectedRequest?.status === 'open',
                    },
                    {
                      title: 'Volunteer Courier Picked Up',
                      time: selectedRequest?.status === 'matched' ? 'En Route' : selectedRequest?.status === 'fulfilled' ? 'Completed' : 'Pending',
                      done: selectedRequest?.status === 'fulfilled' || selectedRequest?.status === 'matched',
                      active: selectedRequest?.status === 'matched',
                    },
                    {
                      title: 'Delivered Safely to Doorstep',
                      time: selectedRequest?.status === 'fulfilled' ? 'Delivered' : 'Awaiting Delivery',
                      done: selectedRequest?.status === 'fulfilled',
                    },
                  ].map((step, idx) => (
                    <View key={idx} style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineCircle,
                          step.done ? styles.timelineDone : step.active ? styles.timelineActive : styles.timelinePending,
                        ]}
                      >
                        <Ionicons
                          name={step.done ? 'checkmark' : step.active ? 'bicycle' : 'ellipse-outline'}
                          size={12}
                          color={step.done || step.active ? '#FFFFFF' : '#9CA3AF'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timelineText, step.active && { color: '#0F7B4F', fontWeight: '800' }]}>
                          {step.title}
                        </Text>
                        <Text style={styles.timelineTime}>{step.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Buttons: Tracking, Raise Concern, Edit/Cancel */}
              <View style={styles.modalActionButtonsGrid}>
                {/* 1. Track Live Delivery Button */}
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => setTrackingModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Track Delivery on Map</Text>
                </TouchableOpacity>

                {/* 2. Raise a Concern Button */}
                <TouchableOpacity
                  style={styles.actionBtnConcern}
                  onPress={() => setConcernModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.actionBtnConcernText}>Raise a Concern</Text>
                </TouchableOpacity>

                {/* 3. Edit / Cancel Options (if still pending open) */}
                {selectedRequest?.status === 'open' && (
                  <View style={styles.openActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={() => {
                        const r = selectedRequest;
                        setSelectedRequest(null);
                        openEditModal(r);
                      }}
                    >
                      <Ionicons name="pencil" size={14} color="#4A1521" />
                      <Text style={styles.actionBtnEditText}>Edit Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnCancel}
                      onPress={() => {
                        const id = selectedRequest.id;
                        setDeletingRequestId(id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.actionBtnCancelText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUP 2: Raise a Concern Modal (linked strictly to selectedRequest) */}
      <Modal visible={concernModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.concernModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Raise a Concern</Text>
                <Text style={styles.modalSubtitle}>
                  Order #{selectedRequest?.id?.slice(-6)?.toUpperCase()} • {selectedRequest?.servingsNeeded} Portions
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConcernModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.concernSectionLabel}>Select the issue you experienced:</Text>
              <View style={styles.reasonChipsContainer}>
                {CONCERN_REASONS.map((reason) => {
                  const isSelected = selectedConcernReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                      onPress={() => setSelectedConcernReason(reason)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={
                          isSelected
                            ? 'checkmark-circle'
                            : reason.includes('not arrived')
                            ? 'close-circle-outline'
                            : reason.includes('delay')
                            ? 'time-outline'
                            : reason.includes('quantity')
                            ? 'scale-outline'
                            : 'alert-circle-outline'
                        }
                        size={14}
                        color={isSelected ? '#FFFFFF' : '#4B5563'}
                      />
                      <Text style={[styles.reasonChipText, isSelected && styles.reasonChipTextSelected]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.concernSectionLabel}>Describe what happened (details for admin):</Text>
              <TextInput
                style={styles.concernTextInput}
                value={concernNotes}
                onChangeText={setConcernNotes}
                multiline
                numberOfLines={4}
                placeholder="e.g. Expected food by 1:00 PM, volunteer has not arrived yet..."
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.concernBtnRow}>
                <TouchableOpacity
                  style={styles.concernCancelBtn}
                  onPress={() => setConcernModalVisible(false)}
                >
                  <Text style={styles.concernCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.concernSubmitBtn}
                  onPress={() => raiseConcernMutation.mutate()}
                  disabled={raiseConcernMutation.isPending}
                >
                  {raiseConcernMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                      <Text style={styles.concernSubmitBtnText}>Submit Concern</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUP 3: Live Food Delivery Tracking Modal */}
      <Modal visible={trackingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.trackingModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Track Food Delivery</Text>
                <Text style={styles.modalSubtitle}>
                  Order #{selectedRequest?.id?.slice(-6)?.toUpperCase()} • {selectedRequest?.dropAddress?.city}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTrackingModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Map View */}
              <View style={styles.trackingMapContainer}>
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
                    <Marker
                      coordinate={{ latitude: volunteerLat, longitude: volunteerLng }}
                      title={`Volunteer: ${liveTrackingData?.volunteer?.name || 'Waiting'}`}
                      description="Courier In Transit (~15 mins away)"
                    >
                      <View style={styles.mapMarkerVolunteer}>
                        <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                      </View>
                    </Marker>

                    {/* Destination (Recipient Home) */}
                    <Marker
                      coordinate={{ latitude: dropLat, longitude: dropLng }}
                      title="Destination: Doorstep Delivery"
                      description={`${selectedRequest?.dropAddress?.line1}`}
                    >
                      <View style={styles.mapMarkerDestination}>
                        <Ionicons name="home" size={14} color="#FFFFFF" />
                      </View>
                    </Marker>

                    {/* Route line */}
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
                  <MapboxStaticImage uri={mapboxTrackingUrl} style={styles.trackingMapImage} />
                )}

                {/* Floating Live ETA Banner */}
                <View style={styles.floatingEtaCard}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.floatingEtaText}>
                    {selectedRequest?.status === 'matched'
                      ? liveTrackingData?.etaMinutes
                        ? `En Route • Arriving in ~${liveTrackingData.etaMinutes} mins${
                            liveTrackingData.routeKm
                              ? ` (${liveTrackingData.routeKm.toFixed(1)} km)`
                              : ''
                          }`
                        : 'En Route • Volunteer assigned'
                      : selectedRequest?.status === 'fulfilled'
                      ? 'Delivered Safely'
                      : 'Matching nearest courier'}
                  </Text>
                </View>
              </View>

              {/* Courier Info Card */}
              <View style={styles.volunteerTraceCard}>
                <View style={styles.courierAvatarWrap}>
                  <Text style={styles.courierAvatarInitial}>
                    {liveTrackingData?.volunteer?.name?.[0] || 'R'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.courierName}>
                      {liveTrackingData?.volunteer?.name || 'Waiting for a volunteer'}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#0F7B4F" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.courierVehicle}>
                    {liveTrackingData?.volunteer?.vehicleType || 'Vehicle not set'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.callCourierBtn}
                  onPress={() =>
                    liveTrackingData?.volunteer?.phone &&
                    Linking.openURL(`tel:${liveTrackingData.volunteer.phone}`)
                  }
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <DeliveryPinCard pin={liveTrackingData?.assignment?.deliveryPin} />

              {/* Endpoints Trace */}
              <View style={styles.endpointsCard}>
                <View style={styles.endpointRow}>
                  <View style={[styles.endpointDot, { backgroundColor: '#5A1626' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.endpointLabel}>START POINT (RELIEF HUB)</Text>
                    <Text style={styles.endpointValue}>
                      {[
                        liveTrackingData?.donation?.pickupAddress?.city,
                        liveTrackingData?.donation?.pickupAddress?.district,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Pickup location pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.endpointLine} />

                <View style={styles.endpointRow}>
                  <View style={[styles.endpointDot, { backgroundColor: '#0F7B4F' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.endpointLabel}>VOLUNTEER CURRENT LOCATION</Text>
                    <Text style={styles.endpointValue}>
                      Hospital Road Junction, Jaffna Town (1.4 km from destination)
                    </Text>
                  </View>
                </View>

                <View style={styles.endpointLine} />

                <View style={styles.endpointRow}>
                  <View style={[styles.endpointDot, { backgroundColor: '#F59E0B' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.endpointLabel}>DESTINATION (YOUR DOORSTEP)</Text>
                    <Text style={styles.endpointValue}>
                      {selectedRequest?.dropAddress?.line1}, {selectedRequest?.dropAddress?.city}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeTrackingBtn}
                onPress={() => setTrackingModalVisible(false)}
              >
                <Text style={styles.closeTrackingBtnText}>Close Live Tracking</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Request Modal */}
      <Modal visible={editingRequest !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalContent, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Food Request</Text>
              <TouchableOpacity onPress={() => setEditingRequest(null)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Number of Portions</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => editServings > 1 && setEditServings(editServings - 1)}
              >
                <Ionicons name="remove" size={18} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.counterVal}>{editServings}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => editServings < 15 && setEditServings(editServings + 1)}
              >
                <Ionicons name="add" size={18} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Notes / Dietary Preferences</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              numberOfLines={3}
              placeholder="e.g. Vegetarian, needed promptly..."
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditingRequest(null)}
              >
                <Text style={styles.cancelModalBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete / Cancel Confirmation Modal */}
      <Modal visible={deletingRequestId !== null} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmDeleteBox}>
            <View style={styles.deleteWarningIcon}>
              <Ionicons name="alert-circle" size={36} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Cancel Food Request?</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to cancel this request? It will be removed from the matching queue and volunteers will be notified.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmKeepBtn}
                onPress={() => setDeletingRequestId(null)}
                disabled={cancelMutation.isPending}
              >
                <Text style={styles.confirmKeepBtnText}>Keep Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleConfirmDelete}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: '#1A1A1A',
  },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Segmented Bar */
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7E1',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F7F4EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E2D8',
  },
  segmentBtnActive: {
    backgroundColor: '#5A1626',
    borderColor: '#5A1626',
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeInactive: {
    backgroundColor: '#E5E0D8',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* List */
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  servingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  servingsText: {
    ...typography.bodyStrong,
    color: '#5A1626',
    fontSize: 13,
  },
  addressText: {
    ...typography.body,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  notesText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardTapHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  cardTapHintText: {
    fontSize: 11,
    color: '#5A1626',
    fontWeight: '600',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#5A1626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Modals Overlay */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  requestDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Status Banner */
  statusBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBannerSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },

  /* Details Section Box */
  detailSectionBox: {
    backgroundColor: '#FDFBF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: 14,
    marginBottom: 12,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
    paddingBottom: 6,
  },
  detailSectionTitle: {
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
  detailNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ECE7E1',
  },
  detailNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  detailNotesText: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 2,
    fontStyle: 'italic',
  },

  /* Timeline */
  timelineList: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDone: {
    backgroundColor: '#0F7B4F',
  },
  timelineActive: {
    backgroundColor: '#F59E0B',
  },
  timelinePending: {
    backgroundColor: '#E5E7EB',
  },
  timelineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  timelineTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  /* Action Buttons Grid */
  modalActionButtonsGrid: {
    gap: 10,
    marginTop: 6,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5A1626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnConcern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnConcernText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  openActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#F9D5DC',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A1521',
  },
  actionBtnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* Concern Modal Card */
  concernModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  concernSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 8,
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
  },
  concernTextInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  concernBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingBottom: 10,
  },
  concernCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  concernCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  concernSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  concernSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Tracking Modal Card */
  trackingModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  trackingMapContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECE7E1',
  },
  trackingMapView: {
    width: '100%',
    height: '100%',
  },
  trackingMapImage: {
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
  floatingEtaCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingEtaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  volunteerTraceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7FCF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 12,
    marginBottom: 12,
  },
  courierAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  courierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F7B4F',
  },
  courierVehicle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  callCourierBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: 14,
    marginBottom: 14,
  },
  endpointRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  endpointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  endpointLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  endpointValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 1,
  },
  endpointLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
    marginVertical: 4,
  },
  closeTrackingBtn: {
    backgroundColor: '#5A1626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeTrackingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Edit Modal */
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalTextInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#5A1626',
    alignItems: 'center',
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Confirm Delete */
  confirmDeleteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  deleteWarningIcon: {
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmKeepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  confirmKeepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
