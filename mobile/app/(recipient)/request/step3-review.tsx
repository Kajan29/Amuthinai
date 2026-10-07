import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { requestsApi, type CreateRequestPayload } from '@/api/requests.api';
import { Card } from '@/components/ui';
import { notifyFoodRequestPlaced } from '@/services/notifications';
import { useRequestDraft } from '@/store/requestDraft.store';

const logoImage = require('../../../assets/images/logo.png');

export default function Step3ReviewScreen() {
  const { draft, reset } = useRequestDraft();
  const [additionalNotes, setAdditionalNotes] = useState('');

  const submit = useMutation({
    mutationFn: () => {
      const payload: CreateRequestPayload = {
        servingsNeeded: draft.servingsNeeded || 3,
        neededBy: draft.neededBy || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        notes: [
          draft.mealCategory,
          draft.dietaryPreference,
          draft.deliveryMethod,
          additionalNotes.trim(),
        ]
          .filter(Boolean)
          .join(' • '),
        dropAddress: draft.dropAddress || {
          line1: draft.hubAddress || 'Hospital Road',
          city: 'Jaffna',
          location: { type: 'Point', coordinates: [80.0167, 9.6615] },
        },
      };
      return requestsApi.create(payload);
    },
    async onSuccess() {
      const hubName = draft.hubName || 'Jaffna Relief Hub';
      const count = draft.servingsNeeded || 1;
      await notifyFoodRequestPlaced(hubName, count);
      reset();
      await queryClient.invalidateQueries({ queryKey: ['recipient', 'requests'] });
      await queryClient.invalidateQueries({ queryKey: ['recipient.requests'] });
      router.replace('/(recipient)/request/success');
    },
    onError(err: any) {
      Alert.alert(
        'Request Status',
        err?.message || 'Unable to submit request. You may already have an active request in progress.',
        [{ text: 'OK' }],
      );
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>

        <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />

        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stepper Progress */}
        <View style={styles.stepperContainer}>
          {/* Step 1: Checked */}
          <View style={styles.stepItem}>
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.completedStepText}>Location</Text>
          </View>

          <View style={styles.completedStepLine} />

          {/* Step 2: Checked */}
          <View style={styles.stepItem}>
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.completedStepText}>Details</Text>
          </View>

          <View style={styles.completedStepLine} />

          {/* Step 3: Active */}
          <View style={styles.stepItem}>
            <View style={styles.activeStepCircle}>
              <Text style={styles.activeStepNum}>3</Text>
            </View>
            <Text style={styles.activeStepText}>Review</Text>
          </View>
        </View>

        {/* Summary Card */}
        <Text style={styles.sectionHeading}>Summary of Food Request</Text>

        <Card style={styles.summaryCard}>
          {/* Hub */}
          <View style={styles.summaryRow}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="location" size={18} color="#0F7B4F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Selected Hub & Location</Text>
              <Text style={styles.rowValue}>{draft.hubName || 'Jaffna Town Relief Hub'}</Text>
              <Text style={styles.rowSubvalue}>{draft.hubAddress || 'Hospital Road, Jaffna'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Category & Portions */}
          <View style={styles.summaryRow}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="restaurant" size={18} color="#4A1521" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Meal Items & Number of People</Text>
              <Text style={styles.rowValue}>
                {draft.servingsNeeded || 3} {draft.servingsNeeded === 1 ? 'Person' : 'People'} • {draft.mealCategory || 'Cooked Hot Meals'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Dietary */}
          <View style={styles.summaryRow}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color="#0F7B4F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Dietary Preference</Text>
              <Text style={styles.rowValue}>{draft.dietaryPreference || 'Pure Vegetarian'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Delivery Method */}
          <View style={styles.summaryRow}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="car" size={18} color="#C2671A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Delivery Method</Text>
              <Text style={styles.rowValue}>
                {draft.deliveryMethod || 'Volunteer Doorstep Delivery'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Additional instructions */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Special Delivery Instructions (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Near the temple entrance, ring the bell on gate..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
          />
        </View>

        {/* Notice Card */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color="#0F7B4F" />
          <Text style={styles.noticeText}>
            Nearby volunteers and matching donors will be alerted immediately. You will be able to track your delivery live on the dashboard.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
            disabled={submit.isPending}
          >
            <Ionicons name="arrow-back" size={16} color="#1A1A1A" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.proceedBtn, submit.isPending && { opacity: 0.7 }]}
            onPress={() => submit.mutate()}
            activeOpacity={0.85}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.proceedBtnText}>Submit Food Request</Text>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLogo: {
    width: 130,
    height: 38,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  completedStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  completedStepLine: {
    width: 44,
    height: 2,
    backgroundColor: '#10B981',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  activeStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A1521',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepNum: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  activeStepText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A1521',
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rowSubvalue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 8,
  },

  notesSection: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: 12,
    fontSize: 13,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    minHeight: 70,
  },

  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#E6F7ED',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C3ECD6',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0F7B4F',
    lineHeight: 18,
  },

  /* Bottom Actions */
  bottomBar: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ECE7E1',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  proceedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A1521',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#4A1521',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
