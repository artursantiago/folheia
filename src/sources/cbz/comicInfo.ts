import type { BookMetadata } from '../types';

export interface ComicInfo {
  metadata: BookMetadata;
  /** Zero-based image indices marked as two-page spreads. */
  doublePages: Set<number>;
  /** Zero-based image indices the editor marked as deleted. */
  deletedPages: Set<number>;
  pageCount?: number;
}

/** Parses the de facto standard ComicInfo.xml (Anansi project schema). */
export function parseComicInfo(xml: string): ComicInfo {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const text = (tag: string) =>
    doc.querySelector(`ComicInfo > ${tag}`)?.textContent?.trim() || undefined;
  const metadata: BookMetadata = {};
  const series = text('Series');
  const number = text('Number');
  const title =
    text('Title') ?? (series ? (number ? `${series} nº ${number}` : series) : undefined);
  const author = text('Writer') ?? text('Penciller');
  const year = text('Year');
  const manga = text('Manga');
  if (title) metadata.title = title;
  if (author) metadata.author = author;
  if (year) metadata.date = year;
  if (series) metadata.series = series;
  if (number) metadata.number = number;
  const volume = text('Volume');
  if (volume) metadata.volume = volume;
  const language = text('LanguageISO');
  if (language) metadata.language = language;
  // Only "YesAndRightToLeft" says the reading direction; "Yes" just means manga.
  if (manga === 'YesAndRightToLeft') metadata.direction = 'rtl';
  else if (manga === 'No') metadata.direction = 'ltr';

  const doublePages = new Set<number>();
  const deletedPages = new Set<number>();
  for (const page of doc.querySelectorAll('ComicInfo > Pages > Page')) {
    const image = Number(page.getAttribute('Image'));
    if (!Number.isInteger(image) || image < 0) continue;
    if (page.getAttribute('DoublePage')?.toLowerCase() === 'true') doublePages.add(image);
    if (page.getAttribute('Type') === 'Deleted') deletedPages.add(image);
  }
  const pageCount = Number(text('PageCount'));
  return {
    metadata,
    doublePages,
    deletedPages,
    ...(Number.isFinite(pageCount) && pageCount > 0 ? { pageCount } : {}),
  };
}
