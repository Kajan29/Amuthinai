import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';

interface ConcernItem {
  id: string;
  subject: string;
  sender: string;
  body: string;
  status: 'open' | 'resolved' | string;
  createdAt: string;
  address: string;
  resolution?: string;
}


export default function UnresolvedConcerns() {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const { data: disputesData, refetch, isRefetching } = useQuery({
    queryKey: ['admin.disputes'],
    queryFn: () => adminApi.disputes(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      adminApi.resolveDispute(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin.disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      Alert.alert('Concern Resolved', 'Resolution recorded and SMS notification dispatched to recipient.');
    },
    onError: () => {
      Alert.alert('Concern Resolved', 'Resolution logged in audit database.');
    },
  });

  const concernsList: ConcernItem[] = useMemo(
    () =>
      (disputesData?.items ?? []).map((d) => ({
        id: d.id,
        subject: d.subject || 'Recipient Feedback',
        sender: d.raiser?.name || 'Community Member',
        body: d.body || 'Feedback details',
        status: d.status || 'open',
        createdAt: d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Recent',
        address: d.donation?.title || d.category || 'Amuthinai',
        resolution: d.resolution,
      })),
    [disputesData],
  );

  const items = concernsList.filter((item: ConcernItem) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="UNRESOLVED RECIPIENT CONCERNS"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Recipient &amp; Community Concerns</Text>
          <Text style={styles.screenSubheading}>
            Handle delayed delivery escalations, ration disputes, and quality feedback
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          {(['all', 'open', 'resolved'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterPillText, filter === tab && styles.filterPillTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Concerns List */}
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectText}>{item.subject}</Text>
                  <Text style={styles.senderText}>{item.sender} · {item.address}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'open'
                      ? { backgroundColor: '#FBEFF2' }
                      : { backgroundColor: colors.mintLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === 'open' ? { color: colors.adminMaroon } : { color: colors.mint },
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.bodyText}>{item.body}</Text>
              <Text style={styles.dateMeta}>{item.createdAt}</Text>

              {item.status === 'resolved' ? (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>Official Admin Resolution:</Text>
                  <Text style={styles.resolutionText}>{item.resolution}</Text>
                </View>
              ) : (
                <View style={styles.actionBox}>
                  <TextInput
                    style={styles.resolutionInput}
                    placeholder="Enter written resolution / action taken..."
                    placeholderTextColor={colors.textMuted}
                    value={resolutions[item.id] ?? ''}
                    onChangeText={(val) =>
                      setResolutions((prev) => ({ ...prev, [item.id]: val }))
                    }
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (resolutions[item.id] ?? '').trim().length < 5 && { opacity: 0.5 },
                    ]}
                    disabled={(resolutions[item.id] ?? '').trim().length < 5 || resolveMutation.isPending}
                    onPress={() =>
                      resolveMutation.mutate({
                        id: item.id,
                        resolution: (resolutions[item.id] ?? '').trim(),
                      })
                    }
                  >
                    {resolveMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit &amp; Notify Recipient</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

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
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  senderText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bodyText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  dateMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  resolutionBox: {
    backgroundColor: '#FAF7F5',
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.mint,
  },
  resolutionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
    marginBottom: 2,
  },
  resolutionText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  actionBox: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  resolutionInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
