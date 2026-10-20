import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './PageSlider.module.css';

export interface PageSliderProps {
  /** Current page, 1-based. */
  value: number;
  total: number;
  /** Accessible name of the slider. */
  label: string;
  /** Accessible text for a position, e.g. "Página 12 de 51". */
  valueText: (value: number) => string;
  /** While dragging: the page under the marker, so a label can follow it (undefined when done). */
  onPreview?: ((value: number | undefined) => void) | undefined;
  /** Released, or moved with the keyboard: go there. */
  onCommit: (value: number) => void;
  /** Right-to-left books run the slider the other way. */
  dir?: 'ltr' | 'rtl';
}

/**
 * Drag through a long book. Only the label moves while dragging; the jump
 * happens on release, so the renderer isn't asked for every page on the way.
 * The marker is a bookmark ribbon.
 */
export function PageSlider({
  value,
  total,
  label,
  valueText,
  onPreview,
  onCommit,
  dir = 'ltr',
}: PageSliderProps) {
  const ref = useRef<HTMLInputElement>(null);
  // Where the marker was dragged, and the page it started from: once the page
  // moves (the jump landed, or another control turned it) the marker follows it.
  const [draft, setDraft] = useState<{ value: number; from: number }>();
  const shown = draft && draft.from === value ? draft.value : value;

  // Unlike React's onChange, the native change event fires on release (and per keyboard step).
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const commit = () => {
      onPreview?.(undefined);
      onCommit(Number(input.value));
    };
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, [onCommit, onPreview]);

  const max = Math.max(1, total);
  const fill = max > 1 ? ((shown - 1) / (max - 1)) * 100 : 0;
  return (
    <input
      ref={ref}
      type="range"
      className={styles.slider}
      min={1}
      max={max}
      step={1}
      value={shown}
      dir={dir}
      aria-label={label}
      aria-valuetext={valueText(shown)}
      style={{ '--fill': `${fill}%` } as CSSProperties}
      onChange={(event) => {
        const next = Number(event.target.value);
        setDraft({ value: next, from: value });
        onPreview?.(next);
      }}
    />
  );
}
