import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { logo } from '@/constants/images';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, typography } from '@/theme';

interface AdminHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  unreadAlertsCount?: number;
}

export function AdminHeader({
  showBack = false,
  onBack,
  subtitle,
  rightAction,
  unreadAlertsCount = 3,
}: AdminHeaderProps) {
  const { user, confirmLogout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: 'grid-outline', route: '/(admin)/dashboard' },
    { label: 'Approvals & Queues', icon: 'checkbox-outline', route: '/(admin)/approvals' },
    {
      label: 'Volunteer Approvals',
      icon: 'people-outline',
      route: '/(admin)/approvals/volunteers',
    },
    { label: 'Active Deliveries', icon: 'cube-outline', route: '/(admin)/deliveries' },
    { label: 'Recipient Food Requests', icon: 'heart-outline', route: '/(admin)/recipients' },
    { label: 'Central Live Map', icon: 'map-outline', route: '/(admin)/map' },
    { label: 'Reports & Analytics', icon: 'bar-chart-outline', route: '/(admin)/analytics' },
    { label: 'Disputes & Concerns', icon: 'warning-outline', route: '/(admin)/disputes' },
    { label: 'Hub Settings', icon: 'settings-outline', route: '/(admin)/settings' },
  ];

  return (
    <>
      <View style={styles.container}>
        <View style={styles.left}>
          {showBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.adminMaroon} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={styles.iconButton}
              hitSlop={12}
            >
              <Ionicons name="menu-outline" size={26} color={colors.adminMaroon} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.center}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>{subtitle ?? 'JAFFNA CENTRAL HUB • OPERATIONS'}</Text>
        </View>

        <View style={styles.right}>
          {rightAction ? (
            <TouchableOpacity onPress={rightAction.onPress} style={styles.iconButton} hitSlop={12}>
              <Ionicons name={rightAction.icon} size={22} color={colors.adminMaroon} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setAlertsVisible(true)}
              style={styles.iconButton}
              hitSlop={12}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.adminMaroon} />
              {unreadAlertsCount > 0 && (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeDotText}>
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Slide Navigation Modal */}
      <Modal visible={menuVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.drawerCard} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.drawerHeader}>
                <Image source={logo} style={styles.drawerLogo} resizeMode="contain" />
                <Text style={styles.drawerTitle}>Amuthinai Operations Hub</Text>
                <Text style={styles.drawerMeta}>{user?.name ?? 'Hub Administrator'}</Text>
              </View>

              <View style={styles.drawerList}>
                {navItems.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.drawerItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(item.route as any);
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={colors.adminMaroon}
                      style={styles.drawerItemIcon}
                    />
                    <Text style={styles.drawerItemText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => {
                    setMenuVisible(false);
                    confirmLogout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                  <Text style={styles.logoutText}>Sign Out of Hub</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Operations Alert Center Modal */}
      <Modal visible={alertsVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setAlertsVisible(false)}>
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons name="alert-circle" size={22} color={colors.urgentRed} />
                <Text style={styles.alertTitle}>Operational Alerts (3)</Text>
              </View>
              <TouchableOpacity onPress={() => setAlertsVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.alertItem}>
              <View style={[styles.alertDot, { backgroundColor: colors.urgentRed }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertItemTitle}>Freshness Alert: Nallur Temple Kitchen</Text>
                <Text style={styles.alertItemDesc}>
                  50 Veg Meals expires in 1h 45m. Immediate dispatch assignment required.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertsVisible(false);
                    router.push('/(admin)/approvals');
                  }}
                >
                  <Text style={styles.alertAction}>Review Item →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.alertItem}>
              <View style={[styles.alertDot, { backgroundColor: colors.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertItemTitle}>Volunteer KYC Vetting</Text>
                <Text style={styles.alertItemDesc}>
                  3 new delivery riders submitted driving license and NIC documents.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertsVisible(false);
                    router.push('/(admin)/approvals/volunteers');
                  }}
                >
                  <Text style={styles.alertAction}>Open Volunteers Queue →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.alertItem}>
              <View style={[styles.alertDot, { backgroundColor: colors.mint }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertItemTitle}>High Demand in Ariyalai Community</Text>
                <Text style={styles.alertItemDesc}>
                  4 priority households requested emergency dinner packs.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertsVisible(false);
                    router.push('/(admin)/recipients' as any);
                  }}
                >
                  <Text style={styles.alertAction}>View Recipient Aid →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 130,
    height: 34,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6E4852',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.urgentRed,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    width: '80%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  drawerHeader: {
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  drawerLogo: {
    width: 140,
    height: 40,
    marginBottom: spacing.xs,
  },
  drawerTitle: {
    ...typography.bodyStrong,
    color: colors.adminMaroon,
    fontSize: 16,
  },
  drawerMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  drawerList: {
    flex: 1,
    gap: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  drawerItemIcon: {
    marginRight: spacing.sm,
  },
  drawerItemText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  drawerFooter: {
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoutText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '70%',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  alertTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 16,
  },
  alertItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  alertItemTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  alertItemDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  alertAction: {
    ...typography.caption,
    color: colors.adminMaroon,
    fontWeight: '700',
  },
});
