import { useEffect, useRef } from 'react';
import { pushLayer } from '../router';

/**
 * While `open`, the layer (dialog, drawer, menu) sits on the history: the
 * system Back closes it before anything else.
 */
export function useBackLayer(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    return pushLayer(() => close.current());
  }, [open]);
}
