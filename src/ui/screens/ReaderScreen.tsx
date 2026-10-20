import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createStore, type Store } from '../../lib/store';
import {
  fullscreenSupported,
  isFullscreen,
  onFullscreenChange,
  toggleFullscreen,
} from '../../platform/fullscreen';
import { copyText, shareLink } from '../../platform/share';
import { createBudget, currentEnvironment } from '../../render/budget';
import type { BookMetadata, PageSource, ReadingDirection } from '../../sources/types';
import { bookMemory } from '../../storage/books';
import { preferences } from '../../storage/preferences';
import { Reader, type ReaderState } from '../../viewer/Reader';
import {
  Icon,
  IconButton,
  Notice,
  PageCounter,
  ReaderBar,
  ReaderBarSeparator,
  TextField,
} from '../components';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import { BookCardDialog } from '../reader/BookCardDialog';
import { diagnostics } from '../reader/diagnostics';
import { IndexDrawer } from '../reader/IndexDrawer';
import { LoanCardDialog } from '../reader/LoanCardDialog';
import { SettingsMenu } from '../reader/SettingsMenu';
import type { OpenRequest } from '../session';
import styles from './ReaderScreen.module.css';

const IDLE_MS = 3000;
const TOAST_MS = 3500;
const emptyState = createStore<ReaderState | undefined>(undefined);

