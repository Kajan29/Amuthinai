import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface DeliveryPinCardProps {
  pin?: string | null;
  label?: string;
  hint?: string;
}

/** Shows the handover PIN — delivery PIN for recipients, pickup PIN for donors. */
export function DeliveryPinCard({ pin, label, hint }: DeliveryPinCardProps) {
  const { t } = useTranslation();
  if (!pin) return null;

  return (
    <View style={styles.card} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name="keypad-outline" size={18} color="#5A1626" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label ?? t('recipient.deliveryPin')}</Text>
        <Text style={styles.pin}>{pin}</Text>
        <Text style={styles.hint}>{hint ?? t('recipient.deliveryPinHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  label: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pin: {
    color: '#1A1A1A',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
  },
  hint: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
