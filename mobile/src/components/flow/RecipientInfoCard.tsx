import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock } from '@/utils/format';

export interface RecipientInfo {
  name: string;
  servingsNeeded: number;
  familySize?: number | null;
  neededBy?: string | null;
  notes?: string | null;
  dietaryRequirements?: string[];
  areaLabel?: string | null;
  phone?: string | null;
  origin?: 'request' | 'claim';
  isUrgent?: boolean;
}

interface RecipientInfoCardProps {
  recipient: RecipientInfo;
  accent?: string;
  title?: string;
}

/** Who the food is for — shown to donors when answering a request and to admins on review. */
export function RecipientInfoCard({ recipient, accent = '#5A1626', title }: RecipientInfoCardProps) {
  const { t } = useTranslation();
  const initial = recipient.name.trim().charAt(0).toUpperCase() || 'R';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${accent}14` }]}>
          <Text style={[styles.avatarText, { color: accent }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{title ?? t('flow.recipientDetails')}</Text>
          <Text style={styles.name}>{recipient.name}</Text>
        </View>
        {recipient.isUrgent ? (
          <View style={styles.urgent}>
            <Ionicons name="flame" size={11} color="#C2410C" />
            <Text style={styles.urgentText}>{t('flow.urgent')}</Text>
          </View>
        ) : recipient.origin ? (
          <View style={[styles.tag, { backgroundColor: `${accent}12` }]}>
            <Text style={[styles.tagText, { color: accent }]}>
              {recipient.origin === 'claim' ? t('flow.claimedGeneral') : t('flow.forRequest')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <Fact icon="restaurant-outline" text={t('flow.servingsNeeded', { count: recipient.servingsNeeded })} />
        {recipient.familySize ? (
          <Fact icon="people-outline" text={t('flow.familyOf', { count: recipient.familySize })} />
        ) : null}
        {recipient.neededBy ? (
          <Fact icon="time-outline" text={t('flow.neededBy', { time: formatClock(recipient.neededBy) })} />
        ) : null}
        {recipient.areaLabel ? <Fact icon="location-outline" text={recipient.areaLabel} /> : null}
      </View>

      {recipient.dietaryRequirements?.length ? (
        <View style={styles.chips}>
          {recipient.dietaryRequirements.map((need) => (
            <View key={need} style={styles.chip}>
              <Text style={styles.chipText}>{need.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {recipient.notes ? (
        <View style={styles.notes}>
          <Ionicons name="chatbox-ellipses-outline" size={14} color="#7A7068" />
          <Text style={styles.notesText}>{recipient.notes}</Text>
        </View>
      ) : null}

      {recipient.phone ? (
        <Pressable
          style={[styles.call, { borderColor: accent }]}
          onPress={() => Linking.openURL(`tel:${recipient.phone}`)}
          accessibilityRole="button"
        >
          <Ionicons name="call" size={14} color={accent} />
          <Text style={[styles.callText, { color: accent }]}>
            {t('flow.callRecipient')} · {recipient.phone}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Fact({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color="#7A7068" />
      <Text style={styles.factText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  avatarText: { fontSize: 16, fontWeight: '800' },
  kicker: { color: '#9A928A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  name: { color: '#1F1A17', fontSize: 16, fontWeight: '800', marginTop: 1 },
  urgent: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: { color: '#C2410C', fontSize: 10, fontWeight: '800' },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: {
    alignItems: 'center',
    backgroundColor: '#F7F3EE',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  factText: { color: '#3F3833', fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#EEF7F1', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { color: '#1E6B43', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  notes: { alignItems: 'flex-start', flexDirection: 'row', gap: 6 },
  notesText: { color: '#5C534C', flex: 1, fontSize: 13, lineHeight: 18 },
  call: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  callText: { fontSize: 12, fontWeight: '800' },
});
