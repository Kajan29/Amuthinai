import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DonorDonationCard } from '@/components/donor/DonorDonationCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { EmptyState } from '@/components/ui';
import { IN_TRANSIT_STATUSES, TERMINAL_STATUSES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { donorColors } from '@/theme/donor';
import { spacing } from '@/theme';

type Tab = 'all' | 'inTransit' | 'history';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'all', labelKey: 'donor.tabAll' },
  { key: 'inTransit', labelKey: 'donor.tabInTransit' },
  { key: 'history', labelKey: 'donor.tabHistory' },
];

export default function DonorDashboard() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const dashboard = useDonorDashboard();
  const [tab, setTab] = useState<Tab>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  const items = useMemo(() => dashboard.data?.donations ?? [], [dashboard.data]);
  const counts = useMemo(
    () => ({
      all: items.length,
      inTransit: items.filter((item) => IN_TRANSIT_STATUSES.includes(item.status)).length,
      history: items.filter((item) => TERMINAL_STATUSES.includes(item.status)).length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    if (tab === 'inTransit') return items.filter((item) => IN_TRANSIT_STATUSES.includes(item.status));
    if (tab === 'history') return items.filter((item) => TERMINAL_STATUSES.includes(item.status));
    return items;
  }, [items, tab]);

  const donor = dashboard.data?.donor;
  const stats = dashboard.data?.stats;
  const firstName = donor?.firstName ?? user?.name.split(' ')[0] ?? '';
  const initials = initialsOf(user?.name ?? firstName);

  function openDonation(id: string) {
    router.push(`/(donor)/donation/${id}`);
  }

  if (dashboard.isPending && !dashboard.data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={donorColors.plum} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={visible}
        keyExtractor={(donation) => donation.id}
        refreshing={dashboard.isFetching}
        onRefresh={() => void dashboard.refetch()}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.sm }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Menu"
                onPress={() => setMenuOpen(true)}
                style={styles.iconButton}
              >
                <Ionicons name="menu" size={24} color={donorColors.ink} />
              </Pressable>

              <View style={styles.brand} pointerEvents="none">
                <Ionicons name="restaurant" size={16} color={donorColors.orange} />
                <Text style={styles.brandText}>
                  Jaffna <Text style={styles.brandAccent}>Connect</Text>
                </Text>
              </View>

              <View style={styles.topActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('donor.alerts')}
                  onPress={() => setTab('inTransit')}
                  style={styles.iconButton}
                >
                  <Ionicons name="notifications-outline" size={22} color={donorColors.ink} />
                  {donor?.hasAlerts ? <View style={styles.alertDot} /> : null}
                </Pressable>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
            </View>

            <View style={styles.greetingRow}>
              <View style={styles.greetingCopy}>
                <Text style={styles.greeting}>{t('donor.greeting', { name: firstName })} 👋</Text>
                <Text style={styles.subline}>
                  {t('donor.activeInHub', {
                    count: donor?.activeContributions ?? 0,
                    hub: donor?.hub ?? 'Jaffna Hub',
                  })}
                </Text>
              </View>
              {donor?.isVerified || user?.isVerified ? (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={14} color={donorColors.green} />
                  <Text style={styles.verifiedText}>{t('donor.verifiedDonor')}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stats}>
              <Stat
                icon="restaurant-outline"
                value={stats?.mealsShared ?? 0}
                label={t('donor.mealsShared')}
              />
              <Stat
                icon="people-outline"
                value={stats?.familiesFed ?? 0}
                label={t('donor.familiesFed')}
              />
              <Stat
                icon="star"
                value={stats?.karmaPoints ?? user?.karmaPoints ?? 0}
                label={t('donor.karmaPts')}
                tone="karma"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabs}
            >
              {TABS.map(({ key, labelKey }) => {
                const active = tab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                      {t(labelKey)}
                    </Text>
                    <View style={[styles.count, active && styles.countActive]}>
                      <Text style={[styles.countText, active && styles.countTextActive]}>
                        {counts[key]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('common.empty')}
            description={t('donor.emptyDonations')}
            actionLabel={t('donor.postSurplus')}
            onAction={() => router.push('/(donor)/post-donation/step1-food')}
          />
        }
        renderItem={({ item }) => (
          <DonorDonationCard donation={item} onPress={() => openDonation(item.id)} />
        )}
      />

      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(donor)/post-donation/step1-food')}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <View style={styles.plus}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaLabel}>{t('donor.postSurplus')}</Text>
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.sheet, { marginTop: insets.top + 56 }]}>
            <Text style={styles.sheetTitle}>{user?.name}</Text>
            <LanguageSwitcher />
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                router.push('/(donor)/profile');
              }}
              style={styles.sheetRow}
            >
              <Text style={styles.sheetRowText}>{t('donor.navProfile')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void logout();
              }}
              style={styles.sheetRow}
            >
              <Text style={styles.sheetDanger}>{t('common.signOut')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  tone?: 'default' | 'karma';
}) {
  const karma = tone === 'karma';

  return (
    <View style={[styles.stat, karma && styles.statKarma]}>
      <View style={[styles.statIcon, karma && styles.statIconKarma]}>
        <Ionicons name={icon} size={16} color={karma ? donorColors.orange : '#9A918A'} />
      </View>
      <Text style={[styles.statValue, karma && styles.statValueKarma]}>{value.toLocaleString('en-US')}</Text>
      <Text style={[styles.statLabel, karma && styles.statLabelKarma]}>{label}</Text>
    </View>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || 'D';
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  center: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    flex: 1,
    justifyContent: 'center',
  },
  list: { paddingBottom: 12, paddingHorizontal: 16 },
  separator: { height: 12 },
  headerBlock: { gap: 16, paddingBottom: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 44 },
  iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    justifyContent: 'center',
  },
  brandText: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  brandAccent: { color: donorColors.orange },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  alertDot: {
    backgroundColor: donorColors.alert,
    borderColor: donorColors.background,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 9,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 9,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F3D7C4',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: donorColors.plum, fontSize: 12, fontWeight: '800' },
  greetingRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' },
  greetingCopy: { flex: 1, gap: 4 },
  greeting: { color: donorColors.ink, fontSize: 26, fontWeight: '800' },
  subline: { color: donorColors.muted, fontSize: 13 },
  verified: {
    alignItems: 'center',
    backgroundColor: donorColors.greenSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedText: { color: donorColors.green, fontSize: 11, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    alignItems: 'center',
    backgroundColor: donorColors.card,
    borderRadius: 16,
    elevation: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 14,
    shadowColor: '#3A2A22',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statKarma: { backgroundColor: donorColors.orangeSoft },
  statIcon: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginBottom: 4,
    width: 28,
  },
  statIconKarma: { backgroundColor: '#FFE4C2' },
  statValue: { color: donorColors.ink, fontSize: 22, fontWeight: '800' },
  statValueKarma: { color: donorColors.orange },
  statLabel: {
    color: donorColors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statLabelKarma: { color: '#C47A2A' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: donorColors.plum },
  tabLabel: { color: donorColors.muted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#FFFFFF' },
  count: {
    alignItems: 'center',
    backgroundColor: donorColors.badge,
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countText: { color: donorColors.ink, fontSize: 10, fontWeight: '800' },
  countTextActive: { color: '#FFFFFF' },
  ctaWrap: { paddingBottom: 10, paddingHorizontal: 16, paddingTop: 4 },
  cta: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
  plus: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  ctaLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  backdrop: { backgroundColor: 'rgba(28, 22, 20, 0.35)', flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  sheetTitle: { color: donorColors.ink, fontSize: 16, fontWeight: '700' },
  sheetRow: { paddingVertical: 6 },
  sheetRowText: { color: donorColors.ink, fontSize: 15 },
  sheetDanger: { color: donorColors.alert, fontSize: 15, fontWeight: '600' },
});
