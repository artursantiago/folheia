import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createStore, type Store } from '../../lib/store';
import { createBudget, currentEnvironment } from '../../render/budget';
import type { BookMetadata, PageSource } from '../../sources/types';
import { Reader, type ReaderState } from '../../viewer/Reader';
import { Icon, IconButton, PageCounter, ReaderBar, TextField } from '../components';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import styles from './ReaderScreen.module.css';

const IDLE_MS = 3000;
const emptyState = createStore<ReaderState | undefined>(undefined);

export function initialPageFromHash(hash = window.location.hash): number | undefined {
  const match = hash.match(/(?:^#|&)p=(\d+)/);
  return match ? Number(match[1]) : undefined;
}

export interface ReaderScreenProps {
  source: PageSource;
  metadata: BookMetadata;
  name: string;
  onClose: () => void;
}

export function ReaderScreen({ source, metadata, name, onClose }: ReaderScreenProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const [reader, setReader] = useState<Reader>();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [goToOpen, setGoToOpen] = useState(false);
  const [goToValue, setGoToValue] = useState('');
  const hoveringBar = useRef(false);
  const budget = useMemo(() => createBudget(currentEnvironment()), []);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    const instance = new Reader({
      source,
      container,
      budget,
      options: { layout: 'auto', coverAlone: true, direction: undefined, hoverPeek: true },
      fileDirection: metadata.direction,
      initialPage: initialPageFromHash(),
      pageLabel: (number) => tRef.current('reader.page', { number }),
    });
    setReader(instance);
    return () => {
      instance.destroy();
      setReader(undefined);
    };
  }, [source, metadata.direction, budget]);

  const state = useStore((reader?.state ?? emptyState) as Store<ReaderState | undefined>);

  // Keep the page in the address so a reload (or a shared link) lands here.
  useEffect(() => {
    if (!state) return;
    const url = new URL(window.location.href);
    url.hash = `p=${state.page}`;
    history.replaceState(history.state, '', url);
  }, [state?.page, state]);

  // Arrow keys follow the visual direction; RTL books turn the other way.
  useEffect(() => {
    if (!reader) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const rtl = reader.state.get().direction === 'rtl';
      const actions: Record<string, () => void> = {
        ArrowRight: () => (rtl ? reader.prev() : reader.next()),
        ArrowLeft: () => (rtl ? reader.next() : reader.prev()),
        PageDown: () => reader.next(),
        PageUp: () => reader.prev(),
        ' ': () => reader.next(),
        Home: () => reader.first(),
        End: () => reader.last(),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
      setChromeVisible(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reader]);

  // The bar fades out after a few idle seconds and comes back on any movement.
  useEffect(() => {
    let timer = window.setTimeout(() => setChromeVisible(false), IDLE_MS);
    const wake = () => {
      setChromeVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!hoveringBar.current) setChromeVisible(false);
      }, IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
    };
  }, []);

  const title = metadata.title ?? name;
  const details = [metadata.author, metadata.date].filter(Boolean).join(' · ');

  const submitGoTo = (event: FormEvent) => {
    event.preventDefault();
    const page = Number(goToValue);
    if (reader && Number.isFinite(page) && page >= 1) reader.goToPage(page);
    setGoToOpen(false);
    setGoToValue('');
  };

  return (
    <div className={styles.reader} data-chrome={chromeVisible ? 'visible' : 'hidden'}>
      <div className={styles.lamp} aria-hidden="true" />
      <header className={styles.top}>
        <button
          type="button"
          className={styles.back}
          onClick={onClose}
          aria-label={t('reader.back')}
        >
          <Icon name="prev" />
          <span className={styles.backText}>{t('reader.back')}</span>
        </button>
        <div className={styles.title}>
          <span className={styles.titleText}>{title}</span>
          {details && <span className={styles.details}>{details}</span>}
        </div>
        <span className={styles.topEnd} />
      </header>

      <main className={styles.stage} ref={stageRef} aria-label={t('reader.book')} />

      {state && (
        <div
          className={styles.barWrap}
          onPointerEnter={() => (hoveringBar.current = true)}
          onPointerLeave={() => (hoveringBar.current = false)}
        >
          <ReaderBar label={t('reader.controls')}>
            <IconButton
              icon="first"
              label={t('reader.first')}
              disabled={state.atStart}
              onClick={() => reader?.first()}
            />
            <IconButton
              icon="prev"
              label={t('reader.prev')}
              disabled={state.atStart}
              onClick={() => reader?.prev()}
            />
            {goToOpen ? (
              <form className={styles.goTo} onSubmit={submitGoTo}>
                <TextField
                  label={t('reader.goTo')}
                  inputMode="numeric"
                  autoFocus
                  value={goToValue}
                  onChange={(event) => setGoToValue(event.target.value.replace(/\D/g, ''))}
                  onBlur={() => setGoToOpen(false)}
                  placeholder={String(state.page)}
                />
              </form>
            ) : (
              <PageCounter
                current={state.label}
                total={state.total}
                label={t('reader.counter', { label: state.label, total: state.total })}
                onClick={() => setGoToOpen(true)}
              />
            )}
            <IconButton
              icon="next"
              label={t('reader.next')}
              disabled={state.atEnd}
              onClick={() => reader?.next()}
            />
            <IconButton
              icon="last"
              label={t('reader.last')}
              disabled={state.atEnd}
              onClick={() => reader?.last()}
            />
          </ReaderBar>
        </div>
      )}
    </div>
  );
}
