import { messages, type Locale, type MessageKey } from './messages';

export type { Locale, MessageKey };
export type MessageParams = Record<string, string | number>;

export function detectLocale(languages: readonly string[] = navigator.languages): Locale {
  for (const lang of languages) {
    if (lang.toLowerCase().startsWith('pt')) return 'pt-BR';
    if (lang.toLowerCase().startsWith('en')) return 'en';
  }
  return 'pt-BR';
}

/** Looks up a message and fills `{name}` placeholders. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template: string = messages[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
