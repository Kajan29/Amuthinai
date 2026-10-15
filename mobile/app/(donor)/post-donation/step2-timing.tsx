import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DonorWizardHeader } from '@/components/donor/DonorWizardHeader';
import { DELIVERY_METHODS } from '@/components/flow/deliveryMethods';
import { MAX_SAFE_HOURS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useDonationDraft } from '@/store/donationDraft.store';
import { donorColors } from '@/theme/donor';
import type { Address, DeliveryMethod, FoodType, HandlingInstruction, PickupSource } from '@/types';
import { validatePrepareTime } from '@/utils/freshness';

const NOTE_LIMIT = 150;

/** Used when the donor has not saved an address on their profile yet. */
const FALLBACK_ADDRESS: Address = {
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
type Picking = 'ready' | 'consume' | 'cooked' | null;

/** FR3 — logistics: where and when the food can be collected. */
export default function Step2Timing() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { draft, update } = useDonationDraft();
  const gps = useLocation(false);
  const REGISTERED_ADDRESS: Address = user?.address?.location?.coordinates?.length
    ? user.address
    : FALLBACK_ADDRESS;
  const [customPoint, setCustomPoint] = useState<Address['location'] | null>(
    draft.pickupSource === 'custom' ? (draft.pickupAddress?.location ?? null) : null,
  );
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
    const foodType: FoodType = draft.foodType ?? 'cooked';
    const maxHours = MAX_SAFE_HOURS[foodType];
    if (!draft.pickupSource) patch.pickupSource = 'registered';
    if (!draft.pickupAddress) patch.pickupAddress = REGISTERED_ADDRESS;
    if (!draft.cookedAt) patch.cookedAt = roundHalfHour(new Date()).toISOString();
    if (!draft.readyFrom) patch.readyFrom = draft.cookedAt ?? patch.cookedAt;
    const cooked = new Date(draft.cookedAt ?? patch.cookedAt ?? Date.now());
    const autoDeadline = new Date(cooked.getTime() + maxHours * 60 * 60 * 1000).toISOString();
    if (!draft.consumeBefore || (foodType === 'cooked' && new Date(draft.consumeBefore).getTime() > new Date(autoDeadline).getTime())) {
      patch.consumeBefore = autoDeadline;
      patch.safeForHours = maxHours;
    }
    if (!draft.handling) patch.handling = ['keep_warm', 'individually_packed'];
    if (!draft.deliveryMethod) patch.deliveryMethod = 'volunteer_rider';
    if (Object.keys(patch).length > 0) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const source: PickupSource = draft.pickupSource ?? 'registered';
  const foodType: FoodType = draft.foodType ?? 'cooked';
  const isCooked = foodType === 'cooked';
  const cookedAt = draft.cookedAt ?? new Date().toISOString();
  const readyFrom = draft.readyFrom ?? cookedAt;
  const consumeBefore = draft.consumeBefore ?? new Date(Date.now() + MAX_SAFE_HOURS[foodType] * 60 * 60 * 1000).toISOString();
  const handling = draft.handling ?? [];
  const method: DeliveryMethod = draft.deliveryMethod ?? 'volunteer_rider';
  const note = draft.handoverInstructions ?? '';
  const windowOk =
    new Date(consumeBefore).getTime() > Math.max(Date.now(), new Date(readyFrom).getTime()) &&
    new Date(consumeBefore).getTime() > new Date(cookedAt).getTime();
  const prepare = validatePrepareTime(draft.cookedAt ?? cookedAt, foodType);
  const customOk = customLine.trim().length >= 3 && customCity.trim().length >= 2;
  const canContinue = prepare.ok && windowOk && (source === 'registered' || customOk);

  function prepareErrorMessage(): string {
    if (prepare.ok) return '';
    if (prepare.issue === 'future') return t('donor.prepareFuture');
    if (prepare.issue === 'missing' || prepare.issue === 'invalid') return t('donor.prepareRequired');
    return t('donor.prepareTooOld', { hours: prepare.maxHours });
  }
  const minutesLeft = Math.max(
    0,
    Math.round((new Date(consumeBefore).getTime() - Date.now()) / 60_000),
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
        location: customPoint ?? REGISTERED_ADDRESS.location,
      },
    });
  }

  async function pinCurrentLocation() {
    const point = await gps.refresh().catch(() => null);
    if (!point) {
      Alert.alert(t('flow.useCurrentLocation'), t('flow.locationFailed'));
      return;
    }
    setCustomPoint(point);
  }

  function toggleHandling(id: HandlingInstruction) {
    const next = handling.includes(id) ? handling.filter((item) => item !== id) : [...handling, id];
    update({ handling: next });
  }

  function openClock(which: Exclude<Picking, null>) {
    const sourceTime = which === 'cooked' ? cookedAt : which === 'ready' ? readyFrom : consumeBefore;
    setClock(readClock(sourceTime));
    setPicking(which);
  }

  function applyClock() {
    if (picking === 'cooked') {
      const next = writeClock(cookedAt, clock);
      const check = validatePrepareTime(next, foodType);
      if (!check.ok) {
        Alert.alert(
          t('donor.cookedAtLabel'),
          check.issue === 'future'
            ? t('donor.prepareFuture')
            : t('donor.prepareTooOld', { hours: check.maxHours }),
        );
        return;
      }
      const maxHours = MAX_SAFE_HOURS[foodType];
      const deadline = new Date(new Date(next).getTime() + maxHours * 60 * 60 * 1000).toISOString();
      update({
        cookedAt: next,
        consumeBefore: isCooked ? deadline : consumeBefore,
        safeForHours: isCooked ? maxHours : draft.safeForHours,
      });
    } else if (picking === 'consume') {
      let next = writeClock(consumeBefore, clock);
      if (isCooked) {
        const maxDeadline = new Date(cookedAt).getTime() + MAX_SAFE_HOURS.cooked * 60 * 60 * 1000;
        if (new Date(next).getTime() > maxDeadline) {
          next = new Date(maxDeadline).toISOString();
        }
      }
      update({ consumeBefore: next });
    } else {
      update({ readyFrom: writeClock(readyFrom, clock) });
    }
    setPicking(null);
  }

  function continueNext() {
    if (!prepare.ok) {
      Alert.alert(t('donor.cookedAtLabel'), prepareErrorMessage());
      return;
    }
    const pickupAddress: Address =
      source === 'registered'
        ? REGISTERED_ADDRESS
        : {
            line1: customLine.trim(),
            city: customCity.trim(),
            district: customNote.trim() || undefined,
            location: customPoint ?? REGISTERED_ADDRESS.location,
          };
    const maxHours = MAX_SAFE_HOURS[foodType];
    const hoursFromCooked = Math.ceil(
      (new Date(consumeBefore).getTime() - new Date(cookedAt).getTime()) / 3_600_000,
    );
    const hours = Math.min(maxHours, Math.max(1, hoursFromCooked));
    update({
      pickupSource: source,
      pickupAddress,
      readyFrom,
      consumeBefore,
      handling,
      deliveryMethod: method,
      handoverInstructions: note.trim() || undefined,
      cookedAt,
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
        <DonorWizardHeader
          onBack={() => router.back()}
          onClose={() => router.replace('/(donor)/dashboard')}
          subtitle={t('donor.logisticsKicker')}
        />

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
              <Pressable
                onPress={() => void pinCurrentLocation()}
                style={[styles.gpsBtn, customPoint && styles.gpsBtnOn]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={customPoint ? 'checkmark-circle' : 'locate'}
                  size={16}
                  color={customPoint ? donorColors.green : donorColors.plum}
                />
                <Text style={[styles.gpsBtnText, customPoint && { color: donorColors.green }]}>
                  {gps.isLoading
                    ? '…'
                    : customPoint
                      ? `${t('flow.locationSet')} · ${formatGps({ ...REGISTERED_ADDRESS, location: customPoint }).replace('GPS: ', '').replace(' (Verified)', '')}`
                      : t('flow.useCurrentLocation')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('donor.freshnessWindow')}</Text>
          {minutesLeft <= 120 ? <Text style={styles.urgent}>{t('donor.urgentWindow')}</Text> : null}
        </View>
        <View style={styles.windowCard}>
          <TimeCard
            label={`${t('donor.cookedAtLabel')} *`}
            day={dayLabel(cookedAt, t('donor.today'))}
            time={clockLabel(cookedAt)}
            warn={!prepare.ok}
            onPress={() => openClock('cooked')}
          />
          {isCooked ? <Text style={styles.cookedHint}>{t('donor.cookedDeadlineHint')}</Text> : null}
          {!prepare.ok ? (
            <View style={[styles.windowNoteRow, styles.windowNoteBad]}>
              <Ionicons name="alert-circle" size={16} color={donorColors.alert} />
              <Text style={[styles.windowNote, styles.windowNoteTextBad]}>{prepareErrorMessage()}</Text>
            </View>
          ) : null}
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
              locked={isCooked}
              onPress={isCooked ? undefined : () => openClock('consume')}
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
          {isCooked ? (
            <View style={styles.safetyBanner}>
              <Ionicons name="shield-checkmark" size={16} color={donorColors.orange} />
              <Text style={styles.safetyText}>{t('donor.cookedSafetyReminder')}</Text>
            </View>
          ) : null}
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

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('flow.preferredMethod')}</Text>
        </View>
        {DELIVERY_METHODS.map((option) => {
          const on = method === option.method;
          return (
            <Pressable
              key={option.method}
              onPress={() => update({ deliveryMethod: option.method })}
              style={[styles.card, on && styles.cardOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <View style={styles.cardTop}>
                <Radio on={on} />
                <View style={styles.methodIcon}>
                  <Ionicons name={option.icon} size={16} color={donorColors.plum} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{t(option.labelKey)}</Text>
                  <Text style={styles.cardMeta}>{t(option.hintKey)}</Text>
                </View>
                {option.method === 'volunteer_rider' ? (
                  <Text style={styles.recommend}>{t('donor.recommended')}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <View style={styles.methodNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={donorColors.muted} />
          <Text style={styles.methodNoteText}>
            {t('flow.adminConfirms')} {t('flow.verificationRequired')}
          </Text>
        </View>

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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
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
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <Text style={styles.sheetTitle}>
              {picking === 'cooked'
                ? t('donor.cookedAtLabel')
                : picking === 'ready'
                  ? t('donor.readyFrom')
                  : t('donor.consumeBefore')}
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
  locked = false,
  onPress,
}: {
  label: string;
  day: string;
  time: string;
  warn?: boolean;
  locked?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.timeCard}>
      <View style={styles.timeTop}>
        <Text style={styles.timeLabel}>{label}</Text>
        <Ionicons
          name={locked ? 'lock-closed-outline' : 'create-outline'}
          size={14}
          color={donorColors.muted}
        />
      </View>
      <Text style={styles.timeDay}>{day}</Text>
      <View style={styles.timeValueRow}>
        <Text style={[styles.timeValue, warn && styles.timeValueWarn]}>{time}</Text>
        {warn ? <Ionicons name="warning" size={14} color={donorColors.orange} /> : null}
      </View>
      <Text style={styles.tapHint}>
        {locked ? t('donor.consumeLockedCooked') : t('donor.tapToChange')}
      </Text>
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
  step: { alignItems: 'center', flex: 1, gap: 6, maxWidth: 90 },
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
  stepLine: { backgroundColor: '#E4DDD6', flex: 1, height: 2, marginTop: 13, maxWidth: 36, minWidth: 12 },
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
  gpsBtn: {
    alignItems: 'center',
    borderColor: donorColors.plum,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gpsBtnOn: { borderColor: donorColors.green, borderStyle: 'solid', backgroundColor: donorColors.greenSoft },
  gpsBtnText: { color: donorColors.plum, flex: 1, fontSize: 12, fontWeight: '700' },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: '#F4E9EC',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  methodNote: { alignItems: 'flex-start', flexDirection: 'row', gap: 6, marginTop: -2 },
  methodNoteText: { color: donorColors.muted, flex: 1, fontSize: 11, lineHeight: 16 },
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
  cookedHint: { color: donorColors.orange, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  safetyBanner: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF6EC',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  safetyText: { color: '#8A5A32', flex: 1, fontSize: 12, lineHeight: 17 },
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
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
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
