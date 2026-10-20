import '@testing-library/jest-dom/vitest';

(globalThis as Record<string, unknown>).__APP_VERSION__ = 'test';
(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'dev';
(globalThis as Record<string, unknown>).__APP_BUILD__ = 'test';
