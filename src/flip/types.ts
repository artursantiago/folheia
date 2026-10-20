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
  /** Best image available for a logical page, or undefined while it renders. */
  imageOf(page: number): string | undefined;
  /** Accessible text for a page image ("Página 12"). */
  pageLabel(page: number): string;
}

/** Page-turn effect. Flip2D now; a WebGL 3D engine can implement the same contract later. */
export interface FlipEngine {
  readonly spread: number;
  readonly isFlipping: boolean;
  setBook(host: FlipHost, spread: number): void;
  setSize(size: PageSlotSize): void;
  goTo(spread: number, options?: { animate?: boolean }): Promise<void>;
  next(): void;
  prev(): void;
  /** Call when new page images are available. */
  refreshImages(): void;
  setInteractive(enabled: boolean): void;
  setHoverPeek(enabled: boolean): void;
  onChange(listener: (spread: number) => void): () => void;
  /** True while a page is moving (the render queue pauses meanwhile). */
  onFlipStateChange(listener: (flipping: boolean) => void): () => void;
  destroy(): void;
}
