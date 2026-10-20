import { Component, useState, type ReactNode } from 'react';
import { copyText } from '../platform/share';
import { Accession, Button, Card } from './components';
import { useI18n } from './hooks/useI18n';
import { diagnostics } from './reader/diagnostics';
import styles from './screens/StatusScreens.module.css';

/**
 * Without this, an error while rendering unmounts the whole app and leaves an
 * empty page in the theme's color. Shows a way out (and a report) instead.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: unknown) {
    console.error('[folheia] render crashed', error);
  }

  override render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children;
  }
}

function CrashScreen({ error }: { error: Error }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const report = diagnostics({ error: `${error.name}: ${error.message}`, stack: error.stack });
    setCopied(await copyText(report));
  };
  return (
    <div className={styles.screen}>
      <Card label={t('crash.label')} meta={<Accession />} className={styles.card}>
        <div role="alert">
          <p className={styles.title}>{t('crash.title')}</p>
          <p className={styles.body}>{t('crash.body')}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t('app.reload')}
          </Button>
          <Button onClick={() => void copy()}>
            {copied ? t('crash.copied') : t('crash.copy')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
