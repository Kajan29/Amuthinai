import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Set false for screens that own their own scrolling, such as lists and maps. */
  scroll?: boolean;
  footer?: ReactNode;
  /** Add top inset padding for screens without native headers */
  safeTop?: boolean;
  /** Additional bottom padding (e.g. For tab bar clearance) */
  extraBottomPadding?: number;
}

/** Shared page frame: safe-area padding, background and an optional pinned footer. */
export function Screen({
  children,
  scroll = true,
  footer,
  safeTop = false,
  extraBottomPadding = 0,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, safeTop && { paddingTop: insets.top }]}>
      <Container
        style={[
          styles.content,
          !scroll && [
            styles.nonScrollContent,
            !footer && {
              paddingBottom: Math.max(
                insets.bottom + spacing.lg + extraBottomPadding,
                spacing.xl + extraBottomPadding,
              ),
            },
          ],
        ]}
        contentContainerStyle={
          scroll
            ? [
                styles.scrollContent,
                !footer && {
                  paddingBottom: Math.max(
                    insets.bottom + spacing.lg + extraBottomPadding,
                    spacing.xl + extraBottomPadding,
                  ),
                },
              ]
            : undefined
        }
      >
        {children}
      </Container>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { flex: 1 },
  nonScrollContent: { gap: spacing.lg, padding: spacing.lg },
  scrollContent: { gap: spacing.lg, padding: spacing.lg },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
