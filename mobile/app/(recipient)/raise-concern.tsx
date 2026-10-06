import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestsApi } from '@/api/requests.api';
import { colors, radius, spacing, typography } from '@/theme';
import type { FoodRequest } from '@/types';

const CONCERN_REASONS = [
  'Food not arrived',
  'Delivery delay',
  'Wrong quantity',
  'Food quality issue',
  'Other issue',
];

export default function RaiseConcernScreen() {
  const { t } = useTranslation();

  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(CONCERN_REASONS[0]!);
  const [details, setDetails] = useState('');

  // Fetch user requests to link concern directly to their orders
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['recipient', 'requests', 'mine'],
    queryFn: () => requestsApi.mine(),
  });

  const allRequests: FoodRequest[] = requestsData?.items ?? [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const selectedReq = allRequests.find((r) => r.id === selectedRequestId);
      const orderRef = selectedReq
        ? `#${selectedReq.id.slice(-6).toUpperCase()} (${selectedReq.servingsNeeded} Servings)`
        : 'General Order';

      const subject = `[${selectedReason}] Order ${orderRef}`;
      const body =
        `Selected Request ID: ${selectedRequestId || 'Not Specified'}\n` +
        `Concern Issue: ${selectedReason}\n` +
        `Drop Address: ${selectedReq?.dropAddress?.line1 || 'N/A'}, ${selectedReq?.dropAddress?.city || 'Jaffna'}\n` +
        `Details: ${details.trim() || 'No additional note provided'}`;

      return requestsApi.raiseConcern({ subject, body });
    },
    onSuccess() {
      setDetails('');
      Alert.alert(
        'Concern Submitted',
        'Your concern has been registered. The administration team will review and contact you regarding your delivery.',
        [
          {
            text: 'View My Requests',
            onPress: () => router.push('/(recipient)/requests'),
          },
        ],
      );
    },
    onError(err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit concern.');
    },
  });

  const canSubmit = selectedReason.length > 0 && details.trim().length >= 5;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('recipient.raiseConcern') || 'Raise a Concern'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.introCard}>
          <Ionicons name="alert-circle-outline" size={28} color="#5A1626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Delivery & Food Assistance Support</Text>
            <Text style={styles.introSub}>
              Tell us what went wrong with your food distribution or courier delivery. Every concern is reviewed by Amuthinai administration.
            </Text>
          </View>
        </View>

        {/* 1. Select Associated Request */}
        <Text style={styles.fieldLabel}>1. Select Current or Past Request</Text>
        {isLoading ? (
          <ActivityIndicator color="#5A1626" style={{ marginVertical: 10 }} />
        ) : allRequests.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.requestsScroll}>
            {allRequests.map((req) => {
              const isSelected = selectedRequestId === req.id;
              const isCurrent = ['open', 'matched'].includes(req.status);
              return (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.requestChip, isSelected && styles.requestChipSelected]}
                  onPress={() => setSelectedRequestId(req.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chipHeaderRow}>
                    <Text style={[styles.chipOrderTitle, isSelected && { color: '#FFFFFF' }]}>
                      Order #{req.id.slice(-6).toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.chipStatusPill,
                        isCurrent ? { backgroundColor: '#0F7B4F' } : { backgroundColor: '#6B7280' },
                      ]}
                    >
                      <Text style={styles.chipStatusText}>
                        {isCurrent ? 'ACTIVE' : 'PAST'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.chipSubtitle, isSelected && { color: '#FDF2F4' }]}>
                    {req.servingsNeeded} Portions • {req.dropAddress?.city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.noRequestsText}>No active or past requests found.</Text>
        )}

        {/* 2. Select Issue Type */}
        <Text style={styles.fieldLabel}>2. Select Issue Type</Text>
        <View style={styles.reasonsGrid}>
          {CONCERN_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                onPress={() => setSelectedReason(reason)}
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
                  size={16}
                  color={isSelected ? '#FFFFFF' : '#4B5563'}
                />
                <Text style={[styles.reasonChipText, isSelected && styles.reasonChipTextSelected]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Detailed Description */}
        <Text style={styles.fieldLabel}>3. Explain Details of the Issue</Text>
        <TextInput
          style={styles.detailsInput}
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={5}
          placeholder="Please describe the issue in detail (e.g. food delivery was delayed by 2 hours, missing vegetarian packages, courier did not contact...)"
          placeholderTextColor="#9CA3AF"
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!canSubmit || submitMutation.isPending) && styles.submitButtonDisabled]}
          onPress={() => submitMutation.mutate()}
          disabled={!canSubmit || submitMutation.isPending}
          activeOpacity={0.85}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Concern to Administration</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: spacing.md,
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  introSub: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  requestsScroll: {
    marginBottom: 10,
  },
  requestChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    marginRight: 10,
    width: 200,
  },
  requestChipSelected: {
    backgroundColor: '#5A1626',
    borderColor: '#5A1626',
  },
  chipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipOrderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  chipStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chipSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  noRequestsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  reasonsGrid: {
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
    backgroundColor: '#FFFFFF',
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
  detailsInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2DBD2',
    padding: 12,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
