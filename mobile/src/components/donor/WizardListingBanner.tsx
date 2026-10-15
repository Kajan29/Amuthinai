import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipientInfoCard } from '@/components/flow/RecipientInfoCard';
import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';

/**
 * Tells the donor who this donation is for: the recipient request they chose (with its
 * details), or a general donation that eligible recipients can claim.
 */
export function WizardListingBanner({ allowChange = true }: { allowChange?: boolean }) {
  const { t } = useTranslation();
  const draft = useDonationDraft((state) => state.draft);
  const update = useDonationDraft((state) => state.update);
  const request = draft.requestSummary;

  if (draft.foodRequestId && request) {
    return (
      <View style={styles.wrap}>
        <View style={styles.kickerRow}>
          <Ionicons name="hand-left" size={14} color={donorColors.plum} />
          <Text style={styles.kicker}>{t('flow.requestFor', { name: request.recipientName })}</Text>
        </View>
        <RecipientInfoCard
          accent={donorColors.plum}
          title={t('flow.recipientDetails')}
          recipient={{
            name: request.recipientName,
            servingsNeeded: request.servingsNeeded,
            familySize: request.familySize,
            neededBy: request.neededBy,
            notes: request.notes,
            dietaryRequirements: request.dietaryRequirements,
            areaLabel: request.locationLabel,
            isUrgent: request.isUrgent,
          }}
        />
        {allowChange ? (
          <Pressable
            onPress={() => update({ foodRequestId: undefined, requestSummary: undefined })}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.change}>{t('flow.changeRequest')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (draft.foodRequestId) {
    return (
      <View style={styles.simple}>
        <Ionicons name="people" size={16} color={donorColors.plum} />
        <Text style={styles.simpleText}>
          {t('donor.fulfillingRequest', { count: draft.servings ?? 1 })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.simple}>
      <Ionicons name="megaphone-outline" size={16} color={donorColors.plum} />
      <View style={{ flex: 1 }}>
        <Text style={styles.simpleTitle}>{t('flow.generalDonation')}</Text>
        <Text style={styles.simpleText}>{t('flow.generalHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  kickerRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  kicker: { color: donorColors.plum, fontSize: 13, fontWeight: '800' },
  change: {
    color: donorColors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  simple: {
    alignItems: 'center',
    backgroundColor: '#F4E9EC',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  simpleTitle: { color: donorColors.plum, fontSize: 13, fontWeight: '800' },
  simpleText: { color: donorColors.plum, flex: 1, fontSize: 12, fontWeight: '600' },
});
