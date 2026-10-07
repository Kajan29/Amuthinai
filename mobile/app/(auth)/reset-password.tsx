import { router, useLocalSearchParams } from 'expo-router';
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

import { logo } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

// Direct import of login background
const loginBackground = require('../../assets/images/login.png');

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;

export default function ResetPassword() {
  const { height: windowHeight } = useWindowDimensions();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        email: email!,
        otp: otp!,
        newPassword: password,
      });

      // Navigate to login screen
      router.replace('/(auth)/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to reset password');
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
                Reset
              </Text>
              <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Password
              </Text>
              <View style={styles.underline} />
              <Text style={styles.subtitle}>
                Create a strong and secure{'\n'}password for your account
              </Text>
            </View>

            {/* Password Icon Card */}
            <View style={styles.iconCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={isScreenSmall ? 32 : 36} color="#D4A574" />
              </View>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="New Password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  autoCorrect={false}
                  autoFocus
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="rgba(255,255,255,0.7)"
                  />
                </Pressable>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm New Password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  autoCorrect={false}
                />
                <Pressable 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="rgba(255,255,255,0.7)"
                  />
                </Pressable>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementIcon}>
                    {password.length >= 8 ? '✓' : '○'}
                  </Text>
                  <Text style={[
                    styles.requirementText,
                    password.length >= 8 && styles.requirementTextMet
                  ]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementIcon}>
                    {password && confirmPassword && password === confirmPassword ? '✓' : '○'}
                  </Text>
                  <Text style={[
                    styles.requirementText,
                    password && confirmPassword && password === confirmPassword && styles.requirementTextMet
                  ]}>
                    Passwords match
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Reset Password Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.resetButton,
                  isSubmitting && styles.resetButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonLeafLeft}>🍂</Text>
                <View style={styles.buttonContent}>
                  <Text style={styles.resetButtonText}>
                    {isSubmitting ? 'Resetting...' : 'Reset Password'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
                <Text style={styles.buttonLeafRight}>🍂</Text>
              </Pressable>

              {/* Back to Sign In */}
              <Pressable 
                onPress={() => router.push('/(auth)/login')}
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 32 : 40,
  },
  logo: {
    // Dynamic size applied inline
  },
  headerSection: {
    marginBottom: isSmallScreen ? 32 : 40,
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
  iconCard: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 32 : 40,
  },
  iconCircle: {
    width: isSmallScreen ? 80 : isMediumScreen ? 90 : 100,
    height: isSmallScreen ? 80 : isMediumScreen ? 90 : 100,
    borderRadius: isSmallScreen ? 40 : isMediumScreen ? 45 : 50,
    backgroundColor: 'rgba(139, 90, 60, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  requirementsBox: {
    backgroundColor: 'rgba(139, 90, 60, 0.2)',
    borderRadius: 12,
    padding: isSmallScreen ? 14 : 16,
    marginBottom: isSmallScreen ? 16 : 20,
  },
  requirementsTitle: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#10B981',
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  requirementTextMet: {
    color: '#10B981',
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: isSmallScreen ? 12 : 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
  },
  resetButton: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
    backgroundColor: '#10B981',
    borderRadius: isSmallScreen ? 28 : isMediumScreen ? 30 : 32,
    marginBottom: isSmallScreen ? 24 : 32,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resetButtonDisabled: {
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
  resetButtonText: {
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
