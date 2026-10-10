import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ProfileScreen } from '@/components/ProfileScreen';
import { chrome } from '@/theme/chrome';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [pushUrgentAlerts, setPushUrgentAlerts] = useState(true);

  return (
    <ProfileScreen
      role="admin"
      menuItems={[
        {
          icon: 'map-outline',
          label: t('admin.liveMap'),
          onPress: () => router.push('/(admin)/map' as any),
        },
        {
          icon: 'bar-chart-outline',
          label: t('admin.analytics'),
          onPress: () => router.push('/(admin)/analytics' as any),
        },
        {
          icon: 'warning-outline',
          label: t('admin.disputes'),
          onPress: () => router.push('/(admin)/disputes' as any),
        },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t('admin.dispatchControls')}</Text>
        <View style={styles.setting}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('admin.autoMatch')}</Text>
            <Text style={styles.hint}>{t('admin.autoMatchHint')}</Text>
          </View>
          <Switch
            value={autoDispatch}
            onValueChange={setAutoDispatch}
            trackColor={{ false: '#DDD', true: chrome.accent }}
          />
        </View>
        <View style={styles.setting}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('admin.urgentAlerts')}</Text>
            <Text style={styles.hint}>{t('admin.urgentAlertsHint')}</Text>
          </View>
          <Switch
            value={pushUrgentAlerts}
            onValueChange={setPushUrgentAlerts}
            trackColor={{ false: '#DDD', true: chrome.accent }}
          />
        </View>
      </View>
    </ProfileScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: chrome.card,
    borderColor: chrome.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  title: { color: chrome.ink, fontSize: 15, fontWeight: '800' },
  setting: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  label: { color: chrome.ink, fontSize: 14, fontWeight: '700' },
  hint: { color: chrome.muted, fontSize: 12, marginTop: 2 },
});
