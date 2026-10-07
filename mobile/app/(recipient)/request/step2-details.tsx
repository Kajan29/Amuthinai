import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRequestDraft } from '@/store/requestDraft.store';

const logoImage = require('../../../assets/images/logo.png');

const MEAL_CATEGORIES = [
  'Cooked Hot Meals (Rice, Sambar & Curry)',
  'Raw Groceries (Dhal, Rice & Flour)',
  'Bakery Food (Bread, Buns & Snacks)',
  'Dry Ration Care Pack',
];

const DIETARY_OPTIONS = [
  'Pure Vegetarian (No meat/eggs)',
  'Non-Vegetarian (Chicken / Fish)',
  'Halal Certified Meals',
  'Diabetic / Low Spice Food',
];

const DELIVERY_METHODS = [
  'Volunteer Doorstep Delivery',
  'Self Pickup at Community Hub',
];

export default function Step2DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { draft, update } = useRequestDraft();

  const [mealCategory, setMealCategory] = useState(
    draft.mealCategory || MEAL_CATEGORIES[0]!,
  );
  const [portions, setPortions] = useState(draft.servingsNeeded || 3);
  const [dietary, setDietary] = useState(
    draft.dietaryPreference || DIETARY_OPTIONS[0]!,
  );
  const [deliveryMethod, setDeliveryMethod] = useState(
    draft.deliveryMethod || DELIVERY_METHODS[0]!,
  );

  const [activeModal, setActiveModal] = useState<
    'category' | 'dietary' | 'delivery' | null
  >(null);

  const handleDecrement = () => {
    if (portions > 1) {
      setPortions(portions - 1);
    }
  };

  const handleIncrement = () => {
    if (portions < 50) {
      setPortions(portions + 1);
    }
  };

  const handleProceed = () => {
    update({
      mealCategory,
      servingsNeeded: portions,
      dietaryPreference: dietary,
      deliveryMethod,
      notes: `${mealCategory} • ${dietary} • ${deliveryMethod} • For ${portions} people`,
    });
    router.push('/(recipient)/request/step3-review');
  };

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

          {/* Step 2: Active */}
          <View style={styles.stepItem}>
            <View style={styles.activeStepCircle}>
              <Text style={styles.activeStepNum}>2</Text>
            </View>
            <Text style={styles.activeStepText}>Food Details</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 3: Inactive */}
          <View style={styles.stepItem}>
            <View style={styles.inactiveStepCircle}>
              <Text style={styles.inactiveStepNum}>3</Text>
            </View>
            <Text style={styles.inactiveStepText}>Review</Text>
          </View>
        </View>

        {/* Field 1: Meal Category */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Meal Category</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setActiveModal('category')}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Ionicons name="book-outline" size={20} color="#4A1521" />
            </View>
            <Text style={styles.inputText} numberOfLines={1}>
              {mealCategory}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Field 2: Number of People (Maximum 50) */}
        <View style={styles.fieldSection}>
          <View style={styles.labelWithHint}>
            <Text style={styles.fieldLabel}>Number of People</Text>
            <Text style={styles.fieldHint}>(Max 50 per request)</Text>
          </View>
          <View style={styles.portionsBox}>
            <View style={styles.iconBox}>
              <Ionicons name="people-outline" size={22} color="#4A1521" />
            </View>

            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, portions <= 1 && styles.counterBtnDisabled]}
                onPress={handleDecrement}
                disabled={portions <= 1}
              >
                <Ionicons name="remove" size={18} color={portions <= 1 ? '#D1D5DB' : '#1A1A1A'} />
              </TouchableOpacity>

              <Text style={styles.portionCountText}>{portions}</Text>

              <TouchableOpacity
                style={[styles.counterBtn, portions >= 50 && styles.counterBtnDisabled]}
                onPress={handleIncrement}
                disabled={portions >= 50}
              >
                <Ionicons name="add" size={18} color={portions >= 50 ? '#D1D5DB' : '#1A1A1A'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Preset Chips for Number of People */}
          <View style={styles.presetChipsRow}>
            {[1, 3, 5, 10, 20, 30, 50].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.presetChip,
                  portions === num && styles.presetChipActive,
                ]}
                onPress={() => setPortions(num)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    portions === num && styles.presetChipTextActive,
                  ]}
                >
                  {num} {num === 1 ? 'Person' : 'People'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Field 3: Dietary Preference */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Dietary Preference</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setActiveModal('dietary')}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#4A1521" />
            </View>
            <Text style={styles.inputText} numberOfLines={1}>
              {dietary}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Field 4: Delivery Method */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Delivery Method</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setActiveModal('delivery')}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Ionicons name="car-outline" size={20} color="#4A1521" />
            </View>
            <Text style={styles.inputText} numberOfLines={1}>
              {deliveryMethod}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Selection Modal Sheet */}
      <Modal visible={activeModal !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
            <View style={styles.modalBar} />
            <Text style={styles.modalTitle}>
              {activeModal === 'category'
                ? 'Select Meal Category'
                : activeModal === 'dietary'
                ? 'Select Dietary Preference'
                : 'Select Delivery Method'}
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {(activeModal === 'category'
                ? MEAL_CATEGORIES
                : activeModal === 'dietary'
                ? DIETARY_OPTIONS
                : DELIVERY_METHODS
              ).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.optionRow}
                  onPress={() => {
                    if (activeModal === 'category') setMealCategory(item);
                    if (activeModal === 'dietary') setDietary(item);
                    if (activeModal === 'delivery') setDeliveryMethod(item);
                    setActiveModal(null);
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                  <Ionicons
                    name={
                      (activeModal === 'category' && mealCategory === item) ||
                      (activeModal === 'dietary' && dietary === item) ||
                      (activeModal === 'delivery' && deliveryMethod === item)
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={20}
                    color="#4A1521"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#1A1A1A" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={handleProceed}
            activeOpacity={0.85}
          >
            <Text style={styles.proceedBtnText}>Proceed to Review</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
    marginBottom: 24,
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
    backgroundColor: '#4A1521',
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
  stepLine: {
    width: 44,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  inactiveStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveStepNum: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  inactiveStepText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* Form Fields */
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    paddingHorizontal: 14,
    height: 56,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  /* Portions Box */
  portionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    paddingHorizontal: 14,
    height: 56,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  portionCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    minWidth: 28,
    textAlign: 'center',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECE7E1',
  },
  presetChipActive: {
    backgroundColor: '#4A1521',
    borderColor: '#4A1521',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});
