/**
 * Swedish → English translations for common grocery items.
 * Used to translate inventory item names before querying TheMealDB.
 */
const TRANSLATIONS: Record<string, string> = {
  // Mejeri
  mjölk: 'milk',
  helmjölk: 'milk',
  lättmjölk: 'milk',
  ägg: 'eggs',
  smör: 'butter',
  ost: 'cheese',
  grädde: 'cream',
  vispgrädde: 'cream',
  matlagningsgrädde: 'cream',
  gräddfil: 'sour cream',
  'crème fraiche': 'creme fraiche',
  'creme fraiche': 'creme fraiche',
  yoghurt: 'yogurt',
  kvarg: 'quark',
  fil: 'buttermilk',
  filmjölk: 'buttermilk',

  // Kött
  kyckling: 'chicken',
  kycklingfilé: 'chicken breast',
  kycklingfile: 'chicken breast',
  nötkött: 'beef',
  fläsk: 'pork',
  blandfärs: 'ground beef',
  nötfärs: 'ground beef',
  fläskfärs: 'ground pork',
  lammkött: 'lamb',
  lamm: 'lamb',
  bacon: 'bacon',
  skinka: 'ham',
  korv: 'sausage',
  falukorv: 'sausage',
  köttbullar: 'meatballs',

  // Fisk & skaldjur
  lax: 'salmon',
  torsk: 'cod',
  tonfisk: 'tuna',
  räkor: 'shrimp',
  musslor: 'mussels',
  sill: 'herring',
  strömming: 'herring',

  // Grönsaker
  lök: 'onion',
  'gul lök': 'onion',
  rödlök: 'red onion',
  vitlök: 'garlic',
  tomat: 'tomato',
  tomater: 'tomato',
  'krossade tomater': 'tomato',
  potatis: 'potato',
  sötpotatis: 'sweet potato',
  morot: 'carrot',
  morötter: 'carrot',
  gurka: 'cucumber',
  paprika: 'bell pepper',
  'röd paprika': 'red pepper',
  broccoli: 'broccoli',
  blomkål: 'cauliflower',
  vitkål: 'cabbage',
  rödkål: 'red cabbage',
  spenat: 'spinach',
  sallad: 'lettuce',
  rucola: 'arugula',
  champinjoner: 'mushrooms',
  svamp: 'mushrooms',
  majs: 'corn',
  ärtor: 'peas',
  bönor: 'beans',
  kidneybönor: 'kidney beans',
  linser: 'lentils',
  kikärtor: 'chickpeas',
  zucchini: 'zucchini',
  aubergine: 'eggplant',
  selleri: 'celery',
  purjolök: 'leek',
  kronärtskocka: 'artichoke',
  sparris: 'asparagus',
  rödbetor: 'beetroot',
  pumpa: 'pumpkin',
  avokado: 'avocado',

  // Frukt
  äpple: 'apple',
  päron: 'pear',
  banan: 'banana',
  apelsin: 'orange',
  citron: 'lemon',
  lime: 'lime',
  jordgubbar: 'strawberries',
  hallon: 'raspberries',
  blåbär: 'blueberries',
  vindruvor: 'grapes',
  mango: 'mango',
  ananas: 'pineapple',
  vattenmelon: 'watermelon',

  // Skafferi
  mjöl: 'flour',
  vetemjöl: 'flour',
  socker: 'sugar',
  florsocker: 'sugar',
  salt: 'salt',
  peppar: 'pepper',
  bakpulver: 'baking powder',
  bikarbonat: 'baking soda',
  jäst: 'yeast',
  ris: 'rice',
  pasta: 'pasta',
  spaghetti: 'spaghetti',
  makaroner: 'macaroni',
  nudlar: 'noodles',
  bröd: 'bread',
  knäckebröd: 'crispbread',
  havregryn: 'oats',
  cornflakes: 'cornflakes',
  linfrön: 'flaxseed',
  solrosfrön: 'sunflower seeds',
  mandel: 'almonds',
  valnötter: 'walnuts',
  cashewnötter: 'cashews',

  // Såser & kryddor
  olivolja: 'olive oil',
  rapsolja: 'oil',
  olja: 'oil',
  vinäger: 'vinegar',
  ketchup: 'ketchup',
  senap: 'mustard',
  majonäs: 'mayonnaise',
  sojasås: 'soy sauce',
  fiskesås: 'fish sauce',
  worcestershiresås: 'worcestershire sauce',
  tabasco: 'tabasco',
  honung: 'honey',
  lönnsirap: 'maple syrup',
  buljong: 'stock',
  hönsbuljongtärning: 'chicken stock',
  köttbuljongtärning: 'beef stock',

  // Örter & kryddor
  kanel: 'cinnamon',
  ingefära: 'ginger',
  curry: 'curry',
  paprikapulver: 'paprika',
  spiskummin: 'cumin',
  koriander: 'coriander',
  oregano: 'oregano',
  basilika: 'basil',
  timjan: 'thyme',
  rosmarin: 'rosemary',
  persilja: 'parsley',
  dill: 'dill',
  gräslök: 'chives',
  mynta: 'mint',
  lagerblad: 'bay leaves',
  vanilj: 'vanilla',
  saffran: 'saffron',
  gurkmeja: 'turmeric',
  chili: 'chili',
  chilipulver: 'chili powder',
  cayennepeppar: 'cayenne',
  vitpeppar: 'white pepper',
  svartpeppar: 'black pepper',
  muskotnöt: 'nutmeg',
  kardemumma: 'cardamom',

  // Bakning & övrigt
  choklad: 'chocolate',
  'mörk choklad': 'dark chocolate',
  mjölkchoklad: 'milk chocolate',
  kakao: 'cocoa',
  sylt: 'jam',
  marmelad: 'marmalade',
  jordnötssmör: 'peanut butter',
  tahini: 'tahini',
  kokosgrädde: 'coconut cream',
  kokosmjölk: 'coconut milk',
}

/**
 * Translate a Swedish ingredient name to English.
 * Falls back to the original name if no translation is found.
 */
export function translateToEnglish(swedish: string): string {
  const lower = swedish.toLowerCase().trim()
  return TRANSLATIONS[lower] ?? swedish
}

/**
 * Translate a space-separated query word by word.
 * E.g. "kyckling pasta" → "chicken pasta"
 */
export function translateQueryToEnglish(query: string): string {
  return query
    .split(' ')
    .map((word) => translateToEnglish(word))
    .join(' ')
}
