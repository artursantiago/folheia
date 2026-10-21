import {
  isBridgeMessage,
  isFolheiaPage,
  isHostname,
  isPageMessage,
  validateRequest,
  wrap,
} from './protocol';

describe('isFolheiaPage', () => {
  it('accepts the published site under /folheia/ and local development', () => {
    expect(isFolheiaPage('https://folheia-app.github.io/folheia/')).toBe(true);
    expect(isFolheiaPage('https://folheia-app.github.io/folheia/#/lab')).toBe(true);
    expect(isFolheiaPage('http://localhost:5173/')).toBe(true);
    expect(isFolheiaPage('http://127.0.0.1:4173/folheia/')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isFolheiaPage('https://folheia-app.github.io/other/')).toBe(false);
    expect(isFolheiaPage('http://folheia-app.github.io/folheia/')).toBe(false);
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

describe('isHostname', () => {
  it('takes plain hosts only, for image header rules', () => {
    expect(isHostname('webtoon-phinf.pstatic.net')).toBe(true);
    expect(isHostname('127.0.0.1')).toBe(true);
    expect(isHostname('*.pstatic.net')).toBe(false);
    expect(isHostname('localhost')).toBe(false);
    expect(isHostname('example.org/path')).toBe(false);
    expect(isHostname('example.org:8080')).toBe(false);
    expect(isHostname(42)).toBe(false);
  });
});
