// Destination allowlist: what the user approves is a browser host permission,
// so the browser's own prompt is the approval screen.

/**
 * Turns what a user or page writes ("api.mangadex.org", "https://*.archive.org/",
 * "http://192.168.0.10:8080") into a host-permission pattern
 * ("https://api.mangadex.org/*"). Ports are dropped: Firefox doesn't allow
 * them in patterns. Returns undefined for anything else.
 */
export function toPermissionPattern(input: string): string | undefined {
  const match = /^(?:(https?):\/\/)?((?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::\d+)?\/?\*?$/i.exec(
    input.trim(),
  );
  if (!match) return undefined;
  const [, scheme = 'https', host = ''] = match;
  return `${scheme.toLowerCase()}://${host.toLowerCase()}/*`;
}

/** The pattern that covers one URL's origin (for permissions.contains). */
export function patternForUrl(url: string): string {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}/*`;
}

/**
 * Where the bridge runs: the published site. Keep in sync with
 * isFolheiaPage() in protocol.ts.
 */
export const FOLHEIA_MATCHES = ['https://folheia-app.github.io/folheia/*'];

/**
 * Local development, only in the dev build: any local server would count as
 * Folheia, and content-script hosts are also reachable by the background.
 * Chrome and Firefox match any port when the pattern has none.
 */
export const DEV_MATCHES = ['http://localhost/*', 'http://127.0.0.1/*'];
