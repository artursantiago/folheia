export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
}

let webpSupport: Promise<boolean> | undefined;

/** Safari can't encode WebP (it silently returns PNG), so we probe once. */
export function supportsWebpEncoding(): Promise<boolean> {
  webpSupport ??= new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    canvas.toBlob((blob) => resolve(blob?.type === 'image/webp'), 'image/webp');
  });
  return webpSupport;
}

/** Compresses a rendered canvas and releases its pixels. */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<EncodedImage> {
  const type = (await supportsWebpEncoding()) ? 'image/webp' : 'image/jpeg';
  const { width, height } = canvas;
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Encoding failed'))),
      type,
      quality,
    ),
  );
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width, height };
}

/** A smaller copy of a rendered canvas (the original is left untouched). */
export function scaleCanvas(
  canvas: HTMLCanvasElement,
  size: { width: number; height: number },
): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = size.width;
  small.height = size.height;
  const context = small.getContext('2d');
  if (context) {
    context.imageSmoothingQuality = 'high';
    context.drawImage(canvas, 0, 0, size.width, size.height);
  }
  return small;
}
