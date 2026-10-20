// Developer tool (#/lab): shows an image with a plain <img>, after asking the
// bridge for a Referer on that host's images. The bytes never go through the
// bridge; this is how covers from hotlink-protected CDNs would be shown.
// Copy is intentionally not translated.
import { useState } from 'react';
import type { Network } from '../../platform/network';
import { URL_INPUT } from './labInput';
import { Button, TextField } from '../components';
import styles from './LabBridge.module.css';

type Status = 'idle' | 'loading' | 'loaded' | 'failed';

export function LabBridgeImage({ network }: { network: Network }) {
  const [url, setUrl] = useState('');
  const [referer, setReferer] = useState('');
  const [rule, setRule] = useState<string>();
  const [src, setSrc] = useState<string>();
  const [status, setStatus] = useState<Status>('idle');

  async function show() {
    setStatus('loading');
    setSrc(undefined);
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      setStatus('failed');
      return;
    }
    if (referer) {
      const result = await network.imageHeaders([{ host, referer }]);
      setRule(
        result.applied.includes(host)
          ? `regra aplicada a ${host}`
          : `regra recusada: ${result.refused.map((item) => item.code).join(', ') || '?'}`,
      );
    } else setRule('sem regra');
    // A fresh URL each time, so the HTTP cache doesn't hide the new Referer.
    const fresh = new URL(url);
    fresh.searchParams.set('folheia-lab', String(Date.now()));
    setSrc(fresh.href);
  }

  return (
    <div className={styles.batch}>
      <div className={styles.controls}>
        <TextField
          {...URL_INPUT}
          label="Imagem direta (URL)"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={styles.wide}
        />
        <TextField
          {...URL_INPUT}
          label="Referer da imagem"
          value={referer}
          onChange={(event) => setReferer(event.target.value)}
          className={styles.field}
        />
        <Button onClick={() => void show()}>Mostrar com &lt;img&gt;</Button>
      </div>
      <p className={styles.mono} data-testid="image-status">
        {status}
        {rule && ` · ${rule}`}
      </p>
      {src && (
        <img
          src={src}
          alt="Imagem direta"
          className={styles.preview}
          data-testid="direct-image"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </div>
  );
}
