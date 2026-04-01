export const ITEM_CATEGORIES = [
  'Mejeri',
  'Kött',
  'Fisk & skaldjur',
  'Grönsaker',
  'Frukt',
  'Pasta & ris',
  'Bakning',
  'Frukost',
  'Konserver',
  'Snacks',
  'Dryck',
  'Skafferi',
  'Såser & kryddor',
  'Örter & kryddor',
]

export const CATEGORY_DEFAULT_UNIT: Record<string, string> = {
  Mejeri: 'l',
  Kött: 'kg',
  'Fisk & skaldjur': 'kg',
  Grönsaker: 'kg',
  Frukt: 'kg',
  'Pasta & ris': 'kg',
  Bakning: 'kg',
  Frukost: 'kg',
  Konserver: 'st',
  Snacks: 'g',
  Dryck: 'l',
  Skafferi: 'kg',
  'Såser & kryddor': 'ml',
  'Örter & kryddor': 'g',
}

/** Returns the i18n translation key for a category DB value */
export function categoryKey(category: string): string {
  return `categories.${category}`
}

export const CATEGORY_DEFAULT_QTY: Record<string, number> = {
  Mejeri: 1,
  Kött: 0.5,
  'Fisk & skaldjur': 0.5,
  Grönsaker: 0.5,
  Frukt: 0.5,
  'Pasta & ris': 0.5,
  Bakning: 0.5,
  Frukost: 0.5,
  Konserver: 1,
  Snacks: 100,
  Dryck: 1,
  Skafferi: 0.5,
  'Såser & kryddor': 200,
  'Örter & kryddor': 20,
}
