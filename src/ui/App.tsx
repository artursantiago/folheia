import { lazy, Suspense, useEffect } from 'react';
import { exampleForUrl } from '../examples';
import { fileOpener } from '../platform/openFile';
import { applyUpdate, registerServiceWorker, updateAvailable } from '../platform/pwa';
import { preferences } from '../storage/preferences';
import { applyTheme } from '../theme/applyTheme';
import { useI18n } from './hooks/useI18n';
import { useStore } from './hooks/useStore';
import { fileInAddress, leaveReader, route } from './router';
import { closeBook, openBook, reopenFromLibrary, session } from './session';
import { HomeScreen, isAcceptableUrl } from './screens/HomeScreen';
import { PasswordDialog } from './screens/PasswordDialog';
import { ReaderScreen } from './screens/ReaderScreen';
import { ErrorScreen, OpeningScreen } from './screens/StatusScreens';
import { Notice } from './components';
import styles from './App.module.css';

const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const Lab = lazy(() => import('./pages/Lab'));

/** Opens the book in the address: `?file=https://…`, or `#/ler/<accession>` from the library's copy. */
function openFromAddress(accession: number | undefined) {
  const file = fileInAddress();
  if (file && isAcceptableUrl(file)) {
    void openBook({ kind: 'url', url: file, example: exampleForUrl(file) });
    return;
  }
  if (accession === undefined) return;
  void reopenFromLibrary(accession).then((opened) => {
    // No copy to open (stage 2 will ask for the file): back to home.
    if (!opened && session.get().status === 'idle') leaveReader();
  });
}

export function App() {
  const { theme } = useStore(preferences);
  const { t } = useI18n();
  const current = useStore(route);
  const state = useStore(session);

  useEffect(() => applyTheme(theme), [theme]);
  // The address leads: leaving the reader route (Back) closes the book, and
  // arriving at one with nothing open (a link, a reload, Forward) opens it.
  const inReader = current.name === 'reader';
  const accession = current.name === 'reader' ? current.accession : undefined;
  useEffect(() => {
    if (!inReader) {
      if (session.get().status !== 'idle') void closeBook();
      return;
    }
    if (session.get().status === 'idle') openFromAddress(accession);
  }, [inReader, accession]);
  useEffect(() => {
    void registerServiceWorker();
    fileOpener.onLaunch((file) => void openBook({ kind: 'file', file }));
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
    leaveReader();
    // Without a reader route (a book opened before the address caught up), close here.
    if (route.get().name !== 'reader' && session.get().status !== 'idle') void closeBook();
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
          memory={state.memory}
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
