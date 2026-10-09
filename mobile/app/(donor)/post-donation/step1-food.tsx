import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uploadsApi } from '@/api/uploads.api';
import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';
import type { DietaryTag, FoodType, QuantityUnit } from '@/types';

const DESCRIPTION_LIMIT = 300;
const QUICK_AMOUNTS = [10, 20, 30, 50];

const CATEGORIES: {
  type: FoodType;
  titleKey: string;
  hintKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { type: 'cooked', titleKey: 'donor.catCooked', hintKey: 'donor.catCookedHint', icon: 'restaurant-outline' },
  { type: 'raw', titleKey: 'donor.catProduce', hintKey: 'donor.catProduceHint', icon: 'leaf-outline' },
  { type: 'bakery', titleKey: 'donor.catBakery', hintKey: 'donor.catBakeryHint', icon: 'pizza-outline' },
  { type: 'packaged', titleKey: 'donor.catDry', hintKey: 'donor.catDryHint', icon: 'cube-outline' },
  { type: 'dairy', titleKey: 'donor.catDairy', hintKey: 'donor.catDairyHint', icon: 'water-outline' },
  { type: 'beverage', titleKey: 'donor.catDrink', hintKey: 'donor.catDrinkHint', icon: 'cafe-outline' },
];

const UNITS: { value: QuantityUnit; labelKey: string }[] = [
  { value: 'packets', labelKey: 'donor.unitPackets' },
  { value: 'kg', labelKey: 'donor.unitKg' },
  { value: 'pieces', labelKey: 'donor.unitPieces' },
  { value: 'litres', labelKey: 'donor.unitLitres' },
  { value: 'portions', labelKey: 'donor.unitPortions' },
];

const TAGS: { id: DietaryTag; labelKey: string }[] = [
  { id: 'pure_vegetarian', labelKey: 'donor.tagVeg' },
  { id: 'halal_friendly', labelKey: 'donor.tagHalal' },
  { id: 'cooked_today', labelKey: 'donor.tagCookedToday' },
  { id: 'nut_free', labelKey: 'donor.tagNutFree' },
  { id: 'contains_egg_meat', labelKey: 'donor.tagEggMeat' },
];

