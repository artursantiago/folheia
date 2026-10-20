// Lab fields take URLs and headers: no auto-capitalization or correction
// (iPadOS turns "http" into "Http" and double spaces into periods).
export const URL_INPUT = {
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
} as const;
