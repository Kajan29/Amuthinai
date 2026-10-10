import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/constants';
import { donorColors } from '@/theme/donor';

interface DonorWizardHeaderProps {
  onBack: () => void;
  onClose?: () => void;
  subtitle?: string;
}

/** Same logo header as the donor dashboard, used on post-donation steps 1–3. */
export function DonorWizardHeader({ onBack, onClose, subtitle }: DonorWizardHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={22} color={donorColors.ink} />
        </Pressable>

        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {onClose ? (
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.circleBtn}>
            <Ionicons name="close" size={20} color={donorColors.ink} />
          </Pressable>
        ) : (
          <View style={styles.circleBtn} />
        )}
      </View>
      {subtitle ? (
        <View style={styles.subtitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  circleBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE6DE',
    borderRadius: 21,
    borderWidth: 1,
    elevation: 2,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    width: 42,
  },
  logo: { height: 38, width: 135 },
  subtitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  liveDot: { backgroundColor: donorColors.green, borderRadius: 4, height: 7, width: 7 },
  subtitle: { color: donorColors.muted, fontSize: 12, fontWeight: '600' },
});
