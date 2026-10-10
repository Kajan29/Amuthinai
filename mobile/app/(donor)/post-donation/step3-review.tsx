import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { donationsApi, type CreateDonationPayload } from '@/api/donations.api';
import { DonorWizardHeader } from '@/components/donor/DonorWizardHeader';
import { queryClient } from '@/api/queryClient';
import { cloudinaryService } from '@/services/cloudinary';
import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';
import type { DietaryTag, FoodType, HandlingInstruction } from '@/types';
import { validatePrepareTime } from '@/utils/freshness';

const BADGE_STYLE: Record<DietaryTag, { backgroundColor: string }> = {
  pure_vegetarian: { backgroundColor: '#E7F6EE' },
  halal_friendly: { backgroundColor: '#E5F6F4' },
  cooked_today: { backgroundColor: '#FFF1DE' },
  nut_free: { backgroundColor: '#FFF1DE' },
  contains_egg_meat: { backgroundColor: '#F8E8EE' },
};

const BADGE_TEXT: Record<DietaryTag, { color: string }> = {
  pure_vegetarian: { color: donorColors.green },
  halal_friendly: { color: '#1A8A80' },
  cooked_today: { color: donorColors.orange },
  nut_free: { color: donorColors.orange },
  contains_egg_meat: { color: donorColors.plum },
};

const TAG_KEYS: Record<DietaryTag, string> = {
  pure_vegetarian: 'donor.tagVeg',
  halal_friendly: 'donor.tagHalal',
  cooked_today: 'donor.tagCookedToday',
  nut_free: 'donor.tagNutFree',
  contains_egg_meat: 'donor.tagEggMeat',
};

const FOOD_KEYS: Record<FoodType, string> = {
  cooked: 'donor.freshlyCooked',
  raw: 'donor.catProduce',
  packaged: 'donor.catDry',
  bakery: 'donor.catBakery',
  dairy: 'donor.catDairy',
  beverage: 'donor.catDrink',
};

const HANDLING_KEYS: Record<HandlingInstruction, string> = {
  keep_warm: 'donor.keepWarm',
  requires_refrigeration: 'donor.needsCold',
  individually_packed: 'donor.packed',
  fragile_liquid: 'donor.fragile',
};

