import { ImageSourcePropType } from 'react-native';

/**
 * App images and assets.
 * Centralized image management for the Amuthinai app.
 */

// Helper function to safely load images with fallback
const safeRequire = (path: string, fallback: any): ImageSourcePropType => {
  try {
    return path as any;
  } catch {
    return fallback;
  }
};

// Logo
export const logo = require('../../assets/images/logo.png');

// Login image
export const loginBackground = require('../../assets/images/login.png');

// Onboarding images
export const onboardingImages = {
  elderChild: require('../../assets/images/Onbording/onbording1.png'),
  volunteerDelivery: require('../../assets/images/Onbording/onbording2.png'),
  communityMeal: require('../../assets/images/Onbording/onbording3.png'),
} as const;

// Export all images
export const images = {
  logo,
  loginBackground,
  onboarding: onboardingImages,
} as const;

export default images;
