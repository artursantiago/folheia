import { lazy, Suspense, useEffect } from 'react';
import { preferences } from '../storage/preferences';
import { applyTheme } from '../theme/applyTheme';
import { useStore } from './hooks/useStore';
import { route } from './router';
import { closeBook, openBook, session } from './session';
import { HomeScreen, isAcceptableUrl } from './screens/HomeScreen';
import { PasswordDialog } from './screens/PasswordDialog';
import { ReaderScreen } from './screens/ReaderScreen';
import { ErrorScreen, OpeningScreen } from './screens/StatusScreens';

const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const Lab = lazy(() => import('./pages/Lab'));

/** Opens ?file=https://… once on startup. */
function openFromQuery() {
  const file = new URLSearchParams(window.location.search).get('file');
  if (file && isAcceptableUrl(file)) void openBook({ kind: 'url', url: file });
}

function clearBookFromAddress() {
  const url = new URL(window.location.href);
  url.searchParams.delete('file');
  url.hash = '';
  history.replaceState(history.state, '', url);
}

export function App() {
  const { theme } = useStore(preferences);
  const current = useStore(route);
  const state = useStore(session);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(openFromQuery, []);

  if (current.name === 'lab' || current.name === 'styleguide') {
    const Page = current.name === 'lab' ? Lab : StyleGuide;
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  }

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
          metadata={state.metadata}
          name={state.name}
          onClose={back}
        />
      )}
      <PasswordDialog />
    </>
  );
}
