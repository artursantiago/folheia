import { lazy, Suspense, useEffect } from 'react';
import { preferences } from '../storage/preferences';
import { applyTheme } from '../theme/applyTheme';
import { useI18n } from './hooks/useI18n';
import { useStore } from './hooks/useStore';
import { route } from './router';
import styles from './App.module.css';

const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const Lab = lazy(() => import('./pages/Lab'));

export function App() {
  const { theme } = useStore(preferences);
  const current = useStore(route);
  const { t } = useI18n();

  useEffect(() => applyTheme(theme), [theme]);

  if (current.name === 'lab') {
    return (
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    );
  }

  if (current.name === 'styleguide') {
    return (
      <Suspense fallback={null}>
        <StyleGuide />
      </Suspense>
    );
  }

  return (
    <main className={styles.app}>
      <h1 className={styles.wordmark}>{t('app.name')}</h1>
      <p className={styles.tagline}>{t('app.tagline')}</p>
      <p>{t('app.underConstruction')}</p>
    </main>
  );
}
