import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { chrome } from '@/theme/chrome';
import type { Role } from '@/types';

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
}

function initialsOf(name?: string): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function ProfileScreen({ role, children, menuItems = [] }: ProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, confirmLogout } = useAuth();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom + 88, 108),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
        </View>
        <Text style={styles.name}>{user?.name || t('common.appName')}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
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
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? '#D0342C' : chrome.accent}
              />
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

const styles = StyleSheet.create({
  root: { backgroundColor: chrome.bg, flex: 1 },
  content: { gap: 14, paddingHorizontal: 16 },
  title: { color: chrome.ink, fontSize: 26, fontWeight: '800' },
  card: {
    backgroundColor: chrome.card,
    borderColor: chrome.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: chrome.accent,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  name: { color: chrome.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  meta: { color: chrome.muted, fontSize: 14, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
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
  sectionTitle: { color: chrome.ink, fontSize: 15, fontWeight: '800' },
  sectionHint: { color: chrome.muted, fontSize: 12, marginTop: -4 },
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
