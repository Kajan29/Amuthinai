import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ngosApi } from '@/api/ngos.api';
import { requestsApi } from '@/api/requests.api';
import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { useRequestDraft } from '@/store/requestDraft.store';
import type { GeoPoint } from '@/types';
import { distanceKm, toGeoPoint } from '@/utils/geo';
import { MapView, Marker } from '@/utils/maps';
import { ngoToHub, type HubItem } from '../hub-map';

const logoImage = require('../../../assets/images/logo.png');

// Pre-defined Jaffna District Locations for Search & Autocomplete
const JAFFNA_LOCATIONS = [
  { name: 'Chunnakam', label: 'Chunnakam, Valikamam South, Jaffna', lat: 9.7464, lng: 80.0245 },
  { name: 'Nallur', label: 'Nallur Kandaswamy Kovil, Point Pedro Rd, Jaffna', lat: 9.6738, lng: 80.0336 },
  { name: 'Jaffna Town', label: 'Jaffna Town Center, Main Street, Jaffna', lat: 9.6615, lng: 80.0167 },
  { name: 'Jaffna Teaching Hospital', label: 'Hospital Road, Jaffna Town', lat: 9.6645, lng: 80.0195 },
  { name: 'Thirunelveli', label: 'Thirunelveli, University of Jaffna', lat: 9.6881, lng: 80.0275 },
  { name: 'Kokuvil', label: 'Kokuvil, KKS Road, Jaffna', lat: 9.6961, lng: 80.0195 },
  { name: 'Kopay', label: 'Kopay Welfare Hub, Main Street, Kopay', lat: 9.6892, lng: 80.0574 },
  { name: 'Manipay', label: 'Manipay Green Memorial Hospital area, Jaffna', lat: 9.7118, lng: 79.9982 },
  { name: 'Chavakachcheri', label: 'Chavakachcheri, Thenmarachchi, Jaffna', lat: 9.6558, lng: 80.1558 },
  { name: 'Point Pedro', label: 'Point Pedro Harbor / Town, Vadamarachchi, Jaffna', lat: 9.8247, lng: 80.2333 },
  { name: 'Tellippalai', label: 'Tellippalai Trail Hospital / Durga Devi Kovil, Jaffna', lat: 9.7786, lng: 80.0347 },
  { name: 'Kankesanthurai (KKS)', label: 'KKS Harbor & Station, Northern Coast, Jaffna', lat: 9.8142, lng: 80.0461 },
  { name: 'Vaddukoddai', label: 'Vaddukoddai, Jaffna College Junction, Jaffna', lat: 9.7197, lng: 79.9482 },
  { name: 'Velanai', label: 'Velanai, Kayts / Islands, Jaffna', lat: 9.6433, lng: 79.9142 },
  { name: 'Karainagar', label: 'Karainagar, Casuarina Beach Road, Jaffna', lat: 9.7389, lng: 79.8694 },
  { name: 'Atchuvely', label: 'Atchuvely Market Junction, Jaffna', lat: 9.7431, lng: 80.0986 },
  { name: 'Kaithady', label: 'Kaithady Bridge / Ayurvedic Hospital, Jaffna', lat: 9.6644, lng: 80.0889 },
  { name: 'Urumpirai', label: 'Urumpirai Junction, Palaly Road, Jaffna', lat: 9.7153, lng: 80.0392 },
  { name: 'Kalviyankadu', label: 'Kalviyankadu, Point Pedro Road, Jaffna', lat: 9.6782, lng: 80.0412 },
  { name: 'Kondavil', label: 'Kondavil Railway Station / Bus Depot, Jaffna', lat: 9.7022, lng: 80.0267 },
  { name: 'Inuvil', label: 'Inuvil, McLeod Hospital area, Jaffna', lat: 9.7289, lng: 80.0152 },
  { name: 'Uduvil', label: 'Uduvil Girls College Junction, Chunnakam, Jaffna', lat: 9.7345, lng: 80.0098 },
  { name: 'Mallakam', label: 'Mallakam Court & Station Junction, Jaffna', lat: 9.7612, lng: 80.0278 },
  { name: 'Maruthanarmadam', label: 'Maruthanarmadam Anjaneyar Kovil, Jaffna', lat: 9.7388, lng: 80.0255 },
  { name: 'Sandilipay', label: 'Sandilipay Junction, Manipay Road, Jaffna', lat: 9.7265, lng: 79.9834 },
  { name: 'Navanthurai', label: 'Navanthurai Coastal Road, Jaffna', lat: 9.6734, lng: 80.0034 },
  { name: 'Ariyalai', label: 'Ariyalai, Old Kandy Road, Jaffna', lat: 9.6587, lng: 80.0389 },
  { name: 'Gurunagar', label: 'Gurunagar Fishery Harbor & Coastal Road, Jaffna', lat: 9.6521, lng: 80.0198 },
  { name: 'Columbuthurai', label: 'Columbuthurai, Kandy Road, Jaffna', lat: 9.6454, lng: 80.0321 },
  { name: 'Kodikamam', label: 'Kodikamam Market, A9 Highway, Jaffna', lat: 9.6845, lng: 80.2089 },
  { name: 'Valvettithurai (VVT)', label: 'Valvettithurai Coastal Town, Vadamarachchi, Jaffna', lat: 9.8189, lng: 80.1712 },
  { name: 'Karaveddy', label: 'Karaveddy Central, Vadamarachchi, Jaffna', lat: 9.7954, lng: 80.1989 },
  { name: 'Pandateruppu', label: 'Pandateruppu Junction, Jaffna', lat: 9.7689, lng: 79.9745 },
  { name: 'Alaveddy', label: 'Alaveddy Center, Valikamam North, Jaffna', lat: 9.7621, lng: 80.0521 },
  { name: 'Kantharmadam', label: 'Kantharmadam, Palaly Road, Jaffna', lat: 9.6789, lng: 80.0212 },
  { name: 'Chundikuli', label: 'Chundikuli Girls College area, Jaffna', lat: 9.6645, lng: 80.0289 },
];

