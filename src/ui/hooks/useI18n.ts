import { useCallback, useEffect } from 'react';
import {
  detectLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from '../../i18n';
import { preferences } from '../../storage/preferences';
import { useStore } from './useStore';

export interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: MessageParams) => string;
}

export function useI18n(): I18n {
  const { locale: chosen } = useStore(preferences);
  const locale = chosen ?? detectLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = useCallback(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  );
  return { locale, t };
}
