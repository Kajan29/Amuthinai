import React from 'react';
import { StyleSheet } from 'react-native';
import LogoSvg from '../../assets/images/logo.svg';

interface LogoProps {
  width?: number;
  height?: number;
}

/**
 * Amuthinai Logo Component with transparent background
 * Uses SVG for crisp rendering at any size
 */
export function Logo({ width = 300, height = 110 }: LogoProps) {
  return <LogoSvg width={width} height={height} style={styles.logo} />;
}

const styles = StyleSheet.create({
  logo: {
    // SVG renders with transparent background by default
  },
});