/** Jaffna District Geographic Boundary Check */
function checkIsWithinJaffnaDistrict(lat: number, lng: number): boolean {
  return lat >= 9.48 && lat <= 9.88 && lng >= 79.75 && lng <= 80.48;
}

export default function Step1LocationScreen() {
  const insets = useSafeAreaInsets();
  const { draft, update } = useRequestDraft();
  const mapRef = useRef<any>(null);

  // User's verified GPS location
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Search query & suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Current draggable / selected location pin (default: Nallur or Chunnakam or draft)
  const [pinLocation, setPinLocation] = useState<{
    latitude: number;
    longitude: number;
    addressName: string;
  }>({
    latitude: draft.dropAddress?.location?.coordinates[1] ?? 9.6738,
    longitude: draft.dropAddress?.location?.coordinates[0] ?? 80.0336,
    addressName: draft.dropAddress?.line1 || 'Point Pedro Road, Nallur',
  });

  // Manually chosen or nearest relief hub
  const [selectedHubOverride, setSelectedHubOverride] = useState<HubItem | null>(null);

  // Check if currently selected location is inside Jaffna District
  const isWithinJaffna = checkIsWithinJaffnaDistrict(
    pinLocation.latitude,
    pinLocation.longitude,
  );

  // Fetch past requests to show previously requested place on map
  const { data: pastRequestsData } = useQuery({
    queryKey: ['recipient', 'requests', 'mine'],
    queryFn: () => requestsApi.mine(),
  });

  // Fetch nearby active requests from backend for collision detection
  const { data: backendNearbyRequests } = useQuery({
    queryKey: ['recipient', 'nearby-active', pinLocation.latitude, pinLocation.longitude],
    queryFn: () =>
      requestsApi.nearbyActive(pinLocation.latitude, pinLocation.longitude, 1),
    enabled: Boolean(pinLocation.latitude && pinLocation.longitude),
  });

  // 1. Initial Load: Request Current Location and move map to recipient's live coordinates
  useEffect(() => {
    async function initUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setGpsLocation({ latitude: lat, longitude: lng });

          // If current location is in Jaffna and user hasn't explicitly set a draft dropAddress
          if (checkIsWithinJaffnaDistrict(lat, lng)) {
            setPinLocation({
              latitude: lat,
              longitude: lng,
              addressName: 'Current Location (Jaffna)',
            });

            if (mapRef.current?.animateToRegion) {
              mapRef.current.animateToRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Location detection failed:', err);
      }
    }

    initUserLocation();
  }, []);

  const previousRequest = pastRequestsData?.items?.find(
    (req) => req.dropAddress?.location?.coordinates?.length === 2,
  );

  const previousReqCoords = previousRequest?.dropAddress?.location
    ? {
        latitude: previousRequest.dropAddress.location.coordinates[1],
        longitude: previousRequest.dropAddress.location.coordinates[0],
        address: `${previousRequest.dropAddress.line1}, ${previousRequest.dropAddress.city}`,
      }
    : null;

  // 1 KM PROXIMITY CHECK: check if an active request zone exists
  // PRIVACY: We do NOT expose other recipients' names, home addresses, or personal phone numbers publicly!
  const currentPinGeoPoint: GeoPoint = toGeoPoint(
    pinLocation.latitude,
    pinLocation.longitude,
  );

  // The backend already limits results to the 1 km radius and omits exact coordinates.
  const firstNearby = backendNearbyRequests?.[0];
  const nearbyActiveDistributionZone = firstNearby
    ? {
        authorizedHelpline: '+94 21 222 4589',
        sectorLabel: `${firstNearby.dropAddress?.city || 'Jaffna'} Relief Sector`,
      }
    : null;

  const { data: ngoPage } = useQuery({
    queryKey: ['ngos'],
    queryFn: () => ngosApi.list(),
  });
  const liveHubs = useMemo(
    () => (ngoPage?.items ?? []).map(ngoToHub).filter((hub): hub is HubItem => Boolean(hub)),
    [ngoPage?.items],
  );

  // Calculate distances for all relief hubs
  const hubsWithDistance = liveHubs
    .map((hub) => {
      const d = distanceKm(currentPinGeoPoint, toGeoPoint(hub.lat, hub.lng));
      return { ...hub, distanceKm: d };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // Hub selection is optional — only set when the recipient explicitly picks one.
  const selectedHub = selectedHubOverride;
  const selectedHubDistance = selectedHub
    ? distanceKm(currentPinGeoPoint, toGeoPoint(selectedHub.lat, selectedHub.lng))
    : 0;

  const toggleHub = (hub: HubItem) => {
    setSelectedHubOverride((current) => (current?.id === hub.id ? null : hub));
  };

  // When map is dragged or location is picked
  const handleMapCoordChange = (lat: number, lng: number, placeName?: string) => {
    const inside = checkIsWithinJaffnaDistrict(lat, lng);

    let computedAddress = placeName;
    if (!computedAddress) {
      let closestLoc = JAFFNA_LOCATIONS[0]!;
      let minLocDist = 9999;
      for (const loc of JAFFNA_LOCATIONS) {
        const d = distanceKm(toGeoPoint(lat, lng), toGeoPoint(loc.lat, loc.lng));
        if (d < minLocDist) {
          minLocDist = d;
          closestLoc = loc;
        }
      }
      if (minLocDist <= 1.2) {
        computedAddress = `Near ${closestLoc.name}, Jaffna`;
      } else {
        computedAddress = `Pointed Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    }

    setPinLocation({
      latitude: lat,
      longitude: lng,
      addressName: computedAddress,
    });

    if (!inside) {
      Alert.alert(
        'Outside Jaffna District',
        'Amuthinai food distribution service is currently active only within Jaffna District. Please point inside Jaffna District.',
      );
    }
  };

  // When searching a location (e.g. Chunnakam, Nallur)
  const handleSelectSearchLocation = (item: (typeof JAFFNA_LOCATIONS)[0]) => {
    setSearchQuery(item.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    handleMapCoordChange(item.lat, item.lng, item.label);

    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: item.lat,
        longitude: item.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    }
  };

  // Re-center on user's current GPS location
  const handleRecenterCurrentLocation = async () => {
    if (gpsLocation) {
      handleMapCoordChange(gpsLocation.latitude, gpsLocation.longitude, 'Current Location (Jaffna)');
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion({
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        });
      }
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGpsLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        handleMapCoordChange(loc.coords.latitude, loc.coords.longitude, 'Current Location (Jaffna)');
        if (mapRef.current?.animateToRegion) {
          mapRef.current.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          });
        }
      } else {
        Alert.alert('Permission Denied', 'Please enable GPS location permission to detect your current position.');
      }
    } catch {
      Alert.alert('Location Error', 'Unable to retrieve GPS location at this moment.');
    }
  };

  // Select a Hub from Map Marker or Nearby List
  const handleSelectHub = (hub: HubItem) => {
    if (selectedHub?.id === hub.id) {
      setSelectedHubOverride(null);
      return;
    }
    setSelectedHubOverride(hub);
    Alert.alert(
      'Relief Hub Selected',
      `${hub.name} has been selected as your distribution source (${hub.availableMeals} meals available).`,
      [{ text: 'OK' }],
    );
  };

  // Re-use previous request location
  const handleUsePreviousRequest = () => {
    if (previousReqCoords) {
      setSearchQuery(previousReqCoords.address);
      handleMapCoordChange(
        previousReqCoords.latitude,
        previousReqCoords.longitude,
        previousReqCoords.address,
      );

      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion({
          latitude: previousReqCoords.latitude,
          longitude: previousReqCoords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
      }
    }
  };

  const handleProceed = () => {
    if (!isWithinJaffna) {
      Alert.alert(
        'Location Outside Jaffna District',
        'Please select a location within Jaffna District. Food requests cannot be accepted outside this boundary.',
      );
      return;
    }

    // Save draft state
    update({
      hubId: selectedHub?.id,
      hubName: selectedHub?.name,
      hubAddress: selectedHub?.address,
      hubDistance: selectedHub ? `${selectedHubDistance.toFixed(1)} km away` : undefined,
      dropAddress: {
        line1: pinLocation.addressName || 'Pinned location',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [pinLocation.longitude, pinLocation.latitude],
        },
      },
    });

    router.push('/(recipient)/request/step2-details');
  };

  // Filter search suggestions
  const filteredSuggestions = searchQuery.trim()
    ? JAFFNA_LOCATIONS.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const mapboxStaticUrl = getMapboxStaticMapUrl({
    center: { latitude: pinLocation.latitude, longitude: pinLocation.longitude },
    zoom: 13.2,
    width: 600,
    height: 420,
    markers: [
      ...(selectedHub
        ? [{ latitude: selectedHub.lat, longitude: selectedHub.lng, label: 'restaurant', color: '5A1626' }]
        : []),
      { latitude: pinLocation.latitude, longitude: pinLocation.longitude, label: 'home', color: 'F59E0B' },
      ...(previousReqCoords
        ? [
            {
              latitude: previousReqCoords.latitude,
              longitude: previousReqCoords.longitude,
              label: 'star',
              color: '3B82F6',
            },
          ]
        : []),
    ],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>

        <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />

        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area (e.g. Chunnakam, Nallur, Kopay)..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (filteredSuggestions.length > 0) {
                  handleSelectSearchLocation(filteredSuggestions[0]!);
                }
              }}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(text.trim().length > 0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
              >
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick GPS locate button */}
          <TouchableOpacity
            style={styles.gpsLocateBtn}
            onPress={handleRecenterCurrentLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={18} color="#5A1626" />
          </TouchableOpacity>
        </View>

        {/* Real-time Autocomplete Dropdown for Jaffna Locations */}
        {showSuggestions && searchQuery.trim().length > 0 && (
          <View style={styles.suggestionsBox}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsHeaderText}>
                {filteredSuggestions.length > 0
                  ? `Found ${filteredSuggestions.length} matching areas:`
                  : `No exact area matching "${searchQuery}"`}
              </Text>
              <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.slice(0, 6).map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSearchLocation(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIconWrap}>
                    <Ionicons name="location" size={16} color="#5A1626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionLabel} numberOfLines={1}>{item.label}</Text>
                  </View>
                  <View style={styles.pointMapBtnPill}>
                    <Text style={styles.pointMapBtnText}>Move Map</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noMatchBox}>
                <Text style={styles.noMatchText}>
                  Drag the map directly to pinpoint your exact street or residence.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Popular Jaffna Location Chips */}
        {!searchQuery && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickChipsScroll}
            contentContainerStyle={styles.quickChipsContainer}
          >
            {[
              { name: 'Nallur', label: 'Nallur Kandaswamy Kovil, Jaffna', lat: 9.6738, lng: 80.0336 },
              { name: 'Chunnakam', label: 'Chunnakam Market, Jaffna', lat: 9.7464, lng: 80.0245 },
              { name: 'Jaffna Town', label: 'Jaffna Town Center, Main St', lat: 9.6615, lng: 80.0167 },
              { name: 'Kopay', label: 'Kopay Welfare Hub, Jaffna', lat: 9.6892, lng: 80.0574 },
              { name: 'Manipay', label: 'Manipay Hospital Area, Jaffna', lat: 9.7118, lng: 79.9982 },
              { name: 'Thirunelveli', label: 'University of Jaffna, Thirunelveli', lat: 9.6881, lng: 80.0275 },
              { name: 'Chavakachcheri', label: 'Chavakachcheri, Jaffna', lat: 9.6558, lng: 80.1558 },
              { name: 'Point Pedro', label: 'Point Pedro Harbor, Jaffna', lat: 9.8247, lng: 80.2333 },
            ].map((chip) => (
              <TouchableOpacity
                key={chip.name}
                style={styles.quickPlaceChip}
                onPress={() => handleSelectSearchLocation(chip)}
                activeOpacity={0.7}
              >
                <Ionicons name="location" size={13} color="#5A1626" />
                <Text style={styles.quickPlaceChipText}>{chip.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Privacy Notice & Active Distribution Coordination (if within 1km) */}
        {nearbyActiveDistributionZone && (
          <View style={styles.privacyCoordinationCard}>
            <View style={styles.privacyCoordHeader}>
              <View style={styles.privacyShieldIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#0F7B4F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyCoordTitle}>
                  Active Relief Distribution in this Sector
                </Text>
                <Text style={styles.privacyCoordSub}>
                  Recipients’ exact personal home addresses are kept strictly private & confidential.
                </Text>
              </View>
            </View>

            <View style={styles.privacyCoordActionRow}>
              <Text style={styles.privacyCoordHint}>
                Need assistance coordinating collection or delivery?
              </Text>
              <TouchableOpacity
                style={styles.coordinatorCallBtn}
                onPress={() => Linking.openURL(`tel:${nearbyActiveDistributionZone?.authorizedHelpline}`)}
              >
                <Ionicons name="call" size={13} color="#FFFFFF" />
                <Text style={styles.coordinatorCallBtnText}>Call Relief Coordinator</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            {/* Native MapView or Mapbox Static Image */}
            {Platform.OS !== 'web' && MapView ? (
              <MapView
                ref={mapRef}
                style={styles.mapView}
                initialRegion={{
                  latitude: pinLocation.latitude,
                  longitude: pinLocation.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                onRegionChangeComplete={(region: any) => {
                  if (
                    Math.abs(region.latitude - pinLocation.latitude) > 0.0003 ||
                    Math.abs(region.longitude - pinLocation.longitude) > 0.0003
                  ) {
                    handleMapCoordChange(region.latitude, region.longitude);
                  }
                }}
                onPress={(e: any) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  handleMapCoordChange(latitude, longitude);
                  if (mapRef.current?.animateToRegion) {
                    mapRef.current.animateToRegion({
                      latitude,
                      longitude,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    });
                  }
                }}
              >
                {/* 1. All Nearby Relief Hubs Markers with Available Meals */}
                {hubsWithDistance.slice(0, 5).map((hub) => {
                  const isSelected = hub.id === selectedHub?.id;
                  return (
                    <Marker
                      key={hub.id}
                      coordinate={{ latitude: hub.lat, longitude: hub.lng }}
                      title={`${hub.name} (${hub.availableMeals} Meals)`}
                      description={`${hub.address} • Tap to Select`}
                      onPress={() => handleSelectHub(hub)}
                    >
                      <View style={styles.hubMarkerWrapper}>
                        <View
                          style={[
                            styles.hubBadge,
                            isSelected && { backgroundColor: '#0F7B4F' },
                          ]}
                        >
                          <Ionicons name="restaurant" size={10} color="#FFFFFF" />
                          <Text style={styles.hubBadgeText}>
                            {hub.name.split(' ')[0]} • {hub.availableMeals} pk
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.hubMarkerCircle,
                            isSelected && { backgroundColor: '#0F7B4F' },
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'business'}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    </Marker>
                  );
                })}

                {/* 2. Recipient Current GPS Location (if available) */}
                {gpsLocation && (
                  <Marker
                    coordinate={gpsLocation}
                    title="My Current Location"
                    description="Verified Device GPS Location"
                  >
                    <View style={styles.gpsMarkerCircle}>
                      <View style={styles.gpsMarkerInner} />
                    </View>
                  </Marker>
                )}

                {/* 3. Previous Request Marker (if exists) */}
                {previousReqCoords && (
                  <Marker
                    coordinate={{
                      latitude: previousReqCoords.latitude,
                      longitude: previousReqCoords.longitude,
                    }}
                    title="Previous Request"
                    description={previousReqCoords.address}
                    onPress={handleUsePreviousRequest}
                  >
                    <View style={styles.prevMarkerWrapper}>
                      <View style={styles.prevMarkerCircle}>
                        <Ionicons name="time" size={12} color="#FFFFFF" />
                      </View>
                    </View>
                  </Marker>
                )}
              </MapView>
            ) : (
              <MapboxStaticImage uri={mapboxStaticUrl} style={styles.mapImage} />
            )}

            {/* Google Maps Style Fixed Center Aim Pin */}
            <View style={styles.googleCenterPinOverlay} pointerEvents="none">
              <View style={styles.googlePinCallout}>
                <Text style={styles.googlePinCalloutText}>Delivery Destination Point</Text>
              </View>
              <Ionicons name="location" size={42} color="#5A1626" style={styles.googlePinIcon} />
              <View style={styles.googlePinShadowDot} />
            </View>

            {/* Map Top Status Pill */}
            <View style={styles.mapTopOverlay} pointerEvents="box-none">
              {selectedHub ? (
                <View style={styles.nearestHubHeaderBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.nearestHubHeaderText}>
                    Selected Hub: {selectedHub.name.split(' ')[0]} ({selectedHubDistance.toFixed(1)} km)
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <TouchableOpacity
                style={styles.mapCompassBtn}
                onPress={handleRecenterCurrentLocation}
              >
                <Ionicons name="locate" size={18} color="#5A1626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Selected Hub & Delivery Location Card */}
        <View style={styles.locationDetailsCard}>
          {/* Pinned Delivery Location */}
          <View style={styles.locCardRow}>
            <View style={styles.maroonIconBox}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locCardSectionLabel}>DELIVERY DROP POINT (PINNED)</Text>
              <Text style={styles.locCardAddressName}>{pinLocation.addressName}</Text>
              <Text style={styles.locCardCoords}>
                Sector Coordinates: {pinLocation.latitude.toFixed(4)}, {pinLocation.longitude.toFixed(4)}
              </Text>
            </View>
          </View>

          {selectedHub && (
            <>
              <View style={styles.locCardDivider} />

              {/* Selected Relief Hub (optional) */}
              <View style={styles.locCardRow}>
                <View style={styles.greenIconBox}>
                  <Ionicons name="business" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.hubHeaderRow}>
                    <Text style={styles.locCardSectionLabel}>SELECTED RELIEF DISTRIBUTION HUB</Text>
                    <View style={styles.distBadge}>
                      <Text style={styles.distBadgeText}>{selectedHubDistance.toFixed(1)} km away</Text>
                    </View>
                  </View>
                  <Text style={styles.locCardHubName}>{selectedHub.name}</Text>
                  <Text style={styles.locCardHubAddress}>{selectedHub.address}</Text>
                  <View style={styles.hubCapacityRow}>
                    <View style={styles.mealCountPill}>
                      <Ionicons name="restaurant" size={12} color="#0F7B4F" />
                      <Text style={styles.mealCountText}>{selectedHub.availableMeals} Meals Ready</Text>
                    </View>
                    <Text style={styles.locCardHubHours}>⏰ {selectedHub.openHours}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHubOverride(null)} activeOpacity={0.7}>
                    <Text style={styles.clearHubText}>Remove hub</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Available Hubs & Food in this Area (optional selector) */}
        {hubsWithDistance.length > 0 && (
          <>
            <View style={styles.hubsSectionHeader}>
              <Text style={styles.hubsSectionTitle}>Nearby Hubs & Available Food (Optional)</Text>
              <Text style={styles.hubsSectionSubtitle}>
                Tap a hub if you prefer a specific distribution source — tap again to remove
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hubsHorizontalScroll}
            >
              {hubsWithDistance.map((hub) => {
                const isSelected = hub.id === selectedHub?.id;
                return (
                  <TouchableOpacity
                    key={hub.id}
                    style={[styles.hubCard, isSelected && styles.hubCardSelected]}
                    onPress={() => toggleHub(hub)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hubCardHeader}>
                      <View
                        style={[
                          styles.hubCardBadge,
                          isSelected ? { backgroundColor: '#0F7B4F' } : { backgroundColor: '#5A1626' },
                        ]}
                      >
                        <Text style={styles.hubCardBadgeText}>{hub.availableMeals} Meals Ready</Text>
                      </View>
                      <Text style={styles.hubCardDist}>{hub.distanceKm.toFixed(1)} km</Text>
                    </View>

                    <Text style={styles.hubCardName} numberOfLines={1}>{hub.name}</Text>
                    <Text style={styles.hubCardMealType} numberOfLines={1}>{hub.mealType}</Text>
                    <Text style={styles.hubCardAddress} numberOfLines={1}>{hub.address}</Text>

                    <View style={styles.hubCardFooter}>
                      <Text style={[styles.selectHubActionText, isSelected && { color: '#0F7B4F', fontWeight: '800' }]}>
                        {isSelected ? '✓ Selected Hub' : 'Select This Hub ›'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Drag Map Hint */}
        <View style={styles.dragHintBox}>
          <Ionicons name="hand-left-outline" size={16} color="#78350F" />
          <Text style={styles.dragHintText}>
            Move the map to pinpoint your exact home or street location.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#1A1A1A" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.proceedBtn, !isWithinJaffna && styles.proceedBtnDisabled]}
            onPress={handleProceed}
            activeOpacity={0.85}
          >
            <Text style={styles.proceedBtnText}>Confirm Location & Proceed</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.footerTagline}>Amuthinai — Connecting Through Food</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLogo: {
    width: 130,
    height: 38,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },

  /* Search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2DBD2',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  gpsLocateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2DBD2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Suggestions */
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7F4EE',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7E1',
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
    gap: 10,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  suggestionLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  pointMapBtnPill: {
    backgroundColor: '#5A1626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointMapBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noMatchBox: {
    padding: 14,
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  /* Quick Chips */
  quickChipsScroll: {
    marginBottom: 10,
  },
  quickChipsContainer: {
    gap: 8,
  },
  quickPlaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  quickPlaceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  /* Privacy Notice */
  privacyCoordinationCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 12,
  },
  privacyCoordHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  privacyShieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCoordTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  privacyCoordSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15,
  },
  privacyCoordActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    flexWrap: 'wrap',
    gap: 8,
  },
  privacyCoordHint: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },
  coordinatorCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F7B4F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  coordinatorCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Map Container */
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2DBD2',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mapWrapper: {
    height: 260,
    width: '100%',
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  googleCenterPinOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -60 }],
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googlePinCallout: {
    backgroundColor: '#5A1626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 2,
  },
  googlePinCalloutText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  googlePinIcon: {
    marginTop: -4,
  },
  googlePinShadowDot: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  },
  mapTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nearestHubHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2DBD2',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  nearestHubHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  mapCompassBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2DBD2',
  },

  /* Markers */
  hubMarkerWrapper: {
    alignItems: 'center',
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5A1626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginBottom: 2,
  },
  hubBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  hubMarkerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gpsMarkerCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  prevMarkerWrapper: {
    alignItems: 'center',
  },
  prevMarkerCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* Details Card */
  locationDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE7E1',
    padding: 14,
    marginBottom: 12,
  },
  locCardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  maroonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locCardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  locCardAddressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  locCardCoords: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  locCardDivider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 12,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F7B4F',
  },
  locCardHubName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  locCardHubAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  hubCapacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  mealCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  locCardHubHours: {
    fontSize: 11,
    color: '#4B5563',
  },
  clearHubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A1626',
    marginTop: 8,
  },

  /* Hubs Horizontal List */
  hubsSectionHeader: {
    marginTop: 6,
    marginBottom: 8,
  },
  hubsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  hubsSectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  hubsHorizontalScroll: {
    gap: 10,
    paddingBottom: 10,
  },
  hubCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECE7E1',
    padding: 12,
  },
  hubCardSelected: {
    borderColor: '#0F7B4F',
    backgroundColor: '#F7FCF9',
  },
  hubCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hubCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hubCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hubCardDist: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  hubCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  hubCardMealType: {
    fontSize: 11,
    color: '#0F7B4F',
    fontWeight: '600',
    marginTop: 2,
  },
  hubCardAddress: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  hubCardFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  selectHubActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A1626',
  },

  /* Hints */
  dragHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  dragHintText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },

  /* Bottom Actions */
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DBD2',
    backgroundColor: '#FFFFFF',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  proceedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5A1626',
    paddingVertical: 12,
    borderRadius: 12,
  },
  proceedBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerTagline: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '500',
  },
});
