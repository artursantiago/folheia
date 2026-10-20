import { detectLocale, translate } from '.';
import { messages } from './messages';

describe('i18n', () => {
  it('detects Portuguese and English, defaulting to Portuguese', () => {
    expect(detectLocale(['pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['en-US', 'pt-BR'])).toBe('en');
    expect(detectLocale(['fr-FR'])).toBe('pt-BR');
  });

  it('has the same keys in every locale', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages['pt-BR']).sort());
  });

  it('translates a key', () => {
    expect(translate('en', 'app.tagline')).toBe('Book reader · PDF and CBZ');
  });
});
