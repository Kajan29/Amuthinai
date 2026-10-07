import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAPBOX_ACCESS_TOKEN } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import type { GeoPoint } from '@/types';
import { distanceKm, toGeoPoint } from '@/utils/geo';
import { MapView, Marker } from '@/utils/maps';

export interface HubItem {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  openHours: string;
  status: 'Open Today' | 'Closing Soon' | 'Upcoming';
  availableMeals: number;
  mealType: string;
  phone: string;
  coordinator: string;
  tags: string[];
}

export const JAFFNA_HUBS: HubItem[] = [
  {
    id: 'hub-1',
    name: 'Nallur Community Relief Hub',
    category: 'Community Center',
    address: 'Point Pedro Road, Nallur',
    city: 'Nallur',
    lat: 9.6738,
    lng: 80.0336,
    openHours: '09:00 AM - 06:00 PM',
    status: 'Open Today',
    availableMeals: 65,
    mealType: 'Fresh Rice & Curry Packs',
    phone: '+94212224589',
    coordinator: 'Ramesh Kumar (Volunteer Lead)',
    tags: ['🍱 Hot Cooked Meals', '♿ Accessible', '📦 Fast Pickup'],
  },
  {
    id: 'hub-2',
    name: 'Jaffna Central Distribution Center',
    category: 'Regional Relief Base',
    address: 'Hospital Road, Jaffna Town',
    city: 'Jaffna',
    lat: 9.6645,
    lng: 80.0195,
    openHours: '10:00 AM - 05:00 PM',
    status: 'Open Today',
    availableMeals: 40,
    mealType: 'Family Grocery Kits & Bakery Packs',
    phone: '+94212217890',
    coordinator: 'Sivapalan (Field Officer)',
    tags: ['🍞 Bakery Packs', '🍚 Raw Groceries', '👶 Child Nutrition'],
  },
  {
    id: 'hub-3',
    name: 'Chunnakam Market Relief Station',
    category: 'Farmers Welfare Hub',
    address: 'KKS Road, Chunnakam Junction',
    city: 'Chunnakam',
    lat: 9.7464,
    lng: 80.0245,
    openHours: '08:30 AM - 04:30 PM',
    status: 'Open Today',
    availableMeals: 52,
    mealType: 'Hot Veg Meals & Fresh Veg Parcels',
    phone: '+94212241234',
    coordinator: 'T. Krishnan (Operations)',
    tags: ['🥗 Vegetarian Only', '🥦 Farm Fresh', '🚲 Bicycle Friendly'],
  },
  {
    id: 'hub-4',
    name: 'Kopay Welfare & Community Kitchen',
    category: 'Charity Kitchen',
    address: 'Main Street, Kopay South',
    city: 'Kopay',
    lat: 9.6892,
    lng: 80.0574,
    openHours: '11:00 AM - 04:00 PM',
    status: 'Open Today',
    availableMeals: 28,
    mealType: 'Lunch Packets (Dhal, Rice, Curry)',
    phone: '+94212235678',
    coordinator: 'Selvi Anandan (Kitchen Lead)',
    tags: ['🍲 Hot Meals', '👵 Senior Priority', '🥤 Clean Water'],
  },
  {
    id: 'hub-5',
    name: 'Chavakachcheri Relief & Supply Hub',
    category: 'Community Kitchen',
    address: 'Kandy Road, Chavakachcheri',
    city: 'Chavakachcheri',
    lat: 9.6558,
    lng: 80.1558,
    openHours: '09:00 AM - 03:00 PM',
    status: 'Open Today',
    availableMeals: 35,
    mealType: 'Dry Rations & Fresh Buns',
    phone: '+94212278901',
    coordinator: 'M. Sathananthan (Supervisor)',
    tags: ['📦 Family Packs', '🍞 Fresh Bread', '🅿️ Ample Parking'],
  },
  {
    id: 'hub-6',
    name: 'Point Pedro Coastal Relief Point',
    category: 'Coastal Outreach',
    address: 'Beach Road, Point Pedro Harbor',
    city: 'Point Pedro',
    lat: 9.8247,
    lng: 80.2333,
    openHours: '10:30 AM - 03:30 PM',
    status: 'Upcoming',
    availableMeals: 20,
    mealType: 'Cooked Lunch Packs & Milk Powder',
    phone: '+94212263456',
    coordinator: 'A. Ravindran (Coast Coordinator)',
    tags: ['🌊 Coastal Support', '🥛 Milk & Dry Food', '📦 Takeaway Only'],
  },
];

