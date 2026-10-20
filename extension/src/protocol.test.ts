import { toPermissionPattern, patternForUrl } from './patterns';
import { isBridgeMessage, isFolheiaPage, isPageMessage, validateRequest, wrap } from './protocol';
import { fromBase64, toBase64 } from './wire';

describe('isFolheiaPage', () => {
  it('accepts the published site under /folheia/ and local development', () => {
    expect(isFolheiaPage('https://artursantiago.github.io/folheia/')).toBe(true);
    expect(isFolheiaPage('https://artursantiago.github.io/folheia/#/lab')).toBe(true);
    expect(isFolheiaPage('http://localhost:5173/')).toBe(true);
    expect(isFolheiaPage('http://127.0.0.1:4173/folheia/')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isFolheiaPage('https://artursantiago.github.io/other/')).toBe(false);
    expect(isFolheiaPage('http://artursantiago.github.io/folheia/')).toBe(false);
    expect(isFolheiaPage('https://evil.example/folheia/')).toBe(false);
    expect(isFolheiaPage('https://localhost.evil.example/')).toBe(false);
    expect(isFolheiaPage('not a url')).toBe(false);
  });
});

describe('validateRequest', () => {
  const ok = { url: 'https://api.mangadex.org/manga', method: 'GET', headers: {} };

  it('accepts a plain GET and the headers the bridge exists for', () => {
    expect(validateRequest(ok)).toBeUndefined();
    expect(
      validateRequest({ ...ok, headers: { referer: 'https://x.org/', 'user-agent': 'Folheia' } }),
    ).toBeUndefined();
  });

  it('refuses other schemes, methods, identity headers and oversized input', () => {
    expect(validateRequest({ ...ok, url: 'file:///etc/passwd' })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, url: 'javascript:alert(1)' })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, method: 'DELETE' })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, headers: { cookie: 'a=b' } })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, headers: { authorization: 'x' } })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, body: 'x' })?.code).toBe('bad-request');
    expect(validateRequest({ ...ok, method: 'POST', body: 'x'.repeat(2 << 20) })?.code).toBe(
      'too-large',
    );
    expect(validateRequest({ ...ok, timeoutMs: 10_000_000 })?.code).toBe('bad-request');
    expect(validateRequest(null)?.code).toBe('bad-request');
  });
});

describe('envelopes', () => {
  it('tells page and bridge messages apart', () => {
    const page = wrap('page', { type: 'hello', id: '1', protocol: 1 });
    expect(isPageMessage(page)).toBe(true);
    expect(isBridgeMessage(page)).toBe(false);
    expect(isPageMessage({ type: 'hello' })).toBe(false);
    expect(isPageMessage('folheia-bridge')).toBe(false);
  });
});

describe('toPermissionPattern', () => {
  it('normalizes what a person types', () => {
    expect(toPermissionPattern('api.mangadex.org')).toBe('https://api.mangadex.org/*');
    expect(toPermissionPattern(' https://*.archive.org/ ')).toBe('https://*.archive.org/*');
    expect(toPermissionPattern('http://192.168.0.10:8080')).toBe('http://192.168.0.10/*');
    expect(toPermissionPattern('https://Example.ORG/*')).toBe('https://example.org/*');
  });

  it('refuses paths, other schemes and wildcards that grant everything', () => {
    expect(toPermissionPattern('*')).toBeUndefined();
    expect(toPermissionPattern('<all_urls>')).toBeUndefined();
    expect(toPermissionPattern('ftp://example.org')).toBeUndefined();
    expect(toPermissionPattern('https://example.org/path')).toBeUndefined();
    expect(toPermissionPattern('https://*.*')).toBeUndefined();
  });

  it('covers a URL by its origin', () => {
    expect(patternForUrl('https://uploads.mangadex.org:443/a/b?c')).toBe(
      'https://uploads.mangadex.org/*',
    );
  });
});

describe('base64', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 31) % 256);
    expect(new Uint8Array(fromBase64(toBase64(bytes)))).toEqual(bytes);
  });
});
