import './flip.css';
import {
  compose,
  computeFold,
  cornerPoint,
  type Affine,
  type Corner,
  type Fold,
  type Point,
  type Polygon,
} from './geometry';
import type { FlipEngine, FlipHost, PageSlotSize } from './types';

const TURN_MS = 620;
const SHADOW_PX = 46;
const TAP_SLOP = 6;
const PEEK_ZONE = 90;
const PEEK_LIFT = 34;
/** Taps only turn pages near the outer edges; the middle is left for zoom gestures. */
const TAP_EDGE = 0.3;

type Side = 'left' | 'right';

interface Turn {
  /** The turn always goes from `from` to `from + 1`; going back plays it in reverse. */
  from: number;
  corner: Corner;
  point: Point;
  els: TurnElements;
  raf?: number;
}

interface TurnElements {
  layer: HTMLElement;
  beneath: HTMLElement;
  front: HTMLElement;
  frontShade: HTMLElement;
  cast: HTMLElement;
  castStrip: HTMLElement;
  backWrap: HTMLElement;
  back: HTMLElement;
  backStrip: HTMLElement;
}

interface Drag {
  pointerId: number;
  start: Point;
  startTime: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  /** Set once the pointer moved enough to be a drag rather than a tap. */
  kind?: 'forward' | 'backward';
  turnStart?: Point;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function polygonCss(points: Polygon): string {
  if (points.length < 3) return 'polygon(0 0, 0 0, 0 0)';
  return `polygon(${points.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(', ')})`;
}

function matrixCss(m: Affine): string {
  return `matrix(${m.map((v) => v.toFixed(5)).join(', ')})`;
}

function el(className: string, parent?: HTMLElement): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  parent?.appendChild(node);
  return node;
}

/**
 * Our own 2D page-turn: a corner fold drawn with clip-path, a reflected back
 * side and gradient shadows, driven by a single control point (the corner).
 * Animations move that point by themselves; dragging moves it with the finger.
 */
export class Flip2D implements FlipEngine {
  private stage: HTMLElement;
  private zoomLayer: HTMLElement;
  private book: HTMLElement;
  private host: FlipHost | undefined;
  private size: PageSlotSize = { width: 400, height: 560 };
  private current = 0;
  private turn: Turn | undefined;
  private drag: Drag | undefined;
  private peeking = false;
  private interactive = true;
  private hoverPeek = true;
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private changeListeners = new Set<(spread: number) => void>();
  private flipListeners = new Set<(flipping: boolean) => void>();
  private pending: (() => void) | undefined;

  constructor(container: HTMLElement) {
    this.stage = el('fx-stage', container);
    this.zoomLayer = el('fx-zoom', this.stage);
    this.book = el('fx-book', this.zoomLayer);
    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('pointermove', this.onPointerMove);
    this.stage.addEventListener('pointerup', this.onPointerUp);
    this.stage.addEventListener('pointercancel', this.onPointerUp);
    this.stage.addEventListener('pointerleave', this.onPointerLeave);
  }

  get spread() {
    return this.current;
  }

  get isFlipping() {
    return this.turn !== undefined;
  }

  setBook(host: FlipHost, spread: number) {
    this.cancelTurn();
    this.host = host;
    this.current = Math.max(0, Math.min(spread, host.spreads.length - 1));
    this.renderStatic();
  }

  setSize(size: PageSlotSize) {
    this.size = size;
    if (!this.turn) this.renderStatic();
  }

  setInteractive(enabled: boolean) {
    this.interactive = enabled;
    if (!enabled) this.endPeek();
  }

  setHoverPeek(enabled: boolean) {
    this.hoverPeek = enabled;
    if (!enabled) this.endPeek();
  }

