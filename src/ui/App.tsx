import { detectLocale, translate } from '../i18n';
import styles from './App.module.css';

export function App() {
  const locale = detectLocale();
  return (
    <main className={styles.app} lang={locale}>
      <h1 className={styles.wordmark}>Folheia</h1>
      <p className={styles.tagline}>{translate(locale, 'app.tagline')}</p>
      <p>{translate(locale, 'app.underConstruction')}</p>
    </main>
  );
}
