/**
 * Name of this channel's own storage. The stable app (site root) and the
 * preview (/next/) share one origin, so they share localStorage, IndexedDB
 * and the OPFS: every store is named after the channel, and testing the
 * preview never touches the stable app's data (docs/versionamento.md).
 */
export const storageName = __APP_CHANNEL__ === 'next' ? 'folheia-next' : 'folheia';
