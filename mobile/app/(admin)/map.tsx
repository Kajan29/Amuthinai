import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminApi } from '@/api/admin.api';
import { AdminHeader } from '@/components/AdminHeader';
import { getAdminDashboardMapUrl } from '@/services/mapbox';
import { colors, radius, spacing } from '@/theme';
import { Circle, MapView, Marker, Polyline } from '@/utils/maps';

const JAFFNA_REGION = {
  latitude: 9.668,
  longitude: 80.025,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const HUBS = [
  {
    id: 'hub-1',
    name: 'Jaffna Central Operations Hub',
    type: 'Central Headquarters',
    latitude: 9.6615,
    longitude: 80.0167,
    address: 'Hospital Road, Jaffna',
    activeVolunteers: 18,
  },
  {
    id: 'hub-2',
    name: 'Nallur Community Distribution Hub',
    type: 'Regional Distribution',
    latitude: 9.6744,
    longitude: 80.0286,
    address: 'Point Pedro Road, Nallur',
    activeVolunteers: 14,
  },
  {
    id: 'hub-3',
    name: 'Chavakachcheri Relief Depot',
    type: 'Sub-Centre',
    latitude: 9.6542,
    longitude: 80.1582,
    address: 'Kandy Road, Chavakachcheri',
    activeVolunteers: 9,
  },
  {
    id: 'hub-4',
    name: 'Kopay Aid Station',
    type: 'Field Post',
    latitude: 9.6924,
    longitude: 80.0528,
    address: 'Main Street, Kopay',
    activeVolunteers: 7,
  },
];

const APPROVED_DONATIONS = [
  {
    id: 'don-1',
    title: '50 Pkts Hot Vegetable Rice & Sambar',
    donor: 'Nallur Temple Kitchen',
    latitude: 9.6744,
    longitude: 80.0286,
    servings: 50,
    freshWindow: '3h 45m left',
  },
  {
    id: 'don-2',
    title: '40 Fresh Buns & Loaves',
    donor: 'Hospital Road Bakery',
    latitude: 9.662,
    longitude: 80.019,
    servings: 40,
    freshWindow: '5h 10m left',
  },
  {
    id: 'don-3',
    title: '30 Vegetable Biryani Packs',
    donor: 'Kopay Community Kitchen',
    latitude: 9.6924,
    longitude: 80.0528,
    servings: 30,
    freshWindow: '2h 20m left',
  },
];

const ACTIVE_ROUTES = [
  {
    id: 'route-1',
    courier: 'Kajan S. (Motorbike)',
    status: 'In Transit to Ariyalai',
    coords: [
      { latitude: 9.6744, longitude: 80.0286 },
      { latitude: 9.668, longitude: 80.023 },
      { latitude: 9.655, longitude: 80.038 },
    ],
  },
  {
    id: 'route-2',
    courier: 'Priya T. (Bicycle)',
    status: 'In Transit to Grace Care',
    coords: [
      { latitude: 9.662, longitude: 80.019 },
      { latitude: 9.669, longitude: 80.025 },
    ],
  },
];

export default function CentralLiveMap() {
  const [activeLayer, setActiveLayer] = useState<'all' | 'hubs' | 'donations' | 'routes' | 'demand'>('all');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  const mapboxUrl = useMemo(
    () => getAdminDashboardMapUrl({ layer: activeLayer, width: 800, height: 600, zoom: 12.6 }),
    [activeLayer],
  );

  const { data: demandCells } = useQuery({
    queryKey: ['admin.demand'],
    queryFn: () => adminApi.demandHeatmap(),
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader
        showBack
        onBack={() => router.push('/(admin)/dashboard' as any)}
        subtitle="CENTRAL OPERATIONS LIVE MAP"
        rightAction={{
          icon: 'layers-outline',
          onPress: () =>
            Alert.alert(
              'Map Layer Filter',
              'Toggle between Food Hubs, Surplus Donations, Active Routes, and Demand Heat-Zones.',
            ),
        }}
      />

      <View style={styles.container}>
        {/* Layer Toggle Pills */}
        <View style={styles.layerPills}>
          {(['all', 'hubs', 'donations', 'routes', 'demand'] as const).map((layer) => (
            <TouchableOpacity
              key={layer}
              style={[styles.layerPill, activeLayer === layer && styles.layerPillActive]}
              onPress={() => setActiveLayer(layer)}
            >
              <Text
                style={[
                  styles.layerPillText,
                  activeLayer === layer && styles.layerPillTextActive,
                ]}
              >
                {layer.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map View */}
        <View style={styles.mapFrame}>
          {Platform.OS === 'web' || !MapView ? (
            <View style={styles.mapboxWebFrame}>
              <Image
                source={{ uri: mapboxUrl }}
                style={styles.mapboxWebImage}
                resizeMode="cover"
              />
              <View style={styles.mapboxWebFloatBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.mapboxWebFloatText}>Mapbox Streets API • Live Grid</Text>
              </View>

              {/* Quick entity selectors */}
              <View style={styles.mapboxWebEntitiesRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mapboxEntitiesScroll}
                >
                  {HUBS.map((hub) => (
                    <TouchableOpacity
                      key={hub.id}
                      style={[
                        styles.quickEntityChip,
                        selectedEntity?.id === hub.id && styles.quickEntityChipActive,
                      ]}
                      onPress={() => setSelectedEntity({ ...hub, entityType: 'hub' })}
                    >
                      <Ionicons
                        name="business"
                        size={12}
                        color={selectedEntity?.id === hub.id ? '#FFFFFF' : '#1E3A4B'}
                      />
                      <Text
                        style={[
                          styles.quickEntityChipText,
                          selectedEntity?.id === hub.id && styles.quickEntityChipTextActive,
                        ]}
                      >
                        {hub.name.split(' ')[0]} Hub
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {APPROVED_DONATIONS.map((don) => (
                    <TouchableOpacity
                      key={don.id}
                      style={[
                        styles.quickEntityChip,
                        selectedEntity?.id === don.id && styles.quickEntityChipActive,
                      ]}
                      onPress={() => setSelectedEntity({ ...don, entityType: 'donation' })}
                    >
                      <Ionicons
                        name="restaurant"
                        size={12}
                        color={selectedEntity?.id === don.id ? '#FFFFFF' : '#0F766E'}
                      />
                      <Text
                        style={[
                          styles.quickEntityChipText,
                          selectedEntity?.id === don.id && styles.quickEntityChipTextActive,
                        ]}
                      >
                        {don.title.split(' ')[0]} ({don.servings})
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {ACTIVE_ROUTES.map((route) => (
                    <TouchableOpacity
                      key={route.id}
                      style={[
                        styles.quickEntityChip,
                        selectedEntity?.id === route.id && styles.quickEntityChipActive,
                      ]}
                      onPress={() => setSelectedEntity({ ...route, entityType: 'route' })}
                    >
                      <Ionicons
                        name="bicycle"
                        size={12}
                        color={selectedEntity?.id === route.id ? '#FFFFFF' : colors.adminMaroon}
                      />
                      <Text
                        style={[
                          styles.quickEntityChipText,
                          selectedEntity?.id === route.id && styles.quickEntityChipTextActive,
                        ]}
                      >
                        {route.courier.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <MapView style={styles.map} initialRegion={JAFFNA_REGION}>
              {/* Hub Markers */}
              {(activeLayer === 'all' || activeLayer === 'hubs') &&
                HUBS.map((hub) => (
                  <Marker
                    key={hub.id}
                    coordinate={{ latitude: hub.latitude, longitude: hub.longitude }}
                    title={hub.name}
                    description={`${hub.address} · ${hub.activeVolunteers} Volunteers`}
                    pinColor="#2B6CB0"
                    onPress={() => setSelectedEntity({ ...hub, entityType: 'hub' })}
                  />
                ))}

              {/* Donation Markers */}
              {(activeLayer === 'all' || activeLayer === 'donations') &&
                APPROVED_DONATIONS.map((don) => (
                  <Marker
                    key={don.id}
                    coordinate={{ latitude: don.latitude, longitude: don.longitude }}
                    title={don.title}
                    description={`${don.servings} servings · ${don.freshWindow}`}
                    pinColor="#0F7B4F"
                    onPress={() => setSelectedEntity({ ...don, entityType: 'donation' })}
                  />
                ))}

              {/* Active Delivery Routes */}
              {(activeLayer === 'all' || activeLayer === 'routes') &&
                ACTIVE_ROUTES.map((route) => (
                  <Polyline
                    key={route.id}
                    coordinates={route.coords}
                    strokeColor={colors.adminMaroon}
                    strokeWidth={5}
                  />
                ))}

              {/* Demand Heat Circles */}
              {(activeLayer === 'all' || activeLayer === 'demand') &&
                (demandCells ?? []).map((cell) => (
                  <Circle
                    key={cell.district}
                    center={{ latitude: cell.latitude, longitude: cell.longitude }}
                    radius={1400}
                    fillColor="rgba(229, 62, 62, 0.25)"
                    strokeColor={colors.urgentRed}
                    strokeWidth={1.5}
                  />
                ))}
            </MapView>
          )}
        </View>

        {/* Bottom Inspector Card */}
        <View style={styles.bottomCard}>
          {selectedEntity ? (
            <View>
              <View style={styles.bottomCardHeader}>
                <View>
                  <Text style={styles.entityTitle}>{selectedEntity.name || selectedEntity.title}</Text>
                  <Text style={styles.entitySubtitle}>
                    {selectedEntity.address || selectedEntity.donor}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEntity(null)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.entityActions}>
                <TouchableOpacity
                  style={styles.entityBtn}
                  onPress={() => {
                    if (selectedEntity.entityType === 'donation') {
                      router.push('/(admin)/approvals/donation/DN-8842' as any);
                    } else {
                      Alert.alert(
                        selectedEntity.name,
                        `Managing operations for ${selectedEntity.name}. ${selectedEntity.activeVolunteers || 14} volunteers currently online.`,
                      );
                    }
                  }}
                >
                  <Text style={styles.entityBtnText}>
                    {selectedEntity.entityType === 'donation' ? 'Inspect Food Safety →' : 'View Hub Logistics →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.legendBottomRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2B6CB0' }]} />
                <Text style={styles.legendText}>Food Hubs (4)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#0F7B4F' }]} />
                <Text style={styles.legendText}>Surplus Food</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.adminMaroon }]} />
                <Text style={styles.legendText}>Active Routes</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.urgentRed }]} />
                <Text style={styles.legendText}>Demand Heat</Text>
              </View>
            </View>
          )}
        </View>
      </View>
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
    position: 'relative',
  },
  layerPills: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  layerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  layerPillActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  layerPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  layerPillTextActive: {
    color: '#FFFFFF',
  },
  mapFrame: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapboxWebFrame: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F3EFEA',
  },
  mapboxWebImage: {
    width: '100%',
    height: '100%',
  },
  mapboxWebFloatBadge: {
    position: 'absolute',
    top: 54,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F766E',
  },
  mapboxWebFloatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  mapboxWebEntitiesRow: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  mapboxEntitiesScroll: {
    gap: 8,
    paddingRight: 20,
  },
  quickEntityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  quickEntityChipActive: {
    backgroundColor: colors.adminMaroon,
    borderColor: colors.adminMaroon,
  },
  quickEntityChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  quickEntityChipTextActive: {
    color: '#FFFFFF',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  webFallbackDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  webStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  webStatItem: {
    alignItems: 'center',
  },
  webStatVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.adminMaroon,
  },
  webStatLbl: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  entitySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  entityActions: {
    marginTop: spacing.sm,
  },
  entityBtn: {
    backgroundColor: colors.adminMaroon,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  entityBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  legendBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