/** FR2, FR3 — confirm the donation, then post it for admin review (FR4). */
export default function Step3Review() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draft, isComplete, update, reset } = useDonationDraft();
  const [pledged, setPledged] = useState(Boolean(draft.foodSafetyVerified));
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const photos = draft.photoUrls ?? [];
  const tags = draft.dietaryTags ?? [];
  const handling = draft.handling ?? [];
  const people = draft.servings ?? 0;
  const co2Kg = Math.round(people * 0.48);

  const submit = useMutation({
    mutationFn: () =>
      donationsApi.create({
        ...(draft as CreateDonationPayload),
        foodSafetyVerified: true,
        photoUrls: photos,
      }),
    async onSuccess(created) {
      const donationId = String(created.id);
      reset();
      await queryClient.invalidateQueries({ queryKey: ['donor.dashboard'] });
      router.replace({
        pathname: '/(donor)/post-donation/success',
        params: { id: donationId },
      });
    },
  });

  const prepare = validatePrepareTime(draft.cookedAt, draft.foodType ?? 'cooked');
  const canPost = isComplete() && prepare.ok && pledged && !submit.isPending;
  const missingDetails = !isComplete() || !prepare.ok;

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
      const uploaded = await cloudinaryService.uploadImage(asset.uri, 'amuthinai/donations');
      update({ photoUrls: [...photos, uploaded.url] });
    } catch {
      setPhotoError(t('donor.photoFailed'));
    } finally {
      setUploading(false);
    }
  }

  const prepared = draft.cookedAt ?? draft.readyFrom;
  const expiry = draft.consumeBefore;
  const note = draft.handoverInstructions || draft.pickupAddress?.district;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      >
        <DonorWizardHeader
          onBack={() => router.back()}
          onClose={() => router.replace('/(donor)/dashboard')}
        />

        <View style={styles.steps}>
          <Step n="✓" label={t('donor.stepDetails')} done />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <Step n="✓" label={t('donor.stepPickup')} done />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <Step n="3" label={t('donor.stepReview')} active />
        </View>

        <Text style={styles.title}>{t('donor.verifyTitle')}</Text>
        <Text style={styles.lead}>{t('donor.verifyLead')}</Text>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {t('donor.attachedPhotos', { count: photos.length })}
          </Text>
          {photos.length > 0 ? <Text style={styles.link}>{t('donor.photoPreviewHint')}</Text> : null}
        </View>
        <View style={styles.photos}>
          {photos.map((url) => (
            <Pressable key={url} onPress={() => setPreview(url)} style={styles.thumbWrap}>
              <Image source={{ uri: url }} style={styles.thumb} />
              <Pressable
                onPress={() => update({ photoUrls: photos.filter((item) => item !== url) })}
                style={styles.remove}
              >
                <Ionicons name="close" size={12} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          ))}
          {photos.length < 3 ? (
            <Pressable onPress={() => void addPhoto()} style={styles.add}>
              {uploading ? (
                <ActivityIndicator color={donorColors.plum} />
              ) : (
                <>
                  <Ionicons name="add" size={18} color={donorColors.plum} />
                  <Text style={styles.addText}>{t('donor.addShort')}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}

        <View style={styles.impact}>
          <Ionicons name="leaf" size={18} color={donorColors.green} />
          <View style={styles.impactCopy}>
            <Text style={styles.impactTitle}>{t('donor.estimatedImpact')}</Text>
            <Text style={styles.impactBody}>
              {people > 0 ? t('donor.impactLine', { people, co2: co2Kg }) : t('donor.impactEmpty')}
            </Text>
          </View>
        </View>

        {missingDetails ? (
          <Pressable
            onPress={() =>
              router.push(
                !prepare.ok
                  ? '/(donor)/post-donation/step2-timing'
                  : '/(donor)/post-donation/step1-food',
              )
            }
            style={styles.missing}
          >
            <Ionicons name="alert-circle" size={18} color={donorColors.orange} />
            <Text style={styles.missingText}>
              {!prepare.ok
                ? prepare.issue === 'future'
                  ? t('donor.prepareFuture')
                  : prepare.issue === 'missing' || prepare.issue === 'invalid'
                    ? t('donor.prepareRequired')
                    : t('donor.prepareTooOld', { hours: prepare.maxHours })
                : t('donor.missingDetails')}
            </Text>
            <Text style={styles.missingAction}>{t('donor.edit')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryHead}>
            <View style={styles.summaryTitleRow}>
              <View style={styles.dot} />
              <Text style={styles.summaryTitle}>{t('donor.summaryTitle')}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(donor)/post-donation/step1-food')}
              style={styles.editBtn}
            >
              <Ionicons name="pencil" size={14} color={donorColors.plum} />
              <Text style={styles.edit}>{t('donor.edit')}</Text>
            </Pressable>
          </View>

          <SummaryRow icon="restaurant-outline" label={t('donor.foodQuantity')}>
            <Text style={[styles.value, !draft.title && styles.missingValue]}>
              {draft.servings ? `${draft.servings} ` : ''}
              {draft.title || t('donor.notAdded')}
            </Text>
            <Text style={styles.sub}>{draft.foodType ? t(FOOD_KEYS[draft.foodType]) : t('donor.notAdded')}</Text>
          </SummaryRow>

          <SummaryRow icon="pricetags-outline" label={t('donor.dietaryBadges')}>
            <View style={styles.badges}>
              {tags.length === 0 ? <Text style={styles.sub}>{t('donor.noBadges')}</Text> : null}
              {tags.map((tag) => (
                <View key={tag} style={[styles.badge, BADGE_STYLE[tag]]}>
                  <Text style={[styles.badgeText, BADGE_TEXT[tag]]}>{t(TAG_KEYS[tag])}</Text>
                </View>
              ))}
            </View>
          </SummaryRow>

          <SummaryRow icon="cube-outline" label={t('donor.packagingType')}>
            <Text style={styles.value}>
              {handling.length
                ? handling.map((item) => t(HANDLING_KEYS[item])).join(' · ')
                : t('donor.standardPack')}
            </Text>
          </SummaryRow>

          <View style={styles.pair}>
            <SummaryRow icon="time-outline" label={t('donor.preparedAt')}>
              <Text style={[styles.value, !prepared && styles.missingValue]}>
                {prepared ? whenLabel(prepared, t('donor.today')) : t('donor.notAdded')}
              </Text>
            </SummaryRow>
            <SummaryRow icon="hourglass-outline" label={t('donor.expiryWindow')}>
              <Text style={[styles.value, expiry ? styles.expiry : styles.missingValue]}>
                {expiry ? leftLabel(expiry) : t('donor.notAdded')}
              </Text>
            </SummaryRow>
          </View>

          <SummaryRow icon="location-outline" label={t('donor.pickupLocation')}>
            <Text style={styles.value}>
              {draft.pickupAddress
                ? `${draft.pickupAddress.line1}, ${draft.pickupAddress.city}`
                : t('donor.notAdded')}
            </Text>
            {note ? <Text style={styles.sub}>{t('donor.locationNote', { note })}</Text> : null}
          </SummaryRow>

          <SummaryRow icon="bicycle-outline" label={t('donor.fulfillment')}>
            <Text style={styles.value}>
              {draft.deliveryMethod === 'self_drop'
                ? t('donor.selfDrop')
                : t('donor.volunteerDispatch')}
            </Text>
          </SummaryRow>
        </View>

        <Pressable onPress={() => setPledged((value) => !value)} style={styles.pledge}>
          <Ionicons
            name={pledged ? 'checkbox' : 'square-outline'}
            size={22}
            color={pledged ? donorColors.plum : donorColors.muted}
          />
          <View style={styles.pledgeCopy}>
            <Text style={styles.pledgeTitle}>{t('donor.pledgeTitle')}</Text>
            <Text style={styles.pledgeBody}>{t('donor.pledgeBody')}</Text>
          </View>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backLabel}>{t('donor.backStep')}</Text>
        </Pressable>
        <Pressable
          disabled={!canPost}
          onPress={() => submit.mutate()}
          style={[styles.nextBtn, !canPost && styles.nextDisabled]}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.nextInner}>
              <Text style={styles.nextLabel}>{t('donor.confirmPost')}</Text>
              <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
      </View>
      {submit.error ? <Text style={styles.errorBar}>{(submit.error as Error).message}</Text> : null}

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {preview ? <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function Step({
  n,
  label,
  active = false,
  done = false,
}: {
  n: string;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, (active || done) && styles.stepCircleActive]}>
        <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={16} color={donorColors.muted} />
      <View style={styles.summaryCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

function whenLabel(iso: string, today: string): string {
  const date = new Date(iso);
  const day = date.toDateString() === new Date().toDateString() ? today : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

function leftLabel(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (mins <= 0) return time;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  const left = hours > 0 ? `${hours}h ${rest}m left` : `${rest}m left`;
  return `${time} (${left})`;
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  scroll: { flex: 1 },
  content: { gap: 12, paddingBottom: 24, paddingHorizontal: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  brandBlock: { alignItems: 'center' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  brand: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  brandAccent: { color: donorColors.orange },
  steps: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  step: { alignItems: 'center', flex: 1, gap: 6, maxWidth: 90 },
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
  stepNum: { color: donorColors.muted, fontSize: 12, fontWeight: '700' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { color: donorColors.muted, fontSize: 11 },
  stepLabelActive: { color: donorColors.ink, fontWeight: '700' },
  stepLine: { backgroundColor: '#E4DDD6', flex: 1, height: 2, marginTop: 13, maxWidth: 36, minWidth: 12 },
  stepLineDone: { backgroundColor: donorColors.plum },
  title: { color: donorColors.ink, fontSize: 22, fontWeight: '800', marginTop: 8 },
  lead: { color: donorColors.muted, fontSize: 13, lineHeight: 18, marginTop: -6 },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: donorColors.ink, fontSize: 12, fontWeight: '800' },
  link: { color: donorColors.orange, fontSize: 12, fontWeight: '600' },
  photos: { flexDirection: 'row', gap: 8 },
  thumbWrap: { borderRadius: 12, height: 72, overflow: 'hidden', width: 72 },
  thumb: { height: '100%', width: '100%' },
  remove: {
    alignItems: 'center',
    backgroundColor: 'rgba(28,22,20,0.7)',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
  },
  add: {
    alignItems: 'center',
    borderColor: '#E4DDD6',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  addText: { color: donorColors.plum, fontSize: 11, fontWeight: '700' },
  impact: {
    alignItems: 'center',
    backgroundColor: '#E7F6EE',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  impactCopy: { flex: 1, gap: 2 },
  impactTitle: { color: donorColors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  impactBody: { color: donorColors.ink, fontSize: 13, fontWeight: '600' },
  summary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  summaryHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dot: { backgroundColor: donorColors.green, borderRadius: 4, height: 8, width: 8 },
  summaryTitle: { color: donorColors.ink, fontSize: 15, fontWeight: '800' },
  editBtn: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  edit: { color: donorColors.plum, fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCopy: { flex: 1, gap: 2 },
  rowLabel: { color: donorColors.muted, fontSize: 11 },
  value: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  missingValue: { color: donorColors.muted, fontWeight: '600' },
  missing: {
    alignItems: 'center',
    backgroundColor: donorColors.orangeSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  missingText: { color: donorColors.ink, flex: 1, fontSize: 13, fontWeight: '600' },
  missingAction: { color: donorColors.plum, fontSize: 13, fontWeight: '800' },
  sub: { color: donorColors.muted, fontSize: 12 },
  expiry: { color: donorColors.orange },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    backgroundColor: '#E7F6EE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: donorColors.green, fontSize: 11, fontWeight: '700' },
  pair: { flexDirection: 'row', gap: 8 },
  pledge: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  pledgeCopy: { flex: 1, gap: 4 },
  pledgeTitle: { color: donorColors.ink, fontSize: 14, fontWeight: '800' },
  pledgeBody: { color: donorColors.muted, fontSize: 12, lineHeight: 17 },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: donorColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  postHint: { color: donorColors.muted, fontSize: 12, width: '100%' },
  backBtn: {
    alignItems: 'center',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  backLabel: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  nextBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 48,
  },
  nextDisabled: { opacity: 0.45 },
  nextInner: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  nextLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  error: { color: donorColors.alert, fontSize: 12 },
  errorBar: { color: donorColors.alert, fontSize: 12, paddingBottom: 8, textAlign: 'center' },
  previewBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(28,22,20,0.8)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  preview: { height: '70%', width: '100%' },
});
