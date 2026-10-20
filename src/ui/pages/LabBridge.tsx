// Developer tool (#/lab): fetches a URL through the network layer (plain
// fetch or the extension/userscript bridge) and shows what came back.
// Copy is intentionally not translated.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BridgeInfo } from '../../platform/bridge';
import {
  NetworkError,
  createWebNetwork,
  type NetworkResponse,
  type NetworkRoute,
} from '../../platform/network';
import { URL_INPUT } from './labInput';
import { Button, Overline, Segmented, TextField } from '../components';
import styles from './LabBridge.module.css';
import { LabBridgeBatch } from './LabBridgeBatch';
import { LabBridgeImage } from './LabBridgeImage';

const PRESETS = [
  {
    label: 'MangaDex API',
    url: 'https://api.mangadex.org/manga?limit=1',
  },
  // The Wonderful Wizard of Oz (1900), public domain.
  {
    label: 'Internet Archive · capa (1,2 MB)',
    url: 'https://archive.org/download/wonderfulwizardo00baumiala/wonderfulwizardo00baumiala_cover_image.jpg',
  },
  {
    label: 'Internet Archive · PDF (17 MB)',
    url: 'https://archive.org/download/wonderfulwizardo00baumiala/wonderfulwizardo00baumiala.pdf',
  },
] as const;

const ROUTES = [
  { value: 'auto', label: 'auto' },
  { value: 'fetch', label: 'só fetch' },
  { value: 'bridge', label: 'só ponte' },
] as const;

type Outcome =
  | { kind: 'ok'; response: NetworkResponse; imageUrl?: string; text?: string }
  | { kind: 'error'; message: string; code?: string; origin?: string | undefined };

function describe(info: BridgeInfo | null | undefined) {
  if (info === undefined) return 'procurando…';
  if (info === null) return 'não detectada';
  return `${info.kind} · ${info.host} · v${info.version} · protocolo ${info.protocol}`;
}

export function LabBridge() {
  const network = useMemo(() => createWebNetwork(), []);
  const [info, setInfo] = useState<BridgeInfo | null>();
  const [url, setUrl] = useState<string>(PRESETS[0].url);
  const [referer, setReferer] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [route, setRoute] = useState<NetworkRoute>('auto');
  const [received, setReceived] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const controller = useRef<AbortController>(undefined);

  async function detect() {
    setInfo(undefined);
    setInfo((await network.bridge()) ?? null);
  }

  useEffect(() => {
    let live = true;
    void network.bridge().then((found) => live && setInfo(found ?? null));
    return () => {
      live = false;
    };
  }, [network]);

  // Object URLs for previews are freed when replaced or on unmount.
  useEffect(() => {
    const imageUrl = outcome?.kind === 'ok' ? outcome.imageUrl : undefined;
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [outcome]);

  async function run() {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setReceived(0);
    setOutcome(undefined);
    try {
      const response = await network.request({
        url,
        route,
        headers: {
          ...(referer && { referer }),
          ...(userAgent && { 'user-agent': userAgent }),
        },
        signal: abort.signal,
        onProgress: setReceived,
      });
      const type = response.headers.get('content-type') ?? '';
      const result: Outcome = { kind: 'ok', response };
      if (type.startsWith('image/'))
        result.imageUrl = URL.createObjectURL(new Blob([response.body], { type }));
      else result.text = new TextDecoder().decode(response.body.slice(0, 4096));
      setOutcome(result);
    } catch (error) {
      setOutcome(
        error instanceof NetworkError
          ? { kind: 'error', code: error.code, message: error.message, origin: error.origin }
          : { kind: 'error', message: String(error) },
      );
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  }

  const response = outcome?.kind === 'ok' ? outcome.response : undefined;
  const mb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;

  return (
    <section className={styles.panel} aria-labelledby="lab-bridge" data-testid="bridge-panel">
      <Overline>
        <span id="lab-bridge">Ponte de rede</span>
      </Overline>
      <p className={styles.status}>
        Ponte: <span data-testid="bridge-status">{describe(info)}</span>{' '}
        <Button compact variant="ghost" onClick={() => void detect()}>
          Detectar
        </Button>
      </p>

      <div className={styles.controls}>
        {PRESETS.map((preset) => (
          <Button key={preset.url} compact onClick={() => setUrl(preset.url)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className={styles.controls}>
        <TextField
          {...URL_INPUT}
          label="URL da ponte"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={styles.wide}
        />
        <TextField
          {...URL_INPUT}
          label="Referer"
          value={referer}
          onChange={(event) => setReferer(event.target.value)}
          className={styles.field}
        />
        <TextField
          {...URL_INPUT}
          label="User-Agent"
          value={userAgent}
          onChange={(event) => setUserAgent(event.target.value)}
          className={styles.field}
        />
      </div>
      <div className={styles.controls}>
        <Segmented label="Caminho" options={ROUTES} value={route} onChange={setRoute} />
        <Button variant="primary" onClick={() => void run()} disabled={busy}>
          Buscar
        </Button>
        <Button onClick={() => controller.current?.abort()} disabled={!busy}>
          Cancelar
        </Button>
      </div>

      <LabBridgeBatch network={network} />
      <LabBridgeImage network={network} />

      {busy && <p className={styles.mono}>recebidos {mb(received)}…</p>}

      {outcome?.kind === 'error' && (
        <div role="alert" className={styles.error} data-testid="bridge-error">
          <p className={styles.mono}>
            {outcome.code ?? 'erro'}: {outcome.message}
          </p>
          {outcome.code === 'not-allowed' && outcome.origin && (
            <Button compact onClick={() => void network.requestAccess([outcome.origin ?? ''])}>
              Pedir acesso a {outcome.origin}
            </Button>
          )}
        </div>
      )}

      {response && (
        <>
          <dl className={styles.stats} data-testid="bridge-result">
            <dt>via</dt>
            <dd data-testid="bridge-via">{response.via}</dd>
            <dt>status</dt>
            <dd data-testid="bridge-http-status">
              {response.status} {response.statusText}
            </dd>
            <dt>URL final</dt>
            <dd>{response.url}</dd>
            <dt>bytes</dt>
            <dd data-testid="bridge-bytes">{response.body.byteLength}</dd>
            <dt>cabeçalhos em</dt>
            <dd>{response.timing.headersMs} ms</dd>
            <dt>total</dt>
            <dd>{response.timing.totalMs} ms</dd>
            <dt>na página</dt>
            <dd data-testid="bridge-page-ms">{response.timing.pageMs} ms</dd>
          </dl>
          <details>
            <summary>Cabeçalhos da resposta</summary>
            <dl className={styles.stats}>
              {[...response.headers].map(([name, value]) => (
                <div key={name} className={styles.row}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </details>
          {outcome?.kind === 'ok' && outcome.imageUrl && (
            <img
              src={outcome.imageUrl}
              alt="Resposta da ponte"
              className={styles.preview}
              data-testid="bridge-image"
            />
          )}
          {outcome?.kind === 'ok' && outcome.text !== undefined && (
            <pre className={styles.text} data-testid="bridge-text">
              {outcome.text}
            </pre>
          )}
        </>
      )}
    </section>
  );
}
