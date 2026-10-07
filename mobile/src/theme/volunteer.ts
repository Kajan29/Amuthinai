/** 
 * Volunteer dashboard palette — warm maroon header tones matching the Amuthinai 
 * design system, with forest-green accents for task actions.
 */
export const volunteerColors = {
  /** Header / branding bar background */
  headerBg: '#5A1626',
  headerText: '#FFFFFF',
  headerAccent: '#F0A03A',

  /** Page background */
  background: '#F7F3EE',
  card: '#FFFFFF',

  /** Typography */
  ink: '#1C1614',
  muted: '#8A8178',

  /** Accent palette */
  maroon: '#5A1626',
  maroonSoft: '#FBEFF2',
  orange: '#F0A03A',
  orangeSoft: '#FFF4E6',
  green: '#0F7B4F',
  greenSoft: '#E3F3EB',
  greenDark: '#0A5B3A',

  /** Status */
  urgentRed: '#D0342C',
  urgentRedSoft: '#FBE6E4',
  warningAmber: '#E8A33D',
  warningAmberSoft: '#FCF1DF',
  infoBlue: '#2B6CB0',
  infoBlueSoft: '#E5EEF8',

  /** Borders & surfaces */
  line: '#EFEAE4',
  surfaceAlt: '#F3F0EC',
  badge: '#E7E2DC',

  /** Karma tier colours */
  tierBronze: '#CD7F32',
  tierSilver: '#A8A9AD',
  tierGold: '#FFD700',
  tierPlatinum: '#E5E4E2',
  tierDiamond: '#B9F2FF',
} as const;

export interface KarmaTier {
  key: string;
  label: string;
  minPoints: number;
  color: string;
  icon: string;
}

/** Karma tier definitions */
export const KARMA_TIERS: readonly KarmaTier[] = [
  { key: 'bronze',   label: 'Bronze Helper',          minPoints: 0,    color: '#CD7F32', icon: '🥉' },
  { key: 'silver',   label: 'Silver Volunteer',       minPoints: 500,  color: '#A8A9AD', icon: '🥈' },
  { key: 'gold',     label: 'Gold Champion',          minPoints: 1500, color: '#FFD700', icon: '🥇' },
  { key: 'platinum', label: 'Platinum Guardian',      minPoints: 3500, color: '#E5E4E2', icon: '💎' },
  { key: 'diamond',  label: 'Diamond Legend',         minPoints: 7000, color: '#B9F2FF', icon: '👑' },
];

export interface TierInfo extends KarmaTier {
  index: number;
  next: KarmaTier | null;
  progress: number;
}

export function getTier(points: number): TierInfo {
  for (let i = KARMA_TIERS.length - 1; i >= 0; i--) {
    const current = KARMA_TIERS[i]!;
    if (points >= current.minPoints) {
      const next = (i < KARMA_TIERS.length - 1 ? KARMA_TIERS[i + 1] : null) ?? null;
      const progress = next
        ? (points - current.minPoints) / (next.minPoints - current.minPoints)
        : 1;
      return {
        key: current.key,
        label: current.label,
        minPoints: current.minPoints,
        color: current.color,
        icon: current.icon,
        index: i,
        next,
        progress: Math.min(Math.max(progress, 0), 1),
      };
    }
  }
  const first = KARMA_TIERS[0]!;
  return {
    key: first.key,
    label: first.label,
    minPoints: first.minPoints,
    color: first.color,
    icon: first.icon,
    index: 0,
    next: KARMA_TIERS[1] ?? null,
    progress: 0,
  };
}
