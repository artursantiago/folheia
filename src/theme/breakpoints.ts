/**
 * Screen breakpoints, by window width rather than orientation (Split View and
 * Stage Manager give the iPad any width). Below `rail` the app uses a bottom
 * bar; from `rail` up, a side rail; from `twoPanes` up, two panes.
 *
 * CSS can't read custom properties inside `@media`, so stylesheets write these
 * numbers out (`@media (width < 600px)`) and Stylelint only accepts these two
 * widths there (stylelint.config.js). Keep both lists in sync.
 */
export const breakpoints = {
  rail: 600,
  twoPanes: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** The media query for "at least this breakpoint", for `matchMedia`. */
export function atLeast(breakpoint: Breakpoint): string {
  return `(width >= ${breakpoints[breakpoint]}px)`;
}
