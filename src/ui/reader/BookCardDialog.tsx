import type { BookMetadata, ReadingDirection, SourceKind } from '../../sources/types';
import type { ReadingMemory } from '../../storage/library';
import { Dialog, Stamp } from '../components';
import { useI18n } from '../hooks/useI18n';
import styles from './BookCardDialog.module.css';

export interface BookCardDialogProps {
  open: boolean;
  onClose: () => void;
  metadata: BookMetadata;
  name: string;
  kind: SourceKind;
  pages: number;
  bytes?: number | undefined;
  direction: ReadingDirection;
  splitSpreads: boolean;
  record?: ReadingMemory | undefined;
  /** Source and license line for example books. */
  credit?: { source: string; license: string } | undefined;
}

function formatBytes(bytes: number, locale: string) {
  const mb = bytes / 1048576;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mb)} MB`;
}

export function BookCardDialog(props: BookCardDialogProps) {
  const { t, locale } = useI18n();
  const { metadata, record } = props;
  const last = record?.history[record.history.length - 1];
  const lastDate = last
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(`${last.date}T12:00:00`),
      )
    : undefined;
  const details = [
    props.kind.toUpperCase(),
    t('card.pages', { count: props.pages }),
    props.bytes ? formatBytes(props.bytes, locale) : undefined,
  ].filter(Boolean);

  return (
    <Dialog
      open={props.open}
      title={t('reader.bookCard')}
      label={t('card.label')}
      closeLabel={t('action.close')}
      onClose={props.onClose}
      punched
      width="lg"
    >
      <div className={styles.entry}>
        <p className={styles.line}>
          {metadata.author ? `${metadata.author}.` : t('card.unknownAuthor')}
        </p>
        <p className={`${styles.line} ${styles.indent}`}>
          <span className={styles.title}>{metadata.title ?? props.name}</span>
          {metadata.date ? ` — ${metadata.date}.` : ''}
        </p>
        <p className={`${styles.line} ${styles.indent}`}>{details.join(' · ')}</p>
        <p className={`${styles.line} ${styles.indent}`}>
          {t(`card.direction.${props.direction}`)}.
        </p>
        {props.splitSpreads && (
          <p className={`${styles.line} ${styles.indent}`}>{t('card.splitSpreads')}.</p>
        )}
        {props.credit && <p className={styles.line}>{props.credit.source}</p>}
        {record && last && (
          <p className={styles.line}>
            {t('card.lastRead', { page: record.lastPage })}
            <span className={styles.muted}>
              {' '}
              · {t('card.lastAccess', { date: lastDate ?? '' })}
            </span>
          </p>
        )}
        {props.credit && (
          <Stamp className={styles.stamp} tilt={-8}>
            {props.credit.license}
          </Stamp>
        )}
      </div>
    </Dialog>
  );
}