  onChange(listener: (spread: number) => void) {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onFlipStateChange(listener: (flipping: boolean) => void) {
    this.flipListeners.add(listener);
    return () => this.flipListeners.delete(listener);
  }

  next() {
    void this.goTo(this.current + 1);
  }

  prev() {
    void this.goTo(this.current - 1);
  }

  async goTo(target: number, options: { animate?: boolean } = {}) {
    const host = this.host;
    if (!host) return;
    const to = Math.max(0, Math.min(target, host.spreads.length - 1));
    if (to === this.current) return;
    this.endPeek();
    if (this.turn) {
      // Finish the running turn instantly, then continue from there.
      this.pending = () => void this.goTo(to, options);
      return;
    }
    const animate = options.animate ?? Math.abs(to - this.current) === 1;
    if (!animate || this.reducedMotion || this.needsCrossfade(this.current, to)) {
      this.crossfade(to, animate);
      return;
    }
    const forward = to > this.current;
    const from = forward ? this.current : to;
    this.startTurn(from, 'bottom');
    const turn = this.turn as Turn | undefined;
    if (!turn) return;
    const c = cornerPoint('bottom', this.size.width, this.size.height);
    const t = this.turnedPoint('bottom');
    const lift = { x: 0, y: this.size.height * 0.82 };
    turn.point = forward ? c : t;
    await this.animatePoint(forward ? [c, lift, t] : [t, lift, c], TURN_MS);
    this.finishTurn(forward);
  }

  /** Pans and scales the whole book (zoom). Scale 1 with no offset is the resting view. */
  setZoom(scale: number, x: number, y: number) {
    this.zoomLayer.style.transform =
      scale === 1 && x === 0 && y === 0 ? '' : `translate(${x}px, ${y}px) scale(${scale})`;
  }

  /** Screen rectangle of a logical page currently on screen. */
  pageRect(page: number): DOMRect | undefined {
    return this.book
      .querySelector<HTMLElement>(`.fx-page[data-page="${page}"]`)
      ?.getBoundingClientRect();
  }

  /** Lays a sharper image over part of a page (zoomed-in area). */
  showTile(
    page: number,
    url: string,
    region: { x: number; y: number; width: number; height: number },
  ) {
    const node = this.book.querySelector<HTMLElement>(`.fx-page[data-page="${page}"]`);
    if (!node) return;
    let tile = node.querySelector<HTMLImageElement>('img.fx-tile');
    if (!tile) {
      tile = document.createElement('img');
      tile.className = 'fx-tile';
      tile.alt = '';
      tile.draggable = false;
      node.appendChild(tile);
    }
    tile.style.left = `${region.x * 100}%`;
    tile.style.top = `${region.y * 100}%`;
    tile.style.width = `${region.width * 100}%`;
    tile.style.height = `${region.height * 100}%`;
    tile.src = url;
  }

  /** Another gesture (pinch, pan) took over: drop any drag and settle the page. */
  cancelGesture() {
    this.drag = undefined;
    this.endPeek();
    if (this.turn && !this.turn.raf) this.finishTurn(false);
  }

  clearTiles() {
    this.book.querySelectorAll('img.fx-tile').forEach((tile) => tile.remove());
  }

  refreshImages() {
    for (const node of this.book.querySelectorAll<HTMLElement>('.fx-page[data-page]')) {
      this.fillPage(node, Number(node.dataset.page));
    }
  }

  destroy() {
    this.cancelTurn();
    this.stage.remove();
    this.changeListeners.clear();
    this.flipListeners.clear();
  }

  // ---- static spreads -------------------------------------------------------

  private get double() {
    return this.host?.mode === 'double';
  }

  private get rtl() {
    return this.host?.direction === 'rtl';
  }

  /** Which screen side each page of a spread sits on. */
  private placement(spread: number): { page: number; side: Side | 'wide' }[] {
    const host = this.host;
    const pages = host?.spreads[spread]?.pages ?? [];
    if (!host || !this.double) return pages.map((page) => ({ page, side: 'right' as Side }));
    if (pages.length === 1) {
      const page = pages[0]!;
      if (host.isWide(page)) return [{ page, side: 'wide' }];
      // The first spread is the cover (front side); a lone last page is the back cover.
      const front: Side = this.rtl ? 'left' : 'right';
      const back: Side = this.rtl ? 'right' : 'left';
      return [{ page, side: spread === 0 ? front : back }];
    }
    const [first, second] = pages as [number, number];
    return this.rtl
      ? [
          { page: first, side: 'right' },
          { page: second, side: 'left' },
        ]
      : [
          { page: first, side: 'left' },
          { page: second, side: 'right' },
        ];
  }

  private pageOnSide(spread: number, side: Side): number | undefined {
    return this.placement(spread).find((p) => p.side === side)?.page;
  }

  private slotX(side: Side | 'wide'): number {
    if (!this.double || side === 'left' || side === 'wide') return 0;
    return this.size.width;
  }

  private renderStatic() {
    const { width, height } = this.size;
    this.book.replaceChildren();
    this.book.style.width = `${this.double ? width * 2 : width}px`;
    this.book.style.height = `${height}px`;
    this.book.toggleAttribute('data-single', !this.double);
    for (const { page, side } of this.placement(this.current)) {
      const node = this.pageElement(page, side);
      this.book.appendChild(node);
    }
    this.book.style.transform = this.centerShift(this.current);
    const placement = this.placement(this.current);
    const lone = this.double && placement.length === 1 ? placement[0]?.side : undefined;
    if (lone === 'left' || lone === 'right') this.book.dataset.lone = lone;
    else delete this.book.dataset.lone;
  }

  /** In double mode a lone cover slides to the middle, like a closed book. */
  private centerShift(spread: number): string {
    if (!this.double) return '';
    const placement = this.placement(spread);
    if (placement.length !== 1 || placement[0]?.side === 'wide') return 'translateX(0)';
    const shift = (placement[0]!.side === 'right' ? -1 : 1) * (this.size.width / 2);
    return `translateX(${shift}px)`;
  }

  private pageElement(page: number, side: Side | 'wide'): HTMLElement {
    const node = el('fx-page');
    const { width, height } = this.size;
    node.style.left = `${this.slotX(side)}px`;
    node.style.width = `${side === 'wide' ? width * 2 : width}px`;
    node.style.height = `${height}px`;
    if (this.double && side !== 'wide')
      node.classList.add(side === 'left' ? 'fx-spine-left' : 'fx-spine-right');
    node.dataset.page = String(page);
    this.fillPage(node, page);
    return node;
  }

  private fillPage(node: HTMLElement, page: number) {
    const host = this.host;
    if (!host) return;
    if (host.isBlank(page)) {
      node.setAttribute('data-blank', '');
      node.querySelector('img:not(.fx-tile)')?.remove();
      return;
    }
    const url = host.imageOf(page);
    let img = node.querySelector<HTMLImageElement>('img:not(.fx-tile)');
    if (!url) {
      node.setAttribute('data-loading', '');
      return;
    }
    node.removeAttribute('data-loading');
    if (!img) {
      img = document.createElement('img');
      img.alt = host.pageLabel(page);
      img.decoding = 'async';
      img.draggable = false;
      node.appendChild(img);
    }
    if (img.getAttribute('src') !== url) img.src = url;
  }

  private needsCrossfade(a: number, b: number): boolean {
    const host = this.host;
    if (!host) return true;
    const wide = (s: number) => host.spreads[s]?.pages.some((p) => host.isWide(p)) ?? false;
    return Math.abs(a - b) !== 1 || wide(a) || wide(b);
  }

  private crossfade(to: number, animate: boolean) {
    const old = this.book.cloneNode(true) as HTMLElement;
    this.current = to;
    this.renderStatic();
    this.emitChange();
    if (!animate) return;
    old.style.position = 'absolute';
    old.style.left = `${this.book.offsetLeft}px`;
    old.style.top = `${this.book.offsetTop}px`;
    old.style.pointerEvents = 'none';
    this.zoomLayer.appendChild(old);
    const duration = this.reducedMotion ? 160 : 260;
    const fade = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out' });
    fade.onfinish = () => old.remove();
  }

  // ---- turning ---------------------------------------------------------------

  /** Where the corner ends up after a full turn (mirrored over the spine). */
  private turnedPoint(corner: Corner): Point {
    return { x: -this.size.width, y: corner === 'bottom' ? this.size.height : 0 };
  }

  /** Spine position and orientation in book coordinates. */
  private frame() {
    const { width } = this.size;
    const s = this.rtl ? -1 : 1;
    const spineX = this.double ? width : this.rtl ? width : 0;
    return { s, spineX };
  }

  private toLeaf(clientX: number, clientY: number): Point {
    const rect = this.book.getBoundingClientRect();
    const { s, spineX } = this.frame();
    const scale = rect.width / (this.book.offsetWidth || rect.width);
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x: (x - spineX) * s, y };
  }

