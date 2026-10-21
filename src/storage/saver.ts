/**
 * Writes only the latest value, once things have been still for `delayMs`
 * (a page turn every second shouldn't mean a write every second). `flush`
 * writes right away: on leaving the page, hiding the tab or closing the book.
 */
export interface Saver<T> {
  schedule(value: T): void;
  flush(): void;
}

export function createSaver<T>(write: (value: T) => Promise<unknown>, delayMs = 1000): Saver<T> {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    void write(value).catch((error: unknown) => console.warn('Could not save', error));
  };
  return {
    schedule(value) {
      pending = { value };
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}

/** Flushes when the page goes away or is hidden (the iPad may never come back to it). */
export function flushOnLeave(saver: Saver<unknown>): () => void {
  const onHide = () => {
    if (document.visibilityState === 'hidden') saver.flush();
  };
  const onPageHide = () => saver.flush();
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}
