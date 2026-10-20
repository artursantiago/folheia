import { useEffect, useRef } from 'react';
import type { ReadingDirection } from '../../sources/types';
import {
  preferences,
  type LayoutPreference,
  type ThemePreference,
} from '../../storage/preferences';
import { Accession, Popover, PopoverRow, Segmented, Switch } from '../components';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import styles from './SettingsMenu.module.css';

export interface SettingsMenuProps {
  id: string;
  direction: ReadingDirection;
  onDirection: (direction: ReadingDirection) => void;
  onCopyDiagnostics: () => void;
  onClose: () => void;
}

export function SettingsMenu({
  id,
  direction,
  onDirection,
  onCopyDiagnostics,
  onClose,
}: SettingsMenuProps) {
  const { t, locale } = useI18n();
  const prefs = useStore(preferences);
  const ref = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<typeof prefs>) => preferences.set((p) => ({ ...p, ...patch }));

  // Closes on Escape or a click outside.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(target as Element).closest?.('[data-settings-toggle]')
      )
        onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={styles.anchor}>
      <Popover id={id} title={t('settings.title')} meta={<Accession />}>
        <PopoverRow>
          <span>{t('settings.pages')}</span>
          <Segmented<LayoutPreference>
            label={t('settings.pages')}
            value={prefs.layout}
            onChange={(layout) => set({ layout })}
            options={[
              { value: 'auto', label: t('settings.pages.auto') },
              { value: 'single', label: t('settings.pages.single') },
              { value: 'double', label: t('settings.pages.double') },
            ]}
          />
        </PopoverRow>
        <PopoverRow>
          <Switch
            label={t('settings.cover')}
            description={t('settings.coverHint')}
            checked={prefs.coverAlone}
            onChange={(coverAlone) => set({ coverAlone })}
          />
        </PopoverRow>
        <PopoverRow>
          <span>{t('settings.direction')}</span>
          <Segmented<ReadingDirection>
            label={t('settings.direction')}
            value={direction}
            onChange={onDirection}
            options={[
              { value: 'ltr', label: t('settings.direction.ltr') },
              { value: 'rtl', label: t('settings.direction.rtl') },
            ]}
          />
        </PopoverRow>
        <PopoverRow>
          <Switch
            label={t('settings.peek')}
            description={t('settings.peekHint')}
            checked={prefs.hoverPeek}
            onChange={(hoverPeek) => set({ hoverPeek })}
          />
        </PopoverRow>
        <PopoverRow>
          <span>{t('theme.label')}</span>
          <Segmented<ThemePreference>
            label={t('theme.label')}
            value={prefs.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'system', label: t('theme.system') },
              { value: 'light', label: t('theme.light') },
              { value: 'dark', label: t('theme.dark') },
            ]}
          />
        </PopoverRow>
        <PopoverRow>
          <span>{t('locale.label')}</span>
          <Segmented
            label={t('locale.label')}
            value={locale}
            onChange={(value) => set({ locale: value })}
            options={[
              { value: 'pt-BR', label: 'PT' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </PopoverRow>
        <div className={styles.footer}>
          <span className={styles.muted}>{t('settings.trouble')}</span>
          <button type="button" className={styles.link} onClick={onCopyDiagnostics}>
            {t('settings.copyDiagnostics')}
          </button>
        </div>
      </Popover>
    </div>
  );
}