  private startTurn(from: number, corner: Corner) {
    const host = this.host;
    if (!host) return;
    const to = from + 1;
    const freeSide: Side = this.double ? (this.rtl ? 'left' : 'right') : 'right';
    const backSide: Side = this.rtl ? 'right' : 'left';
    const frontPage = this.double ? this.pageOnSide(from, freeSide) : host.spreads[from]?.pages[0];
    const beneathPage = this.double ? this.pageOnSide(to, freeSide) : host.spreads[to]?.pages[0];
    const backPage = this.double ? this.pageOnSide(to, backSide) : undefined;

    // Static layer: what stays put during the turn.
    this.book.replaceChildren();
    this.book.style.transform = 'translateX(0)';
    delete this.book.dataset.lone;
    if (this.double) {
      const staticBack = this.pageOnSide(from, backSide);
      if (staticBack !== undefined) this.book.appendChild(this.pageElement(staticBack, backSide));
    }
    const { width, height } = this.size;
    const layer = el('fx-leaf', this.book);
    layer.style.width = `${this.double ? width * 2 : width}px`;
    layer.style.height = `${height}px`;
    layer.style.position = 'absolute';
    layer.style.inset = '0';

    const slotSide: Side = this.double ? freeSide : 'right';
    const beneath =
      beneathPage === undefined ? el('fx-page fx-paper') : this.pageElement(beneathPage, slotSide);
    if (beneathPage === undefined) {
      beneath.style.left = `${this.slotX(slotSide)}px`;
      beneath.style.width = `${width}px`;
      beneath.style.height = `${height}px`;
      beneath.style.opacity = '0';
    }
    layer.appendChild(beneath);

    const cast = el('fx-page', layer);
    cast.style.background = 'transparent';
    cast.style.left = `${this.slotX(slotSide)}px`;
    cast.style.width = `${width}px`;
    cast.style.height = `${height}px`;
    const castStrip = el('fx-strip fx-strip-cast', cast);

    const front =
      frontPage === undefined ? el('fx-page fx-paper') : this.pageElement(frontPage, slotSide);
    front.style.left = `${this.slotX(slotSide)}px`;
    front.style.width = `${width}px`;
    layer.appendChild(front);
    const frontShade = el('fx-strip fx-strip-front', front);

    const backWrap = el('fx-back-wrap', layer);
    const back =
      backPage === undefined
        ? el('fx-page fx-leaf fx-paper')
        : this.pageElement(backPage, backSide);
    back.classList.add('fx-leaf');
    back.style.left = '0';
    back.style.width = `${width}px`;
    back.style.height = `${height}px`;
    backWrap.appendChild(back);
    const backStrip = el('fx-strip fx-strip-back', back);

    this.turn = {
      from,
      corner,
      point: cornerPoint(corner, width, height),
      els: { layer, beneath, front, frontShade, cast, castStrip, backWrap, back, backStrip },
    };
    this.emitFlipping(true);
  }

