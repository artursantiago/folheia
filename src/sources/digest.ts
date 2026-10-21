/**
 * Hex digest identifying a file's content. SHA-256 where Web Crypto exists
 * (secure contexts: HTTPS and localhost); elsewhere (a dev server reached by
 * LAN IP) a cheap non-cryptographic hash. An origin is either secure or not,
 * and stored data is per origin, so ids never mix the two.
 */
export async function contentDigest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `fnv-${fnv1a(bytes, 0x811c9dc5)}${fnv1a(bytes, 0x01000193)}`;
}

function fnv1a(bytes: Uint8Array, seed: number) {
  let hash = seed >>> 0;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
