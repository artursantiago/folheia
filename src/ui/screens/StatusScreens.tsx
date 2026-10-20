import type { SourceError } from '../../sources/types';
import { Accession, Button, Card, Stamp } from '../components';
import { useI18n } from '../hooks/useI18n';
import type { MessageKey } from '../../i18n';
import styles from './StatusScreens.module.css';

export function OpeningScreen({ name, progress }: { name: string; progress?: number | undefined }) {
  const { t } = useI18n();
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <Card label={t('opening.label')} meta={<Accession />} ruled className={styles.card}>
        <p className={styles.title}>{t('opening.title', { name })}</p>
        <div className={styles.progress} aria-hidden="true">
          <span
            className={styles.bar}
            data-indeterminate={progress === undefined || undefined}
            style={progress === undefined ? undefined : { width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </Card>
    </div>
  );
}

interface ErrorCopy {
  label: MessageKey;
  title: MessageKey;
  body?: MessageKey;
  stamp: MessageKey;
}

function copyFor(error: SourceError): ErrorCopy {
  switch (error.code) {
    case 'network':
      return {
        label: 'error.network.label',
        title: 'error.network.title',
        body: 'error.network.body',
        stamp: 'error.network.stamp',
      };
    case 'http':
      return {
        label: 'error.network.label',
        title: 'error.http.title',
        body: 'error.http.body',
        stamp: 'error.network.stamp',
      };
    case 'unsupported-format': {
      const kind = String(error.detail);
      if (kind === 'rar' || kind === '7z')
        return {
          label: 'error.unsupported.label',
          title: kind === 'rar' ? 'error.cbr.title' : 'error.cb7.title',
          body: 'error.archive.body',
          stamp: 'error.unsupported.stamp',
        };
      if (kind === 'encrypted-zip')
        return {
          label: 'error.unsupported.label',
          title: 'error.encrypted.title',
          body: 'error.encrypted.body',
          stamp: 'error.unsupported.stamp',
        };
      return {
        label: 'error.unsupported.label',
        title: 'error.unknown.title',
        body: 'error.unknown.body',
        stamp: 'error.unsupported.stamp',
      };
    }
    case 'empty':
      return {
        label: 'error.invalid.label',
        title: 'error.empty.title',
        stamp: 'error.invalid.stamp',
      };
    default:
      return {
        label: 'error.invalid.label',
        title: 'error.invalid.title',
        body: 'error.invalid.body',
        stamp: 'error.invalid.stamp',
      };
  }
}

export interface ErrorScreenProps {
  error: SourceError;
  name: string;
  url?: string | undefined;
  onBack: () => void;
}

export function ErrorScreen({ error, name, url, onBack }: ErrorScreenProps) {
  const { t } = useI18n();
  const copy = copyFor(error);
  return (
    <div className={styles.screen}>
      <Card
        label={t(copy.label)}
        meta={<span className={styles.name}>{name}</span>}
        className={styles.card}
      >
        <div role="alert">
          <p className={styles.title}>{t(copy.title)}</p>
          {copy.body && <p className={styles.body}>{t(copy.body)}</p>}
        </div>
        <div className={styles.actions}>
          {error.code === 'network' && url && (
            <Button variant="primary" icon="download" href={url} target="_blank" rel="noreferrer">
              {t('error.network.download')}
            </Button>
          )}
          <Button onClick={onBack}>{t('error.chooseAnother')}</Button>
        </div>
        <Stamp className={styles.stamp} tilt={-6}>
          {t(copy.stamp)}
        </Stamp>
      </Card>
    </div>
  );
}
