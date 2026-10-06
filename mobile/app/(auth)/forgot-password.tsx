import { router } from 'expo-router';
import { useState } from 'react';
import { 
  ImageBackground, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '@/theme';
import { logo } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

// Direct import of login background
const loginBackground = require('../../assets/images/login.png');

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helper
const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;

export default function ForgotPassword() {
  const { height: windowHeight } = useWindowDimensions();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic sizing based on screen height
  const isScreenSmall = windowHeight < 700;
  const isScreenMedium = windowHeight >= 700 && windowHeight < 800;

  const logoSize = isScreenSmall ? { width: 220, height: 75 } : isScreenMedium ? { width: 250, height: 85 } : { width: 280, height: 100 };
  const titleFontSize = isScreenSmall ? 44 : isScreenMedium ? 50 : 56;
  const titleLineHeight = isScreenSmall ? 50 : isScreenMedium ? 56 : 62;

  async function handleSubmit() {
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call backend API to send OTP to email
      await forgotPassword({ email: email.trim() });
      
      // Navigate to OTP verification screen with email
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: email.trim(), type: 'forgot-password' }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Background Image */}
      <ImageBackground
        source={loginBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark Overlay */}
        <LinearGradient
          colors={[
            'rgba(30, 20, 10, 0.5)',
            'rgba(20, 15, 10, 0.75)',
            'rgba(15, 10, 5, 0.9)'
          ]}
          locations={[0, 0.5, 1]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Decorative leaves */}
      <View style={styles.decorativeLeaves} pointerEvents="none">
        <Text style={styles.leafTopLeft}>🍃</Text>
        <Text style={styles.leafBottomRight}>🍃</Text>
      </View>

      {/* Content */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={logo} 
                style={[styles.logo, logoSize]} 
                resizeMode="contain" 
              />
            </View>

            {/* Header Text */}
            <View style={styles.headerSection}>
              <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Forgot
              </Text>
              <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Password?
              </Text>
              <View style={styles.underline} />
              <Text style={styles.subtitle}>
                We have sent a 6-digit OTP{'\n'}to your registered email.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Send OTP Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.sendButton,
                  isSubmitting && styles.sendButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonLeafLeft}>🍂</Text>
                <View style={styles.buttonContent}>
                  <Text style={styles.sendButtonText}>
                    {isSubmitting ? 'Sending...' : 'Send OTP'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
                <Text style={styles.buttonLeafRight}>🍂</Text>
              </Pressable>

              {/* Back to Sign In */}
              <Pressable 
                onPress={() => router.back()}
                style={styles.backToSignIn}
              >
                <Text style={styles.backToSignInText}>Back to Sign In</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a0f08',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  decorativeLeaves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  leafTopLeft: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    left: 20,
    fontSize: isSmallScreen ? 30 : 40,
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }],
  },
  leafBottomRight: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.12,
    right: 20,
    fontSize: isSmallScreen ? 40 : 50,
    opacity: 0.25,
    transform: [{ rotate: '25deg' }],
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.07,
    paddingTop: isSmallScreen ? 20 : isMediumScreen ? 30 : 40,
    paddingBottom: isSmallScreen ? 20 : 30,
    justifyContent: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 24 : 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 32 : 40,
  },
  logo: {
    // Dynamic size applied inline
  },
  headerSection: {
    marginBottom: isSmallScreen ? 40 : 48,
  },
  title: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  underline: {
    width: isSmallScreen ? 50 : 60,
    height: 3,
    backgroundColor: '#D4A574',
    marginTop: isSmallScreen ? 6 : 8,
    marginBottom: isSmallScreen ? 12 : 16,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: isSmallScreen ? 15 : 17,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: isSmallScreen ? 22 : 26,
    fontWeight: '400',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 90, 60, 0.4)',
    borderRadius: isSmallScreen ? 18 : 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.5)',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    height: isSmallScreen ? 54 : isMediumScreen ? 58 : 62,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '400',
  },
  errorContainer: {
    marginBottom: isSmallScreen ? 12 : 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
  },
  sendButton: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
    backgroundColor: 'rgba(139, 90, 60, 0.8)',
    borderRadius: isSmallScreen ? 28 : isMediumScreen ? 30 : 32,
    marginBottom: isSmallScreen ? 24 : 32,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonLeafLeft: {
    position: 'absolute',
    left: isSmallScreen ? 15 : 20,
    fontSize: isSmallScreen ? 24 : 28,
    opacity: 0.6,
    transform: [{ rotate: '-25deg' }],
  },
  buttonLeafRight: {
    position: 'absolute',
    right: isSmallScreen ? 15 : 20,
    fontSize: isSmallScreen ? 24 : 28,
    opacity: 0.6,
    transform: [{ rotate: '25deg' }],
  },
  backToSignIn: {
    alignItems: 'center',
  },
  backToSignInText: {
    color: '#F59E0B',
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
