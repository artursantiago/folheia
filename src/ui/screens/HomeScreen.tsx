import { useEffect, useRef, useState, type FormEvent } from 'react';
import { preferences } from '../../storage/preferences';
import {
  Accession,
  Button,
  Card,
  IconButton,
  Overline,
  Segmented,
  Stamp,
  TextField,
} from '../components';
import { useDarkScheme } from '../hooks/useDarkScheme';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import { openBook } from '../session';
import { Collection } from '../home/Collection';
import styles from './HomeScreen.module.css';

export function isAcceptableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function HomeScreen() {
  const { t, locale } = useI18n();
  const prefs = useStore(preferences);
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  // The whole window is a drop target.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void openBook({ kind: 'file', file });
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const submitUrl = (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim();
    if (!isAcceptableUrl(value)) {
      setUrlError(t('home.urlInvalid'));
      return;
    }
    void openBook({ kind: 'url', url: value });
  };

  const dark = useDarkScheme(prefs.theme);

  return (
    <div className={styles.home}>
      <div className={styles.lamp} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>{t('app.name')}</span>
          <Overline className={styles.tagline}>{t('app.tagline')}</Overline>
        </div>
        <div className={styles.headerActions}>
          <Segmented
            label={t('locale.label')}
            value={locale}
            onChange={(value) => preferences.set((p) => ({ ...p, locale: value }))}
            options={[
              { value: 'pt-BR', label: 'PT' },
              { value: 'en', label: 'EN' },
            ]}
          />
          <IconButton
            icon={dark ? 'sun' : 'moon'}
            label={dark ? t('theme.toLight') : t('theme.toDark')}
            onClick={() => preferences.set((p) => ({ ...p, theme: dark ? 'light' : 'dark' }))}
          />
        </div>
      </header>

      <main className={styles.hero}>
        <section className={styles.intro}>
          <Overline>{t('home.overline')}</Overline>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.lead}>{t('home.lead')}</p>
          <Stamp className={styles.privacy}>{t('home.privacy')}</Stamp>
        </section>

        <Card
          as="section"
          label={t('home.loanCard')}
          meta={<Accession />}
          perforated
          punched
          ruled
          className={styles.loanCard}
          data-dragging={dragging || undefined}
          aria-label={t('home.loanCard')}
        >
          {dragging ? (
            <div className={styles.dropping}>
              <p className={styles.bring}>{t('home.dropRelease')}</p>
            </div>
          ) : (
            <>
              <p className={styles.bring}>{t('home.bring')}</p>
              <p className={styles.hint}>{t('home.dropHint')}</p>
              <div className={styles.actions}>
                <Button variant="primary" icon="upload" onClick={() => fileInput.current?.click()}>
                  {t('home.choose')}
                </Button>
                <Overline>{t('home.orUrl')}</Overline>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,application/pdf,.cbz,application/vnd.comicbook+zip,application/x-cbz,application/zip"
                className="srOnly"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void openBook({ kind: 'file', file });
                  event.target.value = '';
                }}
              />
              <form className={styles.urlForm} onSubmit={submitUrl}>
                <TextField
                  label={t('home.urlLabel')}
                  placeholder={t('home.urlPlaceholder')}
                  type="url"
                  inputMode="url"
                  value={url}
                  error={urlError}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setUrlError(undefined);
                  }}
                  className={styles.urlField}
                />
                <Button type="submit">{t('home.open')}</Button>
              </form>
            </>
          )}
        </Card>
      </main>
      <Collection onOpen={(book) => void openBook({ kind: 'url', url: book.url, example: book })} />
    </div>
  );
}
