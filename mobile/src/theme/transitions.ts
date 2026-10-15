import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Dimensions, Easing, Platform } from 'react-native';

type TabTransition = Pick<
  BottomTabNavigationOptions,
  'animation' | 'transitionSpec' | 'sceneStyleInterpolator'
>;

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/** Tab-to-tab switch: soft cross-fade with a short directional drift and a touch of depth. */
export const tabSwitchTransition: TabTransition = {
  animation: 'shift',
  transitionSpec: { animation: 'timing', config: { duration: 260, easing: easeOut } },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, -0.4, 0, 0.4, 1],
        outputRange: [0, 0.6, 1, 0.6, 0],
      }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-32, 0, 32],
          }),
        },
        {
          scale: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.97, 1, 0.97],
          }),
        },
      ],
    },
  }),
};

/**
 * Hidden detail routes registered inside a Tabs navigator (href: null). They behave like
 * pushed pages, so they slide in fully from the right instead of cross-fading.
 */
export const tabPushTransition: TabTransition = {
  animation: 'shift',
  transitionSpec: { animation: 'timing', config: { duration: 340, easing: easeOut } },
  sceneStyleInterpolator: ({ current }) => {
    const { width } = Dimensions.get('window');
    return {
      sceneStyle: {
        opacity: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 1, 1],
        }),
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-width * 0.3, 0, width],
            }),
          },
        ],
      },
    };
  },
};

/** Default page push for native stacks; iOS keeps its native slide and edge-swipe back. */
export const stackPushTransition: NativeStackNavigationOptions = {
  animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
  animationDuration: 320,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

/** Switching between whole app areas (splash, onboarding, auth, role homes). */
export const stackFadeTransition: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 280,
};

/** Overlay-style pages such as notifications. */
export const stackSheetTransition: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: 320,
  gestureEnabled: true,
  gestureDirection: 'vertical',
};

/** Celebration / completion screens at the end of a flow. */
export const stackSuccessTransition: NativeStackNavigationOptions = {
  animation: 'fade_from_bottom',
  animationDuration: 360,
  gestureEnabled: false,
};