/** FR2 — food details, matching the donate-surplus design. */
export default function Step1Food() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draft, update } = useDonationDraft();
  const [unitOpen, setUnitOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    const patch: Parameters<typeof update>[0] = {};
    if (!draft.foodType) patch.foodType = 'cooked';
    if (!draft.quantityUnit) patch.quantityUnit = 'packets';
    if (!draft.servings) patch.servings = 1;
    if (!draft.dietaryTags) patch.dietaryTags = [];
    if (Object.keys(patch).length > 0) update(patch);
    // Defaults are applied once when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foodType = draft.foodType ?? 'cooked';
  const servings = draft.servings ?? 1;
  const quantityUnit = draft.quantityUnit ?? 'packets';
  const tags = draft.dietaryTags ?? [];
  const photos = draft.photoUrls ?? [];
  const description = draft.description ?? '';
  const titleOk = (draft.title?.trim().length ?? 0) >= 3;
  const canContinue = titleOk && servings > 0;

  function toggleTag(id: DietaryTag) {
    const next = tags.includes(id) ? tags.filter((tag) => tag !== id) : [...tags, id];
    update({ dietaryTags: next });
  }

  async function addPhoto() {
    if (photos.length >= 3 || uploading) return;
    setPhotoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(t('donor.photoDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      const uploaded = await uploadsApi.uploadImage(asset.uri);
      update({ photoUrls: [...photos, uploaded.url] });
    } catch {
      setPhotoError(t('donor.photoFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={donorColors.ink} />
          </Pressable>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Ionicons name="restaurant" size={14} color={donorColors.orange} />
              <Text style={styles.brand}>
                Jaffna <Text style={styles.brandAccent}>Connect</Text>
              </Text>
            </View>
            <View style={styles.subtitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.subtitle}>{t('donor.donateSurplus')}</Text>
            </View>
          </View>
          <View style={styles.back} />
        </View>

        <View style={styles.steps}>
          <Step n={1} label={t('donor.stepFood')} active />
          <View style={styles.stepLine} />
          <Step n={2} label={t('donor.stepLogistics')} />
          <View style={styles.stepLine} />
          <Step n={3} label={t('donor.stepReview')} />
        </View>

        {draft.foodRequestId ? (
          <View style={styles.requestBanner}>
            <Ionicons name="people" size={16} color={donorColors.plum} />
            <Text style={styles.requestBannerText}>
              {t('donor.fulfillingRequest', { count: servings })}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('donor.selectCategory')}</Text>
          <Text style={styles.sectionHint}>{t('donor.pickBestFit')}</Text>
        </View>
        <View style={styles.grid}>
          {CATEGORIES.map((category) => {
            const selected = foodType === category.type;
            return (
              <Pressable
                key={category.type}
                onPress={() => update({ foodType: category.type })}
                style={[styles.category, selected && styles.categorySelected]}
              >
                {selected ? (
                  <View style={styles.selectedMark}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={[styles.catIcon, selected && styles.catIconOn]}>
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={selected ? donorColors.plum : donorColors.muted}
                  />
                </View>
                <Text style={[styles.categoryTitle, selected && styles.categoryTitleSelected]}>
                  {t(category.titleKey)}
                </Text>
                <Text style={styles.categoryHint}>{t(category.hintKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>{t('donor.donationTitle')}</Text>
        <View style={[styles.inputRow, titleOk && styles.inputRowOk]}>
          <Ionicons name="fast-food-outline" size={18} color={titleOk ? donorColors.plum : donorColors.muted} />
          <TextInput
            value={draft.title ?? ''}
            onChangeText={(title) => update({ title })}
            placeholder={t('donor.titleShort')}
            placeholderTextColor="#C4B8B0"
            style={styles.input}
          />
          {titleOk ? <Ionicons name="checkmark-circle" size={18} color={donorColors.green} /> : null}
        </View>
        <Text style={styles.help}>{titleOk ? t('donor.titleHint') : t('donor.needTitle')}</Text>

        <View style={styles.amountCard}>
          <View style={styles.split}>
            <View style={styles.splitCol}>
              <Text style={styles.fieldLabel}>{t('donor.quantityAmount')}</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => update({ servings: Math.max(1, servings - 1) })}
                  style={styles.stepBtn}
                >
                  <Ionicons name="remove" size={18} color={donorColors.ink} />
                </Pressable>
                <Text style={styles.stepValue}>{servings}</Text>
                <Pressable
                  onPress={() => update({ servings: Math.min(5000, servings + 1) })}
                  style={styles.stepBtn}
                >
                  <Ionicons name="add" size={18} color={donorColors.ink} />
                </Pressable>
              </View>
            </View>
            <View style={styles.splitCol}>
              <Text style={styles.fieldLabel}>{t('donor.unitType')}</Text>
              <Pressable onPress={() => setUnitOpen(true)} style={styles.dropdown}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {t(UNITS.find((unit) => unit.value === quantityUnit)?.labelKey ?? 'donor.unitPackets')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={donorColors.muted} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.quickLabel}>{t('donor.quickAmount')}</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((amount) => {
              const on = servings === amount;
              return (
                <Pressable
                  key={amount}
                  onPress={() => update({ servings: amount })}
                  style={[styles.quick, on && styles.quickOn]}
                >
                  <Text style={[styles.quickText, on && styles.quickTextOn]}>{amount}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('donor.dietaryTags')}</Text>
        <View style={styles.tags}>
          {TAGS.map((tag) => {
            const on = tags.includes(tag.id);
            return (
              <Pressable
                key={tag.id}
                onPress={() => toggleTag(tag.id)}
                style={[styles.tag, on && styles.tagOn]}
              >
                {on ? <Ionicons name="checkmark" size={14} color={donorColors.plum} /> : null}
                <Text style={[styles.tagText, on && styles.tagTextOn]}>{t(tag.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.fieldLabel}>{t('donor.safetyNote')}</Text>
          <Text style={styles.charCount}>
            {description.length}/{DESCRIPTION_LIMIT}
          </Text>
        </View>
        <TextInput
          value={description}
          onChangeText={(value) => update({ description: value.slice(0, DESCRIPTION_LIMIT) })}
          placeholder={t('donor.safetyPlaceholder')}
          placeholderTextColor="#B3AAA3"
          multiline
          style={styles.note}
        />
        <Pressable
          onPress={() => update({ foodSafetyVerified: !draft.foodSafetyVerified })}
          style={styles.checkRow}
        >
          <Ionicons
            name={draft.foodSafetyVerified ? 'checkbox' : 'square-outline'}
            size={20}
            color={draft.foodSafetyVerified ? donorColors.plum : donorColors.muted}
          />
          <Text style={styles.checkLabel}>{t('donor.safetyVerified')}</Text>
        </Pressable>

        <Text style={styles.fieldLabel}>{t('donor.photosTitle')}</Text>
        <View style={styles.photos}>
          {photos.map((url, index) => (
            <View key={url} style={styles.photoSlot}>
              <Image source={{ uri: url }} style={styles.photo} />
              <Pressable
                onPress={() => update({ photoUrls: photos.filter((item) => item !== url) })}
                style={styles.photoRemove}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.photoName} numberOfLines={1}>
                {fileName(url)}
              </Text>
              <Text style={styles.photoRole}>
                {index === 0 ? t('donor.coverImage') : t('donor.optionalLabels')}
              </Text>
            </View>
          ))}
          {photos.length < 3 ? (
            <Pressable onPress={() => void addPhoto()} style={styles.addSlot}>
              {uploading ? (
                <ActivityIndicator color={donorColors.plum} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={22} color={donorColors.plum} />
                  <Text style={styles.addLabel}>{t('donor.addPhoto')}</Text>
                </>
              )}
            </Pressable>
          ) : null}
          {photos.length < 2 ? (
            <View style={styles.addSlot}>
              <Text style={styles.optional}>{t('donor.optionalLabels')}</Text>
            </View>
          ) : null}
        </View>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}

        <View style={styles.promise}>
          <Ionicons name="shield-checkmark" size={18} color={donorColors.orange} />
          <Text style={styles.promiseText}>{t('donor.qualityPromise')}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.draftBtn}>
          <Text style={styles.draftLabel}>{t('donor.saveDraft')}</Text>
        </Pressable>
        <Pressable
          disabled={!canContinue}
          onPress={() => router.push('/(donor)/post-donation/step2-timing')}
          style={[styles.nextBtn, !canContinue && styles.nextDisabled]}
        >
          <Text style={styles.nextLabel}>{t('donor.continueStep2')}</Text>
        </Pressable>
      </View>

      <Modal visible={unitOpen} transparent animationType="fade" onRequestClose={() => setUnitOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setUnitOpen(false)}>
          <View style={styles.sheet}>
            {UNITS.map((unit) => (
              <Pressable
                key={unit.value}
                onPress={() => {
                  update({ quantityUnit: unit.value });
                  setUnitOpen(false);
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetText}>{t(unit.labelKey)}</Text>
                {quantityUnit === unit.value ? (
                  <Ionicons name="checkmark" size={18} color={donorColors.plum} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Step({ n, label, active = false }: { n: number; label: string; active?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Text style={[styles.stepNum, active && styles.stepNumActive]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

function fileName(url: string): string {
  const name = url.split('/').pop() ?? 'photo.jpg';
  try {
    return decodeURIComponent(name.split('?')[0] ?? name);
  } catch {
    return 'photo.jpg';
  }
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  content: { gap: 14, paddingBottom: 36, paddingHorizontal: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  brandBlock: { alignItems: 'center', gap: 2 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  brand: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  brandAccent: { color: donorColors.orange },
  subtitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  liveDot: { backgroundColor: donorColors.green, borderRadius: 4, height: 7, width: 7 },
  subtitle: { color: donorColors.muted, fontSize: 12 },
  steps: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  step: { alignItems: 'center', gap: 6, width: 84 },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepCircleActive: { backgroundColor: donorColors.plum, borderColor: donorColors.plum },
  stepNum: { color: donorColors.muted, fontSize: 13, fontWeight: '700' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { color: donorColors.muted, fontSize: 11, textAlign: 'center' },
  stepLabelActive: { color: donorColors.ink, fontWeight: '700' },
  stepLine: { backgroundColor: '#E4DDD6', height: 1, marginTop: 14, width: 28 },
  requestBanner: {
    alignItems: 'center',
    backgroundColor: '#F8E8EE',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  requestBannerText: { color: donorColors.plum, flex: 1, fontSize: 13, fontWeight: '700' },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: {
    color: donorColors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionHint: { color: donorColors.orange, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  category: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 108,
    padding: 12,
    width: '31%',
  },
  categorySelected: { backgroundColor: '#FBF6F8', borderColor: donorColors.plum, borderWidth: 1.5 },
  selectedMark: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 18,
  },
  catIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  catIconOn: { backgroundColor: '#F8E8EE' },
  categoryTitle: { color: donorColors.ink, fontSize: 12, fontWeight: '700', marginTop: 6 },
  categoryTitleSelected: { color: donorColors.plum },
  categoryHint: { color: donorColors.muted, fontSize: 10 },
  fieldLabel: {
    color: donorColors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  inputRowOk: { borderColor: donorColors.green },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  input: { color: donorColors.ink, flex: 1, fontSize: 14, paddingVertical: 14 },
  help: { color: donorColors.muted, fontSize: 12, marginTop: -6 },
  split: { flexDirection: 'row', gap: 10 },
  splitCol: { flex: 1, gap: 8 },
  stepper: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  stepBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepValue: { color: donorColors.ink, fontSize: 22, fontWeight: '800' },
  quickLabel: { color: donorColors.muted, fontSize: 12, marginTop: -4 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 10,
  },
  quickOn: { backgroundColor: donorColors.plum, borderColor: donorColors.plum },
  quickText: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  quickTextOn: { color: '#FFFFFF' },
  dropdown: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  dropdownText: { color: donorColors.ink, flex: 1, fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagOn: { backgroundColor: '#F8F1EA', borderColor: donorColors.plum },
  tagText: { color: donorColors.muted, fontSize: 12 },
  tagTextOn: { color: donorColors.plum, fontWeight: '700' },
  note: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 14,
    borderWidth: 1,
    color: donorColors.ink,
    fontSize: 14,
    minHeight: 110,
    padding: 12,
    textAlignVertical: 'top',
  },
  charCount: { color: donorColors.muted, fontSize: 11 },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  checkLabel: { color: donorColors.ink, fontSize: 13 },
  photos: { flexDirection: 'row', gap: 10 },
  photoSlot: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  photo: { height: 78, width: '100%' },
  photoRemove: {
    alignItems: 'center',
    backgroundColor: 'rgba(28,22,20,0.7)',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 20,
  },
  photoName: { color: donorColors.ink, fontSize: 10, paddingHorizontal: 6, paddingTop: 6 },
  photoRole: { color: donorColors.muted, fontSize: 10, paddingBottom: 8, paddingHorizontal: 6 },
  addSlot: {
    alignItems: 'center',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 110,
  },
  addLabel: { color: donorColors.plum, fontSize: 12, fontWeight: '700' },
  optional: { color: donorColors.muted, fontSize: 11, textAlign: 'center' },
  error: { color: donorColors.alert, fontSize: 12 },
  promise: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF6EC',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  promiseText: { color: '#8A5A32', flex: 1, fontSize: 12, lineHeight: 18 },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: donorColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  draftBtn: {
    alignItems: 'center',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  draftLabel: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  nextBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 48,
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  backdrop: { backgroundColor: 'rgba(28,22,20,0.35)', flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  sheetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sheetText: { color: donorColors.ink, fontSize: 15 },
});