  private emitFlipping(flipping: boolean) {
    for (const listener of this.flipListeners) listener(flipping);
  }

  private drawTurn() {
    const turn = this.turn;
    if (!turn) return;
    const { width: w, height: h } = this.size;
    const fold = computeFold(w, h, turn.corner, turn.point);
    turn.point = fold.point;
    const { s, spineX } = this.frame();
    const els = turn.els;

    // Front page (local x = distance from its left edge).
    const toFront = (p: Point): Point => ({ x: s > 0 ? p.x : w - p.x, y: p.y });
    els.front.style.clipPath = polygonCss(fold.remaining.map(toFront));
    els.cast.style.clipPath = polygonCss(fold.folded.map(toFront));
    els.beneath.style.opacity = fold.folded.length ? '' : '0';

    // Back side: local → leaf (mirror) → reflect over the fold → book coordinates.
    const mirror: Affine = s > 0 ? [-1, 0, 0, 1, w, 0] : [1, 0, 0, 1, 0, 0];
    const toBook: Affine = [s, 0, 0, 1, spineX, 0];
    const backMatrix = compose(toBook, compose(fold.reflection, mirror));
    els.back.style.transform = matrixCss(backMatrix);
    const toBack = (p: Point): Point => ({ x: s > 0 ? w - p.x : p.x, y: p.y });
    els.back.style.clipPath = polygonCss(fold.folded.map(toBack));
    els.backWrap.style.visibility = fold.folded.length ? 'visible' : 'hidden';

    // Shadows run along the fold line.
    this.placeStrip(els.castStrip, toFront(fold.origin), {
      x: s * fold.normal.x,
      y: fold.normal.y,
    });
    this.placeStrip(els.backStrip, toBack(fold.origin), {
      x: -s * fold.normal.x,
      y: fold.normal.y,
    });
    this.placeStrip(
      els.frontShade,
      toFront(fold.origin),
      { x: -s * fold.normal.x, y: -fold.normal.y },
      0.6,
    );
    this.foldVisibility(fold);
  }

