/** Size of a page in PDF points (1/72 in) or image pixels: only the ratio matters. */
export interface PageSize {
  width: number;
  height: number;
}

/** A sub-rectangle of a page in normalized coordinates (0..1). */
export interface PageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FULL_PAGE: PageRegion = { x: 0, y: 0, width: 1, height: 1 };

export interface RenderTarget {
  /** Output size in device pixels for the whole page (before cropping to `region`). */
  width: number;
  height: number;
  region?: PageRegion;
}

export type ReadingDirection = 'ltr' | 'rtl';

export interface BookMetadata {
  title?: string;
  author?: string;
  /** Free-form date or year string, as found in the file. */
  date?: string;
  series?: string;
  number?: string;
  volume?: string;
  language?: string;
  direction?: ReadingDirection;
}

export interface OutlineItem {
  title: string;
  /** Zero-based page index, or null when the target can't be resolved. */
  pageIndex: number | null;
  children: OutlineItem[];
}

export interface PageLink {
  /** Normalized rectangle on the page. */
  rect: PageRegion;
  url?: string;
  pageIndex?: number;
}

export type SourceKind = 'pdf' | 'cbz';

export interface OriginalImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Anything that can provide pages: PDF now, CBZ next, images later.
 * Implementations never touch the DOM tree beyond scratch canvases.
 */
export interface PageSource {
  readonly kind: SourceKind;
  /** Stable identifier of the file's content (used to remember the reading position). */
  readonly id: string;
  readonly pageCount: number;
  /** Best known size; may be refined after the page is first loaded. */
  getPageSize(index: number): PageSize;
  /** Size only if actually measured (not a fallback guess). */
  knownPageSize(index: number): PageSize | undefined;
  /**
   * The page's own encoded image, when the file stores one per page (CBZ) in a
   * format every supported browser decodes: it can be shown as is, losslessly
   * and without re-encoding. Optional.
   */
  original?(index: number, signal: AbortSignal): Promise<OriginalImage | undefined>;
  /** Renders the page (or a region of it) into a canvas the caller owns and must release. */
  render(index: number, target: RenderTarget, signal: AbortSignal): Promise<HTMLCanvasElement>;
  getMetadata(): Promise<BookMetadata>;
  getOutline(): Promise<OutlineItem[]>;
  /**
   * Fills `container` with selectable, invisible text matching the page drawn
   * `cssWidth` CSS pixels wide (for copy and screen readers). Optional.
   */
  renderTextLayer?(
    index: number,
    container: HTMLElement,
    cssWidth: number,
    signal: AbortSignal,
  ): Promise<void>;
  /**
   * Physical pages whose decoded data (parsed page, embedded images) stays
   * between renders, so zoom tiles of them only paint. Any page left out of
   * the list is released. Optional.
   */
  keepDecoded?(pages: readonly number[]): void;
  /** Pages stored as one double-page image (CBZ spreads). Optional. */
  isWidePage?(index: number): boolean;
  /** Clickable areas of the page (web links and links to other pages). Optional. */
  getLinks?(index: number): Promise<PageLink[]>;
  /** Fired when page sizes become known. */
  onSizesChanged(listener: () => void): () => void;
  destroy(): Promise<void>;
}

export type SourceErrorCode =
  | 'invalid'
  | 'empty'
  | 'password-cancelled'
  | 'network'
  | 'http'
  | 'unsupported-format'
  | 'aborted';

export class SourceError extends Error {
  constructor(
    readonly code: SourceErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}

/** Asked for when a file is encrypted. Resolve null to give up. */
export type PasswordPrompt = (reason: 'required' | 'incorrect') => Promise<string | null>;
