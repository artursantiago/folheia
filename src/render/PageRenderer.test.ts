import type { PageSource, RenderTarget } from '../sources/types';
import { createBudget } from './budget';
import { PageRenderer } from './PageRenderer';

vi.mock('./encode', () => ({
  encodeCanvas: async (
    canvas: { width: number; height: number },
    _quality: number,
    type = 'image/jpeg',
  ) => ({
    blob: new Blob([new Uint8Array(1000)], { type }),
    width: canvas.width,
    height: canvas.height,
  }),
  scaleCanvas: (_canvas: unknown, size: { width: number; height: number }) => ({ ...size }),
}));

let urlCounter = 0;
globalThis.URL.createObjectURL = () => `blob:${urlCounter++}`;
globalThis.URL.revokeObjectURL = () => {};

function fakeSource(pageCount = 10) {
  const calls: { page: number; target: RenderTarget }[] = [];
  const source: PageSource = {
    kind: 'pdf',
    id: 'test',
    pageCount,
    getPageSize: () => ({ width: 600, height: 800 }),
    knownPageSize: () => ({ width: 600, height: 800 }),
    render: async (page, target) => {
      calls.push({ page, target });
      return { width: target.width, height: target.height } as HTMLCanvasElement;
    },
    getMetadata: async () => ({}),
    getOutline: async () => [],
    onSizesChanged: () => () => {},
    destroy: async () => {},
  };
  return { source, calls };
}

const desktop = createBudget({ maxTouchPoints: 0, platform: 'MacIntel', userAgent: 'Mac' });

