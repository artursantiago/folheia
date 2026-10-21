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
import { library } from '../../storage/db';
import type { BookEntry, ReadingMemory } from '../../storage/library';
import { preferences } from '../../storage/preferences';
import { Reader, type ReaderState } from '../../viewer/Reader';
import {
  Icon,
  IconButton,
  Notice,
  PageCounter,
  PageSlider,
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
/** In immersive mode the mouse brings the bar back near the bottom edge only. */
const REVEAL_EDGE = 96;
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
  /** What the library remembers about this book, read when it opened. */
  memory?: BookEntry | undefined;
  credit?: { source: string; license: string } | undefined;
  onClose: () => void;
}

export function ReaderScreen({
  source,
  metadata,
  name,
  request,
  memory,
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
  const [sliderPage, setSliderPage] = useState<number>();
  const hoveringBar = useRef(false);
  /** We put the page in full screen ourselves (so leaving it also leaves immersive mode). */
  const ownsFullscreen = useRef(false);
  const immersive = prefs.immersive;
  const barMode = immersive ? prefs.immersiveBar : undefined;
  const budget = useMemo(() => createBudget(currentEnvironment()), []);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // What we remember about this book, read once when it opened.
  const [record] = useState(() =>
    memory ? { ...memory.record, history: memory.loans } : undefined,
  );
  const [cardMemory, setCardMemory] = useState<ReadingMemory>();
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
        lossless: initial.lossless,
      },
      fileDirection: metadata.direction,
      initialPage: hashPage,
      pageLabel: (number) => tRef.current('reader.page', { number }),
      failedText: tRef.current('reader.pageFailed'),
    });
    setReader(instance);
    if (instance.state.get().splitSpreads) notify(tRef.current('reader.spreadsSplit'));
    const offTall = instance.state.subscribe(() => {
      if (instance.state.get().tallStrips) {
        notify(tRef.current('reader.tallStrips'));
        offTall();
      }
    });
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
      lossless: prefs.lossless,
    });
  }, [reader, prefs.layout, prefs.coverAlone, prefs.hoverPeek, prefs.lossless]);

  const state = useStore((reader?.state ?? emptyState) as Store<ReaderState | undefined>);

  // Keep the page in the address and in the book's loan card. Only when the
  // page changes: the state also changes on every step of a pinch zoom, and
  // Safari throws after 100 replaceState calls in 10 s.
  const page = state?.page;
  const total = state?.total;
  const atEnd = state?.atEnd;
  useEffect(() => {
    if (page === undefined || total === undefined) return;
    const url = new URL(window.location.href);
    url.hash = `p=${page}`;
    if (url.href !== window.location.href) history.replaceState(history.state, '', url);
    if (sessionStart.current !== undefined)
      void library
        .saveProgress(source.id, {
          fromPage: sessionStart.current,
          page,
          pageCount: total,
          finished: atEnd ?? false,
        })
        .catch(() => undefined);
  }, [page, total, atEnd, source.id]);

  // The book card shows the latest loan stamps.
  useEffect(() => {
    if (panel !== 'card') return;
    let cancelled = false;
    void library
      .recall(source.id)
      .then((entry) => {
        if (!cancelled && entry)
          setCardMemory({ lastPage: entry.record.lastPage, history: entry.loans });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [panel, source.id]);

  const setImmersive = useCallback((on: boolean) => {
    preferences.set((p) => ({ ...p, immersive: on }));
    if (on && fullscreenSupported() && !isFullscreen()) {
      ownsFullscreen.current = true;
      void toggleFullscreen().then(() => (ownsFullscreen.current = isFullscreen()));
    } else if (!on && ownsFullscreen.current) {
      ownsFullscreen.current = false;
      if (isFullscreen()) void toggleFullscreen();
    }
  }, []);

  // Leaving full screen from the system (Esc, a gesture) also leaves immersive mode.
  useEffect(
    () =>
      onFullscreenChange(() => {
        if (isFullscreen() || !ownsFullscreen.current) return;
        ownsFullscreen.current = false;
        preferences.set((p) => ({ ...p, immersive: false }));
      }),
    [],
  );
  useEffect(
    () => () => {
      if (ownsFullscreen.current && isFullscreen()) void toggleFullscreen();
    },
    [],
  );

  // Arrow keys follow the visual direction; RTL books turn the other way.
  const keyContext = useRef({ busy: false, immersive });
  useEffect(() => {
    keyContext.current = { busy: panel !== 'none' || goToOpen, immersive };
  }, [panel, goToOpen, immersive]);
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
      const { busy, immersive: inImmersive } = keyContext.current;
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setImmersive(!inImmersive);
        return;
      }
      if (event.key === 'Escape' && inImmersive && !busy) {
        setImmersive(false);
        return;
      }
      const rtl = reader.state.get().direction === 'rtl';
      const actions: Record<string, () => void> = {
        ArrowRight: () => (rtl ? reader.prev() : reader.next()),
        ArrowLeft: () => (rtl ? reader.next() : reader.prev()),
        PageDown: () => reader.next(),
        PageUp: () => reader.prev(),
        ' ': () => reader.next(),
        Home: () => reader.first(),
        End: () => reader.last(),
        '+': () => reader.zoomIn(),
        '=': () => reader.zoomIn(),
        '-': () => reader.zoomOut(),
        '0': () => reader.zoomReset(),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
      // Turning pages in immersive mode shouldn't bring the bar back; Tab should.
      if (!inImmersive || event.key === 'Tab') setChromeVisible(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reader, setImmersive]);

  // When the bar shows. Normal mode and immersive with a fixed bar: always (the
  // stage leaves room for it, so hiding it shows no more of the book). Immersive
  // with a hiding bar: a tap in the middle of the book (or the mouse near the
  // bottom edge) brings it back for a while; another tap in the middle hides it.
  useEffect(() => {
    // Every other mode is kept visible by `keepChrome`.
    if (barMode !== 'auto') return;
    let visible = true;
    let timer = 0;
    const set = (next: boolean) => {
      visible = next;
      setChromeVisible(next);
      window.clearTimeout(timer);
      if (next)
        timer = window.setTimeout(() => {
          if (!hoveringBar.current) set(false);
        }, IDLE_MS);
    };
    set(true);
    const disposers: (() => void)[] = [];
    const listen = <K extends keyof WindowEventMap>(
      type: K,
      handler: (event: WindowEventMap[K]) => void,
    ) => {
      window.addEventListener(type, handler);
      disposers.push(() => window.removeEventListener(type, handler));
    };
    listen('pointermove', (event) => {
      if (event.pointerType === 'mouse' && event.clientY > window.innerHeight - REVEAL_EDGE)
        set(true);
    });
    const off = reader?.onCenterTap(() => set(!visible));
    if (off) disposers.push(() => void off());
    return () => {
      window.clearTimeout(timer);
      disposers.forEach((dispose) => dispose());
    };
  }, [barMode, reader]);

  const title = metadata.title ?? name;
  const details = [metadata.author, metadata.date].filter(Boolean).join(' · ');
  const keepChrome = panel !== 'none' || goToOpen || barMode !== 'auto';

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
    void library.update(source.id, { direction: value }).catch(() => undefined);
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

  const goToSliderPage = useCallback((page: number) => reader?.goToPage(page), [reader]);

  const closeSettings = useCallback(() => setPanel((p) => (p === 'settings' ? 'none' : p)), []);
  const closeIndex = useCallback(() => setPanel('none'), []);

  return (
    <div
      ref={rootRef}
      className={styles.reader}
      data-chrome={chromeVisible || keepChrome ? 'visible' : 'hidden'}
      data-immersive={barMode}
    >
      <div className={styles.lamp} aria-hidden="true" />
      <header className={styles.top} hidden={immersive}>
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

      {state && state.zoom > 1 && (
        <div className={styles.zoomPill}>
          <span className={styles.zoomPercent}>{Math.round(state.zoom * 100)}%</span>
          <button type="button" className={styles.fit} onClick={() => reader?.zoomReset()}>
            {t('reader.fit')}
          </button>
        </div>
      )}

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
            <div className={styles.settingsSlot}>
              <SettingsMenu
                id="reader-settings"
                direction={direction ?? state.direction}
                onDirection={changeDirection}
                onCopyDiagnostics={() => void copyDiagnostics()}
                onBookCard={immersive ? () => setPanel('card') : undefined}
                onClose={closeSettings}
              />
            </div>
          )}
          <ReaderBar label={t('reader.controls')} variant={immersive ? 'strip' : 'floating'}>
            {immersive ? (
              <>
                <IconButton
                  icon="collapse"
                  label={t('reader.exitImmersive')}
                  onClick={() => setImmersive(false)}
                />
                <ReaderBarSeparator />
              </>
            ) : (
              <IconButton
                icon="first"
                label={t('reader.first')}
                disabled={state.atStart}
                onClick={() => reader?.first()}
                className={styles.wideOnly}
              />
            )}
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
                current={sliderPage === undefined ? state.label : String(sliderPage)}
                total={state.total}
                label={t('reader.counter', { label: state.label, total: state.total })}
                onClick={() => setGoToOpen(true)}
              />
            )}
            {immersive && (
              <PageSlider
                value={state.page}
                total={state.total}
                label={t('reader.position')}
                valueText={(number) => t('reader.pageOf', { number, total: state.total })}
                onPreview={setSliderPage}
                onCommit={goToSliderPage}
                dir={state.direction}
              />
            )}
            <IconButton
              icon="next"
              label={t('reader.next')}
              disabled={state.atEnd}
              onClick={() => reader?.next()}
            />
            {!immersive && (
              <IconButton
                icon="last"
                label={t('reader.last')}
                disabled={state.atEnd}
                onClick={() => reader?.last()}
                className={styles.wideOnly}
              />
            )}
            <ReaderBarSeparator />
            <IconButton
              icon="zoomOut"
              label={t('reader.zoomOut')}
              disabled={state.zoom <= 1}
              onClick={() => reader?.zoomOut()}
              className={styles.wideOnly}
            />
            <span className={`${styles.zoomLevel} ${styles.wideOnly}`} aria-live="polite">
              {Math.round(state.zoom * 100)}%
            </span>
            <IconButton
              icon="zoomIn"
              label={t('reader.zoomIn')}
              disabled={state.zoom >= 4}
              onClick={() => reader?.zoomIn()}
              className={styles.wideOnly}
            />
            <ReaderBarSeparator />
            <IconButton
              icon="thumbnails"
              label={t('reader.index')}
              pressed={panel === 'index'}
              onClick={() => setPanel(panel === 'index' ? 'none' : 'index')}
            />
            {request.kind === 'url' && !immersive && (
              <IconButton
                icon="share"
                label={t('reader.share')}
                onClick={() => void share()}
                className={styles.wideOnly}
              />
            )}
            {!immersive && (
              <IconButton
                icon="fullscreen"
                label={t('reader.immersive')}
                pressed={false}
                onClick={() => setImmersive(true)}
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
          record={cardMemory}
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
