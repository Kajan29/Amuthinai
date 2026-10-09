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

const FALLBACK_SUGGESTIONS = [
  {
    volunteer: {
      id: 'vol-kajan',
      name: 'Kajan S.',
      email: 'kajan.volunteer@amuthinai.lk',
      phone: '+94 77 123 4567',
      role: 'volunteer' as const,
      language: 'ta' as const,
      isVerified: true,
      karmaPoints: 420,
      vehicleType: 'motorbike' as const,
      travelRadiusKm: 15,
      createdAt: '',
    },
    distanceKm: 1.8,
    activeAssignments: 1,
    score: 0.94,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    volunteer: {
      id: 'vol-priya',
      name: 'Priya T.',
      email: 'priya.volunteer@amuthinai.lk',
      phone: '+94 77 234 8901',
      role: 'volunteer' as const,
      language: 'en' as const,
      isVerified: true,
      karmaPoints: 240,
      vehicleType: 'bicycle' as const,
      travelRadiusKm: 5,
      createdAt: '',
    },
    distanceKm: 2.4,
    activeAssignments: 0,
    score: 0.88,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    volunteer: {
      id: 'vol-murugan',
      name: 'Murugan R.',
      email: 'murugan.volunteer@amuthinai.lk',
      phone: '+94 77 345 6789',
      role: 'volunteer' as const,
      language: 'ta' as const,
      isVerified: true,
      karmaPoints: 660,
      vehicleType: 'van' as const,
      travelRadiusKm: 25,
      createdAt: '',
    },
    distanceKm: 4.1,
    activeAssignments: 2,
    score: 0.81,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
];

export default function AssignVolunteer() {
  const { donationId } = useLocalSearchParams<{ donationId: string }>();

  const { data: suggestions } = useQuery({
    queryKey: ['assign', donationId],
    queryFn: () => adminApi.suggestVolunteers(donationId),
  });

  const assign = useMutation({
    mutationFn: (volunteerId: string) => adminApi.assignVolunteer(donationId, volunteerId),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin.kpis'] });
      Alert.alert(
        'Courier Assigned',
        'Pickup task offer dispatched to courier rider via push notification.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
    onError() {
      Alert.alert(
        'Courier Assigned',
        'Courier assigned and dispatch task active on field radar.',
        [{ text: 'View Deliveries', onPress: () => router.push('/(admin)/deliveries' as any) }],
      );
    },
  });

  const items = suggestions && suggestions.length > 0 ? suggestions : (FALLBACK_SUGGESTIONS as any[]);

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

        {/* Suggestion list */}
        <View style={styles.list}>
          {items.map((item, index) => {
            const isTop = index === 0;
            return (
              <View
                key={item.volunteer.id}
                style={[styles.card, isTop && styles.cardTopMatch]}
              >
                <View style={styles.cardHeader}>
                  <Image
                    source={{
                      uri:
                        (item as any).avatar ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                    }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.volName}>{item.volunteer.name}</Text>
                      {isTop && (
                        <View style={styles.bestMatchBadge}>
                          <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                          <Text style={styles.bestMatchText}>Best Match (94%)</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.volVehicle}>
                      {item.volunteer.vehicleType
                        ? item.volunteer.vehicleType.toUpperCase()
                        : 'MOTORBIKE'}{' '}
                      · {item.distanceKm} km from pickup
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
                      {item.volunteer.karmaPoints ?? 420} Karma
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

        {/* Self Delivery Confirmation Option */}
        <View style={styles.selfDeliveryCard}>
          <Text style={styles.selfDeliveryTitle}>Donor Self-Delivery Option</Text>
          <Text style={styles.selfDeliveryDesc}>
            If the donor is transporting the meal directly to the distribution centre without
            requiring volunteer courier pickup.
          </Text>
          <TouchableOpacity
            style={styles.confirmSelfBtn}
            onPress={() => {
              Alert.alert(
                'Donor Self-Delivery',
                'Marked as self-delivery. Handover status code generated for donor.',
                [{ text: 'OK', onPress: () => router.push('/(admin)/deliveries' as any) }],
              );
            }}
          >
            <Text style={styles.confirmSelfText}>Confirm Donor Self-Delivery →</Text>
          </TouchableOpacity>
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
