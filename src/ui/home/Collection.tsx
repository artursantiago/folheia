import { useRef } from 'react';
import { examples, type ExampleBook } from '../../examples';
import { Accession, IconButton, Overline } from '../components';
import { useI18n } from '../hooks/useI18n';
import { BookCover } from './BookCover';
import styles from './Collection.module.css';

export function Collection({ onOpen }: { onOpen: (book: ExampleBook) => void }) {
  const { t } = useI18n();
  const track = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  return (
    <section className={styles.collection} aria-labelledby="collection-title">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id="collection-title" className={styles.title}>
            {t('home.collection')}
          </h2>
          <Overline>{t('home.collectionNote')}</Overline>
        </div>
        <div className={styles.arrows}>
          <IconButton icon="prev" label={t('home.prevBooks')} onClick={() => scroll(-1)} />
          <IconButton icon="next" label={t('home.nextBooks')} onClick={() => scroll(1)} />
        </div>
      </header>
      <ul ref={track} className={styles.track}>
        {examples.map((book, i) => (
          <li key={book.url} className={styles.item}>
            <button
              type="button"
              className={styles.book}
              onClick={() => onOpen(book)}
              aria-label={t('home.openExample', {
                title: book.title,
                author: book.author,
                year: book.year,
              })}
            >
              <BookCover book={book} featured={i === 0} />
              <span className={styles.caption}>
                <Accession number={book.number} details={[book.year, book.language]} />
                <span className={styles.name}>{book.title}</span>
              </span>
            </button>
          </li>
        ))}
        <li className={`${styles.item} ${styles.empty}`} aria-hidden="true">
          <span className={styles.slot}>{t('home.emptySlot')}</span>
          <span className={styles.caption}>
            <Accession number={examples.length + 1} />
          </span>
        </li>
      </ul>
    </section>
  );
}
