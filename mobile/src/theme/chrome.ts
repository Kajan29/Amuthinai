/** Shared chrome so every role screen uses the same layout language. */
export const chrome = {
  accent: '#5A1626',
  accentSoft: '#FDF2F4',
  muted: '#8E8E93',
  ink: '#1A1A1A',
  bg: '#FCF9F7',
  card: '#FFFFFF',
  line: '#F0E8E4',
  green: '#0F7B4F',
  greenSoft: '#E3F5EC',
} as const;

export function roleTabBarStyle(bottomPadding: number) {
  return {
    backgroundColor: chrome.card,
    borderTopColor: chrome.line,
    borderTopWidth: 1,
    height: 68 + bottomPadding,
    paddingTop: 6,
    paddingBottom: bottomPadding,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  };
}
