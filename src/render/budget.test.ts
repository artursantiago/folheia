import { createBudget, isAppleTouchDevice, previewSize, scaleStep, sharpSize } from './budget';

const ipad = { maxTouchPoints: 5, platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' };
const mac = { maxTouchPoints: 0, platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' };

describe('render budget', () => {
  it('detects iPadOS pretending to be a Mac', () => {
    expect(isAppleTouchDevice(ipad)).toBe(true);
    expect(isAppleTouchDevice(mac)).toBe(false);
  });

  it('is stricter on iOS', () => {
    expect(createBudget(ipad).maxCanvasPixels).toBeLessThan(createBudget(mac).maxCanvasPixels);
  });

  it('caps the pixel ratio at 2', () => {
    const size = sharpSize(
      { width: 600, height: 800 },
      { width: 300, height: 400 },
      3,
      createBudget(mac),
    );
    expect(size).toEqual({ width: 600, height: 800 });
  });

  it('never exceeds the canvas pixel limit', () => {
    const budget = createBudget(ipad);
    const size = sharpSize({ width: 600, height: 800 }, { width: 2000, height: 2667 }, 2, budget);
    expect(size.width * size.height).toBeLessThanOrEqual(budget.maxCanvasPixels);
    expect(size.width / size.height).toBeCloseTo(0.75, 2);
  });

  it('rounds sharp widths up to a fixed ladder', () => {
    expect(scaleStep(100)).toBe(256);
    expect(scaleStep(600)).toBe(625);
    expect(scaleStep(625)).toBe(625);
    expect(scaleStep(626)).toBe(781);
    expect(scaleStep(600, 2)).toBe(1024);
    const size = sharpSize(
      { width: 600, height: 800 },
      { width: 300, height: 400 },
      2,
      createBudget(mac),
      1.25,
    );
    expect(size).toEqual({ width: 625, height: 833 });
  });

  it('sizes previews by their long side', () => {
    expect(previewSize({ width: 600, height: 800 }, createBudget(mac))).toEqual({
      width: 270,
      height: 360,
    });
  });
});
