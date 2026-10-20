// Developer tool (#/lab): runs a list of URLs through plain fetch and the
// bridge, one at a time, to see which sources work where (e.g. on the iPad).
// The list is a local JSON file, [{ name, url, headers? }], kept out of the
// repo (fixtures/personal/). Copy is intentionally not translated.
import { useState } from 'react';
import { NetworkError, type Network } from '../../platform/network';
import { URL_INPUT } from './labInput';
import { Button, TextField } from '../components';
import styles from './LabBridge.module.css';

interface Probe {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

interface Row {
  name: string;
  page: string;
  bridge: string;
  bytes?: number;
  ms?: number;
}

const CHALLENGE = /Just a moment|cf-chl|challenge-platform|Attention Required/i;

async function probe(network: Network, { url, headers = {} }: Probe) {
  let page: string;
  try {
    page = `${(await network.request({ url, route: 'fetch' })).status}`;
  } catch (error) {
    page = error instanceof NetworkError ? error.code : 'erro';
  }
  try {
    const response = await network.request({ url, route: 'bridge', headers, timeoutMs: 40_000 });
    const head = new TextDecoder().decode(response.body.slice(0, 4096));
    const challenge = response.headers.get('cf-mitigated') === 'challenge' || CHALLENGE.test(head);
    return {
      page,
      bridge: `${response.status}${challenge ? ' (desafio)' : ''}`,
      bytes: response.body.byteLength,
      ms: response.timing.pageMs,
    };
  } catch (error) {
    return { page, bridge: error instanceof NetworkError ? error.code : String(error) };
  }
}

export function LabBridgeBatch({ network }: { network: Network }) {
  const [list, setList] = useState('fixtures/personal/bridge-probes.json');
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  async function run() {
    setRunning(true);
    setError(undefined);
    setRows([]);
    try {
      const probes = (await (await fetch(list)).json()) as Probe[];
      for (const item of probes) {
        const result = await probe(network, item);
        setRows((done) => [...done, { name: item.name, ...result }]);
        // Be polite: one site at a time, with a pause.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.batch}>
      <div className={styles.controls}>
        <TextField
          {...URL_INPUT}
          label="Lista (JSON)"
          value={list}
          onChange={(event) => setList(event.target.value)}
          className={styles.wide}
        />
        <Button onClick={() => void run()} disabled={running}>
          Rodar lote
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {rows.length > 0 && (
        <table className={styles.table} data-testid="batch">
          <thead>
            <tr>
              <th>fonte</th>
              <th>página</th>
              <th>ponte</th>
              <th>bytes</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{row.name}</td>
                <td>{row.page}</td>
                <td>{row.bridge}</td>
                <td>{row.bytes ?? ''}</td>
                <td>{row.ms ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
