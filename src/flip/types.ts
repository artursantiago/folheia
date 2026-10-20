import type { ReadingDirection } from '../sources/types';

export interface PageSlotSize {
  width: number;
  height: number;
}

/** What the flip engine needs to know about the book; provided by the reader. */
export interface FlipHost {
  spreads: readonly { pages: readonly number[] }[];
  mode: 'single' | 'double';
  direction: ReadingDirection;
  isBlank(page: number): boolean;
  isWide(page: number): boolean;
  /** The page couldn't be drawn (e.g. an image format this browser can't decode). */
  isFailed?(page: number): boolean;
  /** Text shown on a page that failed. */
  failedText?: string;
  /** Best image available for a logical page, or undefined while it renders. */
  imageOf(page: number): string | undefined;
  /** Accessible text for a page image ("Página 12"). */
  pageLabel(page: number): string;
  /** Adds overlays (text layer, links) to a page resting on screen. Returns a cleanup. */
  decorate?(page: number, node: HTMLElement, slot: PageSlotSize): (() => void) | void;
}

/** Page-turn effect. Flip2D now; a WebGL 3D engine can implement the same contract later. */
export interface FlipEngine {
  readonly spread: number;
  readonly isFlipping: boolean;
  /** Where queued turns will end up (the current spread when none are queued). */
  readonly target: number;
  /** Spreads the turn in progress moves between (empty at rest). */
  readonly turning: readonly number[];
  setBook(host: FlipHost, spread: number): void;
  setSize(size: PageSlotSize): void;
  goTo(spread: number, options?: { animate?: boolean }): Promise<void>;
  next(): void;
  prev(): void;
  /** Call when new page images are available. */
  refreshImages(): void;
  setInteractive(enabled: boolean): void;
  setZoom(scale: number, x: number, y: number): void;
  pageRect(page: number): DOMRect | undefined;
  showTile(
    page: number,
    url: string,
    region: { x: number; y: number; width: number; height: number },
  ): void;
  clearTiles(): void;
  cancelGesture(): void;
  setHoverPeek(enabled: boolean): void;
  onChange(listener: (spread: number) => void): () => void;
  /** A single tap or click in the middle of the book (not a double tap, not a turn). */
  onCenterTap(listener: () => void): () => void;
  /** True while a page is moving (the render queue pauses meanwhile). */
  onFlipStateChange(listener: (flipping: boolean) => void): () => void;
  destroy(): void;
}
