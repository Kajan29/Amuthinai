import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NearbyTask } from '@/api/assignments.api';
import { Badge } from '@/components/ui';
import { URGENT_THRESHOLD_MINUTES } from '@/constants';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { useLocation } from '@/hooks/useLocation';
import { useVolunteerTasks } from '@/hooks/useVolunteerTasks';
import { useAuthStore } from '@/store/auth.store';
import { radius, typography } from '@/theme';
import { volunteerColors } from '@/theme/volunteer';
import { toLatLng } from '@/utils/geo';
import { MapView, Marker, Circle } from '@/utils/maps';
import { dropOffLabel, etaMinutes, formatKm, KARMA_PER_DELIVERY, pickupLabel } from '@/utils/tasks';

/** Full-screen volunteer map showing all nearby tasks with interactive markers */
export default function VolunteerMap() {
  const insets = useSafeAreaInsets();
  const { point } = useLocation();
  const user = useAuthStore((state) => state.user);
  const travelRadiusKm = user?.travelRadiusKm ?? 10;
  const homePoint = user?.address?.location;

  const tasks = useVolunteerTasks();
  const items = tasks.live;

  const [selectedTask, setSelectedTask] = useState<NearbyTask | null>(null);

  const urgentCount = items.filter((t) => t.isUrgent || t.minutesLeft <= URGENT_THRESHOLD_MINUTES).length;

  const center = point
    ? toLatLng(point)
    : homePoint
      ? toLatLng(homePoint)
      : items[0]
        ? toLatLng(items[0].donation.pickupAddress.location)
        : { latitude: 9.6615, longitude: 80.0255 };

  const mapboxFullMapUrl = getMapboxStaticMapUrl({
    center,
    zoom: 13.0,
    width: 600,
    height: 700,
    retina: true,
    markers: items.map((t, idx) => ({
      latitude: t.donation.pickupAddress.location.coordinates[1],
      longitude: t.donation.pickupAddress.location.coordinates[0],
      label: String(idx + 1),
      color: t.minutesLeft <= URGENT_THRESHOLD_MINUTES ? 'D97706' : '0F766E',
      size: 's',
    })),
  });

  return (
    <View style={styles.root}>
      {Platform.OS !== 'web' && MapView ? (
        <MapView
          style={styles.map}
          initialRegion={{
            ...center,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Travel radius circle */}
          {(point || homePoint) && (
            <Circle
              center={toLatLng((point ?? homePoint)!)}
              radius={travelRadiusKm * 1000}
              fillColor="rgba(15, 123, 79, 0.08)"
              strokeColor={volunteerColors.green}
              strokeWidth={1}
            />
          )}

          {/* Task markers */}
          {items.map((task) => {
            const isUrgent = task.isUrgent || task.minutesLeft <= URGENT_THRESHOLD_MINUTES;
            const isActive = task.assignment.status === 'accepted';
            return (
              <Marker
                key={task.assignment.id}
                coordinate={toLatLng(task.donation.pickupAddress.location)}
                title={task.donation.title}
                description={`${formatKm(task.distanceKm)} · ${task.donation.servings} servings`}
                pinColor={
                  isActive
                    ? volunteerColors.orange
                    : isUrgent
                      ? volunteerColors.urgentRed
                      : volunteerColors.green
                }
                onPress={() => setSelectedTask(task)}
              />
            );
          })}
        </MapView>
      ) : (
        <View style={styles.mapboxMapContainer}>
          <Image
            source={{ uri: mapboxFullMapUrl }}
            style={styles.mapboxFullMapImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Floating header */}
      <View style={[styles.floatingHeader, { top: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={volunteerColors.muted} />
          <Text style={styles.searchPlaceholder}>Search tasks by area, shelter, food type...</Text>
        </View>
        <TouchableOpacity style={styles.filterFab}>
          <Ionicons name="options" size={20} color={volunteerColors.maroon} />
        </TouchableOpacity>
      </View>

      {/* Legend chips */}
      <View style={[styles.legendRow, { top: insets.top + 60 }]}>
        <View style={styles.legendChip}>
          <View style={[styles.legendDot, { backgroundColor: volunteerColors.urgentRed }]} />
          <Text style={styles.legendText}>Urgent ({urgentCount})</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.legendDot, { backgroundColor: volunteerColors.green }]} />
          <Text style={styles.legendText}>Available ({items.length - urgentCount})</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.legendDot, { backgroundColor: volunteerColors.orange }]} />
          <Text style={styles.legendText}>Active</Text>
        </View>
      </View>

      {/* Selected task card */}
      {selectedTask && (
        <View style={[styles.taskPopup, { bottom: Math.max(insets.bottom + 68, 76) }]}>
          <Pressable style={styles.popupDismiss} onPress={() => setSelectedTask(null)}>
            <Ionicons name="close" size={18} color={volunteerColors.muted} />
          </Pressable>

          <View style={styles.popupContent}>
            <View style={styles.popupHeader}>
              <View style={styles.popupIconFrame}>
                <Ionicons name="restaurant" size={20} color={volunteerColors.maroon} />
              </View>
              <View style={styles.popupInfo}>
                <Text style={styles.popupTitle} numberOfLines={1}>
                  {selectedTask.donation.title}
                </Text>
                <Text style={styles.popupMeta}>
                  {selectedTask.donation.servings} servings · {formatKm(selectedTask.distanceKm)} away
                </Text>
              </View>
              {(selectedTask.isUrgent || selectedTask.minutesLeft <= URGENT_THRESHOLD_MINUTES) && (
                <Badge label="Urgent" tone="danger" />
              )}
            </View>

            <View style={styles.popupStatsRow}>
              <View style={styles.popupStat}>
                <Ionicons name="navigate-outline" size={14} color={volunteerColors.green} />
                <Text style={styles.popupStatText}>{formatKm(selectedTask.distanceKm)}</Text>
              </View>
              <View style={styles.popupStat}>
                <Ionicons name="time-outline" size={14} color={volunteerColors.green} />
                <Text style={styles.popupStatText}>
                  ~{etaMinutes(selectedTask.distanceKm + (selectedTask.routeKm ?? 0))} min
                </Text>
              </View>
              <View style={styles.popupStat}>
                <Ionicons name="leaf-outline" size={14} color={volunteerColors.orange} />
                <Text style={styles.popupStatText}>+{KARMA_PER_DELIVERY} pts</Text>
              </View>
            </View>

            <View style={styles.popupRouteRow}>
              <View style={[styles.popupRouteDot, { backgroundColor: volunteerColors.green }]} />
              <Text style={styles.popupRouteText} numberOfLines={1}>
                Pickup: {pickupLabel(selectedTask)}
              </Text>
            </View>
            <View style={styles.popupRouteRow}>
              <View style={[styles.popupRouteDot, { backgroundColor: volunteerColors.urgentRed }]} />
              <Text style={styles.popupRouteText} numberOfLines={1}>
                Drop-off: {dropOffLabel(selectedTask)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => {
                setSelectedTask(null);
                router.push(`/(volunteer)/assignment/${selectedTask.assignment.id}`);
              }}
            >
              <Text style={styles.popupButtonText}>View Task Details</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Re-center FAB */}
      <TouchableOpacity
        style={[
          styles.recenterFab,
          {
            bottom: selectedTask
              ? Math.max(insets.bottom + 270, 280)
              : Math.max(insets.bottom + 74, 84),
          },
        ]}
      >
        <Ionicons name="locate" size={22} color={volunteerColors.maroon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: volunteerColors.background },
  map: { flex: 1 },

  mapboxMapContainer: {
    flex: 1,
    backgroundColor: '#E4EFF5',
  },
  mapboxFullMapImage: {
    width: '100%',
    height: '100%',
  },

  /* Floating header */
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchPlaceholder: { ...typography.body, color: volunteerColors.muted, fontSize: 13, flex: 1 },
  filterFab: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  /* Legend */
  legendRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: volunteerColors.ink, fontSize: 11 },

  /* Task popup */
  taskPopup: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  popupDismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  popupContent: { gap: 10 },
  popupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  popupIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: volunteerColors.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupInfo: { flex: 1, gap: 2 },
  popupTitle: { ...typography.bodyStrong, color: volunteerColors.ink },
  popupMeta: { ...typography.caption, color: volunteerColors.muted },

  popupStatsRow: { flexDirection: 'row', gap: 16 },
  popupStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  popupStatText: { ...typography.caption, color: volunteerColors.muted, fontWeight: '600' },

  popupRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 8,
  },
  popupRouteDot: { width: 8, height: 8, borderRadius: 4 },
  popupRouteText: { ...typography.caption, color: volunteerColors.ink, flex: 1 },

  popupButton: {
    backgroundColor: volunteerColors.maroon,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  popupButtonText: { ...typography.bodyStrong, color: '#FFF', fontSize: 14 },

  /* FAB */
  recenterFab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
});
