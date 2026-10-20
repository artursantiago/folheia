// Developer tool (#/lab): checks what this browser's OPFS can do before the
// file store is built on it (docs/spec-fundacoes.md, question 2).

const DIR = 'folheia-lab-probe';

type Line = [label: string, value: string];

function describe(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** A file of `mb` megabytes with a recognizable pattern, so the read-back can be checked. */
export function patternBlob(mb: number) {
  const chunk = new Uint8Array(1024 * 1024);
  for (let i = 0; i < chunk.length; i++) chunk[i] = i % 251;
  return new Blob(Array.from({ length: mb }, () => chunk));
}

async function sameBytes(a: Blob, b: Blob) {
  if (a.size !== b.size) return false;
  // Start, middle and end are enough to catch a truncated or shifted copy.
  for (const at of [0, Math.floor(a.size / 2), Math.max(0, a.size - 4096)]) {
    const [x, y] = await Promise.all(
      [a, b].map(async (blob) => new Uint8Array(await blob.slice(at, at + 4096).arrayBuffer())),
    );
    if (!x || !y || x.some((value, i) => value !== y[i])) return false;
  }
  return true;
}

function writeInWorker(blob: Blob, name: string) {
  return new Promise<{ ok: boolean; ms?: number; error?: string }>((resolve) => {
    const worker = new Worker(new URL('./labOpfs.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      worker.terminate();
      resolve(event.data as { ok: boolean; ms?: number; error?: string });
    };
    worker.onerror = (event) => {
      worker.terminate();
      resolve({ ok: false, error: event.message || 'worker error' });
    };
    worker.postMessage({ blob, dir: DIR, name });
  });
}

export async function probeOpfs(blob: Blob, onStep: (text: string) => void): Promise<string> {
  const lines: Line[] = [];
  const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
  const report = () => lines.map(([label, value]) => `${label}: ${value}`).join('\n');
  const add = (label: string, value: string) => {
    lines.push([label, value]);
    onStep(report());
  };

  add('navegador', navigator.userAgent);
  add('arquivo de teste', mb(blob.size));
  add('contexto seguro', String(window.isSecureContext));
  if (!navigator.storage?.getDirectory) {
    add('navigator.storage.getDirectory', 'ausente: sem OPFS');
    return report();
  }

  try {
    const estimate = await navigator.storage.estimate();
    add('estimate', `uso ${mb(estimate.usage ?? 0)} de ${mb(estimate.quota ?? 0)}`);
  } catch (error) {
    add('estimate', describe(error));
  }
  try {
    add('persisted (antes)', String(await navigator.storage.persisted()));
    add('persist()', String(await navigator.storage.persist()));
  } catch (error) {
    add('persist()', describe(error));
  }

  let root: FileSystemDirectoryHandle;
  try {
    root = await navigator.storage.getDirectory();
    await root.removeEntry(DIR, { recursive: true }).catch(() => undefined);
    add('getDirectory', 'ok');
  } catch (error) {
    add('getDirectory', describe(error));
    return report();
  }
  const folder = await root.getDirectoryHandle(DIR, { create: true });

  // Page: createWritable, streaming the file straight in.
  const pageHandle = await folder.getFileHandle('page.bin', { create: true });
  const createWritable = (pageHandle as { createWritable?: unknown }).createWritable;
  add('createWritable na página', typeof createWritable === 'function' ? 'existe' : 'ausente');
  if (typeof createWritable === 'function') {
    try {
      const started = performance.now();
      const writable = await pageHandle.createWritable();
      await blob.stream().pipeTo(writable);
      const ms = performance.now() - started;
      const file = await pageHandle.getFile();
      add(
        'escrita na página',
        `${Math.round(ms)} ms (${mb(blob.size / (ms / 1000))}/s), confere: ${await sameBytes(blob, file)}`,
      );
    } catch (error) {
      add('escrita na página', describe(error));
    }
  }

  // Worker: createSyncAccessHandle.
  const result = await writeInWorker(blob, 'worker.bin');
  if (result.ok && result.ms !== undefined) {
    const file = await (await folder.getFileHandle('worker.bin')).getFile();
    add(
      'escrita no worker (sync handle)',
      `${result.ms} ms (${mb(blob.size / (result.ms / 1000))}/s), confere: ${await sameBytes(blob, file)}`,
    );
    // The sources read files in slices: make sure an OPFS File allows that.
    try {
      const started = performance.now();
      const tail = await file.slice(file.size - 65536).arrayBuffer();
      add(
        'File do OPFS, leitura aos pedaços',
        `${tail.byteLength} bytes em ${Math.round(performance.now() - started)} ms`,
      );
    } catch (error) {
      add('File do OPFS, leitura aos pedaços', describe(error));
    }
  } else {
    add('escrita no worker (sync handle)', result.error ?? 'falhou');
  }

  try {
    await root.removeEntry(DIR, { recursive: true });
    add('limpeza', 'ok');
  } catch (error) {
    add('limpeza', describe(error));
  }
  return report();
}
