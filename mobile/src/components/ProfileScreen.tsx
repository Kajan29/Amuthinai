import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authApi } from '@/api/auth.api';
import { usersApi } from '@/api/users.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { chrome } from '@/theme/chrome';
import type { Role } from '@/types';

const JAFFNA_POINT = { type: 'Point' as const, coordinates: [80.0167, 9.6615] as [number, number] };

interface ProfileMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

interface ProfileScreenProps {
  role: Role;
  children?: ReactNode;
  menuItems?: ProfileMenuItem[];
  /** Skip extra top inset when the page already has role chrome (header/sidebar). */
  embedded?: boolean;
}

function initialsOf(name?: string): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatJoined(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProfileScreen({ role, children, menuItems = [], embedded = false }: ProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, confirmLogout } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [line1, setLine1] = useState(user?.address?.line1 ?? '');
  const [city, setCity] = useState(user?.address?.city ?? '');
  const [district, setDistrict] = useState(user?.address?.district ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (editing) return;
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setLine1(user?.address?.line1 ?? '');
    setCity(user?.address?.city ?? '');
    setDistrict(user?.address?.district ?? '');
  }, [user, editing]);

  const locationLabel = [user?.address?.line1, user?.address?.city, user?.address?.district]
    .filter(Boolean)
    .join(', ');

  function startEdit() {
    setProfileError(null);
    setProfileSuccess(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setProfileError(null);
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setLine1(user?.address?.line1 ?? '');
    setCity(user?.address?.city ?? '');
    setDistrict(user?.address?.district ?? '');
  }

  async function saveProfile() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2) {
      setProfileError(t('profile.nameRequired'));
      return;
    }
    if (trimmedPhone.length < 7) {
      setProfileError(t('profile.phoneRequired'));
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const updated = await usersApi.update({
        name: trimmedName,
        phone: trimmedPhone,
        ...(line1.trim() && city.trim()
          ? {
              address: {
                line1: line1.trim(),
                city: city.trim(),
                district: district.trim() || undefined,
                location: user?.address?.location ?? JAFFNA_POINT,
              },
            }
          : {}),
      });
      setUser(updated);
      setEditing(false);
      setProfileSuccess(t('profile.profileSaved'));
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : t('profile.profileSaveFailed'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError(t('profile.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('profile.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setPasswordSuccess(t('profile.passwordChanged'));
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : t('profile.passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: embedded ? 8 : insets.top + 16,
          paddingBottom: Math.max(insets.bottom + 88, 108),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
          </View>
        </View>
        <Text style={styles.name}>{user?.name || t('common.appName')}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{t(`profile.role.${role}`)}</Text>
          </View>
          <View style={[styles.verifiedBadge, !user?.isVerified && styles.pendingBadge]}>
            <Ionicons
              name={user?.isVerified ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={user?.isVerified ? chrome.green : chrome.accent}
            />
            <Text style={[styles.verifiedText, !user?.isVerified && styles.pendingText]}>
              {user?.isVerified ? t('profile.verified') : t('profile.pending')}
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(user?.karmaPoints ?? 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('profile.karma')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatJoined(user?.createdAt)}</Text>
            <Text style={styles.statLabel}>{t('profile.memberSince')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <Ionicons name="person-outline" size={16} color={chrome.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
            <Text style={styles.sectionHint}>{t('profile.emailReadOnly')}</Text>
          </View>
          {!editing ? (
            <Pressable onPress={startEdit} style={styles.editChip} hitSlop={8}>
              <Ionicons name="create-outline" size={14} color={chrome.accent} />
              <Text style={styles.editChipText}>{t('profile.editProfile')}</Text>
            </Pressable>
          ) : null}
        </View>

        {profileSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={chrome.green} />
            <Text style={styles.successText}>{profileSuccess}</Text>
          </View>
        ) : null}
        {profileError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#D0342C" />
            <Text style={styles.errorText}>{profileError}</Text>
          </View>
        ) : null}

        {editing ? (
          <View style={styles.form}>
            <Field label={t('auth.name')} value={name} onChangeText={setName} autoCapitalize="words" />
            <Field label={t('auth.email')} value={user?.email ?? ''} editable={false} />
            <Field
              label={t('profile.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field label={t('profile.address')} value={line1} onChangeText={setLine1} />
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Field label={t('profile.city')} value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('profile.district')} value={district} onChangeText={setDistrict} />
              </View>
            </View>
            <View style={styles.formActions}>
              <Pressable onPress={cancelEdit} disabled={savingProfile} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>{t('profile.cancelEdit')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveProfile()}
                disabled={savingProfile}
                style={styles.primaryBtn}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('profile.saveProfile')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.infoList}>
            <InfoRow icon="call-outline" label={t('profile.phone')} value={user?.phone || '—'} />
            <InfoRow
              icon="location-outline"
              label={t('profile.location')}
              value={locationLabel || t('profile.locationUnset')}
            />
            <InfoRow icon="mail-outline" label={t('auth.email')} value={user?.email || '—'} />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <Ionicons name="lock-closed-outline" size={16} color={chrome.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
            <Text style={styles.sectionHint}>{t('profile.securityHint')}</Text>
          </View>
        </View>

        {passwordSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={chrome.green} />
            <Text style={styles.successText}>{passwordSuccess}</Text>
          </View>
        ) : null}
        {passwordError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#D0342C" />
            <Text style={styles.errorText}>{passwordError}</Text>
          </View>
        ) : null}

        {showPassword ? (
          <View style={styles.form}>
            <Field
              label={t('profile.currentPassword')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!revealCurrent}
              autoCapitalize="none"
              trailing={
                <Pressable onPress={() => setRevealCurrent((value) => !value)} hitSlop={8}>
                  <Ionicons
                    name={revealCurrent ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={chrome.muted}
                  />
                </Pressable>
              }
            />
            <Field
              label={t('profile.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!revealNew}
              autoCapitalize="none"
              trailing={
                <Pressable onPress={() => setRevealNew((value) => !value)} hitSlop={8}>
                  <Ionicons
                    name={revealNew ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={chrome.muted}
                  />
                </Pressable>
              }
            />
            <Field
              label={t('profile.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!revealNew}
              autoCapitalize="none"
            />
            <View style={styles.formActions}>
              <Pressable
                onPress={() => {
                  setShowPassword(false);
                  setPasswordError(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={savingPassword}
                style={styles.ghostBtn}
              >
                <Text style={styles.ghostBtnText}>{t('profile.cancelEdit')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void savePassword()}
                disabled={savingPassword}
                style={styles.primaryBtn}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('profile.updatePassword')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setShowPassword(true)} style={styles.passwordCta}>
            <Ionicons name="key-outline" size={18} color={chrome.accent} />
            <Text style={styles.passwordCtaText}>{t('profile.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={16} color={chrome.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.languageTitle')}</Text>
        <Text style={styles.sectionHint}>{t('profile.languageHint')}</Text>
        <LanguageSwitcher />
      </View>

      {children}

      {menuItems.length > 0 ? (
        <View style={styles.card}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.menuRow, index > 0 && styles.menuDivider]}
            >
              <Ionicons name={item.icon} size={20} color={item.danger ? '#D0342C' : chrome.accent} />
              <Text style={[styles.menuLabel, item.danger && styles.menuDanger]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={chrome.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => void confirmLogout()} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={18} color="#D0342C" />
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={chrome.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  trailing,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, !editable && styles.fieldBoxLocked]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.fieldInput}
          placeholderTextColor={chrome.muted}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: chrome.bg, flex: 1 },
  content: { gap: 14, paddingHorizontal: 16 },
  title: { color: chrome.ink, fontSize: 26, fontWeight: '800' },
  subtitle: { color: chrome.muted, fontSize: 13, marginTop: 4 },
  hero: {
    alignItems: 'center',
    backgroundColor: chrome.card,
    borderColor: chrome.line,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  heroAccent: {
    alignSelf: 'stretch',
    backgroundColor: chrome.accent,
    height: 64,
    marginHorizontal: -18,
    marginBottom: -36,
  },
  avatarWrap: { marginBottom: 10 },
  avatar: {
    alignItems: 'center',
    backgroundColor: chrome.accent,
    borderColor: '#FFFFFF',
    borderRadius: 40,
    borderWidth: 3,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  name: { color: chrome.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  meta: { color: chrome.muted, fontSize: 14, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  roleBadge: {
    backgroundColor: chrome.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: { color: chrome.accent, fontSize: 12, fontWeight: '800' },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: chrome.greenSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadge: { backgroundColor: chrome.accentSoft },
  verifiedText: { color: chrome.green, fontSize: 12, fontWeight: '700' },
  pendingText: { color: chrome.accent },
  statRow: {
    alignItems: 'center',
    borderTopColor: chrome.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    width: '100%',
  },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { color: chrome.ink, fontSize: 15, fontWeight: '800' },
  statLabel: { color: chrome.muted, fontSize: 11, fontWeight: '600' },
  statDivider: { alignSelf: 'stretch', backgroundColor: chrome.line, width: 1 },
  card: {
    backgroundColor: chrome.card,
    borderColor: chrome.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionHead: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: chrome.accentSoft,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sectionTitle: { color: chrome.ink, fontSize: 15, fontWeight: '800' },
  sectionHint: { color: chrome.muted, fontSize: 12, marginTop: 1 },
  editChip: {
    alignItems: 'center',
    backgroundColor: chrome.accentSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editChipText: { color: chrome.accent, fontSize: 12, fontWeight: '700' },
  infoList: { gap: 12 },
  infoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: chrome.accentSoft,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    marginTop: 2,
    width: 30,
  },
  infoLabel: { color: chrome.muted, fontSize: 11, fontWeight: '600' },
  infoValue: { color: chrome.ink, fontSize: 14, fontWeight: '600', marginTop: 1 },
  form: { gap: 12 },
  rowFields: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  fieldLabel: { color: chrome.ink, fontSize: 12, fontWeight: '700' },
  fieldBox: {
    alignItems: 'center',
    backgroundColor: chrome.bg,
    borderColor: chrome.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  fieldBoxLocked: { backgroundColor: '#F4F1EE' },
  fieldInput: { color: chrome.ink, flex: 1, fontSize: 14, paddingVertical: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  ghostBtn: {
    alignItems: 'center',
    borderColor: chrome.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  ghostBtnText: { color: chrome.ink, fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: chrome.accent,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  passwordCta: {
    alignItems: 'center',
    backgroundColor: chrome.accentSoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordCtaText: { color: chrome.accent, flex: 1, fontSize: 14, fontWeight: '700' },
  successBanner: {
    alignItems: 'center',
    backgroundColor: chrome.greenSoft,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  successText: { color: chrome.green, flex: 1, fontSize: 13, fontWeight: '600' },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FEECEC',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { color: '#D0342C', flex: 1, fontSize: 13, fontWeight: '600' },
  menuRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 8 },
  menuDivider: { borderTopColor: chrome.line, borderTopWidth: 1, paddingTop: 12 },
  menuLabel: { color: chrome.ink, flex: 1, fontSize: 14, fontWeight: '600' },
  menuDanger: { color: '#D0342C' },
  signOut: {
    alignItems: 'center',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  signOutText: { color: '#D0342C', fontSize: 15, fontWeight: '700' },
});
