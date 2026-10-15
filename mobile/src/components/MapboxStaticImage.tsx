import { createElement, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders a Mapbox Static Images API URL.
 * On web, RN `Image` often collapses to 0-height and mishandles "+" in overlay
 * paths — a real <img> with absolute fill is reliable there.
 */
export function MapboxStaticImage({ uri, style }: Props) {
  // Error count is tied to the URL it happened on, so a new URL (data loaded, filter
  // changed) gets a fresh attempt instead of staying stuck on the fallback.
  const [errors, setErrors] = useState({ uri, count: 0 });
  const errorCount = errors.uri === uri ? errors.count : 0;
  const failed = errorCount > 1;
  const src = errorCount === 1 ? `${uri}${uri.includes('?') ? '&' : '?'}retry=1` : uri;
  const setFailed = () => setErrors({ uri, count: errorCount + 1 });

  const webImgStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      display: 'block',
      border: 0,
    }),
    [],
  );

  if (!uri || failed) {
    return (
      <View style={[styles.base, styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          {uri ? 'Map unavailable' : 'Map unavailable (Mapbox token missing)'}
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.base, style]}>
        {createElement('img', {
          key: src,
          src,
          alt: 'Map',
          onError: setFailed,
          style: webImgStyle,
        })}
      </View>
    );
  }

  return (
    <View style={[styles.base, style]}>
      <Image
        key={src}
        source={{ uri: src }}
        style={styles.nativeImage}
        resizeMode="cover"
        onError={setFailed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: '100%',
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E4EFF5',
  },
  nativeImage: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
});
