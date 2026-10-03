import type { Language } from '@/types';

const LOCALES: Record<Language, string> = {
  en: 'en-LK',
  ta: 'ta-LK',
  si: 'si-LK',
};

export function formatDateTime(iso: string, language: Language = 'en'): string {
  return new Date(iso).toLocaleString(LOCALES[language], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string, language: Language = 'en'): string {
  return new Date(iso).toLocaleTimeString(LOCALES[language], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const diffMinutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  if (Math.abs(diffMinutes) < 1440) return formatter.format(Math.round(diffMinutes / 60), 'hour');
  return formatter.format(Math.round(diffMinutes / 1440), 'day');
}