  private foldVisibility(fold: Fold) {
    const turn = this.turn;
    if (!turn) return;
    turn.els.frontShade.style.visibility = fold.folded.length ? 'visible' : 'hidden';
  }

  /** A gradient band along the fold line, fading in the direction of `normal`. */
  private placeStrip(strip: HTMLElement, origin: Point, normal: Point, depth = 1) {
    const { width, height } = this.size;
    const length = 2 * Math.hypot(width, height);
    const thickness = SHADOW_PX * depth;
    const len = Math.hypot(normal.x, normal.y) || 1;
    const n = { x: normal.x / len, y: normal.y / len };
    const t = { x: n.y, y: -n.x };
    const e = origin.x - (t.x * length) / 2;
    const f = origin.y - (t.y * length) / 2;
    strip.style.width = `${length}px`;
    strip.style.height = `${thickness}px`;
    strip.style.transform = matrixCss([t.x, t.y, n.x, n.y, e, f]);
  }

  private animatePoint(path: Point[], duration: number): Promise<void> {
    const turn = this.turn;
    if (!turn) return Promise.resolve();
    const [p0, p1, p2] = path as [Point, Point, Point];
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        if (this.turn !== turn) return resolve();
        const t = Math.min(1, (now - start) / duration);
        const k = easeInOut(t);
        const a = (1 - k) * (1 - k);
        const b = 2 * (1 - k) * k;
        const c = k * k;
        turn.point = { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
        this.drawTurn();
        if (t < 1) turn.raf = requestAnimationFrame(step);
        else resolve();
      };
      turn.raf = requestAnimationFrame(step);
    });
  }

  /** Ends a turn: `completed` means the book now shows `from + 1`. */
  private finishTurn(completed: boolean) {
    const turn = this.turn;
    if (!turn) return;
    if (turn.raf) cancelAnimationFrame(turn.raf);
    this.turn = undefined;
    const changed = this.current !== (completed ? turn.from + 1 : turn.from);
    this.current = completed ? turn.from + 1 : turn.from;
    this.renderStatic();
    this.emitFlipping(false);
    if (changed) this.emitChange();
    const pending = this.pending;
    this.pending = undefined;
    pending?.();
  }

  private cancelTurn() {
    if (!this.turn) return;
    if (this.turn.raf) cancelAnimationFrame(this.turn.raf);
    this.turn = undefined;
    this.peeking = false;
    this.emitFlipping(false);
  }

  private emitChange() {
    for (const listener of this.changeListeners) listener(this.current);
  }

  // ---- pointer ---------------------------------------------------------------

  private canGo(kind: 'forward' | 'backward') {
    const count = this.host?.spreads.length ?? 0;
    return kind === 'forward' ? this.current < count - 1 : this.current > 0;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.interactive || !this.host || event.button !== 0) return;
    if (this.turn && !this.peeking) return;
    this.endPeek();
    this.stage.setPointerCapture?.(event.pointerId);
    const leaf = this.toLeaf(event.clientX, event.clientY);
    this.drag = {
      pointerId: event.pointerId,
      start: leaf,
      startTime: performance.now(),
      lastX: leaf.x,
      lastTime: performance.now(),
      velocity: 0,
    };
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.interactive) return;
    const drag = this.drag;
    if (!drag) {
      if (event.pointerType === 'mouse' && event.buttons === 0) this.updatePeek(event);
      return;
    }
    if (drag.pointerId !== event.pointerId) return;
    const leaf = this.toLeaf(event.clientX, event.clientY);
    const now = performance.now();
    drag.velocity = (leaf.x - drag.lastX) / Math.max(1, now - drag.lastTime);
    drag.lastX = leaf.x;
    drag.lastTime = now;

    if (!drag.kind) {
      if (Math.hypot(leaf.x - drag.start.x, leaf.y - drag.start.y) < TAP_SLOP) return;
      const half = this.double ? 0 : this.size.width / 2;
      const kind = drag.start.x >= half ? 'forward' : 'backward';
      if (!this.canGo(kind)) return;
      const corner: Corner = drag.start.y < this.size.height / 2 ? 'top' : 'bottom';
      drag.kind = kind;
      this.startTurn(kind === 'forward' ? this.current : this.current - 1, corner);
      drag.turnStart =
        kind === 'forward'
          ? cornerPoint(corner, this.size.width, this.size.height)
          : this.turnedPoint(corner);
    }
    const turn = this.turn;
    if (!turn || !drag.turnStart) return;
    turn.point = {
      x: drag.turnStart.x + (leaf.x - drag.start.x),
      y: drag.turnStart.y + (leaf.y - drag.start.y),
    };
    this.drawTurn();
  };

  private onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.drag = undefined;
    const turn = this.turn;
    if (!drag.kind || !turn) {
      // A tap: right side moves forward in LTR, backward in RTL.
      if (event.type === 'pointercancel') return;
      const rect = this.book.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      if (x > TAP_EDGE && x < 1 - TAP_EDGE) return;
      const forward = x >= 0.5 !== this.rtl;
      if (forward) this.next();
      else this.prev();
      return;
    }
    const { width: w, height: h } = this.size;
    // Finish the turn if the corner crossed the spine or was flicked.
    const flick = Math.abs(drag.velocity) > 0.45;
    const completed = flick ? drag.velocity < 0 : turn.point.x < 0;
    const target = completed ? this.turnedPoint(turn.corner) : cornerPoint(turn.corner, w, h);
    const remaining = Math.abs(target.x - turn.point.x) / (2 * w);
    const mid = { x: (turn.point.x + target.x) / 2, y: (turn.point.y + target.y) / 2 };
    void this.animatePoint([turn.point, mid, target], Math.max(140, TURN_MS * remaining)).then(() =>
      this.finishTurn(completed),
    );
  };

  private onPointerLeave = () => {
    if (!this.drag) this.endPeek();
  };

  /** Hovering near the free corner lifts it a little, inviting a drag. */
  private updatePeek(event: PointerEvent) {
    if (!this.hoverPeek || (this.turn && !this.peeking) || !this.canGo('forward')) return;
    const { width: w, height: h } = this.size;
    const leaf = this.toLeaf(event.clientX, event.clientY);
    const nearX = leaf.x > w - PEEK_ZONE && leaf.x <= w + 4;
    const corner: Corner | undefined = !nearX
      ? undefined
      : leaf.y > h - PEEK_ZONE && leaf.y <= h + 4
        ? 'bottom'
        : leaf.y < PEEK_ZONE && leaf.y >= -4
          ? 'top'
          : undefined;
    if (!corner) {
      this.endPeek();
      return;
    }
    if (!this.turn) {
      this.startTurn(this.current, corner);
      this.peeking = true;
    }
    const turn = this.turn as Turn | undefined;
    if (!turn) return;
    turn.corner = corner;
    const c = cornerPoint(corner, w, h);
    turn.point = {
      x: c.x - PEEK_LIFT,
      y: c.y + (corner === 'bottom' ? -PEEK_LIFT : PEEK_LIFT) * 0.6,
    };
    this.drawTurn();
  }

  private endPeek() {
    if (!this.peeking) return;
    this.peeking = false;
    if (this.turn) {
      if (this.turn.raf) cancelAnimationFrame(this.turn.raf);
      this.turn = undefined;
      this.renderStatic();
      this.emitFlipping(false);
    }
  }
}
