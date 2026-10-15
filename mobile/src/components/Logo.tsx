import { Image, StyleSheet } from 'react-native';

import { logo } from '@/constants/images';

interface LogoProps {
  width?: number;
  height?: number;
}

/** Wordmark logo. Uses PNG so the standalone APK does not depend on a missing SVG. */
export function Logo({ width = 300, height = 110 }: LogoProps) {
  return <Image source={logo} style={[styles.logo, { width, height }]} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: 'transparent',
  },
});
