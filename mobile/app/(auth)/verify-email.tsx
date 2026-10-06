import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
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
import { logo } from '@/constants';

// Direct import of login background
const loginBackground = require('../../assets/images/login.png');

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTP_LENGTH = 6;
const RESEND_TIMER = 60; // seconds

/** Email verification after registration */
export default function VerifyEmail() {
  const { height: windowHeight } = useWindowDimensions();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail, user, resendVerificationOtp } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Dynamic sizing based on screen height
  const isScreenSmall = windowHeight < 700;
  const isScreenMedium = windowHeight >= 700 && windowHeight < 800;

  const logoSize = isScreenSmall ? { width: 200, height: 68 } : isScreenMedium ? { width: 220, height: 75 } : { width: 250, height: 85 };

  // Timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function handleVerify() {
    setError(null);
    setSuccess(null);

    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify email
      await verifyEmail(email, otpString);
      setSuccess('Email verified! Redirecting to your dashboard...');
      
      // Navigate to home screen based on user's role
      setTimeout(() => {
        if (user?.role) {
          const homeRoute = HOME_ROUTE[user.role];
          router.replace(homeRoute as never);
        } else {
          // Fallback to select-role if somehow role is not set
          router.replace('/(auth)/select-role');
        }
      }, 1500);
    } catch (cause) {
      console.error('Verification error:', cause);
      setError(cause instanceof Error ? cause.message : 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;

    setError(null);
    setSuccess(null);
    setCanResend(false);
    setResendTimer(RESEND_TIMER);

    try {
      await resendVerificationOtp(email);
      setSuccess('A new OTP has been sent to your email');
      
      // Clear OTP inputs and focus first input
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to resend OTP');
      setCanResend(true);
      setResendTimer(0);
    }
  }

  const handleEdit = () => {
    router.back();
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
        <Text style={[styles.leafTopLeft, { 
          top: SCREEN_HEIGHT * 0.08, 
          fontSize: isScreenSmall ? 30 : 40 
        }]}>
          🍃
        </Text>
        <Text style={[styles.leafBottomRight, { 
          bottom: SCREEN_HEIGHT * 0.12, 
          fontSize: isScreenSmall ? 40 : 50 
        }]}>
          🍃
        </Text>
      </View>

      {/* Content */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, {
              paddingHorizontal: SCREEN_WIDTH * 0.07,
              paddingTop: isScreenSmall ? 15 : isScreenMedium ? 20 : 25,
              paddingBottom: isScreenSmall ? 20 : 30,
            }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <Pressable onPress={() => router.back()} style={[styles.backButton, {
              marginBottom: isScreenSmall ? 16 : 20
            }]}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* Logo */}
            <View style={[styles.logoContainer, {
              marginBottom: isScreenSmall ? 20 : 28
            }]}>
              <Image 
                source={logo} 
                style={[styles.logo, logoSize]} 
                resizeMode="contain" 
              />
            </View>

            {/* Header Text */}
            <View style={[styles.headerSection, {
              marginBottom: isScreenSmall ? 24 : 32
            }]}>
              <Text style={[styles.title, {
                fontSize: isScreenSmall ? 44 : isScreenMedium ? 50 : 56,
                lineHeight: isScreenSmall ? 50 : isScreenMedium ? 56 : 62,
              }]}>
                Verify
              </Text>
              <Text style={[styles.title, {
                fontSize: isScreenSmall ? 44 : isScreenMedium ? 50 : 56,
                lineHeight: isScreenSmall ? 50 : isScreenMedium ? 56 : 62,
              }]}>
                Your Email
              </Text>
              <View style={[styles.underline, {
                width: isScreenSmall ? 50 : 60,
                marginTop: isScreenSmall ? 6 : 8,
                marginBottom: isScreenSmall ? 12 : 16,
              }]} />
              <Text style={[styles.subtitle, {
                fontSize: isScreenSmall ? 15 : 17,
                lineHeight: isScreenSmall ? 22 : 26,
              }]}>
                We've sent a 6-digit verification{'\n'}code to your email address.
              </Text>
            </View>

            {/* Email Icon Card */}
            <View style={[styles.iconCard, {
              marginBottom: isScreenSmall ? 24 : 32
            }]}>
              <View style={[styles.iconCircle, {
                width: isScreenSmall ? 80 : isScreenMedium ? 90 : 100,
                height: isScreenSmall ? 80 : isScreenMedium ? 90 : 100,
                borderRadius: isScreenSmall ? 40 : isScreenMedium ? 45 : 50,
              }]}>
                <Ionicons name="mail-open" size={isScreenSmall ? 32 : 36} color="#D4A574" />
              </View>
            </View>

            {/* OTP Section */}
            <View style={styles.otpSection}>
              <Text style={[styles.otpTitle, {
                fontSize: isScreenSmall ? 18 : 20,
                marginBottom: isScreenSmall ? 12 : 16,
              }]}>
                Enter Verification Code
              </Text>
              <View style={[styles.emailContainer, {
                marginBottom: isScreenSmall ? 20 : 24
              }]}>
                <Text style={[styles.emailText, {
                  fontSize: isScreenSmall ? 13 : 14
                }]}>
                  Code sent to
                </Text>
                <View style={styles.emailRow}>
                  <Text style={[styles.emailAddress, {
                    fontSize: isScreenSmall ? 14 : 15
                  }]}>
                    {email}
                  </Text>
                  <Pressable onPress={handleEdit} hitSlop={8}>
                    <Text style={[styles.editLink, {
                      fontSize: isScreenSmall ? 13 : 14
                    }]}>
                      Edit ✏️
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* OTP Input Boxes */}
              <View style={[styles.otpInputContainer, {
                gap: isScreenSmall ? 6 : 8,
                marginBottom: isScreenSmall ? 16 : 20,
              }]}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      {
                        width: (SCREEN_WIDTH * 0.86 - (isScreenSmall ? 30 : 40)) / 6,
                        height: isScreenSmall ? 54 : isScreenMedium ? 58 : 62,
                        borderRadius: isScreenSmall ? 12 : 14,
                        fontSize: isScreenSmall ? 22 : 24,
                      },
                      digit && styles.otpInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {/* Resend Section */}
              <View style={[styles.resendContainer, {
                marginBottom: isScreenSmall ? 16 : 20
              }]}>
                {canResend ? (
                  <Pressable onPress={handleResend} hitSlop={8}>
                    <Text style={[styles.resendLink, {
                      fontSize: isScreenSmall ? 14 : 15
                    }]}>
                      Resend Code
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.resendText, {
                    fontSize: isScreenSmall ? 13 : 14
                  }]}>
                    Resend code in{' '}
                    <Text style={styles.timerText}>{formatTime(resendTimer)}</Text>
                  </Text>
                )}
              </View>

              {/* Success Message */}
              {success && (
                <View style={[styles.successContainer, {
                  marginBottom: isScreenSmall ? 12 : 16
                }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={[styles.successText, {
                    fontSize: isScreenSmall ? 13 : 14
                  }]}>
                    {success}
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View style={[styles.errorContainer, {
                  marginBottom: isScreenSmall ? 12 : 16
                }]}>
                  <Text style={[styles.errorText, {
                    fontSize: isScreenSmall ? 13 : 14
                  }]}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Verify Button */}
              <Pressable
                onPress={handleVerify}
                disabled={isSubmitting || otp.join('').length !== OTP_LENGTH}
                style={({ pressed }) => [
                  styles.verifyButton,
                  {
                    height: isScreenSmall ? 54 : isScreenMedium ? 58 : 62,
                    borderRadius: isScreenSmall ? 27 : isScreenMedium ? 29 : 31,
                    marginBottom: isScreenSmall ? 16 : 20,
                  },
                  (isSubmitting || otp.join('').length !== OTP_LENGTH) && styles.verifyButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.buttonLeafLeft, {
                  left: isScreenSmall ? 15 : 20,
                  fontSize: isScreenSmall ? 24 : 28,
                }]}>
                  🍂
                </Text>
                <View style={styles.buttonContent}>
                  <Text style={[styles.verifyButtonText, {
                    fontSize: isScreenSmall ? 18 : 20
                  }]}>
                    {isSubmitting ? 'Verifying...' : 'Verify Email'}
                  </Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
                <Text style={[styles.buttonLeafRight, {
                  right: isScreenSmall ? 15 : 20,
                  fontSize: isScreenSmall ? 24 : 28,
                }]}>
                  🍂
                </Text>
              </Pressable>

              {/* Help Text */}
              <Text style={[styles.helpText, {
                fontSize: isScreenSmall ? 12 : 13
              }]}>
                Didn't receive the code? Check your spam folder or try resending.
              </Text>
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
    left: 20,
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }],
  },
  leafBottomRight: {
    position: 'absolute',
    right: 20,
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
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    // Dynamic size applied inline
  },
  headerSection: {
    // Dynamic margin applied inline
  },
  title: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  underline: {
    height: 3,
    backgroundColor: '#D4A574',
    borderRadius: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  iconCard: {
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: 'rgba(139, 90, 60, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSection: {
    width: '100%',
  },
  otpTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emailContainer: {
    // Dynamic margin applied inline
  },
  emailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 6,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailAddress: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editLink: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    backgroundColor: 'rgba(139, 90, 60, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.4)',
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    backgroundColor: 'rgba(139, 90, 60, 0.5)',
    borderColor: '#D4A574',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  resendLink: {
    color: '#F59E0B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  timerText: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    padding: 12,
  },
  successText: {
    color: '#10B981',
    fontWeight: '600',
  },
  errorContainer: {
    // Dynamic margin applied inline
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
  },
  verifyButton: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
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
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonLeafLeft: {
    position: 'absolute',
    opacity: 0.6,
    transform: [{ rotate: '-25deg' }],
  },
  buttonLeafRight: {
    position: 'absolute',
    opacity: 0.6,
    transform: [{ rotate: '25deg' }],
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
