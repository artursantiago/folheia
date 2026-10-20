import type { PageSource, RenderTarget } from '../sources/types';
import { createBudget } from './budget';
import { PageRenderer } from './PageRenderer';

vi.mock('./encode', () => ({
  encodeCanvas: async (canvas: { width: number; height: number }) => ({
    blob: new Blob([new Uint8Array(1000)]),
    width: canvas.width,
    height: canvas.height,
  }),
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
      [4, 640],
      [5, 270],
      [5, 640],
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