export default function HubMapScreen() {
  const { user } = useAuth();
  const mapRef = useRef<any>(null);
  const carouselRef = useRef<FlatList>(null);

  // User location defaults to Nallur Jaffna coordinates
  const userLat = user?.address?.location?.coordinates?.[1] || 9.6615;
  const userLng = user?.address?.location?.coordinates?.[0] || 80.0167;
  const userGeoPoint: GeoPoint = useMemo(() => toGeoPoint(userLat, userLng), [userLat, userLng]);

  // Selected Hub & View State
  const [selectedHubId, setSelectedHubId] = useState<string>(JAFFNA_HUBS[0]!.id);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'meals' | 'nearby'>('all');

  // Compute live distances for each hub
  const hubsWithDistance = useMemo(() => {
    return JAFFNA_HUBS.map((hub) => {
      const hubGeo: GeoPoint = toGeoPoint(hub.lat, hub.lng);
      const distKm = distanceKm(userGeoPoint, hubGeo);
      const distanceText =
        distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)} km away`;
      return {
        ...hub,
        distanceKm: distKm,
        distanceText,
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [userGeoPoint]);

  // Filtered Hubs
  const filteredHubs = useMemo(() => {
    return hubsWithDistance.filter((hub) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.city.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'open') return hub.status === 'Open Today';
      if (activeFilter === 'meals') return hub.availableMeals >= 30;
      if (activeFilter === 'nearby') return hub.distanceKm <= 3.0;
      return true;
    });
  }, [hubsWithDistance, searchQuery, activeFilter]);

  const selectedHub = useMemo(() => {
    return (
      filteredHubs.find((h) => h.id === selectedHubId) ||
      hubsWithDistance.find((h) => h.id === selectedHubId) ||
      filteredHubs[0] ||
      hubsWithDistance[0]!
    );
  }, [filteredHubs, hubsWithDistance, selectedHubId]);

  // Handle selecting a hub on map or list
  const handleSelectHub = (hub: (typeof hubsWithDistance)[0], scrollCarousel = true) => {
    setSelectedHubId(hub.id);
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: hub.lat,
        longitude: hub.lng,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      });
    }

    if (scrollCarousel && carouselRef.current) {
      const index = filteredHubs.findIndex((h) => h.id === hub.id);
      if (index >= 0) {
        carouselRef.current.scrollToIndex({ index, animated: true });
      }
    }
  };

  // Center on user's home location
  const handleCenterOnUser = () => {
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    }
  };

  // Center on Jaffna overall district
  const handleCenterDistrict = () => {
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: 9.685,
        longitude: 80.03,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
    }
  };

  // Open directions in native map app
  const handleOpenDirections = (hub: HubItem) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${hub.name}@${hub.lat},${hub.lng}`,
      android: `geo:0,0?q=${hub.lat},${hub.lng}(${encodeURIComponent(hub.name)})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${hub.lat},${hub.lng}`,
    });
    Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${hub.lat},${hub.lng}`);
  };

  // Call hub coordinator
  const handleCallHub = (hub: HubItem) => {
    Linking.openURL(`tel:${hub.phone}`);
  };

  // Navigate to food request with hub pre-selected
  const handleRequestFromHub = (hub: HubItem) => {
    router.push({
      pathname: '/(recipient)/request/step1-location',
      params: { hubId: hub.id, hubName: hub.name },
    });
  };

  // Construct fallback Mapbox static URL with all pins
  const mapboxStaticUrl = useMemo(() => {
    const hubPins = filteredHubs
      .slice(0, 6)
      .map(
        (h) =>
          `pin-s-${h.id === selectedHubId ? 'star+5A1626' : 'restaurant+0F7B4F'}(${h.lng},${h.lat})`,
      )
      .join(',');
    const userPin = `pin-s-home+F59E0B(${userLng},${userLat})`;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${userPin},${hubPins}/${selectedHub.lng},${selectedHub.lat},12.5,0/650x450@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }, [filteredHubs, selectedHubId, selectedHub, userLng, userLat]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Premium Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle}>Distribution Hubs</Text>
          <Text style={styles.topBarSubtitle}>
            Jaffna District Relief Network ({filteredHubs.length} Active Hubs)
          </Text>
        </View>

        {/* View Mode Switcher: Map vs List */}
        <View style={styles.modeSwitchContainer}>
          <TouchableOpacity
            style={[styles.modeSwitchBtn, viewMode === 'map' && styles.modeSwitchBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map"
              size={16}
              color={viewMode === 'map' ? '#0F7B4F' : '#6B7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeSwitchBtn, viewMode === 'list' && styles.modeSwitchBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? '#0F7B4F' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Fast Filter Chips Row */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={17} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hub by town, name or road..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}
            >
              All Hubs ({hubsWithDistance.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'nearby' && styles.filterChipActive]}
            onPress={() => setActiveFilter('nearby')}
          >
            <Ionicons
              name="navigate"
              size={12}
              color={activeFilter === 'nearby' ? '#FFFFFF' : '#0F7B4F'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'nearby' && styles.filterChipTextActive,
              ]}
            >
              Nearby (&lt; 3 km)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'meals' && styles.filterChipActive]}
            onPress={() => setActiveFilter('meals')}
          >
            <Ionicons
              name="restaurant"
              size={12}
              color={activeFilter === 'meals' ? '#FFFFFF' : '#D97706'}
            />
            <Text
              style={[styles.filterChipText, activeFilter === 'meals' && styles.filterChipTextActive]}
            >
              High Stock (30+ Packs)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'open' && styles.filterChipActive]}
            onPress={() => setActiveFilter('open')}
          >
            <Ionicons
              name="time"
              size={12}
              color={activeFilter === 'open' ? '#FFFFFF' : '#2563EB'}
            />
            <Text
              style={[styles.filterChipText, activeFilter === 'open' && styles.filterChipTextActive]}
            >
              Open Today
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* MAIN VIEW: Map-Based View with Floating Bottom Carousel */}
      {viewMode === 'map' ? (
        <View style={styles.mapScreenContainer}>
          {/* Interactive Map Canvas */}
          <View style={styles.mapCanvasWrapper}>
            {Platform.OS !== 'web' && MapView ? (
              <MapView
                ref={mapRef}
                style={styles.mapComponent}
                initialRegion={{
                  latitude: selectedHub.lat,
                  longitude: selectedHub.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {/* 1. User Location Pin */}
                <Marker
                  coordinate={{ latitude: userLat, longitude: userLng }}
                  title="Your Registered Location"
                  description="Delivery Drop Point"
                >
                  <View style={styles.userMarkerWrapper}>
                    <View style={styles.userMarkerBadge}>
                      <Text style={styles.userMarkerText}>You</Text>
                    </View>
                    <View style={styles.userMarkerDot} />
                  </View>
                </Marker>

                {/* 2. All Distribution Hub Markers */}
                {filteredHubs.map((hub) => {
                  const isSelected = hub.id === selectedHubId;
                  return (
                    <Marker
                      key={hub.id}
                      coordinate={{ latitude: hub.lat, longitude: hub.lng }}
                      title={hub.name}
                      description={`${hub.address} • ${hub.availableMeals} packs ready`}
                      onPress={() => handleSelectHub(hub, true)}
                    >
                      <View style={[styles.hubMarkerPinWrap, isSelected && styles.hubMarkerSelectedWrap]}>
                        {/* Food Inventory Pill */}
                        <View
                          style={[
                            styles.hubInventoryPill,
                            isSelected && styles.hubInventoryPillSelected,
                          ]}
                        >
                          <Ionicons
                            name="restaurant"
                            size={10}
                            color={isSelected ? '#FFFFFF' : '#0F7B4F'}
                          />
                          <Text
                            style={[
                              styles.hubInventoryText,
                              isSelected && styles.hubInventoryTextSelected,
                            ]}
                          >
                            {hub.availableMeals} packs
                          </Text>
                        </View>

                        {/* Pin Center Circle */}
                        <View
                          style={[
                            styles.hubMarkerCircle,
                            isSelected && styles.hubMarkerCircleSelected,
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'star' : 'business'}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <View
                          style={[
                            styles.hubMarkerTriangle,
                            isSelected && styles.hubMarkerTriangleSelected,
                          ]}
                        />
                      </View>
                    </Marker>
                  );
                })}
              </MapView>
            ) : (
              /* Fallback for Web: Mapbox Static Map with clickable hub overlays */
              <View style={styles.fallbackMapWrapper}>
                <Image
                  source={{ uri: mapboxStaticUrl }}
                  style={styles.fallbackMapImage}
                  resizeMode="cover"
                />
                <View style={styles.fallbackOverlayNotice}>
                  <Ionicons name="information-circle" size={16} color="#0F7B4F" />
                  <Text style={styles.fallbackOverlayText}>
                    Showing {filteredHubs.length} Pinned Hubs in Jaffna District
                  </Text>
                </View>
              </View>
            )}

            {/* Floating Quick Action Map Controls */}
            <View style={styles.floatingControlsWrap}>
              <TouchableOpacity
                style={styles.mapControlBtn}
                onPress={handleCenterOnUser}
                activeOpacity={0.8}
              >
                <Ionicons name="locate" size={20} color="#0F7B4F" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapControlBtn}
                onPress={handleCenterDistrict}
                activeOpacity={0.8}
              >
                <Ionicons name="compass-outline" size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Floating Indicator of Current Hub */}
            <View style={styles.floatingHubIndicator}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.floatingIndicatorText}>
                Selected: <Text style={{ fontWeight: '800' }}>{selectedHub.name}</Text>
              </Text>
            </View>
          </View>

          {/* Bottom Swipeable Hubs Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              data={filteredHubs}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToAlignment="center"
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / 310);
                if (filteredHubs[index]) {
                  handleSelectHub(filteredHubs[index]!, false);
                }
              }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedHubId;
                return (
                  <TouchableOpacity
                    style={[styles.carouselCard, isSelected && styles.carouselCardSelected]}
                    activeOpacity={0.9}
                    onPress={() => handleSelectHub(item, false)}
                  >
                    {/* Card Top: Badges & Distance */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.categoryPill}>
                        <Ionicons name="business" size={12} color="#0F7B4F" />
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                      <View style={styles.distPill}>
                        <Ionicons name="navigate" size={11} color="#5A1626" />
                        <Text style={styles.distText}>{item.distanceText}</Text>
                      </View>
                    </View>

                    {/* Hub Title & Location */}
                    <Text style={styles.cardHubName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.cardAddressRow}>
                      <Ionicons name="location" size={13} color="#9CA3AF" />
                      <Text style={styles.cardAddressText} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>

                    {/* Stock & Timing Bar */}
                    <View style={styles.inventoryHighlightBox}>
                      <View style={styles.inventoryLeft}>
                        <View style={styles.stockCircle}>
                          <Ionicons name="restaurant" size={14} color="#0F7B4F" />
                        </View>
                        <View>
                          <Text style={styles.stockCountText}>
                            {item.availableMeals} Portions Ready
                          </Text>
                          <Text style={styles.mealTypeText} numberOfLines={1}>
                            {item.mealType}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.hoursBadge}>
                        <Ionicons name="time-outline" size={12} color="#4B5563" />
                        <Text style={styles.hoursText}>{item.openHours.split(' - ')[0]}</Text>
                      </View>
                    </View>

                    {/* Tags row */}
                    <View style={styles.tagsRow}>
                      {item.tags.map((tag: string, idx: number) => (
                        <View key={idx} style={styles.facilityTag}>
                          <Text style={styles.facilityTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={styles.requestFromHubBtn}
                        onPress={() => handleRequestFromHub(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.requestFromHubBtnText}>Request Meals</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconCircleActionBtn}
                        onPress={() => handleOpenDirections(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate" size={16} color="#0F7B4F" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconCircleActionBtn}
                        onPress={() => handleCallHub(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={16} color="#0F7B4F" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      ) : (
        /* LIST VIEW MODE */
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.listSectionTitle}>
            All Jaffna Distribution Centers ({filteredHubs.length})
          </Text>

          {filteredHubs.map((hub) => (
            <View key={hub.id} style={styles.listCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.categoryPill}>
                  <Ionicons name="business" size={12} color="#0F7B4F" />
                  <Text style={styles.categoryText}>{hub.category}</Text>
                </View>
                <View style={styles.distPill}>
                  <Ionicons name="navigate" size={11} color="#5A1626" />
                  <Text style={styles.distText}>{hub.distanceText}</Text>
                </View>
              </View>

              <Text style={styles.cardHubName}>{hub.name}</Text>
              <Text style={styles.cardAddressText}>{hub.address}</Text>

              <View style={styles.inventoryHighlightBox}>
                <View style={styles.inventoryLeft}>
                  <View style={styles.stockCircle}>
                    <Ionicons name="restaurant" size={14} color="#0F7B4F" />
                  </View>
                  <View>
                    <Text style={styles.stockCountText}>
                      {hub.availableMeals} Available Meals Today
                    </Text>
                    <Text style={styles.mealTypeText}>{hub.mealType}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.listCoordinatorRow}>
                <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.listCoordinatorText}>{hub.coordinator}</Text>
                <Text style={styles.listTimingText}>• {hub.openHours}</Text>
              </View>

              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.requestFromHubBtn}
                  onPress={() => handleRequestFromHub(hub)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestFromHubBtnText}>Request Food Delivery</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconCircleActionBtn, { width: 44, height: 44 }]}
                  onPress={() => handleOpenDirections(hub)}
                >
                  <Ionicons name="navigate" size={18} color="#0F7B4F" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconCircleActionBtn, { width: 44, height: 44 }]}
                  onPress={() => handleCallHub(hub)}
                >
                  <Ionicons name="call" size={18} color="#0F7B4F" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },

  /* Top Navigation Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7E1',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3EFEA',
    borderRadius: 12,
    padding: 3,
  },
  modeSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  /* Search & Filter Section */
  searchFilterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7E1',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4EF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#0F7B4F',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* Map Canvas Container */
  mapScreenContainer: {
    flex: 1,
    position: 'relative',
  },
  mapCanvasWrapper: {
    flex: 1,
    position: 'relative',
  },
  mapComponent: {
    width: '100%',
    height: '100%',
  },

  /* Fallback Image Map for Web */
  fallbackMapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fallbackMapImage: {
    width: '100%',
    height: '100%',
  },
  fallbackOverlayNotice: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fallbackOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F7B4F',
  },

  /* Custom Map Markers */
  userMarkerWrapper: {
    alignItems: 'center',
  },
  userMarkerBadge: {
    backgroundColor: '#5A1626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  userMarkerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },

  /* Hub Marker Styling */
  hubMarkerPinWrap: {
    alignItems: 'center',
  },
  hubMarkerSelectedWrap: {
    transform: [{ scale: 1.15 }],
  },
  hubInventoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0F7B4F',
    marginBottom: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  hubInventoryPillSelected: {
    backgroundColor: '#5A1626',
    borderColor: '#5A1626',
  },
  hubInventoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F7B4F',
  },
  hubInventoryTextSelected: {
    color: '#FFFFFF',
  },
  hubMarkerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  hubMarkerCircleSelected: {
    backgroundColor: '#5A1626',
    borderColor: '#F59E0B',
  },
  hubMarkerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0F7B4F',
    marginTop: -1,
  },
  hubMarkerTriangleSelected: {
    borderTopColor: '#5A1626',
  },

  /* Floating Map Controls */
  floatingControlsWrap: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  mapControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECE7E1',
  },
  floatingHubIndicator: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: 'rgba(26, 20, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '65%',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingIndicatorText: {
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* Bottom Carousel */
  carouselContainer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselCard: {
    width: 300,
    maxWidth: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ECE7E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  carouselCardSelected: {
    borderColor: '#0F7B4F',
    backgroundColor: '#FCFDFD',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F7B4F',
  },
  distPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5A1626',
  },
  cardHubName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  cardAddressText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },

  /* Inventory Box */
  inventoryHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F4EF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  inventoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  mealTypeText: {
    fontSize: 10,
    color: '#6B7280',
    maxWidth: 160,
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hoursText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },

  /* Tags */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  facilityTag: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  facilityTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4B5563',
  },

  /* Card Action Row */
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestFromHubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F7B4F',
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: '#0F7B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  requestFromHubBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  iconCircleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C3ECD6',
  },

  /* List View Mode Styles */
  listContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listCoordinatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  listCoordinatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  listTimingText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
