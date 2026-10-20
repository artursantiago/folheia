import { ZoomController } from './ZoomController';

function stage(width = 800, height = 600) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: width });
  Object.defineProperty(el, 'clientHeight', { value: height });
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return el;
}

describe('ZoomController', () => {
  it('steps through zoom levels and back to fit', () => {
    const applied: number[] = [];
    const zoom = new ZoomController(stage(), {
      apply: (s) => applied.push(s),
      settle: () => {},
      takeOver: () => {},
    });
    zoom.zoomIn();
    zoom.zoomIn();
    expect(zoom.scale).toBe(2);
    zoom.zoomOut();
    expect(zoom.scale).toBe(1.5);
    zoom.reset();
    expect(zoom.scale).toBe(1);
    expect(applied).toEqual([1.5, 2, 1.5, 1]);
  });

  it('keeps the point under the cursor fixed and never pans past the edges', () => {
    const zoom = new ZoomController(stage(), {
      apply: () => {},
      settle: () => {},
      takeOver: () => {},
    });
    zoom.zoomTo(2, 200, 150);
    // The content point at (200, 150) stays at (200, 150): x = 200 - 2 × 200.
    expect(zoom.x).toBe(-200);
    expect(zoom.y).toBe(-150);
    zoom.zoomTo(2, 0, 0);
    expect(zoom.x).toBeLessThanOrEqual(0);
    zoom.zoomTo(4, 800, 600);
    expect(zoom.x).toBeGreaterThanOrEqual(800 * (1 - 4));
  });

  it('caps zoom at 4× and never goes below fit', () => {
    const zoom = new ZoomController(stage(), {
      apply: () => {},
      settle: () => {},
      takeOver: () => {},
    });
    zoom.zoomTo(10);
    expect(zoom.scale).toBe(4);
    zoom.zoomTo(0.2);
    expect(zoom.scale).toBe(1);
  });
});
