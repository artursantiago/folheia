import type { ExampleBook } from '../../examples';
import styles from './BookCover.module.css';

const ornaments: Record<ExampleBook['ornament'], string> = {
  sun: 'M30 22a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM22 6v4M22 34v4M6 22h4M34 22h4M10.7 10.7l2.8 2.8M30.5 30.5l2.8 2.8M10.7 33.3l2.8-2.8M30.5 13.5l2.8-2.8',
  road: 'M4 36c8-4 12-10 18-14s12-6 18-6M10 38c6-3 10-8 15-11s10-5 15-5',
  star: 'M22 6l4.7 9.6 10.6 1.5-7.6 7.5 1.8 10.5L22 30.1l-9.5 5 1.8-10.5-7.6-7.5 10.6-1.5z',
  key: 'M14 22a7 7 0 1 1 0-.1zM21 22h17M32 22v6M37 22v4',
};

/** A typographic cover in our own style: no image, no network request. */
export function BookCover({ book, featured = false }: { book: ExampleBook; featured?: boolean }) {
  return (
    <span
      className={styles.cover}
      data-binding={book.binding}
      data-featured={featured || undefined}
      aria-hidden="true"
    >
      <span className={styles.title}>{book.title}</span>
      <svg className={styles.ornament} viewBox="0 0 44 44">
        <path d={ornaments[book.ornament]} />
      </svg>
      <span className={styles.author}>{book.author}</span>
    </span>
  );
}
