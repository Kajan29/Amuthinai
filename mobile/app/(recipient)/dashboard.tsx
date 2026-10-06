import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { donationsApi } from '@/api/donations.api';
import { requestsApi } from '@/api/requests.api';
import { usersApi } from '@/api/users.api';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Badge, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

// Direct import of logo
const logoImage = require('../../assets/images/logo.png');

/** Enhanced recipient dashboard with sidebar navigation (FR9). */
export default function RecipientDashboard() {
  const { t } = useTranslation();
  const { confirmLogout } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Fetch user info
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.me(),
  });

  // Fetch requests
  const requests = useOfflineQuery('recipient.requests', () => requestsApi.mine());

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['recipient', 'stats'],
    queryFn: () => requestsApi.stats(),
  });

  // Fetch available distributions
  const { data: distributions } = useQuery({
    queryKey: ['recipient', 'distributions'],
    queryFn: () => requestsApi.availableDistributions({ pageSize: 10 }),
  });

  const active = requests.data?.items.find((request) =>
    ['open', 'matched'].includes(request.status),
  );

  const timeline = useQuery({
    queryKey: ['request', active?.id, 'timeline'],
    queryFn: () => donationsApi.timeline(active!.id),
    enabled: Boolean(active && active.status === 'matched'),
  });

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Helper to format food type
  const formatFoodType = (type: string) => {
    switch (type) {
      case 'cooked':
        return 'Hot Meals';
      case 'raw':
        return 'Groceries';
      case 'bakery':
        return 'Bakery Food';
      case 'packaged':
        return 'Packaged Food';
      default:
        return type;
    }
  };

  // Helper to get expiry info
  const getExpiryInfo = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    }
    return `${diffMinutes}m remaining`;
  };

  return (
    <View style={styles.container}>
      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <Pressable style={styles.overlay} onPress={() => setSidebarVisible(false)} />
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, sidebarVisible && styles.sidebarVisible]}>
        <View style={styles.sidebarHeader}>
          <Image source={logoImage} style={styles.sidebarLogo} resizeMode="contain" />
        </View>

        <View style={styles.sidebarContent}>
          <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
            <Ionicons name="home" size={24} color={colors.primary} />
            <Text style={styles.sidebarItemText}>{t('recipient.dashboard')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => {
              setSidebarVisible(false);
              router.push('/(recipient)/request/step1-location');
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>{t('recipient.newRequest')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => {
              setSidebarVisible(false);
              router.push('/(recipient)/raise-concern');
            }}
          >
            <Ionicons name="alert-circle-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>{t('recipient.raiseConcern')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
            <Ionicons name="location-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>Hub Map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
            <Ionicons name="time-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>Request History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>Impact</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => setSidebarVisible(false)}>
            <Ionicons name="person-outline" size={24} color={colors.text} />
            <Text style={styles.sidebarItemText}>Profile</Text>
          </TouchableOpacity>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => {
              setSidebarVisible(false);
              confirmLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
            <Text style={[styles.sidebarItemText, { color: colors.danger }]}>
              {t('common.logout') || 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color={colors.text} />
          </TouchableOpacity>

          <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* User Info Banner */}
        {user && (
          <View style={styles.userBanner}>
            <View style={styles.userInfo}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.userName}>{user.name}</Text>
            </View>
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>
                Hub: {user.language === 'ta' ? 'நல்லூர்' : 'Nallur'}, Jaffna
              </Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stats Cards */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="hand-left" size={24} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>{stats.activeNeeds}</Text>
                <Text style={styles.statLabel}>Active Needs</Text>
                <View style={styles.statUnderline} />
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{stats.nearbyHubs}</Text>
                <Text style={styles.statLabel}>Nearby Hubs</Text>
                <View style={styles.statUnderline} />
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FCE8E8' }]}>
                  <Ionicons name="restaurant" size={24} color={colors.danger} />
                </View>
                <Text style={styles.statNumber}>{stats.mealsShared}</Text>
                <Text style={styles.statLabel}>Meals Shared</Text>
                <View style={styles.statUnderline} />
              </View>
            </View>
          )}

          {/* Active Request Card */}
          {active && (
            <Card style={styles.distributionCard}>
              <View style={styles.distributionHeader}>
                <View style={styles.statusBadge}>
                  <View style={styles.activeIndicator} />
                  <Text style={styles.statusText}>
                    {active.status === 'open' ? 'Looking for Food' : 'Request Matched'}
                  </Text>
                </View>
                <Badge
                  label={active.status === 'open' ? 'OPEN' : 'MATCHED'}
                  tone={active.status === 'open' ? 'warning' : 'info'}
                />
              </View>

              <Text style={styles.distributionTitle}>
                Food Request: {active.servingsNeeded} Servings
              </Text>
              <Text style={styles.distributionSubtitle}>
                {active.dropAddress.line1}, {active.dropAddress.city}
              </Text>

              <View style={styles.distributionInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={16} color={colors.textMuted} />
                  <Text style={styles.infoText}>
                    Needed by: {formatDateTime(active.neededBy)}
                  </Text>
                </View>
                {active.notes && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text" size={16} color={colors.textMuted} />
                    <Text style={styles.infoText}>{active.notes}</Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Available Distributions */}
          {distributions && distributions.items.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Distributions</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllButton}>
                    View All ({distributions.total}) ›
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontal}
              >
                {distributions.items.map((donation) => (
                  <Card key={donation.id} style={styles.foodCard}>
                    {donation.photoUrls && donation.photoUrls.length > 0 ? (
                      <Image
                        source={{ uri: donation.photoUrls[0] }}
                        style={styles.foodImage}
                      />
                    ) : (
                      <View style={[styles.foodImage, styles.placeholderImage]}>
                        <Ionicons name="fast-food" size={40} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.kitsBadge}>
                      <Text style={styles.kitsText}>{donation.servings} servings</Text>
                    </View>
                    <Text style={styles.foodTitle}>{formatFoodType(donation.foodType)}</Text>
                    <Text style={styles.foodDescription} numberOfLines={1}>
                      {donation.title}
                    </Text>
                    <Text style={styles.foodTag}>{getExpiryInfo(donation.expiresAt)}</Text>
                  </Card>
                ))}
              </ScrollView>
            </>
          )}

          {/* Immediate Assistance Banner */}
          {!active && (
            <TouchableOpacity
              style={styles.assistanceBanner}
              onPress={() => router.push('/(recipient)/request/step1-location')}
            >
              <View style={styles.assistanceIcon}>
                <Ionicons name="add-circle" size={32} color={colors.warning} />
              </View>
              <View style={styles.assistanceContent}>
                <Text style={styles.assistanceTitle}>IMMEDIATE ASSISTANCE</Text>
                <Text style={styles.assistanceText}>Post a Meal Request for Family</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Timeline if available */}
          {timeline.data && timeline.data.length > 0 && (
            <Card>
              <Text style={styles.title}>Progress</Text>
              <StatusTimeline events={timeline.data} />
            </Card>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    left: -280,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.background,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  sidebarVisible: {
    left: 0,
  },
  sidebarHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  sidebarLogo: {
    width: 150,
    height: 50,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sidebarItemText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    marginHorizontal: spacing.lg,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: spacing.xs,
  },
  headerLogo: {
    width: 120,
    height: 40,
  },
  notificationButton: {
    padding: spacing.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  userBanner: {
    backgroundColor: '#F0F9F4',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    width: 100,
  },
  progressFill: {
    height: '100%',
    width: '70%',
    backgroundColor: colors.primary,
  },
  userName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  locationBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  locationText: {
    ...typography.caption,
    color: colors.text,
  },
  scrollContent: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  statCard: {
    alignItems: 'center',
    width: 100,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statUnderline: {
    width: 32,
    height: 3,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
    borderRadius: 2,
  },
  distributionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    ...typography.caption,
    color: colors.text,
  },
  distributionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  distributionSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  distributionInfo: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  viewAllButton: {
    ...typography.body,
    color: colors.primary,
  },
  horizontal: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  foodCard: {
    width: 140,
    marginRight: spacing.md,
    padding: spacing.sm,
  },
  foodImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  placeholderImage: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitsBadge: {
    position: 'absolute',
    top: spacing.sm + 8,
    right: spacing.sm + 8,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kitsText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  foodTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: 2,
  },
  foodDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  foodTag: {
    ...typography.caption,
    color: colors.primary,
  },
  assistanceBanner: {
    backgroundColor: '#6B2727',
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  assistanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceContent: {
    flex: 1,
  },
  assistanceTitle: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assistanceText: {
    ...typography.body,
    color: '#FFFFFF',
  },
  title: { ...typography.bodyStrong, color: colors.text },
  bottomPadding: {
    height: 100,
  },
});
