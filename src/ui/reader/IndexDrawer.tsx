import { useEffect, useRef, useState } from 'react';
import type { OutlineItem, PageSource } from '../../sources/types';
import type { Reader } from '../../viewer/Reader';
import { Drawer, DrawerSection } from '../components';
import { useI18n } from '../hooks/useI18n';
import styles from './IndexDrawer.module.css';

interface IndexDrawerProps {
  reader: Reader;
  source: PageSource;
  visible: number[];
  onClose: () => void;
}

function Thumb({
  reader,
  index,
  label,
  current,
  version,
}: {
  reader: Reader;
  index: number;
  label: number;
  current: boolean;
  version: number;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);

  // Only pages scrolled into view ask for a thumbnail.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setSeen(true), {
      rootMargin: '200px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: 'center' });
  }, [current]);

  const url = seen ? reader.thumbnail(index) : undefined;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.thumb}
      data-current={current || undefined}
      data-version={version}
      aria-label={t('reader.page', { number: label })}
      aria-current={current ? 'page' : undefined}
      onClick={() => reader.goToPage(label)}
    >
      <span className={styles.paper}>{url && <img src={url} alt="" draggable={false} />}</span>
      <span className={styles.label}>{current ? `${label} · ${t('reader.here')}` : label}</span>
    </button>
  );
}

function OutlineList({ items, reader }: { items: OutlineItem[]; reader: Reader }) {
  return (
    <ol className={styles.outline}>
      {items.map((item, i) => {
        const label = item.pageIndex === null ? undefined : reader.labelForPhysical(item.pageIndex);
        return (
          <li key={`${item.title}-${i}`}>
            <button
              type="button"
              className={styles.entry}
              disabled={label === undefined}
              onClick={() => label !== undefined && reader.goToPage(label)}
            >
              <span className={styles.entryTitle}>{item.title}</span>
              <span className={styles.leader} aria-hidden="true" />
              <span className={styles.entryPage}>{label ?? '—'}</span>
            </button>
            {item.children.length > 0 && <OutlineList items={item.children} reader={reader} />}
          </li>
        );
      })}
    </ol>
  );
}

export function IndexDrawer({ reader, source, visible, onClose }: IndexDrawerProps) {
  const { t } = useI18n();
  const [outline, setOutline] = useState<OutlineItem[]>();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void source.getOutline().then((items) => alive && setOutline(items));
    return () => {
      alive = false;
    };
  }, [source]);

  useEffect(() => reader.onImages(() => setVersion((v) => v + 1)) as () => void, [reader]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Drawer
      title={t('reader.index')}
      closeLabel={t('reader.closeIndex')}
      onClose={onClose}
      className={styles.drawer}
    >
      <DrawerSection title={t('reader.outline')}>
        {outline === undefined ? null : outline.length ? (
          <OutlineList items={outline} reader={reader} />
        ) : (
          <p className={styles.empty}>{t('reader.noOutline')}</p>
        )}
      </DrawerSection>
      <DrawerSection title={t('reader.pages')}>
        <div className={styles.grid}>
          {reader.pages().map(({ index, label }) => (
            <Thumb
              key={index}
              reader={reader}
              index={index}
              label={label}
              current={visible.includes(index)}
              version={version}
            />
          ))}
        </div>
      </DrawerSection>
    </Drawer>
  );
}
