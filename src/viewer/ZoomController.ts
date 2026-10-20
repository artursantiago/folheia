export interface ZoomCallbacks {
  /** Apply a transform: screen = (x, y) + scale × content, origin at the stage's top-left. */
  apply(scale: number, x: number, y: number): void;
  /** The view stopped moving: time to render sharp tiles. */
  settle(): void;
  /** Another gesture took over: cancel any page-turn in progress. */
  takeOver(): void;
}

export const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;
const MAX = 4;
const SETTLE_MS = 220;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
/** Double taps only zoom away from the page edges, which belong to page turns. */
const EDGE = 0.3;

interface PointerInfo {
  x: number;
  y: number;
  startX: number;
  startY: number;
  time: number;
}

/**
 * Zoom and pan for the reading stage: buttons, Ctrl/⌘ + wheel, pinch,
 * double tap and drag-to-pan. While zoomed in, single-finger drags pan the
 * page instead of turning it.
 */
export class ZoomController {
  scale = 1;
  x = 0;
  y = 0;
  private pointers = new Map<number, PointerInfo>();
  private pinch: { distance: number; scale: number; midX: number; midY: number } | undefined;
  private lastTap: { x: number; y: number; time: number } | undefined;
  private settleTimer: number | undefined;

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: ZoomCallbacks,
  ) {
    container.addEventListener('wheel', this.onWheel, { passive: false });
    container.addEventListener('pointerdown', this.onDown, true);
    container.addEventListener('pointermove', this.onMove, true);
    container.addEventListener('pointerup', this.onUp, true);
    container.addEventListener('pointercancel', this.onUp, true);
    container.addEventListener('dblclick', this.onDoubleClick);
  }

  get zoomed() {
    return this.scale > 1.001;
  }

  zoomIn() {
    const next = ZOOM_STEPS.find((step) => step > this.scale + 0.01) ?? MAX;
    this.zoomTo(next);
  }

  zoomOut() {
    const prev = [...ZOOM_STEPS].reverse().find((step) => step < this.scale - 0.01) ?? 1;
    this.zoomTo(prev);
  }

  reset() {
    this.set(1, 0, 0, false);
  }

  /** Zooms keeping the point under (clientX, clientY) fixed; defaults to the center. */
  zoomTo(scale: number, clientX?: number, clientY?: number) {
    const rect = this.container.getBoundingClientRect();
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const next = Math.min(MAX, Math.max(1, scale));
    const contentX = (px - this.x) / this.scale;
    const contentY = (py - this.y) / this.scale;
    this.set(next, px - next * contentX, py - next * contentY);
  }

  destroy() {
    window.clearTimeout(this.settleTimer);
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('pointerdown', this.onDown, true);
    this.container.removeEventListener('pointermove', this.onMove, true);
    this.container.removeEventListener('pointerup', this.onUp, true);
    this.container.removeEventListener('pointercancel', this.onUp, true);
    this.container.removeEventListener('dblclick', this.onDoubleClick);
  }

  private set(scale: number, x: number, y: number, settle = true) {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    // Keep the zoomed content covering the stage: no panning into the void.
    this.scale = scale;
    this.x = scale === 1 ? 0 : Math.min(0, Math.max(width * (1 - scale), x));
    this.y = scale === 1 ? 0 : Math.min(0, Math.max(height * (1 - scale), y));
    this.callbacks.apply(this.scale, this.x, this.y);
    window.clearTimeout(this.settleTimer);
    if (settle) this.settleTimer = window.setTimeout(() => this.callbacks.settle(), SETTLE_MS);
  }

  private onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      if (this.zoomed) {
        event.preventDefault();
        this.set(this.scale, this.x - event.deltaX, this.y - event.deltaY);
      }
      return;
    }
    event.preventDefault();
    this.zoomTo(this.scale * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
  };

  private onDown = (event: PointerEvent) => {
    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      time: performance.now(),
    });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()] as [PointerInfo, PointerInfo];
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: this.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      this.callbacks.takeOver();
      event.stopPropagation();
    } else if (this.zoomed) {
      event.stopPropagation();
    }
  };

  private onMove = (event: PointerEvent) => {
    const info = this.pointers.get(event.pointerId);
    if (!info) return;
    const dx = event.clientX - info.x;
    const dy = event.clientY - info.y;
    info.x = event.clientX;
    info.y = event.clientY;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()] as [PointerInfo, PointerInfo];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      // Scale around the fingers' midpoint and follow it as it moves.
      this.zoomTo(this.pinch.scale * (distance / this.pinch.distance), midX, midY);
      this.set(this.scale, this.x + (midX - this.pinch.midX), this.y + (midY - this.pinch.midY));
      this.pinch.midX = midX;
      this.pinch.midY = midY;
      event.stopPropagation();
      return;
    }
    if (this.zoomed) {
      this.set(this.scale, this.x + dx, this.y + dy);
      event.stopPropagation();
    }
  };

  private onUp = (event: PointerEvent) => {
    const info = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = undefined;
      event.stopPropagation();
      return;
    }
    if (this.zoomed) event.stopPropagation();
    if (!info || event.pointerType === 'mouse' || event.type === 'pointercancel') return;
    // Double tap (touch): toggle between fit and 2×.
    const moved = Math.hypot(event.clientX - info.startX, event.clientY - info.startY);
    const now = performance.now();
    if (moved > 10 || now - info.time > 300) return;
    const last = this.lastTap;
    if (
      last &&
      now - last.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_TAP_PX
    ) {
      this.lastTap = undefined;
      this.toggleAt(event.clientX, event.clientY);
    } else {
      this.lastTap = { x: event.clientX, y: event.clientY, time: now };
    }
  };

  private onDoubleClick = (event: MouseEvent) => this.toggleAt(event.clientX, event.clientY);

  private toggleAt(clientX: number, clientY: number) {
    if (this.zoomed) {
      this.reset();
      return;
    }
    const rect = this.container.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    if (fx < EDGE / 2 || fx > 1 - EDGE / 2) return;
    this.zoomTo(2, clientX, clientY);
  }
}
