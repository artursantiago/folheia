// Content script on Folheia pages only: relays window messages to the
// background over a port, opened on the first request so that merely loading
// Folheia never wakes the background.
import {
  PROTOCOL_VERSION,
  isFolheiaPage,
  isPageMessage,
  wrap,
  type BridgeInfo,
  type BridgeMessage,
  type PageMessage,
} from './protocol';
import { api, engine, type Port } from './webext';
import { PORT_NAME, fromBase64, type FromBackground } from './wire';

const info: BridgeInfo = {
  protocol: PROTOCOL_VERSION,
  kind: 'extension',
  version: __BRIDGE_VERSION__,
  host: engine,
};

function post(message: BridgeMessage, transfer: Transferable[] = []) {
  window.postMessage(wrap('bridge', message), location.origin, transfer);
}

let port: Port | undefined;
const pending = new Set<string>();

function connect(): Port {
  if (port) return port;
  const opened = api.runtime.connect({ name: PORT_NAME });
  opened.onMessage.addListener((raw) => {
    const message = raw as FromBackground;
    if (message.type === 'chunk') {
      const data = 'base64' in message ? fromBase64(message.base64) : message.data;
      post({ type: 'chunk', id: message.id, data }, [data]);
      return;
    }
    if (message.type === 'end' || message.type === 'error' || message.type === 'access')
      pending.delete(message.id);
    post(message);
  });
  // The background can restart (Chrome stops idle service workers): fail
  // what was in flight and reconnect on the next request.
  opened.onDisconnect.addListener(() => {
    port = undefined;
    for (const id of pending)
      post({ type: 'error', id, error: { code: 'network', message: 'The bridge restarted' } });
    pending.clear();
  });
  port = opened;
  return opened;
}

/** Rebuilds the message from known fields, so nothing else reaches the extension. */
function forward(message: PageMessage) {
  switch (message.type) {
    case 'fetch':
      pending.add(message.id);
      connect().postMessage({ type: 'fetch', id: message.id, request: message.request });
      break;
    case 'abort':
      connect().postMessage({ type: 'abort', id: message.id });
      break;
    case 'request-access':
      pending.add(message.id);
      connect().postMessage({ type: 'request-access', id: message.id, origins: message.origins });
      break;
    case 'hello':
      post({ type: 'hello', id: message.id, info });
      break;
  }
}

if (isFolheiaPage(location.href)) {
  window.addEventListener('message', (event) => {
    // Only the page itself, never other frames or windows.
    if (event.source !== window || event.origin !== location.origin) return;
    if (isPageMessage(event.data)) forward(event.data);
  });
  post({ type: 'ready', info });
}