export function initialPageFromHash(hash = window.location.hash): number | undefined {
  const match = hash.match(/(?:^#|&)p=(\d+)/);
  return match ? Number(match[1]) : undefined;
}

export interface ReaderScreenProps {
  source: PageSource;
  metadata: BookMetadata;
  name: string;
  request: OpenRequest;
  credit?: { source: string; license: string } | undefined;
  onClose: () => void;
}

export function ReaderScreen({
  source,
  metadata,
  name,
  request,
  credit,
  onClose,
}: ReaderScreenProps) {
  const { t } = useI18n();
  const prefs = useStore(preferences);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [reader, setReader] = useState<Reader>();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [goToOpen, setGoToOpen] = useState(false);
  const [goToValue, setGoToValue] = useState('');
  const [panel, setPanel] = useState<'none' | 'index' | 'settings' | 'card'>('none');
  const [toast, setToast] = useState<string>();
  const [fullscreen, setFullscreen] = useState(isFullscreen());
  const hoveringBar = useRef(false);
  const budget = useMemo(() => createBudget(currentEnvironment()), []);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // What we remember about this book, read once when it opens.
  const [record] = useState(() => bookMemory.get(source.id));
  const [hashPage] = useState(() => initialPageFromHash());
  const [askToContinue, setAskToContinue] = useState(
    () => !hashPage && (record?.lastPage ?? 1) > 1,
  );
  const sessionStart = useRef<number | undefined>(askToContinue ? undefined : (hashPage ?? 1));
  const [direction, setDirection] = useState<ReadingDirection | undefined>(record?.direction);

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    const initial = preferences.get();
    const instance = new Reader({
      source,
      container,
      budget,
      options: {
        layout: initial.layout,
        coverAlone: initial.coverAlone,
        direction: record?.direction,
        hoverPeek: initial.hoverPeek,
      },
      fileDirection: metadata.direction,
      initialPage: hashPage,
      pageLabel: (number) => tRef.current('reader.page', { number }),
    });
    setReader(instance);
    if (instance.state.get().splitSpreads) notify(tRef.current('reader.spreadsSplit'));
    return () => {
      instance.destroy();
      setReader(undefined);
    };
  }, [source, metadata.direction, budget, record, hashPage, notify]);

  useEffect(() => {
    reader?.setOptions({
      layout: prefs.layout,
      coverAlone: prefs.coverAlone,
      hoverPeek: prefs.hoverPeek,
    });
  }, [reader, prefs.layout, prefs.coverAlone, prefs.hoverPeek]);

  const state = useStore((reader?.state ?? emptyState) as Store<ReaderState | undefined>);

  // Keep the page in the address and in the book's loan card.
  useEffect(() => {
    if (!state) return;
    const url = new URL(window.location.href);
    url.hash = `p=${state.page}`;
    history.replaceState(history.state, '', url);
    if (sessionStart.current !== undefined)
      bookMemory.recordProgress(source.id, sessionStart.current, state.page);
  }, [state?.page, state, source.id]);

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
      if (document.querySelector('dialog[open]')) return;
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

  useEffect(() => onFullscreenChange(() => setFullscreen(isFullscreen())), []);

  const title = metadata.title ?? name;
  const details = [metadata.author, metadata.date].filter(Boolean).join(' · ');
  const keepChrome = panel !== 'none' || goToOpen;

  const submitGoTo = (event: FormEvent) => {
    event.preventDefault();
    const page = Number(goToValue);
    if (reader && Number.isFinite(page) && page >= 1) reader.goToPage(page);
    setGoToOpen(false);
    setGoToValue('');
  };

  const changeDirection = (value: ReadingDirection) => {
    setDirection(value);
    reader?.setOptions({ direction: value });
    bookMemory.update(source.id, { direction: value });
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = '';
    if (request.kind === 'url') url.searchParams.set('file', request.url);
    const result = await shareLink(url.href, title);
    if (result === 'copied') notify(t('reader.linkCopied'));
  };

  const copyDiagnostics = async () => {
    const report = diagnostics({
      book: { kind: source.kind, pages: source.pageCount, ...reader?.stats() },
    });
    if (await copyText(report)) notify(t('settings.diagnosticsCopied'));
  };

  const closeSettings = useCallback(() => setPanel((p) => (p === 'settings' ? 'none' : p)), []);
  const closeIndex = useCallback(() => setPanel('none'), []);

  return (
    <div
      ref={rootRef}
      className={styles.reader}
      data-chrome={chromeVisible || keepChrome ? 'visible' : 'hidden'}
    >
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
        <div className={styles.topEnd}>
          <IconButton icon="card" label={t('reader.bookCard')} onClick={() => setPanel('card')} />
        </div>
      </header>

      <main className={styles.stage} ref={stageRef} aria-label={t('reader.book')} />

      {reader && panel === 'index' && (
        <IndexDrawer
          reader={reader}
          source={source}
          visible={reader.visiblePages()}
          onClose={closeIndex}
        />
      )}

      {state && (
        <div
          className={styles.barWrap}
          onPointerEnter={() => (hoveringBar.current = true)}
          onPointerLeave={() => (hoveringBar.current = false)}
        >
          {panel === 'settings' && (
            <SettingsMenu
              id="reader-settings"
              direction={direction ?? state.direction}
              onDirection={changeDirection}
              onCopyDiagnostics={() => void copyDiagnostics()}
              onClose={closeSettings}
            />
          )}
          <ReaderBar label={t('reader.controls')}>
            <IconButton
              icon="first"
              label={t('reader.first')}
              disabled={state.atStart}
              onClick={() => reader?.first()}
              className={styles.wideOnly}
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
              className={styles.wideOnly}
            />
            <ReaderBarSeparator />
            <IconButton
              icon="thumbnails"
              label={t('reader.index')}
              pressed={panel === 'index'}
              onClick={() => setPanel(panel === 'index' ? 'none' : 'index')}
            />
            {request.kind === 'url' && (
              <IconButton
                icon="share"
                label={t('reader.share')}
                onClick={() => void share()}
                className={styles.wideOnly}
              />
            )}
            {fullscreenSupported() && (
              <IconButton
                icon="fullscreen"
                label={fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen')}
                pressed={fullscreen}
                onClick={() => void toggleFullscreen()}
                className={styles.wideOnly}
              />
            )}
            <IconButton
              icon="settings"
              label={t('reader.settings')}
              pressed={panel === 'settings'}
              aria-expanded={panel === 'settings'}
              aria-controls="reader-settings"
              data-settings-toggle=""
              onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')}
            />
          </ReaderBar>
        </div>
      )}

      {toast && (
        <div className={styles.toast}>
          <Notice>{toast}</Notice>
        </div>
      )}

      {state && (
        <BookCardDialog
          open={panel === 'card'}
          onClose={() => setPanel('none')}
          metadata={metadata}
          name={name}
          kind={source.kind}
          pages={state.total}
          bytes={request.kind === 'file' ? request.file.size : undefined}
          direction={state.direction}
          splitSpreads={state.splitSpreads}
          record={bookMemory.get(source.id)}
          credit={credit}
        />
      )}

      {askToContinue && record && reader && (
        <LoanCardDialog
          title={title}
          record={record}
          onContinue={() => {
            sessionStart.current = record.lastPage;
            setAskToContinue(false);
            reader.goToPage(record.lastPage);
          }}
          onRestart={() => {
            sessionStart.current = 1;
            setAskToContinue(false);
          }}
        />
      )}
    </div>
  );
}
