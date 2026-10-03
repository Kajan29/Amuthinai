import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { assignmentsApi } from '@/api/assignments.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { TRAVEL_RADIUS_OPTIONS_KM, VEHICLE_TYPES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, typography } from '@/theme';
import type { VehicleType } from '@/types';

/** FR7 — vehicle and travel radius drive which pickups the volunteer is offered. */
export default function VolunteerProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [vehicleType, setVehicleType] = useState<VehicleType>(user?.vehicleType ?? 'motorbike');
  const [travelRadiusKm, setTravelRadiusKm] = useState(user?.travelRadiusKm ?? 5);

  const save = useMutation({
    mutationFn: () => assignmentsApi.updateProfile({ vehicleType, travelRadiusKm }),
  });

  return (
    <Screen
      footer={<Button label={t('common.signOut')} variant="ghost" onPress={() => void logout()} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name}>{user?.name}</Text>
        <LanguageSwitcher />
      </View>

      <Card>
        <Text style={styles.label}>Verification</Text>
        <Badge
          label={user?.isVerified ? 'Verified volunteer' : 'Awaiting admin verification'}
          tone={user?.isVerified ? 'success' : 'warning'}
        />
      </Card>

      <Card>
        <Text style={styles.label}>{t('volunteer.vehicle')}</Text>
        <View style={styles.chips}>
          {VEHICLE_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setVehicleType(type)}
              style={[styles.chip, vehicleType === type && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, vehicleType === type && styles.chipLabelActive]}>
                {type.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{t('volunteer.travelRadius')}</Text>
        <View style={styles.chips}>
          {TRAVEL_RADIUS_OPTIONS_KM.map((km) => (
            <Pressable
              key={km}
              onPress={() => setTravelRadiusKm(km)}
              style={[styles.chip, travelRadiusKm === km && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, travelRadiusKm === km && styles.chipLabelActive]}>
                {km} km
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button label={t('common.submit')} loading={save.isPending} onPress={() => save.mutate()} />
      {save.isSuccess && <Text style={styles.saved}>Saved</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.h3, color: colors.text },
  label: { ...typography.bodyStrong, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  chipLabelActive: { color: colors.primaryDark, fontWeight: '600' },
  saved: { ...typography.caption, color: colors.success, textAlign: 'center' },
});
