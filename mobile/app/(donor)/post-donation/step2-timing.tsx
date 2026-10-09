import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';
import type { Address, DeliveryMethod, HandlingInstruction, PickupSource } from '@/types';

const NOTE_LIMIT = 150;

/** Nallur pickup used as the donor's registered address in the logistics design. */
const REGISTERED_ADDRESS: Address = {
  line1: 'Nallur Kovil Road, Jaffna',
  city: 'Jaffna',
  district: 'Opposite Hindu College Playground, Ground Floor Entrance',
  location: { type: 'Point', coordinates: [80.0298, 9.674] },
};

const HANDLING: { id: HandlingInstruction; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] =
  [
    { id: 'keep_warm', labelKey: 'donor.keepWarm', icon: 'flame-outline' },
    { id: 'requires_refrigeration', labelKey: 'donor.needsCold', icon: 'snow-outline' },
    { id: 'individually_packed', labelKey: 'donor.packed', icon: 'cube-outline' },
    { id: 'fragile_liquid', labelKey: 'donor.fragile', icon: 'water-outline' },
  ];

type Clock = { hour: number; minute: number; period: 'AM' | 'PM' };
type Picking = 'ready' | 'consume' | null;

/** FR3 — logistics: where and when the food can be collected. */
export default function Step2Timing() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draft, update } = useDonationDraft();
  const [picking, setPicking] = useState<Picking>(null);
  const [clock, setClock] = useState<Clock>({ hour: 2, minute: 30, period: 'PM' });
  const [customLine, setCustomLine] = useState(
    draft.pickupSource === 'custom' ? (draft.pickupAddress?.line1 ?? '') : '',
  );
  const [customCity, setCustomCity] = useState(
    draft.pickupSource === 'custom' ? (draft.pickupAddress?.city ?? '') : '',
  );
  const [customNote, setCustomNote] = useState(
    draft.pickupSource === 'custom' ? (draft.pickupAddress?.district ?? '') : '',
  );

  useEffect(() => {
    const patch: Parameters<typeof update>[0] = {};
    if (!draft.pickupSource) patch.pickupSource = 'registered';
    if (!draft.pickupAddress) patch.pickupAddress = REGISTERED_ADDRESS;
    if (!draft.readyFrom) patch.readyFrom = roundHalfHour(new Date()).toISOString();
    if (!draft.consumeBefore) {
      const start = new Date(draft.readyFrom ?? patch.readyFrom ?? Date.now());
      patch.consumeBefore = new Date(start.getTime() + 4.5 * 60 * 60 * 1000).toISOString();
    }
    if (!draft.handling) patch.handling = ['keep_warm', 'individually_packed'];
    if (!draft.deliveryMethod) patch.deliveryMethod = 'volunteer_rider';
    if (Object.keys(patch).length > 0) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const source: PickupSource = draft.pickupSource ?? 'registered';
  const readyFrom = draft.readyFrom ?? new Date().toISOString();
  const consumeBefore = draft.consumeBefore ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const handling = draft.handling ?? [];
  const method: DeliveryMethod = draft.deliveryMethod ?? 'volunteer_rider';
  const note = draft.handoverInstructions ?? '';
  const windowOk = new Date(consumeBefore).getTime() > Math.max(Date.now(), new Date(readyFrom).getTime());
  const customOk = customLine.trim().length >= 3 && customCity.trim().length >= 2;
  const canContinue = windowOk && (source === 'registered' || customOk);
  const minutesLeft = Math.max(
    0,
    Math.round((new Date(consumeBefore).getTime() - new Date(readyFrom).getTime()) / 60_000),
  );

  function chooseSource(next: PickupSource) {
    if (next === 'registered') {
      update({ pickupSource: next, pickupAddress: REGISTERED_ADDRESS });
      return;
    }
    update({
      pickupSource: next,
      pickupAddress: {
        line1: customLine,
        city: customCity || 'Jaffna',
        district: customNote || undefined,
        location: REGISTERED_ADDRESS.location,
      },
    });
  }

  function toggleHandling(id: HandlingInstruction) {
    const next = handling.includes(id) ? handling.filter((item) => item !== id) : [...handling, id];
    update({ handling: next });
  }

  function openClock(which: Exclude<Picking, null>) {
    setClock(readClock(which === 'ready' ? readyFrom : consumeBefore));
    setPicking(which);
  }

  function applyClock() {
    const base = picking === 'consume' ? consumeBefore : readyFrom;
    const next = writeClock(base, clock);
    update(picking === 'consume' ? { consumeBefore: next } : { readyFrom: next });
    setPicking(null);
  }

  function continueNext() {
    const pickupAddress: Address =
      source === 'registered'
        ? REGISTERED_ADDRESS
        : {
            line1: customLine.trim(),
            city: customCity.trim(),
            district: customNote.trim() || undefined,
            location: REGISTERED_ADDRESS.location,
          };
    const hours = Math.min(
      72,
      Math.max(1, Math.ceil((new Date(consumeBefore).getTime() - Date.now()) / 3_600_000)),
    );
    update({
      pickupSource: source,
      pickupAddress,
      readyFrom,
      consumeBefore,
      handling,
      deliveryMethod: method,
      handoverInstructions: note.trim() || undefined,
      cookedAt: new Date().toISOString(),
      safeForHours: hours,
    });
    router.push('/(donor)/post-donation/step3-review');
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={donorColors.ink} />
          </Pressable>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Ionicons name="restaurant" size={14} color={donorColors.orange} />
              <Text style={styles.brand}>
                Jaffna <Text style={styles.brandAccent}>Connect</Text>
              </Text>
            </View>
            <Text style={styles.kicker}>{t('donor.logisticsKicker')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(donor)/dashboard')}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={22} color={donorColors.ink} />
          </Pressable>
        </View>

        <View style={styles.steps}>
          <Step n="✓" label={t('donor.stepDetails')} done />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <Step n="2" label={t('donor.stepLogistics')} active />
          <View style={styles.stepLine} />
          <Step n="3" label={t('donor.stepReview')} />
        </View>

        <Text style={styles.title}>{t('donor.scheduleTitle')}</Text>
        <Text style={styles.lead}>{t('donor.scheduleLead')}</Text>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('donor.pickupLocation')}</Text>
          <Text style={styles.required}>{t('donor.required')}</Text>
        </View>

        <Pressable
          onPress={() => chooseSource('registered')}
          style={[styles.card, source === 'registered' && styles.cardOn]}
        >
          <View style={styles.cardTop}>
            <Radio on={source === 'registered'} />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{t('donor.useRegistered')}</Text>
              <Text style={styles.cardBody}>{REGISTERED_ADDRESS.line1}</Text>
              <Text style={styles.cardMeta}>{REGISTERED_ADDRESS.district}</Text>
              <Text style={styles.gps}>{formatGps(REGISTERED_ADDRESS)}</Text>
            </View>
            <Text style={styles.defaultBadge}>{t('donor.defaultAddress')}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => chooseSource('custom')}
          style={[styles.card, source === 'custom' && styles.cardOn]}
        >
          <View style={styles.cardTop}>
            <Radio on={source === 'custom'} />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{t('donor.differentAddress')}</Text>
              <Text style={styles.cardMeta}>{t('donor.differentAddressHint')}</Text>
            </View>
          </View>
          {source === 'custom' ? (
            <View style={styles.customFields}>
              <TextInput
                value={customLine}
                onChangeText={setCustomLine}
                placeholder={t('donor.streetPlaceholder')}
                placeholderTextColor="#B3AAA3"
                style={styles.field}
              />
              <TextInput
                value={customCity}
                onChangeText={setCustomCity}
                placeholder={t('donor.cityPlaceholder')}
                placeholderTextColor="#B3AAA3"
                style={styles.field}
              />
              <TextInput
                value={customNote}
                onChangeText={setCustomNote}
                placeholder={t('donor.landmarkPlaceholder')}
                placeholderTextColor="#B3AAA3"
                style={styles.field}
              />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('donor.freshnessWindow')}</Text>
          {minutesLeft <= 120 ? <Text style={styles.urgent}>{t('donor.urgentWindow')}</Text> : null}
        </View>
        <View style={styles.windowCard}>
          <View style={styles.windowRow}>
            <TimeCard
              label={t('donor.readyFrom')}
              day={dayLabel(readyFrom, t('donor.today'))}
              time={clockLabel(readyFrom)}
              onPress={() => openClock('ready')}
            />
            <TimeCard
              label={t('donor.consumeBefore')}
              day={dayLabel(consumeBefore, t('donor.today'))}
              time={clockLabel(consumeBefore)}
              warn={minutesLeft <= 120 || !windowOk}
              onPress={() => openClock('consume')}
            />
          </View>
          <View style={[styles.windowNoteRow, !windowOk && styles.windowNoteBad]}>
            <Ionicons
              name={windowOk ? 'time-outline' : 'alert-circle'}
              size={16}
              color={windowOk ? donorColors.green : donorColors.alert}
            />
            <Text style={[styles.windowNote, !windowOk && styles.windowNoteTextBad]}>
              {windowOk
                ? t('donor.windowRemaining', { time: formatDuration(minutesLeft) })
                : t('donor.windowInvalid')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('donor.storageTitle')}</Text>
        <View style={styles.grid}>
          {HANDLING.map((item) => {
            const on = handling.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleHandling(item.id)}
                style={[styles.handle, on && styles.handleOn]}
              >
                <Ionicons
                  name={on ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={on ? donorColors.plum : donorColors.muted}
                />
                <Ionicons name={item.icon} size={16} color={donorColors.ink} />
                <Text style={styles.handleText}>{t(item.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{t('donor.deliveryTitle')}</Text>
        <Pressable
          onPress={() => update({ deliveryMethod: 'volunteer_rider' })}
          style={[styles.card, method === 'volunteer_rider' && styles.cardOn]}
        >
          <View style={styles.cardTop}>
            <Radio on={method === 'volunteer_rider'} />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{t('donor.volunteerPickup')}</Text>
              <Text style={styles.cardMeta}>{t('donor.volunteerPickupHint')}</Text>
            </View>
            <Text style={styles.recommend}>{t('donor.recommended')}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => update({ deliveryMethod: 'self_drop' })}
          style={[styles.card, method === 'self_drop' && styles.cardOn]}
        >
          <View style={styles.cardTop}>
            <Radio on={method === 'self_drop'} />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{t('donor.selfDrop')}</Text>
              <Text style={styles.cardMeta}>{t('donor.selfDropHint')}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('donor.handoverTitle')}</Text>
          <Text style={styles.optional}>{t('donor.optional')}</Text>
        </View>
        <TextInput
          value={note}
          onChangeText={(value) => update({ handoverInstructions: value.slice(0, NOTE_LIMIT) })}
          placeholder={t('donor.handoverPlaceholder')}
          placeholderTextColor="#B3AAA3"
          multiline
          style={styles.note}
        />
        <Text style={styles.count}>
          {note.length}/{NOTE_LIMIT}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backLabel}>{t('donor.backStep')}</Text>
        </Pressable>
        <Pressable
          disabled={!canContinue}
          onPress={continueNext}
          style={[styles.nextBtn, !canContinue && styles.nextDisabled]}
        >
          <Text style={styles.nextLabel}>{t('donor.continueStep3')}</Text>
        </Pressable>
      </View>

      {picking ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => setPicking(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {picking === 'ready' ? t('donor.readyFrom') : t('donor.consumeBefore')}
            </Text>
            <View style={styles.clockRow}>
              <ClockColumn
                values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                selected={clock.hour}
                onSelect={(hour) => setClock((current) => ({ ...current, hour }))}
              />
              <ClockColumn
                values={[0, 15, 30, 45]}
                selected={clock.minute}
                label={(value) => String(value).padStart(2, '0')}
                onSelect={(minute) => setClock((current) => ({ ...current, minute }))}
              />
              <ClockColumn
                values={['AM', 'PM']}
                selected={clock.period}
                onSelect={(period) => setClock((current) => ({ ...current, period }))}
              />
            </View>
            <Pressable onPress={applyClock} style={styles.apply}>
              <Text style={styles.applyLabel}>{t('common.continue')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Step({
  n,
  label,
  active = false,
  done = false,
}: {
  n: string;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, (active || done) && styles.stepCircleActive]}>
        <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>;
}

function TimeCard({
  label,
  day,
  time,
  warn = false,
  onPress,
}: {
  label: string;
  day: string;
  time: string;
  warn?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={styles.timeCard}>
      <View style={styles.timeTop}>
        <Text style={styles.timeLabel}>{label}</Text>
        <Ionicons name="create-outline" size={14} color={donorColors.muted} />
      </View>
      <Text style={styles.timeDay}>{day}</Text>
      <View style={styles.timeValueRow}>
        <Text style={[styles.timeValue, warn && styles.timeValueWarn]}>{time}</Text>
        {warn ? <Ionicons name="warning" size={14} color={donorColors.orange} /> : null}
      </View>
      <Text style={styles.tapHint}>{t('donor.tapToChange')}</Text>
    </Pressable>
  );
}

function ClockColumn<T extends string | number>({
  values,
  selected,
  onSelect,
  label,
}: {
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
  label?: (value: T) => string;
}) {
  return (
    <ScrollView style={styles.clockCol} showsVerticalScrollIndicator={false}>
      {values.map((value) => {
        const on = value === selected;
        return (
          <Pressable key={String(value)} onPress={() => onSelect(value)} style={[styles.clockItem, on && styles.clockItemOn]}>
            <Text style={[styles.clockText, on && styles.clockTextOn]}>
              {label ? label(value) : String(value)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function roundHalfHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  next.setMinutes(minutes <= 30 ? 30 : 0);
  if (minutes > 30) next.setHours(next.getHours() + 1);
  return next;
}

function readClock(iso: string): Clock {
  const date = new Date(iso);
  const period: Clock['period'] = date.getHours() >= 12 ? 'PM' : 'AM';
  const hour = date.getHours() % 12 || 12;
  const minute = [0, 15, 30, 45].reduce((best, value) =>
    Math.abs(value - date.getMinutes()) < Math.abs(best - date.getMinutes()) ? value : best,
  );
  return { hour, minute, period };
}

function writeClock(iso: string, clock: Clock): string {
  const date = new Date(iso);
  let hours = clock.hour % 12;
  if (clock.period === 'PM') hours += 12;
  date.setHours(hours, clock.minute, 0, 0);
  return date.toISOString();
}

function dayLabel(iso: string, today: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return today;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatGps(address: Address): string {
  const [longitude, latitude] = address.location.coordinates;
  const latHem = latitude >= 0 ? 'N' : 'S';
  const lngHem = longitude >= 0 ? 'E' : 'W';
  return `GPS: ${Math.abs(latitude).toFixed(4)}° ${latHem}, ${Math.abs(longitude).toFixed(4)}° ${lngHem} (Verified)`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} mins`;
  if (rest === 0) return `${hours} hrs`;
  return `${hours} hrs ${rest} mins`;
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  scroll: { flex: 1 },
  content: { gap: 12, paddingBottom: 28, paddingHorizontal: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  brandBlock: { alignItems: 'center', gap: 2 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  brand: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  brandAccent: { color: donorColors.orange },
  kicker: { color: donorColors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  steps: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  step: { alignItems: 'center', gap: 6, width: 78 },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepCircleActive: { backgroundColor: donorColors.plum, borderColor: donorColors.plum },
  stepNum: { color: donorColors.muted, fontSize: 12, fontWeight: '700' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { color: donorColors.muted, fontSize: 11 },
  stepLabelActive: { color: donorColors.ink, fontWeight: '700' },
  stepLine: { backgroundColor: '#E4DDD6', height: 2, marginTop: 13, width: 24 },
  stepLineDone: { backgroundColor: donorColors.plum },
  title: { color: donorColors.ink, fontSize: 22, fontWeight: '800', marginTop: 8 },
  lead: { color: donorColors.muted, fontSize: 13, lineHeight: 18, marginTop: -6 },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sectionTitle: { color: donorColors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  required: { color: donorColors.alert, fontSize: 12, fontWeight: '700' },
  optional: { color: donorColors.muted, fontSize: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  cardOn: { borderColor: donorColors.plum, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', gap: 10 },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  cardBody: { color: donorColors.ink, fontSize: 13 },
  cardMeta: { color: donorColors.muted, fontSize: 12, lineHeight: 16 },
  gps: { color: donorColors.green, fontSize: 12, fontWeight: '600', marginTop: 4 },
  defaultBadge: { color: donorColors.muted, fontSize: 11, fontWeight: '700' },
  recommend: { color: donorColors.orange, fontSize: 11, fontWeight: '800' },
  radio: {
    alignItems: 'center',
    borderColor: '#D9D1CA',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  radioOn: { borderColor: donorColors.plum },
  radioDot: { backgroundColor: donorColors.plum, borderRadius: 5, height: 10, width: 10 },
  customFields: { gap: 8, marginTop: 10 },
  field: {
    backgroundColor: donorColors.background,
    borderRadius: 12,
    color: donorColors.ink,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  urgent: { color: donorColors.orange, fontSize: 12, fontWeight: '800' },
  windowCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  windowRow: { flexDirection: 'row', gap: 10 },
  timeCard: {
    backgroundColor: donorColors.background,
    borderRadius: 12,
    flex: 1,
    gap: 2,
    padding: 12,
  },
  timeTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  timeLabel: { color: donorColors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  timeDay: { color: donorColors.ink, fontSize: 12 },
  timeValueRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  timeValue: { color: donorColors.ink, fontSize: 18, fontWeight: '800' },
  timeValueWarn: { color: donorColors.orange },
  tapHint: { color: donorColors.plum, fontSize: 11, fontWeight: '700', marginTop: 4 },
  windowNoteRow: {
    alignItems: 'center',
    backgroundColor: donorColors.greenSoft,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  windowNoteBad: { backgroundColor: '#FDECEC' },
  windowNote: { color: donorColors.green, flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  windowNoteTextBad: { color: donorColors.alert },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  handle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: '48%',
  },
  handleOn: { borderColor: donorColors.plum },
  handleText: { color: donorColors.ink, flex: 1, fontSize: 12, fontWeight: '600' },
  note: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE4',
    borderRadius: 14,
    borderWidth: 1,
    color: donorColors.ink,
    fontSize: 14,
    minHeight: 90,
    padding: 12,
    textAlignVertical: 'top',
  },
  count: { alignSelf: 'flex-end', color: donorColors.muted, fontSize: 11, marginTop: -6 },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: donorColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    alignItems: 'center',
    borderColor: '#E4DDD6',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  backLabel: { color: donorColors.ink, fontSize: 14, fontWeight: '700' },
  nextBtn: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 48,
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,22,20,0.35)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    padding: 16,
  },
  sheetTitle: { color: donorColors.ink, fontSize: 16, fontWeight: '800' },
  clockRow: { flexDirection: 'row', gap: 8, maxHeight: 220 },
  clockCol: { flex: 1 },
  clockItem: { alignItems: 'center', borderRadius: 8, paddingVertical: 6 },
  clockItemOn: { backgroundColor: '#F8F1EA' },
  clockText: { color: donorColors.muted, fontSize: 14 },
  clockTextOn: { color: donorColors.plum, fontWeight: '800' },
  apply: {
    alignItems: 'center',
    backgroundColor: donorColors.plum,
    borderRadius: 12,
    paddingVertical: 12,
  },
  applyLabel: { color: '#FFFFFF', fontWeight: '700' },
});
