import type { BookRecord } from '../../storage/books';
import { Button, Dialog, Stamp } from '../components';
import { useI18n } from '../hooks/useI18n';
import styles from './LoanCardDialog.module.css';

export interface LoanCardDialogProps {
  title: string;
  record: BookRecord;
  onContinue: () => void;
  onRestart: () => void;
}

/** "Continue reading?" as a library loan card with dated stamps. */
export function LoanCardDialog({ title, record, onContinue, onRestart }: LoanCardDialogProps) {
  const { t, locale } = useI18n();
  const format = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const rows = record.history.slice(-4);
  return (
    <Dialog open title={t('loan.label')} label={t('loan.label')} onClose={onRestart} punched>
      <p className={styles.title}>{title}</p>
      <p className={styles.question}>{t('loan.question')}</p>
      <table className={styles.table} aria-label={t('loan.history')}>
        <thead>
          <tr>
            <th scope="col">{t('loan.date')}</th>
            <th scope="col">{t('loan.from')}</th>
            <th scope="col">{t('loan.to')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((stamp, i) => (
            <tr key={stamp.date}>
              <td>{format.format(new Date(`${stamp.date}T12:00:00`))}</td>
              <td>{stamp.fromPage}</td>
              <td>
                {i === rows.length - 1 ? (
                  <Stamp tilt={-6}>{t('loan.stamp', { page: record.lastPage })}</Stamp>
                ) : (
                  stamp.toPage
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.actions}>
        <Button variant="primary" className={styles.grow} onClick={onContinue} autoFocus>
          {t('loan.continue', { page: record.lastPage })}
        </Button>
        <Button onClick={onRestart}>{t('loan.restart')}</Button>
      </div>
    </Dialog>
  );
}
