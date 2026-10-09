export const colors = {
  primary: '#0F7B4F',
  primaryDark: '#0A5B3A',
  primaryLight: '#E3F3EB',
  accent: '#F2A13B',

  success: '#1E8E3E',
  warning: '#E8A33D',
  danger: '#D0342C',
  info: '#2B6CB0',

  text: '#15211C',
  textMuted: '#5F6B66',
  textInverse: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#F6F8F7',
  border: '#DFE5E2',
  overlay: 'rgba(0, 0, 0, 0.45)',

  // Amuthinai Admin Theme Palette (Matching Operations Hub UI)
  adminMaroon: '#531827',
  adminMaroonDark: '#3E101E',
  adminMaroonLight: '#FDF2F4',
  creamBg: '#FCF9F7',
  cardBorder: '#F0E8E4',
  mint: '#2E9383',
  mintLight: '#E3F5F0',
  amber: '#E89838',
  amberLight: '#FEF4E8',
  urgentRed: '#E53E3E',
  urgentRedLight: '#FDECEB',
} as const;

export type ColorName = keyof typeof colors;
