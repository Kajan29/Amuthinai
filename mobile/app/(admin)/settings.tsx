import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminHeader } from '@/components/AdminHeader';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing } from '@/theme';

export default function AdminSettings() {
  const { user, confirmLogout } = useAuth();

  const [autoDispatch, setAutoDispatch] = useState(true);
  const [pushUrgentAlerts, setPushUrgentAlerts] = useState(true);
  const [thermalEnforcement, setThermalEnforcement] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="OPERATIONS & HUB SETTINGS"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Hub Settings</Text>
          <Text style={styles.screenSubheading}>
            Configure Jaffna Central Operations Hub preferences and dispatch rules
          </Text>
        </View>

        {/* Admin Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={24} color={colors.adminMaroon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name ?? 'Amuthinai Admin'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? 'admin@amuthinai.lk'}</Text>
              <Text style={styles.profileRole}>Jaffna Central Hub · Operations Master</Text>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Language &amp; Localization</Text>
          <Text style={styles.cardSectionDesc}>
            Switch application language across English, Tamil, and Sinhala
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <LanguageSwitcher />
          </View>
        </View>

        {/* Operations & Dispatch Parameters */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Dispatch &amp; Safety Controls</Text>

          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Auto-Score Courier Matching</Text>
              <Text style={styles.settingDesc}>
                Rank nearest suitable couriers based on distance, travel radius, and capacity
              </Text>
            </View>
            <Switch
              value={autoDispatch}
              onValueChange={setAutoDispatch}
              trackColor={{ false: '#DDD', true: colors.adminMaroon }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Urgent Freshness Push Alerts</Text>
              <Text style={styles.settingDesc}>
                Send high-priority alerts when meals are within 2 hours of expiry deadline
              </Text>
            </View>
            <Switch
              value={pushUrgentAlerts}
              onValueChange={setPushUrgentAlerts}
              trackColor={{ false: '#DDD', true: colors.adminMaroon }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Mandatory Thermal Check (60°C+)</Text>
              <Text style={styles.settingDesc}>
                Require thermal food temperature log before approving cooked donations
              </Text>
            </View>
            <Switch
              value={thermalEnforcement}
              onValueChange={setThermalEnforcement}
              trackColor={{ false: '#DDD', true: colors.adminMaroon }}
            />
          </View>
        </View>

        {/* Quick Operations Links */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Operational Management</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(admin)/map' as any)}
          >
            <Ionicons name="map-outline" size={20} color={colors.adminMaroon} />
            <Text style={styles.linkText}>Live Operations Map</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(admin)/analytics' as any)}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.adminMaroon} />
            <Text style={styles.linkText}>Reports &amp; Impact Analytics</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(admin)/disputes' as any)}
          >
            <Ionicons name="warning-outline" size={20} color={colors.adminMaroon} />
            <Text style={styles.linkText}>Unresolved Recipient Concerns</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out of Admin Console</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: colors.creamBg,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },
  headerBlock: {
    marginBottom: spacing.md,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FBEFF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  profileRole: {
    fontSize: 11,
    color: colors.adminMaroon,
    fontWeight: '700',
    marginTop: 2,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  cardSectionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    paddingRight: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5ECEE',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: radius.pill,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
