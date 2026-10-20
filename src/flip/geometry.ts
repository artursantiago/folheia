/**
 * Corner-fold geometry, in "leaf" coordinates: the turning page spans
 * x ∈ [0, w], y ∈ [0, h], with the spine at x = 0 and the free edge at x = w.
 * The grabbed corner C follows a control point P; the fold line is the
 * perpendicular bisector of C–P. Reflecting the part beyond the fold over
 * that line gives where the back of the page shows.
 */

export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

/** 2D affine transform as CSS matrix(a, b, c, d, e, f). */
export type Affine = [number, number, number, number, number, number];

export type Corner = 'top' | 'bottom';

export interface Fold {
  /** Part of the leaf still lying flat (front side visible). */
  remaining: Polygon;
  /** Part of the leaf beyond the fold, in its flat position. */
  folded: Polygon;
  /** Where the folded part is drawn (its back side), after reflection. */
  reflected: Polygon;
  /** Reflection across the fold line; identity when there is no fold. */
  reflection: Affine;
  /** Fold line through `origin`, with unit `normal` pointing to the corner. */
  origin: Point;
  normal: Point;
  /** The constrained control point actually used. */
  point: Point;
}

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

export function cornerPoint(corner: Corner, w: number, h: number): Point {
  return { x: w, y: corner === 'bottom' ? h : 0 };
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function clampToCircle(p: Point, center: Point, radius: number): Point {
  const d = dist(p, center);
  if (d <= radius) return p;
  const k = radius / d;
  return { x: center.x + (p.x - center.x) * k, y: center.y + (p.y - center.y) * k };
}

/**
 * Keeps the paper from "tearing" off the spine: the corner can't get farther
 * from the spine than the page allows.
 */
export function constrainPoint(p: Point, corner: Corner, w: number, h: number): Point {
  const near = { x: 0, y: corner === 'bottom' ? h : 0 };
  const far = { x: 0, y: corner === 'bottom' ? 0 : h };
  let q = clampToCircle(p, near, w);
  q = clampToCircle(q, far, Math.hypot(w, h));
  return q;
}

/** Sutherland–Hodgman against one half-plane: keeps points where side(p) <= 0 (or > 0). */
function clip(polygon: Polygon, side: (p: Point) => number, keepPositive: boolean): Polygon {
  const inside = (p: Point) => (keepPositive ? side(p) > 0 : side(p) <= 0);
  const out: Polygon = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const ina = inside(a);
    const inb = inside(b);
    if (ina) out.push(a);
    if (ina !== inb) {
      const sa = side(a);
      const sb = side(b);
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

export function reflectionAcross(origin: Point, normal: Point): Affine {
  const { x: nx, y: ny } = normal;
  const k = 2 * (nx * origin.x + ny * origin.y);
  return [1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, k * nx, k * ny];
}

export function apply(m: Affine, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** Composition: first `inner`, then `outer`. */
export function compose(outer: Affine, inner: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function computeFold(w: number, h: number, corner: Corner, pointer: Point): Fold {
  const c = cornerPoint(corner, w, h);
  const point = constrainPoint(pointer, corner, w, h);
  const page: Polygon = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const d = dist(c, point);
  if (d < 0.5) {
    return {
      remaining: page,
      folded: [],
      reflected: [],
      reflection: IDENTITY,
      origin: c,
      normal: { x: 1, y: 0 },
      point,
    };
  }
  const origin = { x: (c.x + point.x) / 2, y: (c.y + point.y) / 2 };
  const normal = { x: (c.x - point.x) / d, y: (c.y - point.y) / d };
  const side = (p: Point) => (p.x - origin.x) * normal.x + (p.y - origin.y) * normal.y;
  const remaining = clip(page, side, false);
  const folded = clip(page, side, true);
  const reflection = reflectionAcross(origin, normal);
  return {
    remaining,
    folded,
    reflected: folded.map((p) => apply(reflection, p)),
    reflection,
    origin,
    normal,
    point,
  };
}

/** How far the turn has gone: 0 = flat, 1 = fully turned over the spine. */
export function turnProgress(point: Point, w: number): number {
  return Math.min(1, Math.max(0, (w - point.x) / (2 * w)));
}

export function polygonArea(polygon: Polygon): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}
