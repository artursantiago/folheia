/** Fullscreen API with the WebKit prefix; iPhone Safari supports neither for documents. */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenEnabled?: boolean;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function fullscreenSupported(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

export async function toggleFullscreen(element: HTMLElement = document.documentElement) {
  const doc = document as WebkitDocument;
  const el = element as WebkitElement;
  try {
    if (isFullscreen()) await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    else await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
  } catch {
    // Denied (e.g. not triggered by a user gesture): nothing to do.
  }
}

export function onFullscreenChange(listener: () => void) {
  document.addEventListener('fullscreenchange', listener);
  document.addEventListener('webkitfullscreenchange', listener);
  return () => {
    document.removeEventListener('fullscreenchange', listener);
    document.removeEventListener('webkitfullscreenchange', listener);
  };
}
