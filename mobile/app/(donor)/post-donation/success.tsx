import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { donationsApi } from '@/api/donations.api';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { useAuth } from '@/hooks/useAuth';
import { donorColors } from '@/theme/donor';
import type { Address, Donation, FoodType, QuantityUnit } from '@/types';

/** Same award as backend POINTS.donationDelivered — credited when the meal is delivered. */
const DELIVERY_KARMA = 50;

const LEVELS = [
  { min: 2000, level: 4, nameKey: 'donor.levelGrove' },
  { min: 750, level: 3, nameKey: 'donor.levelTree' },
  { min: 200, level: 2, nameKey: 'donor.levelSprout' },
  { min: 0, level: 1, nameKey: 'donor.levelSeed' },
] as const;

export default function PostDonationSuccess() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const dashboard = useDonorDashboard();

  const donation = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationsApi.byId(id as string),
    enabled: Boolean(id),
  });

  const item = donation.data;
  const code = item ? referenceCode(item.id, item.createdAt) : '';
  const area = item ? areaLabel(item.pickupAddress) : '';
  const karmaBalance = dashboard.data?.stats.karmaPoints ?? user?.karmaPoints ?? 0;
  const earnedNow = dashboard.data?.donations.find((card) => card.id === id)?.karmaEarned;
  const karmaPoints = earnedNow && earnedNow > 0 ? earnedNow : DELIVERY_KARMA;
  const level = LEVELS.find((entry) => karmaBalance >= entry.min) ?? LEVELS[3];

  function goHome() {
    router.replace('/(donor)/dashboard');
  }

  async function share(channel: 'whatsapp' | 'more') {
    if (!item) return;
    const message = t('donor.shareMessage', { count: item.servings, area, code });
    try {
      if (channel === 'whatsapp') {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
        return;
      }
      await Share.share({ message });
    } catch {
      // The share sheet was dismissed.
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={goHome} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={donorColors.ink} />
          </Pressable>
          <View style={styles.brandRow}>
            <Ionicons name="restaurant" size={14} color={donorColors.orange} />
            <Text style={styles.brand}>
              Jaffna <Text style={styles.brandAccent}>Connect</Text>
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.steps}>
          <Step n="✓" label={t('donor.stepDetails')} done />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <Step n="✓" label={t('donor.stepPickup')} done />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <Step n="✓" label={t('donor.stepConfirmed')} active />
        </View>

        <View style={styles.sealWrap}>
          <View style={styles.seal}>
            <Ionicons name="restaurant" size={28} color={donorColors.plum} />
            <Text style={styles.sealLabel}>{t('donor.jaffnaAid')}</Text>
          </View>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('donor.live')}</Text>
          </View>
        </View>

        <Text style={styles.title}>{t('donor.postedTitle')}</Text>
        <Text style={styles.lead}>{t('donor.postedLead')}</Text>

        {donation.isPending ? (
          <ActivityIndicator color={donorColors.plum} style={styles.loader} />
        ) : null}
        {donation.isError ? <Text style={styles.error}>{(donation.error as Error).message}</Text> : null}

        {item ? (
          <View style={styles.card}>
            <View style={styles.refRow}>
              <View style={styles.refIcon}>
                <Ionicons name="document-text-outline" size={18} color={donorColors.muted} />
              </View>
              <View style={styles.refCopy}>
                <Text style={styles.kicker}>{t('donor.referenceCode')}</Text>
                <Text style={styles.code}>{code}</Text>
              </View>
              <View style={styles.mealPill}>
                <Text style={styles.mealText}>{mealLabel(item, t)}</Text>
              </View>
            </View>

            <InfoRow icon="radio-button-on" label={t('donor.currentStatus')} value={statusLabel(item, t)} />
            <InfoRow icon="time-outline" label={t('donor.estimatedPickup')} value={etaLabel(item, t)} />
            <InfoRow icon="location-outline" label={t('donor.assignedArea')} value={area} />
          </View>
        ) : null}

        <View style={styles.karma}>
          <View style={styles.karmaIcon}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.karmaCopy}>
            <View style={styles.karmaTop}>
              <Text style={styles.karmaPoints}>{t('donor.karmaEarnedLine', { points: karmaPoints })}</Text>
              <View style={styles.earnedPill}>
                <Text style={styles.earnedText}>
                  {earnedNow && earnedNow > 0 ? t('donor.earned') : t('donor.onDelivery')}
                </Text>
              </View>
            </View>
            <Text style={styles.level}>
              {t('donor.levelLine', { level: level.level, name: t(level.nameKey) })}
            </Text>
          </View>
          <View style={styles.trophy}>
            <Ionicons name="trophy-outline" size={18} color={donorColors.orange} />
          </View>
        </View>

        <Pressable
          disabled={!id}
          onPress={() => router.push(`/(donor)/donation/${id}`)}
          style={[styles.trackBtn, !id && styles.disabled]}
        >
          <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
          <Text style={styles.trackLabel}>{t('donor.trackPickup')}</Text>
        </Pressable>

        <Pressable onPress={goHome} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={16} color={donorColors.ink} />
          <Text style={styles.homeLabel}>{t('donor.returnHome')}</Text>
        </Pressable>

        <Text style={styles.kindness}>{t('donor.spreadKindness')}</Text>

        <View style={styles.shareRow}>
          <Pressable onPress={() => void share('whatsapp')} style={styles.shareBtn}>
            <Ionicons name="logo-whatsapp" size={16} color="#1E9B57" />
            <Text style={styles.shareLabel}>{t('donor.shareWhatsApp')}</Text>
          </Pressable>
          <Pressable onPress={() => void share('more')} style={styles.shareBtn}>
            <Ionicons name="logo-instagram" size={16} color="#C13584" />
            <Text style={styles.shareLabel}>{t('donor.shareStory')}</Text>
          </Pressable>
          <Pressable onPress={() => void share('more')} style={styles.shareIcon}>
            <Ionicons name="share-social-outline" size={16} color={donorColors.ink} />
          </Pressable>
        </View>
      </ScrollView>
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={donorColors.muted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function referenceCode(id: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  const tail = id.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase() || '0000';
  return `#KP-${year}-${tail}`;
}

function areaLabel(address: Address): string {
  const withoutNumber = address.line1.replace(/^\d+\s*/, '');
  const head = withoutNumber.split(/,|\broad\b|\bstreet\b|\blane\b/i)[0]?.trim() ?? '';
  const place = head.split(/\s+/).slice(0, 2).join(' ');
  return place ? `${place}, ${address.city}` : address.city;
}

function mealLabel(donation: Donation, t: (key: string, options?: Record<string, unknown>) => string): string {
  const hot: FoodType[] = ['cooked', 'bakery'];
  const unit = donation.quantityUnit;
  if (!unit || hot.includes(donation.foodType) || unit === 'packets' || unit === 'portions') {
    return t('donor.hotMeals', { count: donation.servings });
  }
  const units: Record<QuantityUnit, string> = {
    packets: 'pkts',
    kg: 'kg',
    pieces: 'pcs',
    litres: 'L',
    portions: 'portions',
  };
  return `${donation.servings} ${units[unit]}`;
}

function statusLabel(donation: Donation, t: (key: string) => string): string {
  if (donation.deliveryMethod === 'self_drop') return t('donor.statusSelfDrop');
  if (donation.status === 'assigned' || donation.status === 'picked_up' || donation.status === 'in_transit') {
    return t('donor.statusRider');
  }
  if (donation.status === 'delivered') return t('donor.statusDelivered');
  return t('donor.statusMatching');
}

function etaLabel(donation: Donation, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (donation.deliveryMethod === 'self_drop') return t('donor.selfDropEta');
  if (!donation.readyFrom) return t('donor.pickupSoon');
  const mins = Math.round((new Date(donation.readyFrom).getTime() - Date.now()) / 60_000);
  if (mins < 15) return t('donor.pickupSoon');
  const low = Math.max(15, mins - 10);
  const high = mins + 10;
  return t('donor.pickupWindow', { low, high });
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  content: { gap: 14, paddingHorizontal: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  brand: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  brandAccent: { color: donorColors.orange },
  steps: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center' },
  step: { alignItems: 'center', gap: 6, width: 78 },
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
  stepLine: { backgroundColor: '#E4DDD6', height: 2, marginTop: 13, width: 24 },
  stepLineDone: { backgroundColor: donorColors.plum },
  sealWrap: { alignItems: 'center', marginTop: 8 },
  seal: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: donorColors.plum,
    borderRadius: 22,
    borderWidth: 2,
    gap: 4,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  sealLabel: { color: donorColors.plum, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  live: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7F6EE',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: -10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { backgroundColor: donorColors.green, borderRadius: 4, height: 6, width: 6 },
  liveText: { color: donorColors.green, fontSize: 11, fontWeight: '700' },
  title: { color: donorColors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  lead: { color: donorColors.muted, fontSize: 13, lineHeight: 18, marginTop: -6, textAlign: 'center' },
  loader: { marginVertical: 12 },
  error: { color: donorColors.alert, fontSize: 12, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  refRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  refIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  refCopy: { flex: 1, gap: 2 },
  kicker: { color: donorColors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  code: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  mealPill: { backgroundColor: '#F8E8EE', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  mealText: { color: donorColors.plum, fontSize: 11, fontWeight: '800' },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  infoLabel: { color: donorColors.muted, flex: 1, fontSize: 13 },
  infoValue: { color: donorColors.ink, flex: 1.1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  karma: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  karmaIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  karmaCopy: { flex: 1, gap: 2 },
  karmaTop: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  karmaPoints: { color: donorColors.ink, fontSize: 15, fontWeight: '800' },
  earnedPill: { backgroundColor: donorColors.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  earnedText: { color: donorColors.green, fontSize: 11, fontWeight: '700' },
  level: { color: donorColors.muted, fontSize: 12 },
  trophy: {
    alignItems: 'center',
    backgroundColor: donorColors.orangeSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  trackBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  trackLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  homeBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  homeLabel: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  kindness: { color: donorColors.muted, fontSize: 12, textAlign: 'center' },
  shareRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  shareBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD6',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareLabel: { color: donorColors.ink, fontSize: 12, fontWeight: '700' },
  shareIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD6',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
