import { messages, type Locale, type MessageKey } from './messages';

export type { Locale, MessageKey };

export function detectLocale(languages: readonly string[] = navigator.languages): Locale {
  for (const lang of languages) {
    if (lang.toLowerCase().startsWith('pt')) return 'pt-BR';
    if (lang.toLowerCase().startsWith('en')) return 'en';
  }
  return 'pt-BR';
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
