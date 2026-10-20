// Content script ↔ background messages. Extension messaging in Chrome is
// JSON, so there bytes travel as base64 strings and become ArrayBuffers again
// in the content script, which then transfers them to the page.
import type { BridgeMessage, PageMessage } from './protocol';

export const PORT_NAME = 'folheia-bridge';

export type ToBackground = PageMessage;

export type FromBackground =
  | Exclude<BridgeMessage, { type: 'chunk' | 'ready' }>
  /** Chrome messaging is JSON: base64. Firefox uses structured clone: bytes as they are. */
  | { type: 'chunk'; id: string; base64: string }
  | { type: 'chunk'; id: string; data: ArrayBuffer };

type Base64Bytes = Uint8Array & { toBase64?: () => string };
type Base64Ctor = typeof Uint8Array & { fromBase64?: (text: string) => Uint8Array };

export function toBase64(bytes: Uint8Array): string {
  const native = (bytes as Base64Bytes).toBase64;
  if (native) return native.call(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(text: string): ArrayBuffer {
  const native = (Uint8Array as Base64Ctor).fromBase64;
  const bytes = native ? native(text) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}
