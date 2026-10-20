import stylelintConfig from '../../stylelint.config.js?raw';
import { atLeast, breakpoints } from './breakpoints';

describe('breakpoints', () => {
  it('are the only widths Stylelint allows in @media', () => {
    const allowed = stylelintConfig.match(/width: \[([^\]]*)\]/)?.[1];
    expect(allowed).toBe(
      Object.values(breakpoints)
        .map((px) => `'${px}px'`)
        .join(', '),
    );
  });

  it('builds matchMedia queries', () => {
    expect(atLeast('rail')).toBe('(width >= 600px)');
  });
});
