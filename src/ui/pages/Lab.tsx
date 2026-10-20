// Developer tool (#/lab): drives the page engine directly to measure it.
// Copy is intentionally not translated.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createBudget, currentEnvironment } from '../../render/budget';
import { PageRenderer, refKey, type PageRef } from '../../render/PageRenderer';
import { openPdf, type PdfSource } from '../../sources/pdf/PdfSource';
import { Button, IconButton, Overline, TextField } from '../components';
import styles from './Lab.module.css';

type Loaded = { source: PdfSource; renderer: PageRenderer; openedIn: number };

function useRendererVersion(renderer: PageRenderer | undefined) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!renderer) return;
    const unsubscribe = renderer.subscribe(() => setVersion((v) => v + 1));
    return () => void unsubscribe();
  }, [renderer]);
  return version;
}

function heapMb() {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : undefined;
}

export default function Lab() {
  const [loaded, setLoaded] = useState<Loaded>();
  const [error, setError] = useState<string>();
  const [spread, setSpread] = useState(0);
  const [url, setUrl] = useState('fixtures/generated/heavy.pdf');
  const [firstPreviewMs, setFirstPreviewMs] = useState<number>();
  const [firstSharpMs, setFirstSharpMs] = useState<number>();
  const version = useRendererVersion(loaded?.renderer);
  useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 500);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 500),
  );

  const budget = useMemo(() => createBudget(currentEnvironment()), []);

  async function open(input: { file: Blob } | { url: string }) {
    setError(undefined);
    loaded?.renderer.destroy();
    await loaded?.source.destroy();
    setLoaded(undefined);
    setFirstPreviewMs(undefined);
    setFirstSharpMs(undefined);
    const started = performance.now();
    try {
      const source = await openPdf(input, {
        onPassword: async () => window.prompt('Senha do PDF'),
      });
      const renderer = new PageRenderer(source, budget);
      const unsubscribe = renderer.subscribe(() => {
        const image = renderer.getImage({ page: 0 });
        if (image) setFirstPreviewMs((ms) => ms ?? Math.round(performance.now() - started));
        if (image?.tier === 'sharp') {
          setFirstSharpMs((ms) => ms ?? Math.round(performance.now() - started));
          unsubscribe();
        }
      });
      setSpread(0);
      setLoaded({ source, renderer, openedIn: Math.round(performance.now() - started) });
    } catch (err) {
      setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    }
  }

  const pageCount = loaded?.source.pageCount ?? 0;
  const pages: PageRef[] = [spread * 2, spread * 2 + 1]
    .filter((p) => p < pageCount)
    .map((page) => ({ page }));

  useEffect(() => {
    if (!loaded) return;
    const at = (offset: number) =>
      [spread * 2 + offset, spread * 2 + offset + 1]
        .filter((p) => p >= 0 && p < pageCount)
        .map((page) => ({ page }));
    loaded.renderer.setDisplaySize({ width: 420, height: 560 });
    loaded.renderer.focus({
      visible: at(0),
      ahead: at(2),
      behind: at(-2),
      nearby: [...at(4), ...at(-4)],
    });
  }, [loaded, spread, pageCount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight')
        setSpread((s) => Math.min(s + 1, Math.ceil(pageCount / 2) - 1));
      if (event.key === 'ArrowLeft') setSpread((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageCount]);

  const stats = loaded?.renderer.stats();
  const mb = (bytes = 0) => (bytes / 1048576).toFixed(1);

  return (
    <main className={styles.lab} data-version={version}>
      <header className={styles.controls}>
        <Overline>Laboratório do motor</Overline>
        <input
          type="file"
          accept=".pdf,application/pdf"
          aria-label="Abrir PDF"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void open({ file });
          }}
        />
        <TextField
          label="URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={styles.url}
        />
        <Button onClick={() => void open({ url })}>Abrir URL</Button>
      </header>

      {error && <p role="alert">{error}</p>}

      {loaded && (
        <>
          <div className={styles.spread} data-testid="spread">
            {pages.map((ref) => {
              const image = loaded.renderer.getImage(ref);
              return (
                <div key={refKey(ref)} className={styles.page}>
                  {image && (
                    <img
                      src={image.url}
                      alt={`Página ${ref.page + 1}`}
                      data-tier={image.tier}
                      className={styles.image}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.nav}>
            <IconButton
              icon="prev"
              label="Anterior"
              onClick={() => setSpread((s) => Math.max(s - 1, 0))}
            />
            <span className={styles.mono}>
              {pages.map((p) => p.page + 1).join('–')} / {pageCount}
            </span>
            <IconButton
              icon="next"
              label="Próxima"
              onClick={() => setSpread((s) => Math.min(s + 1, Math.ceil(pageCount / 2) - 1))}
            />
          </div>
          <dl className={styles.stats} data-testid="stats">
            <dt>aberto em</dt>
            <dd>{loaded.openedIn} ms</dd>
            <dt>1ª prévia</dt>
            <dd data-testid="first-preview">{firstPreviewMs ?? '…'} ms</dd>
            <dt>1ª nítida</dt>
            <dd data-testid="first-sharp">{firstSharpMs ?? '…'} ms</dd>
            <dt>nítidas</dt>
            <dd data-testid="sharp-count">
              {stats?.sharpCount} ({mb(stats?.sharpBytes)} MB)
            </dd>
            <dt>prévias</dt>
            <dd>
              {stats?.previewCount} ({mb(stats?.previewBytes)} MB)
            </dd>
            <dt>na fila</dt>
            <dd>{stats?.queued}</dd>
            <dt>heap JS</dt>
            <dd>{heapMb() ?? 'n/d'} MB</dd>
            <dt>orçamento</dt>
            <dd>
              {(budget.maxCanvasPixels / 1e6).toFixed(0)} MP/canvas · {mb(budget.maxCacheBytes)} MB
              cache
            </dd>
          </dl>
        </>
      )}
    </main>
  );
}
