import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { useLanguageStore } from '@/store/language.store';
import { colors, spacing, typography, radius } from '@/theme';
import { logo } from '@/constants';
import type { Role } from '@/types';

// Direct import of login background (same as login page)
const loginBackground = require('../../assets/images/login.png');

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helper
const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;
const isLargeScreen = SCREEN_HEIGHT >= 800;

/** FR1 — account creation with role selection */
export default function Register() {
  const { t } = useTranslation();
  const { register, googleAuth } = useAuth();
  const language = useLanguageStore((state) => state.language);
  const { height: windowHeight } = useWindowDimensions();

  const [selectedRole, setSelectedRole] = useState<Role>('donor');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic sizing based on screen height
  const isScreenSmall = windowHeight < 700;
  const isScreenMedium = windowHeight >= 700 && windowHeight < 800;

  const logoSize = isScreenSmall ? { width: 180, height: 60 } : isScreenMedium ? { width: 200, height: 68 } : { width: 220, height: 75 };
  const titleFontSize = isScreenSmall ? 28 : isScreenMedium ? 32 : 36;
  const titleLineHeight = isScreenSmall ? 34 : isScreenMedium ? 38 : 42;

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  async function handleSubmit() {
    setError(null);

    // Validation
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ 
        name: form.name,
        email: form.email.trim(), 
        phone: form.phone,
        password: form.password,
        language,
        role: selectedRole  // Send role during registration
      });
      
      // Navigate to email verification page
      router.push({
        pathname: '/(auth)/verify-email',
        params: { 
          email: form.email.trim(),
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Import the Google Sign-In utility
      const { signInWithGoogle } = await import('@/utils/googleAuth');
      
      // Get the ID token from Google
      const idToken = await signInWithGoogle();
      
      // Authenticate with backend using the ID token and selected role
      const user = await googleAuth(idToken, selectedRole);
      
      // Go straight to the matching dashboard when a role is available.
      router.replace(user.role ? (HOME_ROUTE[user.role] as never) : '/(auth)/register');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { 
      id: 'donor' as Role, 
      icon: '🍲', 
      label: 'Food Donor', 
      subtitle: 'Share extra food',
      color: '#D97706'
    },
    { 
      id: 'volunteer' as Role, 
      icon: '👥', 
      label: 'Volunteer', 
      subtitle: 'Collect & Deliver',
      color: '#10B981'
    },
    { 
      id: 'recipient' as Role, 
      icon: '❤️', 
      label: 'Recipient', 
      subtitle: 'Request food',
      color: '#EF4444'
    },
  ];

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
        <Text style={styles.leafTopRight}>🍃</Text>
        <Text style={styles.leafBottomLeft}>🍃</Text>
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
              <View style={styles.iconTextRow}>
                <Text style={styles.leafIcon}>🍃</Text>
                <Text style={styles.joinText}>Join Our Community</Text>
              </View>
              <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Create Account
              </Text>
              <Text style={styles.subtitle}>
                Be a part of a kinder tomorrow.{'\n'}
                Share food • Support communities •{'\n'}
                Reduce waste
              </Text>
            </View>

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Select Your Role</Text>
              <View style={styles.roleButtons}>
                {roles.map((role) => (
                  <Pressable
                    key={role.id}
                    onPress={() => setSelectedRole(role.id)}
                    style={[
                      styles.roleButton,
                      selectedRole === role.id && styles.roleButtonActive,
                    ]}
                  >
                    {selectedRole === role.id && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                    <Text style={styles.roleIcon}>{role.icon}</Text>
                    <Text style={styles.roleLabel}>{role.label}</Text>
                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Full Name Input */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={form.name}
                  onChangeText={set('name')}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

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
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={form.email}
                  onChangeText={set('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.inputIcon}
                />
                <View style={styles.phonePrefix}>
                  <Image 
                    source={{ uri: 'https://flagcdn.com/w40/lk.png' }} 
                    style={styles.flagIcon}
                  />
                  <Text style={styles.phonePrefixText}>+94</Text>
                  <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="77 123 4567"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={form.phone}
                  onChangeText={set('phone')}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>

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
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={form.password}
                  onChangeText={set('password')}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  autoCorrect={false}
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
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={form.confirmPassword}
                  onChangeText={set('confirmPassword')}
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

              {/* Terms Checkbox */}
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                  {agreeToTerms && (
                    <Ionicons name="checkmark" size={16} color="#000" />
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text style={styles.linkText}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.linkText}>Privacy Policy</Text>.
                </Text>
              </Pressable>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Create Account Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.createAccountButton,
                  isSubmitting && styles.createAccountButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonLeafLeft}>🍂</Text>
                <View style={styles.buttonContent}>
                  <Text style={styles.createAccountButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
                <Text style={styles.buttonLeafRight}>🍂</Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign Up */}
              <Pressable
                onPress={handleGoogleSignUp}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.googleButton,
                  isSubmitting && styles.createAccountButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="logo-google" size={24} color="#fff" />
                <Text style={styles.googleButtonText}>
                  {isSubmitting ? 'Signing up...' : 'Continue with Google'}
                </Text>
              </Pressable>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={styles.signInLink}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
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
    top: SCREEN_HEIGHT * 0.06,
    left: 10,
    fontSize: isSmallScreen ? 25 : 30,
    opacity: 0.25,
    transform: [{ rotate: '-15deg' }],
  },
  leafTopRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    right: 15,
    fontSize: isSmallScreen ? 30 : 35,
    opacity: 0.2,
    transform: [{ rotate: '25deg' }],
  },
  leafBottomLeft: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.15,
    left: 15,
    fontSize: isSmallScreen ? 35 : 40,
    opacity: 0.2,
    transform: [{ rotate: '-35deg' }],
  },
  leafBottomRight: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.08,
    right: 10,
    fontSize: isSmallScreen ? 30 : 35,
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
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingTop: isSmallScreen ? 10 : isMediumScreen ? 15 : 20,
    paddingBottom: isSmallScreen ? 15 : 25,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  },
  logo: {
    // Dynamic size applied inline
  },
  headerSection: {
    marginBottom: isSmallScreen ? 16 : isMediumScreen ? 20 : 24,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 4 : 6,
  },
  leafIcon: {
    fontSize: isSmallScreen ? 16 : 18,
    marginRight: 6,
  },
  joinText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  title: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: isSmallScreen ? 6 : 10,
  },
  subtitle: {
    fontSize: isSmallScreen ? 12 : 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: isSmallScreen ? 17 : 19,
    fontWeight: '400',
  },
  roleSection: {
    marginBottom: isSmallScreen ? 14 : isMediumScreen ? 18 : 22,
  },
  roleSectionTitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: isSmallScreen ? 8 : 10,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: 'rgba(139, 90, 60, 0.3)',
    borderRadius: isSmallScreen ? 12 : 14,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    padding: isSmallScreen ? 8 : 10,
    alignItems: 'center',
    position: 'relative',
    minHeight: isSmallScreen ? 75 : 85,
    justifyContent: 'center',
  },
  roleButtonActive: {
    backgroundColor: 'rgba(139, 90, 60, 0.5)',
    borderColor: '#D4A574',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: isSmallScreen ? 20 : 22,
    height: isSmallScreen ? 20 : 22,
    borderRadius: isSmallScreen ? 10 : 11,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: isSmallScreen ? 24 : 28,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: isSmallScreen ? 10 : 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: isSmallScreen ? 8 : 9,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 90, 60, 0.4)',
    borderRadius: isSmallScreen ? 16 : 18,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.5)',
    paddingHorizontal: isSmallScreen ? 14 : 16,
    height: isSmallScreen ? 48 : isMediumScreen ? 52 : 56,
    marginBottom: isSmallScreen ? 8 : 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '400',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  flagIcon: {
    width: isSmallScreen ? 20 : 22,
    height: isSmallScreen ? 13 : 15,
    borderRadius: 2,
  },
  phonePrefixText: {
    color: '#fff',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '500',
  },
  phoneInput: {
    paddingLeft: 0,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 12 : 14,
    marginTop: isSmallScreen ? 2 : 4,
  },
  checkbox: {
    width: isSmallScreen ? 18 : 20,
    height: isSmallScreen ? 18 : 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxText: {
    flex: 1,
    fontSize: isSmallScreen ? 11 : 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: isSmallScreen ? 16 : 18,
  },
  linkText: {
    color: '#F59E0B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    marginBottom: isSmallScreen ? 10 : 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: 'center',
  },
  createAccountButton: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: isSmallScreen ? 50 : isMediumScreen ? 54 : 58,
    backgroundColor: '#D97706',
    borderRadius: isSmallScreen ? 25 : isMediumScreen ? 27 : 29,
    marginBottom: isSmallScreen ? 14 : 18,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createAccountButtonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createAccountButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonLeafLeft: {
    position: 'absolute',
    left: isSmallScreen ? 12 : 16,
    fontSize: isSmallScreen ? 22 : 26,
    opacity: 0.6,
    transform: [{ rotate: '-25deg' }],
  },
  buttonLeafRight: {
    position: 'absolute',
    right: isSmallScreen ? 12 : 16,
    fontSize: isSmallScreen ? 22 : 26,
    opacity: 0.6,
    transform: [{ rotate: '25deg' }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isSmallScreen ? 12 : 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: isSmallScreen ? 48 : isMediumScreen ? 52 : 56,
    borderRadius: isSmallScreen ? 24 : isMediumScreen ? 26 : 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: isSmallScreen ? 14 : 18,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 6 : 8,
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: isSmallScreen ? 11 : 12,
  },
  signInLink: {
    color: '#F59E0B',
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