describe('PageRenderer', () => {
  it('renders visible previews first, then sharp, then what lies ahead', async () => {
    const { source, calls } = fakeSource();
    const renderer = new PageRenderer(source, desktop, () => 2);
    renderer.setDisplaySize({ width: 300, height: 400 });
    renderer.focus({ visible: [{ page: 4 }], ahead: [{ page: 5 }], behind: [], nearby: [] });
    await vi.waitFor(() => expect(calls).toHaveLength(4));
    expect(calls.map((c) => [c.page, c.target.width])).toEqual([
      [4, 270],
      [4, 625],
      [5, 270],
      [5, 625],
    ]);
    expect(renderer.getImage({ page: 4 })?.tier).toBe('sharp');
  });

  it('drops sharp images that move out of focus', async () => {
    const { source } = fakeSource();
    const renderer = new PageRenderer(source, desktop, () => 1);
    renderer.focus({ visible: [{ page: 0 }], ahead: [], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.tier).toBe('sharp'));
    renderer.focus({ visible: [{ page: 8 }], ahead: [], behind: [], nearby: [] });
    expect(renderer.getImage({ page: 0 })?.tier).toBe('preview');
  });

  it('never makes a page worse: a big enough sharp image is reused after a resize', async () => {
    const { source, calls } = fakeSource();
    const renderer = new PageRenderer(source, desktop, () => 2);
    const focus = () =>
      renderer.focus({ visible: [{ page: 0 }], ahead: [], behind: [], nearby: [] });
    renderer.setDisplaySize({ width: 300, height: 400 });
    focus();
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.tier).toBe('sharp'));
    const rendered = calls.length;

    // A little smaller (e.g. immersive mode toggled): the 625 px render still serves.
    renderer.setDisplaySize({ width: 280, height: 380 });
    focus();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toHaveLength(rendered);

    // Bigger: the next rung replaces the old image, which stays up meanwhile.
    renderer.setDisplaySize({ width: 360, height: 480 });
    focus();
    expect(renderer.getImage({ page: 0 })?.width).toBe(625);
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.width).toBe(781));
    expect(renderer.stats().sharpCount).toBe(1);
  });

  it('skips separate previews when they cost as much as sharp pages (comics)', async () => {
    const { source, calls } = fakeSource();
    const render = source.render;
    // Like a scanned comic: decoding the page image dominates, whatever the output size.
    source.render = async (page, target, signal) => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return render(page, target, signal);
    };
    const renderer = new PageRenderer(source, desktop, () => 1);
    renderer.focus({ visible: [{ page: 0 }], ahead: [], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.tier).toBe('sharp'));
    calls.length = 0;

    renderer.focus({ visible: [{ page: 4 }], ahead: [{ page: 5 }], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 5 })?.tier).toBe('sharp'));
    // One render per page; the preview comes from shrinking the sharp one.
    expect(calls.map((c) => c.page)).toEqual([4, 5]);
    expect(renderer.stats().previewCount).toBe(3);
  });

  it('over budget, drops the sharp page farthest from the reader, never a turning one', async () => {
    const { source } = fakeSource();
    // Room for three 1000-byte sharp pages.
    const renderer = new PageRenderer(source, { ...desktop, maxCacheBytes: 3000 }, () => 1);
    const sharp = (page: number) => renderer.getImage({ page })?.tier === 'sharp';
    renderer.focus({
      visible: [{ page: 2 }],
      ahead: [{ page: 3 }],
      behind: [{ page: 1 }],
      nearby: [],
    });
    await vi.waitFor(() => expect([1, 2, 3].every(sharp)).toBe(true));

    // Turning from 2 to 3: page 2 leaves the plan's visible set but is pinned until the turn lands.
    renderer.pinTurn([{ page: 2 }, { page: 3 }]);
    renderer.focus({
      visible: [{ page: 3 }],
      ahead: [{ page: 4 }],
      behind: [{ page: 2 }, { page: 1 }],
      nearby: [],
    });
    await vi.waitFor(() => expect(sharp(4)).toBe(true));
    // Page 1 is farthest (behind the page behind); the page ahead, rendered last, stays.
    expect([sharp(1), sharp(2), sharp(3), sharp(4)]).toEqual([false, true, true, true]);
  });

  it("shows a CBZ page's own image as is, and renders only the ones too big for that", async () => {
    const { source, calls } = fakeSource();
    const original = { blob: new Blob([new Uint8Array(500)]), width: 1000, height: 1500 };
    source.original = async (page) =>
      page === 3 ? { ...original, width: 5000, height: 7500 } : original;
    const renderer = new PageRenderer(source, desktop, () => 2);
    renderer.setDisplaySize({ width: 300, height: 400 });
    renderer.focus({ visible: [{ page: 1 }], ahead: [{ page: 3 }], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 3 })?.tier).toBe('sharp'));
    expect(renderer.getImage({ page: 1 })).toMatchObject({
      tier: 'sharp',
      width: 1000,
      bytes: 500,
    });
    // Page 3 (37.5 MP) went through the canvas; page 1 needed no render, not even a preview.
    expect(calls.map((c) => c.page)).toEqual([3]);

    // A bigger slot still can't beat the original: it is kept, not re-rendered.
    renderer.setDisplaySize({ width: 900, height: 1200 });
    renderer.focus({ visible: [{ page: 1 }], ahead: [], behind: [], nearby: [] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.map((c) => c.page)).toEqual([3]);
    expect(renderer.getImage({ page: 1 })?.width).toBe(1000);
  });

  it('drops a queued preview once the page is wanted sharp (comics)', async () => {
    const { source, calls } = fakeSource();
    const render = source.render;
    source.render = async (page, target, signal) => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return render(page, target, signal);
    };
    const renderer = new PageRenderer(source, desktop, () => 1);
    renderer.focus({ visible: [{ page: 0 }], ahead: [], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.tier).toBe('sharp'));
    calls.length = 0;
    // Page 3 waits for a preview while page 1 renders...
    renderer.focus({ visible: [{ page: 1 }], ahead: [], behind: [], nearby: [{ page: 3 }] });
    // ...then the reader moves on and page 3 is wanted sharp.
    renderer.focus({ visible: [{ page: 2 }], ahead: [{ page: 3 }], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.getImage({ page: 3 })?.tier).toBe('sharp'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    // Only sharp renders: page 3's preview came from its sharp page.
    expect(calls.filter((c) => c.target.width < 300)).toEqual([]);
  });

  it('lossless: new sharp pages are PNG, and JPEG ones on screen are redone', async () => {
    const { source, calls } = fakeSource();
    const renderer = new PageRenderer(source, desktop, () => 1);
    const focus = () =>
      renderer.focus({ visible: [{ page: 0 }], ahead: [], behind: [], nearby: [] });
    focus();
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.tier).toBe('sharp'));
    const jpeg = renderer.getImage({ page: 0 })!.url;
    calls.length = 0;

    renderer.setLossless(true);
    focus();
    // The JPEG stays up until the PNG lands; then it is replaced, once.
    expect(renderer.getImage({ page: 0 })?.url).toBe(jpeg);
    await vi.waitFor(() => expect(renderer.getImage({ page: 0 })?.url).not.toBe(jpeg));
    focus();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.map((c) => c.page)).toEqual([0]);

    // Back to JPEG: the PNG page is kept as is.
    renderer.setLossless(false);
    focus();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.map((c) => c.page)).toEqual([0]);
  });

  it('renders half pages from the full sheet with a region', async () => {
    const { source, calls } = fakeSource();
    const renderer = new PageRenderer(source, desktop, () => 1);
    renderer.focus({ visible: [], ahead: [], behind: [], nearby: [{ page: 2, half: 'right' }] });
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.target.region).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
    expect(calls[0]?.target.width).toBe(2 * Math.round(360 * (300 / 800)));
  });

  it('remembers pages that failed instead of retrying forever', async () => {
    const { source } = fakeSource();
    source.render = async () => {
      throw new Error('broken page');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const renderer = new PageRenderer(source, desktop, () => 1);
    renderer.focus({ visible: [{ page: 1 }], ahead: [], behind: [], nearby: [] });
    await vi.waitFor(() => expect(renderer.hasFailed({ page: 1 })).toBe(true));
    warn.mockRestore();
  });
});
