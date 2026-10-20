import {
  apply,
  compose,
  computeFold,
  constrainPoint,
  polygonArea,
  reflectionAcross,
  turnProgress,
} from './geometry';

const W = 400;
const H = 600;

describe('fold geometry', () => {
  it('has no fold when the corner is at rest', () => {
    const fold = computeFold(W, H, 'bottom', { x: W, y: H });
    expect(fold.folded).toEqual([]);
    expect(polygonArea(fold.remaining)).toBe(W * H);
  });

  it('folds a vertical strip when the corner moves straight left', () => {
    const fold = computeFold(W, H, 'bottom', { x: W / 2, y: H });
    // Fold line at x = 3W/4: the last quarter folds back over [W/2, 3W/4].
    expect(polygonArea(fold.folded)).toBeCloseTo((W / 4) * H);
    expect(Math.min(...fold.reflected.map((p) => p.x))).toBeCloseTo(W / 2);
    expect(Math.max(...fold.reflected.map((p) => p.x))).toBeCloseTo((3 * W) / 4);
  });

  it('covers the opposite page exactly when fully turned', () => {
    const fold = computeFold(W, H, 'bottom', { x: -W, y: H });
    expect(polygonArea(fold.remaining)).toBeCloseTo(0);
    expect(polygonArea(fold.folded)).toBeCloseTo(W * H);
    const xs = fold.reflected.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(-W);
    expect(Math.max(...xs)).toBeCloseTo(0);
  });

  it('keeps the area of the page constant through a diagonal fold', () => {
    const fold = computeFold(W, H, 'bottom', { x: 150, y: 480 });
    expect(polygonArea(fold.remaining) + polygonArea(fold.folded)).toBeCloseTo(W * H);
  });

  it('never lets the corner leave the spine circle', () => {
    const p = constrainPoint({ x: -900, y: H + 300 }, 'bottom', W, H);
    expect(Math.hypot(p.x - 0, p.y - H)).toBeLessThanOrEqual(W + 1e-9);
  });

  it('reflection is an involution and composes like functions', () => {
    const r = reflectionAcross({ x: 10, y: 20 }, { x: Math.SQRT1_2, y: Math.SQRT1_2 });
    const p = { x: 3, y: -7 };
    const back = apply(r, apply(r, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
    const twice = compose(r, r);
    expect(apply(twice, p).x).toBeCloseTo(p.x);
  });

  it('measures turn progress', () => {
    expect(turnProgress({ x: W, y: H }, W)).toBe(0);
    expect(turnProgress({ x: 0, y: H }, W)).toBe(0.5);
    expect(turnProgress({ x: -W, y: H }, W)).toBe(1);
  });
});
