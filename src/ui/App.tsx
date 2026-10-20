import { lazy, Suspense, useEffect } from 'react';
import { exampleForUrl } from '../examples';
import { applyUpdate, onLaunchFile, registerServiceWorker, updateAvailable } from '../platform/pwa';
import { preferences } from '../storage/preferences';
import { applyTheme } from '../theme/applyTheme';
import { useI18n } from './hooks/useI18n';
import { useStore } from './hooks/useStore';
import { route } from './router';
import { closeBook, openBook, session } from './session';
import { HomeScreen, isAcceptableUrl } from './screens/HomeScreen';
import { PasswordDialog } from './screens/PasswordDialog';
import { ReaderScreen } from './screens/ReaderScreen';
import { ErrorScreen, OpeningScreen } from './screens/StatusScreens';
import { Notice } from './components';
import styles from './App.module.css';

const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const Lab = lazy(() => import('./pages/Lab'));

/** Opens ?file=https://… once on startup. */
function openFromQuery() {
  const file = new URLSearchParams(window.location.search).get('file');
  if (file && isAcceptableUrl(file))
    void openBook({ kind: 'url', url: file, example: exampleForUrl(file) });
}

function clearBookFromAddress() {
  const url = new URL(window.location.href);
  url.searchParams.delete('file');
  url.hash = '';
  history.replaceState(history.state, '', url);
}

export function App() {
  const { theme } = useStore(preferences);
  const { t } = useI18n();
  const current = useStore(route);
  const state = useStore(session);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(openFromQuery, []);
  useEffect(() => {
    void registerServiceWorker();
    onLaunchFile((file) => void openBook({ kind: 'file', file }));
  }, []);
  const hasUpdate = useStore(updateAvailable);

  if (current.name === 'lab' || current.name === 'styleguide') {
    const Page = current.name === 'lab' ? Lab : StyleGuide;
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  }

  const example =
    state.status === 'open' && state.request.kind === 'url' ? state.request.example : undefined;

  const back = () => {
    clearBookFromAddress();
    void closeBook();
  };

  return (
    <>
      {state.status === 'idle' && <HomeScreen />}
      {state.status === 'opening' && <OpeningScreen name={state.name} progress={state.progress} />}
      {state.status === 'error' && (
        <ErrorScreen
          error={state.error}
          name={state.name}
          url={state.request.kind === 'url' ? state.request.url : undefined}
          onBack={back}
        />
      )}
      {state.status === 'open' && (
        <ReaderScreen
          source={state.source}
          metadata={
            example
              ? {
                  ...state.metadata,
                  title: example.title,
                  author: example.author,
                  date: String(example.year),
                }
              : state.metadata
          }
          name={state.name}
          request={state.request}
          credit={
            example ? { source: example.source, license: t('license.publicDomain') } : undefined
          }
          onClose={back}
        />
      )}
      <PasswordDialog />
      {hasUpdate && (
        <div className={styles.update}>
          <Notice action={{ label: t('app.reload'), onClick: applyUpdate }}>
            {t('app.updateAvailable')}
          </Notice>
        </div>
      )}
    </>
  );
}
