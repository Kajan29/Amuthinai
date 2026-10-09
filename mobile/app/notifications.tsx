import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationsApi } from '@/api/notifications.api';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/theme';
import { relativeFromNow } from '@/utils/date';
import type { AppNotification, NotificationType, Role } from '@/types';

const TYPE_ICON: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  donation: { icon: 'fast-food-outline', color: colors.primary },
  assignment: { icon: 'bicycle-outline', color: colors.info },
  urgent: { icon: 'alarm-outline', color: colors.urgentRed },
  pickup: { icon: 'cube-outline', color: colors.mint },
  delivery: { icon: 'checkmark-done-outline', color: colors.success },
  delay: { icon: 'time-outline', color: colors.amber },
  enquiry: { icon: 'chatbubbles-outline', color: colors.adminMaroon },
  request: { icon: 'hand-left-outline', color: colors.accent },
  points: { icon: 'star-outline', color: colors.warning },
  system: { icon: 'notifications-outline', color: colors.textMuted },
};

/** Where a notification should take each role. */
function targetFor(role: Role | undefined, data: Record<string, string>): Href | null {
  const { donationId, assignmentId, requestId, enquiryId } = data;
  switch (role) {
    case 'donor':
      if (donationId) return `/(donor)/donation/${donationId}` as Href;
      return '/(donor)/donations';
    case 'volunteer':
      if (assignmentId) return `/(volunteer)/assignment/${assignmentId}` as Href;
      if (enquiryId) return '/(volunteer)/raise-concern';
      return '/(volunteer)/tasks';
    case 'recipient':
      if (enquiryId) return '/(recipient)/raise-concern';
      return '/(recipient)/requests';
    case 'admin':
      if (enquiryId) return '/(admin)/disputes';
      if (assignmentId) return '/(admin)/deliveries';
      if (requestId) return '/(admin)/recipients';
      if (donationId) return `/(admin)/approvals/donation/${donationId}` as Href;
      return '/(admin)/dashboard';
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ pageSize: 50 }),
  });

  const refreshCounts = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications.unread'] }),
    ]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: refreshCounts,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: refreshCounts,
  });

  function open(item: AppNotification) {
    if (!item.read) markRead.mutate(item.id);
    const target = targetFor(role, item.data ?? {});
    if (target) router.push(target);
  }

  const items = list.data?.items ?? [];
  const unread = list.data?.unread ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unread > 0 ? `${unread} unread` : 'All caught up'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.markAll, unread === 0 && { opacity: 0.4 }]}
          disabled={unread === 0 || markAll.isPending}
          onPress={() => markAll.mutate()}
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={list.isFetching} onRefresh={() => void list.refetch()} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={list.isError ? 'cloud-offline-outline' : 'notifications-off-outline'}
              size={44}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {list.isLoading ? 'Loading…' : list.isError ? 'Could not load notifications' : 'No notifications yet'}
            </Text>
            {list.isError && (
              <Text style={styles.emptyBody}>{(list.error as Error).message}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const meta = TYPE_ICON[item.type] ?? TYPE_ICON.system;
          return (
            <Pressable style={[styles.card, !item.read && styles.cardUnread]} onPress={() => open(item)}>
              <View style={[styles.iconFrame, { backgroundColor: `${meta.color}1A` }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardText}>{item.body}</Text>
                <Text style={styles.cardTime}>{relativeFromNow(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  markAll: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.primaryLight },
  markAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardUnread: { borderColor: colors.primary, backgroundColor: '#FBFFFD' },
  iconFrame: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  cardTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
