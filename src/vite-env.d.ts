/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
/** Release channel: "stable" (site root), "next" (main, under /next/) or "dev". */
declare const __APP_CHANNEL__: 'stable' | 'next' | 'dev';
/** Short commit hash of the build. */
declare const __APP_BUILD__: string;
