import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { AdminHeader } from '@/components/AdminHeader';
import { colors, radius, spacing } from '@/theme';
import { formatAddress, titleCase } from '@/utils/format';

export default function AssignVolunteer() {
  const { donationId } = useLocalSearchParams<{ donationId: string }>();

  const { data: options, isPending } = useQuery({
    queryKey: ['assign', donationId],
    queryFn: () => adminApi.assignmentOptions(donationId),
    enabled: Boolean(donationId),
  });

  const matchedRequestId = options?.requests[0]?.id;

  const assign = useMutation({
    mutationFn: (volunteerId: string) =>
      adminApi.assignVolunteer(donationId, volunteerId, matchedRequestId),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.monitor'] });
      Alert.alert(
        'Courier Assigned',
        'Pickup task offer dispatched to the volunteer.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
    onError(error) {
      Alert.alert('Could not assign volunteer', (error as Error).message);
    },
  });

  const assignNgo = useMutation({
    mutationFn: (ngoId: string) => adminApi.assignToNgo(donationId, ngoId, matchedRequestId),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      Alert.alert(
        'NGO Assigned',
        'This donation was handed to a partner organisation.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
    onError(error) {
      Alert.alert('Could not assign NGO', (error as Error).message);
    },
  });

  const items = options?.volunteers ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.back()}
        subtitle="COURIER SELECTION & ROUTING"
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={styles.screenHeading}>Assign Delivery Courier</Text>
          <Text style={styles.screenSubheading}>
            Riders ranked by proximity to pickup point, vehicle cargo capacity, and active load
          </Text>
        </View>

        {options?.donation ? (
          <Text style={styles.screenSubheading}>
            {options.donation.title} · {options.donation.servings} servings
            {matchedRequestId
              ? ` · nearest request ${formatAddress(options.requests[0]?.dropAddress)}`
              : ' · no open request nearby yet'}
          </Text>
        ) : null}

        {/* Suggestion list */}
        <View style={styles.list}>
          {isPending ? <ActivityIndicator color={colors.adminMaroon} /> : null}
          {!isPending && items.length === 0 ? (
            <Text style={styles.screenSubheading}>
              No verified volunteers are available within travel radius. Use an NGO fallback below.
            </Text>
          ) : null}
          {items.map((item, index) => {
            const isTop = index === 0;
            return (
              <View
                key={item.volunteer.id}
                style={[styles.card, isTop && styles.cardTopMatch]}
              >
                <View style={styles.cardHeader}>
                  {item.volunteer.avatarUrl ? (
                    <Image source={{ uri: item.volunteer.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mintLight }]}>
                      <Ionicons name="person" size={22} color={colors.mint} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.volName}>{item.volunteer.name}</Text>
                      {isTop && (
                        <View style={styles.bestMatchBadge}>
                          <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                          <Text style={styles.bestMatchText}>
                            Best Match ({Math.round(item.score * 100)}%)
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.volVehicle}>
                      {titleCase(item.volunteer.vehicleType) || 'Volunteer'} · {item.distanceKm} km from pickup
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statTag}>
                    <Ionicons name="cube-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.statTagText}>
                      {item.activeAssignments} active task{item.activeAssignments === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.statTag}>
                    <Ionicons name="ribbon-outline" size={12} color={colors.mint} />
                    <Text style={styles.statTagText}>
                      {item.volunteer.karmaPoints ?? 0} Karma
                    </Text>
                  </View>
                  <View style={styles.statTag}>
                    <Ionicons name="speedometer-outline" size={12} color={colors.amber} />
                    <Text style={styles.statTagText}>
                      Score: {Math.round(item.score * 100)}%
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.assignBtn, !isTop && styles.assignBtnSecondary]}
                  onPress={() => assign.mutate(item.volunteer.id)}
                  disabled={assign.isPending}
                  activeOpacity={0.8}
                >
                  {assign.isPending && assign.variables === item.volunteer.id ? (
                    <ActivityIndicator color={isTop ? '#FFFFFF' : colors.adminMaroon} />
                  ) : (
                    <>
                      <Ionicons
                        name="paper-plane"
                        size={14}
                        color={isTop ? '#FFFFFF' : colors.adminMaroon}
                      />
                      <Text
                        style={[
                          styles.assignBtnText,
                          !isTop && styles.assignBtnTextSecondary,
                        ]}
                      >
                        {isTop ? 'Assign & Dispatch Next' : 'Assign to Courier'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {(options?.ngos ?? []).map((ngo) => (
          <View key={ngo.id} style={styles.selfDeliveryCard}>
            <Text style={styles.selfDeliveryTitle}>NGO fallback · {ngo.name}</Text>
            <Text style={styles.selfDeliveryDesc}>
              {formatAddress(ngo.address)} · {ngo.distanceKm} km · {ngo.contactPhone}
            </Text>
            <TouchableOpacity
              style={styles.confirmSelfBtn}
              onPress={() => assignNgo.mutate(ngo.id)}
              disabled={assignNgo.isPending}
            >
              <Text style={styles.confirmSelfText}>Assign to {ngo.name} →</Text>
            </TouchableOpacity>
          </View>
        ))}

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
    paddingBottom: 60,
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
  list: {
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  cardTopMatch: {
    borderColor: colors.adminMaroon,
    backgroundColor: '#FFFCFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEE',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bestMatchBadge: {
    backgroundColor: colors.adminMaroon,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestMatchText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  volVehicle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  statTag: {
    backgroundColor: '#FAF7F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  assignBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  assignBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  assignBtnTextSecondary: {
    color: colors.adminMaroon,
  },
  selfDeliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  selfDeliveryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  selfDeliveryDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  confirmSelfBtn: {
    backgroundColor: '#FAF5F5',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  confirmSelfText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.adminMaroon,
  },
});
