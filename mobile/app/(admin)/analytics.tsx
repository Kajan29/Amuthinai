import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';

export default function AnalyticsReports() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const { data: reportData, refetch, isRefetching } = useQuery({
    queryKey: ['admin.reports'],
    queryFn: () => adminApi.reports(),
  });

  const kpis = reportData?.kpis;
  const impact = reportData?.communityImpact;
  const foodBreakdown = reportData?.foodTypeBreakdown ?? [];
  const monthlyTrends = reportData?.monthlyTrends ?? [];
  const topVolunteers = reportData?.topVolunteers ?? [];

  const handleExport = () => {
    Alert.alert(
      'Audit Report Exported',
      'The comprehensive Jaffna Food Distribution & Waste Reduction Report (October 2026) has been generated in CSV/PDF format.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="REPORTS & COMMUNITY IMPACT"
        rightAction={{
          icon: 'download-outline',
          onPress: handleExport,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Reports &amp; Analytics</Text>
          <Text style={styles.screenSubheading}>
            Summary charts for food waste reduction, delivery performance, and community impact
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['month', 'quarter', 'year'] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.periodBtn, period === item && styles.periodBtnActive]}
              onPress={() => setPeriod(item)}
            >
              <Text style={[styles.periodBtnText, period === item && styles.periodBtnTextActive]}>
                {item === 'month' ? 'THIS MONTH' : item === 'quarter' ? 'QUARTERLY' : 'ALL TIME'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4 Big Impact KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FBEFF2' }]}>
              <Ionicons name="restaurant" size={20} color={colors.adminMaroon} />
            </View>
            <Text style={styles.kpiNumber}>
              {(impact?.totalMealsDistributed ?? kpis?.servingsToday ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel}>Meals Distributed</Text>
            <Text style={styles.kpiChange}>{kpis?.servingsToday ?? 0} servings today</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.mintLight }]}>
              <Ionicons name="leaf" size={20} color={colors.mint} />
            </View>
            <Text style={styles.kpiNumber}>
              {`${(impact?.wasteAvertedKg ?? kpis?.wasteAvertedKg ?? 0).toLocaleString()} kg`}
            </Text>
            <Text style={styles.kpiLabel}>Food Waste Averted</Text>
            <Text style={styles.kpiChange}>{impact?.carbonOffsetKg ?? 0} kg CO₂e offset</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="people" size={20} color={colors.amber} />
            </View>
            <Text style={styles.kpiNumber}>
              {(impact?.householdsSupported ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel}>Households Fed</Text>
            <Text style={styles.kpiChange}>{impact?.activeReliefCentres ?? 0} relief hubs active</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EBF4FF' }]}>
              <Ionicons name="bicycle" size={20} color="#2B6CB0" />
            </View>
            <Text style={styles.kpiNumber}>
              {(impact?.totalDeliveries ?? kpis?.completedDistributions ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel}>Completed Deliveries</Text>
            <Text style={styles.kpiChange}>{kpis?.activeDeliveries ?? 0} currently active</Text>
          </View>
        </View>

        {/* Chart 1: Monthly Waste Reduction Trend */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Food Waste Reduction (kg Averted)</Text>
          <Text style={styles.cardSubtitle}>Monthly surplus food diverted to food-insecure households</Text>

          <View style={styles.barChartContainer}>
            {monthlyTrends.map((trend) => {
              const maxWaste = Math.max(...monthlyTrends.map((row) => row.wasteKg), 1);
              const heightPercent = Math.min(100, Math.round((trend.wasteKg / maxWaste) * 100));
              return (
                <View key={trend.month} style={styles.chartCol}>
                  <Text style={styles.chartColVal}>{trend.wasteKg}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                  </View>
                  <Text style={styles.chartColMonth}>{trend.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Chart 2: Surplus Food by Category */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Surplus Food Donations by Category</Text>
          <Text style={styles.cardSubtitle}>Breakdown across registered Jaffna commercial kitchens</Text>

          <View style={styles.breakdownList}>
            {foodBreakdown.map((item, index) => {
              const barColors = [colors.adminMaroon, colors.mint, colors.amber, '#2B6CB0'];
              const col = barColors[index % barColors.length];
              return (
                <View key={item.label} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={styles.breakdownPercent}>
                      {item.percentage}% ({item.count} packs)
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${item.percentage}%`, backgroundColor: col },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Chart 3: Volunteer Performance Leaderboard */}
        <View style={styles.sectionCard}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.cardTitle}>Top Volunteer Couriers</Text>
            <Ionicons name="trophy" size={20} color="#D97706" />
          </View>
          <Text style={styles.cardSubtitle}>Ranked by deliveries completed and community karma points</Text>

          <View style={styles.leaderboardList}>
            {topVolunteers.map((vol, index) => (
              <View key={vol.name} style={styles.leaderboardItem}>
                <View
                  style={[
                    styles.rankCircle,
                    index === 0
                      ? { backgroundColor: '#FEF3C7' }
                      : index === 1
                      ? { backgroundColor: '#F3F4F6' }
                      : { backgroundColor: '#FFF7ED' },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankNumber,
                      index === 0
                        ? { color: '#B45309' }
                        : index === 1
                        ? { color: '#4B5563' }
                        : { color: '#9A3412' },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.volInfo}>
                  <Text style={styles.volName}>{vol.name}</Text>
                  <Text style={styles.volVehicle}>
                    {vol.vehicle}
                  </Text>
                </View>

                <View style={styles.volStats}>
                  <Text style={styles.volDeliveries}>{vol.deliveries} Drops</Text>
                  <Text style={styles.volKarma}>+{vol.karma} Karma</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportFullBtn} onPress={handleExport}>
          <Ionicons name="download" size={18} color="#FFFFFF" />
          <Text style={styles.exportFullBtnText}>Export Full Operations &amp; Audit Report</Text>
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
    lineHeight: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  periodBtnActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  periodBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiChange: {
    fontSize: 9,
    color: colors.mint,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECEE',
    paddingBottom: spacing.xs,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  chartColVal: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: '#F5EFEA',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.adminMaroon,
    borderRadius: 7,
    width: '100%',
  },
  chartColMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  breakdownList: {
    gap: spacing.sm,
  },
  breakdownItem: {
    gap: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F5EFEA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardList: {
    gap: spacing.sm,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  volInfo: {
    flex: 1,
  },
  volName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  volVehicle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  volStats: {
    alignItems: 'flex-end',
  },
  volDeliveries: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  volKarma: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mint,
  },
  exportFullBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },
  exportFullBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
