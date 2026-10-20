const pt = {
  'app.tagline': 'Leitor de livros · PDF e CBZ',
  'app.underConstruction': 'Em construção. Em breve, todo PDF vai poder ser folheado aqui.',
} as const;

export type MessageKey = keyof typeof pt;
export type Messages = Record<MessageKey, string>;

const en: Messages = {
  'app.tagline': 'Book reader · PDF and CBZ',
  'app.underConstruction': 'Under construction. Soon, every PDF will be leafable here.',
};

export const messages = { 'pt-BR': pt, en } satisfies Record<string, Messages>;
export type Locale = keyof typeof messages;
