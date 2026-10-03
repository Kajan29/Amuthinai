import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { StatusEvent } from '@/types';
import { formatDateTime } from '@/utils/date';

interface StatusTimelineProps {
  events: StatusEvent[];
}

/**
 * FR12 — renders the append-only status log. Events arrive oldest-first from the server
 * and are never edited, so the list is a direct reflection of the audit trail (NFR7).
 */
export function StatusTimeline({ events }: StatusTimelineProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, isLast && styles.dotCurrent]} />
              {!isLast && <View style={styles.line} />}
            </View>

            <View style={styles.body}>
              <Text style={styles.status}>{t(`status.${event.status}`)}</Text>
              <Text style={styles.meta}>
                {formatDateTime(event.occurredAt)} · {event.actorRole}
              </Text>
              {Boolean(event.note) && <Text style={styles.note}>{event.note}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 16 },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  dotCurrent: { backgroundColor: colors.accent, height: 16, marginTop: 2, width: 16 },
  line: { backgroundColor: colors.border, flex: 1, marginVertical: 2, width: 2 },
  body: { flex: 1, gap: 2, paddingBottom: spacing.lg },
  status: { ...typography.bodyStrong, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.body, color: colors.text },
});
