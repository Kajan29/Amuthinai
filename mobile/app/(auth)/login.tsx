import { Link, router } from 'expo-router';
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

import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, logo } from '@/constants';
import type { Role } from '@/types';

// Direct import of login background
const loginBackground = require('../../assets/images/login.png');

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helper for styles
const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;

/** FR1 — email and password login with Google sign-in option. */
export default function Login() {
  const { login, googleAuth } = useAuth();
  const { height: windowHeight } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickRole, setQuickRole] = useState<Role | null>(null);

  // Dynamic sizing based on screen height
  const isScreenSmall = windowHeight < 700;
  const isScreenMedium = windowHeight >= 700 && windowHeight < 800;

  const logoSize = isScreenSmall ? { width: 220, height: 75 } : isScreenMedium ? { width: 250, height: 85 } : { width: 280, height: 100 };
  const titleFontSize = isScreenSmall ? 44 : isScreenMedium ? 50 : 56;
  const titleLineHeight = isScreenSmall ? 50 : isScreenMedium ? 56 : 62;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email.trim(), password);
      // Use the role already attached to the account. If there is no role yet, send the user
      // back to registration so they can pick one from the role selector there.
      const route = user.role ? (HOME_ROUTE[user.role] as never) : '/(auth)/register';
      router.replace(route);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickLogin(role: Role) {
    const account = DEMO_ACCOUNTS[role];
    setError(null);
    setQuickRole(role);
    setIsSubmitting(true);
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);

    try {
      const user = await login(account.email, DEMO_PASSWORD);
      router.replace((user.role ? HOME_ROUTE[user.role] : HOME_ROUTE[role]) as never);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not open the ${account.name} dashboard. Seed that account first.`,
      );
    } finally {
      setIsSubmitting(false);
      setQuickRole(null);
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Import the Google Sign-In utility
      const { signInWithGoogle } = await import('@/utils/googleAuth');
      
      // Get the ID token from Google
      const idToken = await signInWithGoogle();
      
      // Authenticate with backend using the ID token
      const user = await googleAuth(idToken);
      
      // Navigate to the user's dashboard or back to registration if no role is present.
      router.replace(user.role ? (HOME_ROUTE[user.role] as never) : '/(auth)/register');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Welcome
              </Text>
              <Text style={[styles.welcomeTitle, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
                Back
              </Text>
              <View style={styles.underline} />
              <Text style={styles.welcomeSubtitle}>
                Sign in to continue{'\n'}sharing kindness.
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
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
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

              {/* Forgot Password */}
              <Pressable 
                style={styles.forgotPasswordBtn}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Pressable>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Sign In Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.signInButton,
                  isSubmitting && styles.signInButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonLeafLeft}>🍂</Text>
                <View style={styles.buttonContent}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
                <Text style={styles.buttonLeafRight}>🍂</Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.googleButton,
                  isSubmitting && styles.signInButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="logo-google" size={24} color="#fff" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>

              {/* Advanced Login — one tap per role dashboard */}
              <View style={styles.advancedBlock}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ADVANCED LOGIN</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Text style={styles.advancedHint}>
                  Tap a role to sign in automatically and open that dashboard
                </Text>
                <View style={styles.advancedGrid}>
                  {(
                    [
                      { role: 'donor', icon: 'restaurant-outline', label: 'Donor' },
                      { role: 'volunteer', icon: 'bicycle-outline', label: 'Volunteer' },
                      { role: 'recipient', icon: 'heart-outline', label: 'Recipient' },
                      { role: 'admin', icon: 'shield-outline', label: 'Admin' },
                    ] as const
                  ).map((item) => {
                    const busy = quickRole === item.role;
                    return (
                      <Pressable
                        key={item.role}
                        onPress={() => void handleQuickLogin(item.role)}
                        disabled={isSubmitting}
                        style={({ pressed }) => [
                          styles.advancedBtn,
                          busy && styles.advancedBtnActive,
                          isSubmitting && !busy && styles.signInButtonDisabled,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Ionicons
                          name={busy ? 'hourglass-outline' : item.icon}
                          size={18}
                          color="#F8E7D2"
                        />
                        <Text style={styles.advancedBtnText}>
                          {busy ? 'Opening…' : item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={styles.registerLink}>Register</Text>
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
    paddingHorizontal: SCREEN_WIDTH * 0.07, // 7% of screen width
    paddingTop: isSmallScreen ? 20 : isMediumScreen ? 30 : 40,
    paddingBottom: isSmallScreen ? 20 : 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : isMediumScreen ? 26 : 32,
    marginTop: isSmallScreen ? 10 : 20,
  },
  logo: {
    // Dynamic size applied inline
  },
  welcomeSection: {
    marginBottom: isSmallScreen ? 24 : isMediumScreen ? 32 : 40,
  },
  welcomeTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    // Dynamic fontSize and lineHeight applied inline
  },
  underline: {
    width: isSmallScreen ? 50 : 60,
    height: 3,
    backgroundColor: '#D4A574',
    marginTop: isSmallScreen ? 6 : 8,
    marginBottom: isSmallScreen ? 12 : 16,
    borderRadius: 2,
  },
  welcomeSubtitle: {
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
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: isSmallScreen ? 16 : 20,
  },
  forgotPasswordText: {
    color: '#F59E0B',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: isSmallScreen ? 12 : 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
  },
  signInButton: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
    backgroundColor: 'rgba(139, 90, 60, 0.8)',
    borderRadius: isSmallScreen ? 28 : isMediumScreen ? 30 : 32,
    marginBottom: isSmallScreen ? 18 : 24,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonDisabled: {
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
  signInButtonText: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isSmallScreen ? 16 : 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: isSmallScreen ? 54 : isMediumScreen ? 58 : 62,
    borderRadius: isSmallScreen ? 27 : isMediumScreen ? 29 : 31,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: isSmallScreen ? 18 : 24,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 8 : 0,
  },
  registerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: isSmallScreen ? 13 : 14,
  },
  registerLink: {
    color: '#F59E0B',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  advancedBlock: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  advancedHint: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: isSmallScreen ? 12 : 13,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: -4,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  advancedBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 90, 60, 0.55)',
    borderColor: 'rgba(212, 165, 116, 0.45)',
    borderRadius: 16,
    borderWidth: 1.5,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  advancedBtnActive: {
    backgroundColor: 'rgba(212, 165, 116, 0.35)',
    borderColor: '#D4A574',
  },
  advancedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
