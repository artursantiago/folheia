const pt = {
  'app.name': 'Folheia',
  'app.tagline': 'Leitor de livros · PDF e CBZ',
  'app.underConstruction': 'Em construção. Em breve, todo PDF vai poder ser folheado aqui.',
  'accession.prefix': 'Nº',
  'action.close': 'Fechar',
  'theme.system': 'Sistema',
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',
  'theme.label': 'Tema',
  'locale.label': 'Idioma',
  'reader.pageCounter': 'Página {current} de {total}',
} as const;

export type MessageKey = keyof typeof pt;
export type Messages = Record<MessageKey, string>;

const en: Messages = {
  'app.name': 'Folheia',
  'app.tagline': 'Book reader · PDF and CBZ',
  'app.underConstruction': 'Under construction. Soon, every PDF will be leafable here.',
  'accession.prefix': 'No.',
  'action.close': 'Close',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.label': 'Theme',
  'locale.label': 'Language',
  'reader.pageCounter': 'Page {current} of {total}',
};

export const messages = { 'pt-BR': pt, en } satisfies Record<string, Messages>;
export type Locale = keyof typeof messages;
