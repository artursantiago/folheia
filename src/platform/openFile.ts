/** What the picker offers: PDF and CBZ (format is checked by content later). */
export const BOOK_FILE_TYPES =
  '.pdf,application/pdf,.cbz,application/vnd.comicbook+zip,application/x-cbz,application/zip';

/**
 * Every way a book file reaches the app: the system picker, a drop on the
 * window and "Open with" from the system. A native build answers with its own
 * picker and intents behind the same interface.
 */
export interface FileOpener {
  /** Shows the picker; a chosen file arrives through `listen`. */
  pick(): void;
  /**
   * Starts taking files from the picker and from drops on the window.
   * `onDragging` follows files being dragged over it. Returns a disposer.
   */
  listen(open: (file: File) => void, onDragging?: (dragging: boolean) => void): () => void;
  /** Files the system asks the app to open (file_handlers / launchQueue). */
  onLaunch(open: (file: File) => void): void;
}

interface LaunchParams {
  files: { getFile(): Promise<File> }[];
}

export function webFileOpener(): FileOpener {
  let input: HTMLInputElement | undefined;
  return {
    pick: () => input?.click(),
    listen(open, onDragging) {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = BOOK_FILE_TYPES;
      picker.className = 'srOnly';
      picker.tabIndex = -1;
      picker.setAttribute('aria-hidden', 'true');
      picker.addEventListener('change', () => {
        const file = picker.files?.[0];
        picker.value = '';
        if (file) open(file);
      });
      document.body.append(picker);
      input = picker;

      // The whole window is a drop target.
      let depth = 0;
      const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
      const enter = (event: DragEvent) => {
        if (!hasFiles(event)) return;
        depth++;
        onDragging?.(true);
      };
      const leave = () => {
        depth = Math.max(0, depth - 1);
        if (depth === 0) onDragging?.(false);
      };
      const over = (event: DragEvent) => {
        if (hasFiles(event)) event.preventDefault();
      };
      const drop = (event: DragEvent) => {
        event.preventDefault();
        depth = 0;
        onDragging?.(false);
        const file = event.dataTransfer?.files[0];
        if (file) open(file);
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
        picker.remove();
        if (input === picker) input = undefined;
      };
    },
    onLaunch(open) {
      const queue = (
        window as unknown as { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } }
      ).launchQueue;
      queue?.setConsumer((params) => {
        void params.files[0]?.getFile().then(open);
      });
    },
  };
}

export const fileOpener = webFileOpener();
