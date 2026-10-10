import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logo } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { donorColors } from '@/theme/donor';

export type DonorShellTab = 'home' | 'donations' | 'map' | 'impact' | 'profile';

interface DonorShellProps {
  active: DonorShellTab;
  children: ReactNode;
  hasAlerts?: boolean;
}

function initialsOf(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'D';
}

export function DonorShell({ active, children, hasAlerts = false }: DonorShellProps) {
  const { t } = useTranslation();
  const { user, confirmLogout } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const initials = initialsOf(user?.name);
  const karma = user?.karmaPoints ?? 0;

  function go(href: string) {
    setSidebarVisible(false);
    router.push(href as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {sidebarVisible ? (
        <Pressable style={styles.overlay} onPress={() => setSidebarVisible(false)} />
      ) : null}

      <View style={[styles.sidebar, sidebarVisible && styles.sidebarOpen]}>
        <View style={styles.sidebarHeader}>
          <Image source={logo} style={styles.sidebarLogo} resizeMode="contain" />
          <View style={styles.sidebarUserRow}>
            <View style={styles.sidebarAvatar}>
              <Text style={styles.sidebarAvatarText}>{initials}</Text>
            </View>
            <View style={styles.sidebarUserInfo}>
              <Text style={styles.sidebarUserName}>{user?.name || t('common.appName')}</Text>
              <View style={styles.sidebarRoleBadge}>
                <View style={styles.sidebarRoleDot} />
                <Text style={styles.sidebarUserRole}>
                  {t('donor.verifiedDonor')} • {karma} KP
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          <SideItem
            icon="home"
            label={t('donor.navHome')}
            active={active === 'home'}
            onPress={() => go('/(donor)/dashboard')}
          />
          <SideItem
            icon="cube-outline"
            label={t('donor.navDonations')}
            active={active === 'donations'}
            onPress={() => go('/(donor)/donations')}
          />
          <SideItem
            icon="map-outline"
            label={t('donor.navMap')}
            active={active === 'map'}
            onPress={() => go('/(donor)/map')}
          />
          <SideItem
            icon="bar-chart-outline"
            label={t('donor.navImpact')}
            active={active === 'impact'}
            onPress={() => go('/(donor)/rewards')}
          />
          <SideItem
            icon="person-outline"
            label={t('donor.navProfile')}
            active={active === 'profile'}
            onPress={() => go('/(donor)/profile')}
          />
          <SideItem
            icon="add-circle-outline"
            label={t('donor.postSurplus')}
            onPress={() => go('/(donor)/post-donation/step1-food')}
          />

          <View style={styles.sidebarDivider} />

          <SideItem
            icon="log-out-outline"
            label={t('common.logout')}
            danger
            onPress={() => {
              setSidebarVisible(false);
              void confirmLogout();
            }}
          />
        </ScrollView>
      </View>

      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          style={styles.circleBtn}
          activeOpacity={0.7}
          accessibilityLabel="Menu"
        >
          <Ionicons name="menu" size={22} color={donorColors.ink} />
        </TouchableOpacity>

        <Image source={logo} style={styles.logoImage} resizeMode="contain" />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => router.push('/notifications' as never)}
            activeOpacity={0.7}
            accessibilityLabel={t('donor.alerts')}
          >
            <Ionicons name="notifications-outline" size={20} color={donorColors.ink} />
            {hasAlerts ? <View style={styles.alertDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(donor)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

function SideItem({
  icon,
  label,
  active = false,
  danger = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.sideItem, active && styles.sideItemActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger ? donorColors.alert : active ? donorColors.plum : '#374151'}
      />
      <Text
        style={[
          styles.sideItemText,
          active && styles.sideItemTextActive,
          danger && styles.sideItemDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: donorColors.background, flex: 1 },
  body: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 999,
  },
  sidebar: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    elevation: 8,
    left: -280,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    top: 0,
    width: 280,
    zIndex: 1000,
  },
  sidebarOpen: { left: 0 },
  sidebarHeader: {
    alignItems: 'flex-start',
    backgroundColor: '#FDFBF7',
    borderBottomColor: '#F0EAE1',
    borderBottomWidth: 1,
    padding: 20,
  },
  sidebarLogo: { height: 40, marginBottom: 14, width: 140 },
  sidebarUserRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  sidebarAvatar: {
    alignItems: 'center',
    backgroundColor: donorColors.orange,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sidebarAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sidebarUserInfo: { flex: 1 },
  sidebarUserName: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  sidebarRoleBadge: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 2 },
  sidebarRoleDot: { backgroundColor: donorColors.green, borderRadius: 3, height: 6, width: 6 },
  sidebarUserRole: { color: donorColors.plum, fontSize: 12, fontWeight: '600' },
  sidebarContent: { flex: 1, paddingTop: 8 },
  sideItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sideItemActive: { backgroundColor: '#FDF2F4' },
  sideItemText: { color: '#374151', flex: 1, fontSize: 14, fontWeight: '600' },
  sideItemTextActive: { color: donorColors.plum, fontWeight: '800' },
  sideItemDanger: { color: donorColors.alert, fontWeight: '700' },
  sidebarDivider: {
    backgroundColor: '#F0ECE4',
    height: 1,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  circleBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE6DE',
    borderRadius: 21,
    borderWidth: 1,
    elevation: 2,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    width: 42,
  },
  logoImage: { height: 38, width: 135 },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  alertDot: {
    backgroundColor: donorColors.alert,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 8,
    position: 'absolute',
    right: 9,
    top: 9,
    width: 8,
  },
  avatarBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.orange,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
