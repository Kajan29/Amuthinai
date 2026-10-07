import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

/**
 * Get the Google Web Client ID from environment variables
 */
function getGoogleWebClientId(): string {
  // Try to get from expo config extra first
  const webClientId = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
                      // @ts-ignore - process.env is available in React Native
                      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

  if (!webClientId) {
    throw new Error('Google Web Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env file');
  }

  return webClientId;
}

/**
 * Initialize Google Sign-In with web client ID
 * Call this once when the app starts
 */
export function configureGoogleSignIn() {
  try {
    const webClientId = getGoogleWebClientId();
    
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
    });
    
    console.log('Google Sign-In configured successfully');
  } catch (error) {
    console.error('Failed to configure Google Sign-In:', error);
  }
}

/**
 * Sign in with Google and return the ID token
 * @returns Google ID token for backend verification
 */
export async function signInWithGoogle(): Promise<string> {
  try {
    // Check if Google Play Services is available (Android only)
    await GoogleSignin.hasPlayServices();

    // Perform sign in
    const userInfo = await GoogleSignin.signIn();

    // Get ID token
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('Failed to get ID token from Google');
    }

    return idToken;
  } catch (error: any) {
    // Handle specific error codes
    if (error.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Google sign-in was cancelled');
    } else if (error.code === 'IN_PROGRESS') {
      throw new Error('Google sign-in already in progress');
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Google Play Services not available');
    } else {
      console.error('Google Sign-In Error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
  }
}

/**
 * Check if user is currently signed in with Google
 */
export async function isSignedInWithGoogle(): Promise<boolean> {
  try {
    return GoogleSignin.hasPreviousSignIn ? GoogleSignin.hasPreviousSignIn() : false;
  } catch {
    return false;
  }
}
