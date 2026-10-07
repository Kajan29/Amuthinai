import { useRef, useState } from 'react';
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { ImageSourcePropType } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/theme';
import { useOnboardingStore } from '@/store/onboarding.store';
import { onboardingImages, logo } from '@/constants';

interface Slide {
  icon: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  image: ImageSourcePropType;
}

// Try to load onboarding images
const getImage = (name: keyof typeof onboardingImages): ImageSourcePropType => {
  return onboardingImages[name];
};

const SLIDES: Slide[] = [
  {
    icon: '🍃',
    titleLine1: 'Let no good food',
    titleLine2: 'go to waste.',
    subtitle: 'Share it with those\nwho need it.',
    image: getImage('elderChild'),
  },
  {
    icon: '🍃',
    titleLine1: 'Unavai serppom,',
    titleLine2: 'pasiyai pokkuvom.',
    subtitle: 'Volunteers bridge the last mile\nto doorsteps.',
    image: getImage('volunteerDelivery'),
  },
  {
    icon: '🍃',
    titleLine1: 'Ondraaga inainthu,',
    titleLine2: 'uravaai vaazhvom.',
    subtitle: 'Together, no one goes to sleep hungry.',
    image: getImage('communityMeal'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const markOnboardingSeen = useOnboardingStore((state) => state.markOnboardingSeen);

  const isSmallScreen = height < 700;
  const currentSlide = SLIDES[index] ?? SLIDES[0]!;

  const goToLogin = async () => {
    await markOnboardingSeen();
    router.replace('/(auth)/login');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    } else {
      goToLogin();
    }
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {SLIDES.map((slide, i) => (
          <ImageBackground
            key={i}
            source={slide.image}
            style={[styles.slide, { width }]}
            resizeMode="cover"
          >
            {/* Darker gradient overlay for better text readability */}
            <LinearGradient
              colors={[
                'rgba(30, 20, 10, 0.5)',
                'rgba(30, 20, 10, 0.75)',
                'rgba(20, 15, 10, 0.85)',
              ]}
              locations={[0, 0.5, 1]}
              style={styles.overlay}
            />

            {/* Decorative leaf elements */}
            <View style={styles.decorativeLeaves}>
              <Text style={styles.leafTopLeft}>🍃</Text>
              <Text style={styles.leafBottomRight}>🍃</Text>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>

      {/* Foreground content overlaid on top of the pager */}
      <SafeAreaView style={styles.foreground} pointerEvents="box-none">
        {/* Skip button in top-right corner */}
        {!isLast && (
          <Pressable
            onPress={goToLogin}
            accessibilityRole="button"
            style={[styles.skipBtnTop, { top: Math.max(insets.top + 8, 20) }]}
          >
            <Text style={styles.skipTextTop}>Skip</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}

        {/* Logo at the top center */}
        <View
          style={[
            styles.logoContainer,
            {
              paddingTop: isSmallScreen ? Math.max(insets.top + 16, 36) : Math.max(insets.top + 32, 60),
              paddingBottom: isSmallScreen ? 10 : 20,
            },
          ]}
        >
          <Image
            source={logo}
            style={[
              styles.logo,
              isSmallScreen && { width: 220, height: 75 },
            ]}
            resizeMode="contain"
          />
        </View>

        {/* Main content area */}
        <View
          style={[
            styles.center,
            isSmallScreen && { paddingBottom: 20 },
          ]}
          pointerEvents="none"
        >
          <View style={styles.contentContainer}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={[styles.icon, isSmallScreen && { fontSize: 32 }]}>
                {currentSlide.icon}
              </Text>
            </View>

            {/* Title with two lines */}
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.titleLine1,
                  isSmallScreen && { fontSize: 28, lineHeight: 34 },
                ]}
              >
                {currentSlide.titleLine1}
              </Text>
              <Text
                style={[
                  styles.titleLine2,
                  isSmallScreen && { fontSize: 28, lineHeight: 34 },
                ]}
              >
                {currentSlide.titleLine2}
              </Text>

              {/* Decorative underline */}
              <View style={styles.underline} />
            </View>

            {/* Subtitle */}
            <Text
              style={[
                styles.subtitle,
                isSmallScreen && { fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
              ]}
            >
              {currentSlide.subtitle}
            </Text>
          </View>
        </View>

        {/* Bottom section with dots and button */}
        <View
          style={[
            styles.bottom,
            {
              paddingBottom: Math.max(insets.bottom + 16, isSmallScreen ? 20 : 40),
              gap: isSmallScreen ? spacing.md : spacing.xl,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Dots indicator */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Next/Get Started Button with glass effect */}
          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.nextBtnContainer,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.nextBtn, isSmallScreen && { height: 52, borderRadius: 26 }]}>
              {/* Decorative leaf icons on button */}
              <Text style={styles.leafLeft}>🍂</Text>

              <View style={styles.nextBtnContent}>
                <Text style={[styles.nextText, isSmallScreen && { fontSize: 17 }]}>
                  {isLast ? 'Get Started' : 'Next'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={isSmallScreen ? 18 : 22}
                  color="#FFF"
                  style={styles.arrowIcon}
                />
              </View>

              <Text style={styles.leafRight}>🍂</Text>
            </View>
          </Pressable>
        </View>

        {/* More decorative leaves at bottom corners */}
        <View style={styles.bottomLeaves} pointerEvents="none">
          <Text style={styles.bottomLeafLeft}>🍃</Text>
          <Text style={styles.bottomLeafRight}>🍃</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a0f08',
  },
  slide: {
    flex: 1,
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeLeaves: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  leafTopLeft: {
    position: 'absolute',
    top: 120,
    left: 30,
    fontSize: 40,
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }],
  },
  leafBottomRight: {
    position: 'absolute',
    bottom: 180,
    right: 25,
    fontSize: 50,
    opacity: 0.25,
    transform: [{ rotate: '25deg' }],
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  skipBtnTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 10,
  },
  skipTextTop: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 80,
    paddingBottom: 20,
  },
  logo: {
    width: 280,
    height: 100,
  },
  center: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 44,
    opacity: 0.9,
  },
  titleContainer: {
    width: '100%',
    gap: 4,
    marginBottom: spacing.sm,
  },
  titleLine1: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleLine2: {
    color: '#D4A574',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  underline: {
    width: 60,
    height: 3,
    backgroundColor: '#D4A574',
    marginTop: spacing.sm,
    borderRadius: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    marginTop: spacing.md,
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: 50,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    borderRadius: 999,
  },
  dotActive: {
    width: 32,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextBtnContainer: {
    width: '100%',
    maxWidth: 380,
  },
  nextBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 90, 60, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  arrowIcon: {
    marginTop: 2,
  },
  leafLeft: {
    position: 'absolute',
    left: 20,
    fontSize: 28,
    opacity: 0.5,
    transform: [{ rotate: '-25deg' }],
  },
  leafRight: {
    position: 'absolute',
    right: 20,
    fontSize: 28,
    opacity: 0.5,
    transform: [{ rotate: '25deg' }],
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  bottomLeaves: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    paddingBottom: 10,
  },
  bottomLeafLeft: {
    fontSize: 35,
    opacity: 0.2,
    transform: [{ rotate: '-35deg' }],
  },
  bottomLeafRight: {
    fontSize: 35,
    opacity: 0.2,
    transform: [{ rotate: '35deg' }],
  },
});
