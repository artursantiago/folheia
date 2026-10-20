// Visual identity is enforced here: outside src/theme/, styles may only use
// design tokens (CSS custom properties), never raw colors or font stacks.
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': [
      '^([a-z][a-zA-Z0-9]*|fx-[a-z0-9-]+)$',
      { message: 'Use camelCase (CSS Modules) or the fx- prefix (flip engine).' },
    ],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    'custom-property-empty-line-before': null,
    'import-notation': 'string',
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
    'declaration-property-value-allowed-list': {
      'font-family': ['/^var\\(--/', 'inherit'],
      'font-size': ['/^var\\(--/', '/^clamp\\(var\\(--/', 'inherit', '100%', '1em'],
      'border-radius': ['/^var\\(--/', '0', '50%', 'inherit'],
    },
  },
  overrides: [
    {
      files: ['src/theme/**/*.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-value-allowed-list': null,
      },
    },
  ],
};
