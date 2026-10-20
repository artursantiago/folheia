/**
 * Example books for the home carousel. All are public domain in Brazil and
 * the US, and are fetched from Wikimedia Commons only when someone opens one.
 * Edit this list to change the collection.
 */
export interface ExampleBook {
  /** Accession number shown on the cover ("Nº 0001"). */
  number: number;
  title: string;
  author: string;
  year: number;
  language: 'PT' | 'EN';
  url: string;
  /** Where the scan comes from, shown on the book card. */
  source: string;
  /** Cover color (one of the theme's book-binding tones). */
  binding: 'terracotta' | 'green' | 'blue' | 'violet';
  ornament: 'sun' | 'road' | 'star' | 'key';
}

export const examples: ExampleBook[] = [
  {
    number: 1,
    title: 'A Menina do Narizinho Arrebitado',
    author: 'Monteiro Lobato',
    year: 1920,
    language: 'PT',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/A_Menina_do_Narizinho_Arrebitado_%281920%29.pdf',
    source: 'Biblioteca Nacional / Wikimedia Commons',
    binding: 'terracotta',
    ornament: 'sun',
  },
  {
    number: 2,
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    language: 'EN',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/The_Wonderful_Wizard_of_Oz.pdf',
    source: 'Wikimedia Commons',
    binding: 'green',
    ornament: 'road',
  },
  {
    number: 3,
    title: 'Peter Pan in Kensington Gardens',
    author: 'J. M. Barrie · Arthur Rackham',
    year: 1912,
    language: 'EN',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/MU_KPB_040_Peter_Pan_-_Illustrated_by_Arthur_Rackham.pdf',
    source: 'Maastricht University Library / Wikimedia Commons',
    binding: 'blue',
    ornament: 'star',
  },
  {
    number: 4,
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll · Arthur Rackham',
    year: 1907,
    language: 'EN',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/MU_KPB_050_Alice%27s_adventures_in_Wonderland_-_by_Lewis_Carroll.pdf',
    source: 'Maastricht University Library / Wikimedia Commons',
    binding: 'violet',
    ornament: 'key',
  },
];

export function exampleForUrl(url: string): ExampleBook | undefined {
  return examples.find((book) => book.url === url);
}
