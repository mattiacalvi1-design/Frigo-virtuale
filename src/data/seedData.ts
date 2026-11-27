import { FridgeItem, Recipe } from '../types/fridge';
import { addDaysToDateString, getTodayDateString } from '../utils/fridgeLogic';

export function createInitialFridgeItems(
  todayStr: string = getTodayDateString(),
): FridgeItem[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'item-burrata',
      name: 'Burrata Pugliese',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: addDaysToDateString(todayStr, 0),
      addedAt: nowIso,
      barcode: '8004567001234',
    },
    {
      id: 'item-pomodorini',
      name: 'Pomodorini Datterini',
      quantity: 2,
      unit: 'vaschette',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, 1),
      addedAt: nowIso,
      barcode: '8008811223344',
    },
    {
      id: 'item-spinaci',
      name: 'Spinaci Freschi in Foglia',
      quantity: 1,
      unit: 'busta',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, -1),
      addedAt: nowIso,
    },
    {
      id: 'item-zucchine',
      name: 'Zucchine Verdi Romane',
      quantity: 3,
      unit: 'pz',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, 2),
      addedAt: nowIso,
    },
    {
      id: 'item-ricotta',
      name: 'Ricotta Romana DOP',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: addDaysToDateString(todayStr, 2),
      addedAt: nowIso,
    },
    {
      id: 'item-fragole',
      name: 'Fragole della Basilicata',
      quantity: 1,
      unit: 'cestino',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, 2),
      addedAt: nowIso,
    },
    {
      id: 'item-salmone',
      name: 'Filetti di Salmone Norvegese',
      quantity: 2,
      unit: 'tranci',
      shelf: 'carne_pesce',
      expiryDate: addDaysToDateString(todayStr, 1),
      addedAt: nowIso,
      barcode: '8003219876543',
    },
    {
      id: 'item-funghi',
      name: 'Funghi Champignon Cremini',
      quantity: 1,
      unit: 'vaschetta',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, 3),
      addedAt: nowIso,
    },
    {
      id: 'item-paccheri',
      name: 'Paccheri Freschi Trafilati',
      quantity: 1,
      unit: 'conf.',
      shelf: 'pasta_sughi',
      expiryDate: addDaysToDateString(todayStr, 5),
      addedAt: nowIso,
    },
    {
      id: 'item-uova',
      name: 'Uova Bio da Allevamento a Terra',
      quantity: 6,
      unit: 'pz',
      shelf: 'latticini',
      expiryDate: addDaysToDateString(todayStr, 11),
      addedAt: nowIso,
    },
    {
      id: 'item-parmigiano',
      name: 'Parmigiano Reggiano 24 Mesi',
      quantity: 1,
      unit: 'pezzo',
      shelf: 'latticini',
      expiryDate: addDaysToDateString(todayStr, 18),
      addedAt: nowIso,
    },
    {
      id: 'item-mascarpone',
      name: 'Mascarpone Fresco Artigianale',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: addDaysToDateString(todayStr, 4),
      addedAt: nowIso,
    },
    {
      id: 'item-pesto',
      name: 'Pesto alla Genovese Fresco',
      quantity: 1,
      unit: 'vasetto',
      shelf: 'pasta_sughi',
      expiryDate: addDaysToDateString(todayStr, 6),
      addedAt: nowIso,
    },
    {
      id: 'item-limoni',
      name: 'Limoni di Amalfi Non Trattati',
      quantity: 3,
      unit: 'pz',
      shelf: 'verdura',
      expiryDate: addDaysToDateString(todayStr, 9),
      addedAt: nowIso,
    },
  ];
}

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'ricetta-paccheri-burrata',
    title: 'Paccheri con Pomodorini Arrostiti e Burrata',
    subtitle:
      'Un primo cremoso e avvolgente che trasforma pomodorini maturi e burrata in scadenza in un piatto da trattoria.',
    category: 'Primi Piatti',
    prepMinutes: 10,
    cookMinutes: 15,
    difficulty: 'Facile',
    servings: 2,
    imageUrl: '/src/assets/images/recipe_pasta_burrata_1795773480813.jpg',
    ingredients: [
      { name: 'Paccheri freschi', amount: '250 g', fridgeMatchTerm: 'paccheri' },
      { name: 'Pomodorini datterini', amount: '300 g', fridgeMatchTerm: 'pomodor' },
      { name: 'Burrata pugliese', amount: '200 g', fridgeMatchTerm: 'burrata' },
      { name: 'Basilico fresco', amount: '1 mazzetto', fridgeMatchTerm: 'basilico' },
      { name: 'Olio extravergine e aglio', amount: 'q.b.', fridgeMatchTerm: 'olio' },
    ],
    steps: [
      'Lava e taglia a metà i pomodorini datterini, poi falli saltare in padella ampia con olio extravergine e uno spicchio d’aglio a fuoco vivace per 8 minuti finché risultano leggermente arrostiti.',
      'Cuoci i paccheri in abbondante acqua salata e scolali al dente direttamente nella padella con il condimento di pomodorini, aggiungendo un mestolo di acqua di cottura.',
      'Spegni il fuoco, manteca con foglie di basilico spezzettate a mano e impiatta completando con la burrata sfilacciata al centro e un filo d’olio a crudo.',
    ],
    chefTip:
      'Non cuocere mai la burrata in padella: aggiungila a fuoco spento sul piatto caldo perché mantenga intatta la sua stracciatella cremosa.',
    sourceTag: 'Ricetta Consigliata · Anti-Spreco',
  },
  {
    id: 'ricetta-frittata-zucchine',
    title: 'Frittata Soffice al Forno con Zucchine e Ricotta',
    subtitle:
      'Dorata ai bordi e morbida al cuore: perfetta per consumare uova, zucchine verdi e ricotta fresca in meno di mezz’ora.',
    category: 'Secondi',
    prepMinutes: 10,
    cookMinutes: 20,
    difficulty: 'Facile',
    servings: 4,
    imageUrl: '/src/assets/images/recipe_frittata_zucchine_1795773481875.jpg',
    ingredients: [
      { name: 'Zucchine verdi', amount: '3 medie', fridgeMatchTerm: 'zucchin' },
      { name: 'Ricotta romana DOP', amount: '150 g', fridgeMatchTerm: 'ricotta' },
      { name: 'Uova fresche bio', amount: '5 pz', fridgeMatchTerm: 'uova' },
      { name: 'Parmigiano Reggiano', amount: '40 g', fridgeMatchTerm: 'parmigiano' },
    ],
    steps: [
      'Affetta le zucchine a rondelle sottili e rosolale in padella adatta al forno con poco olio extravergine e un pizzico di sale per 6 minuti.',
      'Sbatti le uova in una ciotola capiente con il Parmigiano Reggiano grattugiato, pepe nero macinato al momento e metà della ricotta.',
      'Versa il composto sulle zucchine, distribuisci in superficie fiocchetti della ricotta rimasta e cuoci in forno statico a 190 °C per 18-20 minuti finché sarà ben gonfia e dorata.',
    ],
    chefTip:
      'I fiocchetti di ricotta aggiunti in superficie prima di infornare creano una crosticina leggermente gratinata senza asciugare l’interno.',
    sourceTag: 'Cucina di Casa · Veloce',
  },
  {
    id: 'ricetta-risotto-zafferano',
    title: 'Risotto allo Zafferano, Funghi e Salvia Croccante',
    subtitle:
      'Un grande classico lombardo arricchito dai funghi cremini del cassetto verdure e mantecato al Parmigiano.',
    category: 'Primi Piatti',
    prepMinutes: 15,
    cookMinutes: 20,
    difficulty: 'Media',
    servings: 3,
    imageUrl: '/src/assets/images/recipe_risotto_zafferano_1795773480757.jpg',
    ingredients: [
      { name: 'Funghi champignon cremini', amount: '250 g', fridgeMatchTerm: 'funghi' },
      { name: 'Parmigiano Reggiano 24 mesi', amount: '60 g', fridgeMatchTerm: 'parmigiano' },
      { name: 'Riso Carnaroli', amount: '240 g', fridgeMatchTerm: 'riso' },
      { name: 'Zafferano in pistilli o bustina', amount: '1 dose', fridgeMatchTerm: 'zafferano' },
    ],
    steps: [
      'Pulisci i funghi con un panno umido, tagliali a lamelle e trifolali velocemente in padella calda con un filo d’olio per 5 minuti, poi tienili da parte.',
      'Tosta il riso Carnaroli a secco in casseruola, sfuma e porta a cottura per circa 16 minuti versando brodo caldo poco alla volta; a metà cottura unisci lo zafferano sciolto e i funghi.',
      'Fuori dal fuoco manteca energicamente con Parmigiano Reggiano grattugiato e una noce di burro freddo, lasciando riposare due minuti prima di servire.',
    ],
    chefTip:
      'Sciogli i pistilli di zafferano in mezzo bicchiere di brodo tiepido almeno 20 minuti prima: sprigioneranno colore e aroma intensi.',
    sourceTag: 'Tradizione Regionale',
  },
  {
    id: 'ricetta-trifle-fragole',
    title: 'Coppa Tiramisù alle Fragole, Mascarpone e Pistacchi',
    subtitle:
      'Dolce al cucchiaio fresco senza cottura: ideale per salvare fragole mature e mascarpone prima della scadenza.',
    category: 'Dolci & Colazione',
    prepMinutes: 15,
    cookMinutes: 0,
    difficulty: 'Facile',
    servings: 4,
    imageUrl: '/src/assets/images/recipe_tiramisu_fragole_1795773482557.jpg',
    ingredients: [
      { name: 'Fragole fresche', amount: '300 g', fridgeMatchTerm: 'fragol' },
      { name: 'Mascarpone fresco', amount: '250 g', fridgeMatchTerm: 'mascarpone' },
      { name: 'Limone non trattato', amount: '1/2 scorza', fridgeMatchTerm: 'limon' },
      { name: 'Uova fresche', amount: '2 pz', fridgeMatchTerm: 'uova' },
    ],
    steps: [
      'Taglia le fragole a fettine e lasciale macerare per 10 minuti con un cucchiaio di zucchero e poche gocce di succo di limone.',
      'Lavora i tuorli con lo zucchero, incorpora il mascarpone freddo e la scorza grattugiata di limone fino a ottenere una crema liscia e vellutata.',
      'Alterna in una coppa o nei bicchieri strati di crema al mascarpone, fragole macerate con il loro sciroppo e biscotti savoiardi, completando con granella di pistacchi.',
    ],
    chefTip:
      'Puoi sostituire i savoiardi con fette biscottate o biscotti secchi da colazione leggermente bagnati nello sciroppo delle fragole.',
    sourceTag: 'Dolci Veloci · Zero Sprechi',
  },
  {
    id: 'ricetta-salmone-limone',
    title: 'Salmone Scottato al Limone con Spinaci al Vapore',
    subtitle:
      'Un secondo piatto leggero e proteico pronto in 12 minuti per consumare subito il pesce fresco e gli agrumi.',
    category: 'Secondi',
    prepMinutes: 5,
    cookMinutes: 10,
    difficulty: 'Facile',
    servings: 2,
    imageUrl: '/src/assets/images/hero_cucina_fresca_1795773482849.jpg',
    ingredients: [
      { name: 'Filetti di salmone', amount: '2 tranci', fridgeMatchTerm: 'salmone' },
      { name: 'Limoni di Amalfi', amount: '1 pz', fridgeMatchTerm: 'limon' },
      { name: 'Spinaci freschi', amount: '200 g', fridgeMatchTerm: 'spinaci' },
    ],
    steps: [
      'Asciuga bene i tranci di salmone e cuocili in padella antiaderente ben calda dal lato della pelle per 4 minuti finché diventa croccante.',
      'Gira i filetti, sfuma con il succo di mezzo limone e prosegui la cottura per altri 3 minuti a fiamma dolce.',
      'Negli ultimi 2 minuti fai appassire in padella gli spinaci freschi con un pizzico di sale e servi con fettine di limone.',
    ],
    chefTip:
      'Se gli spinaci hanno già passato il giorno ottimale ma sono ancora integri, lavali in acqua fredda e cuocili subito in padella.',
    sourceTag: 'Pronto in 15 Minuti',
  },
  {
    id: 'ricetta-trofie-pesto-pomodorini',
    title: 'Pasta al Pesto Fresco, Pomodorini e Ricotta',
    subtitle:
      'Un primo piatto mediterraneo profumatissimo che unisce il pesto in vasetto con pomodorini dolci e crema di ricotta.',
    category: 'Primi Piatti',
    prepMinutes: 8,
    cookMinutes: 10,
    difficulty: 'Facile',
    servings: 2,
    imageUrl: '/src/assets/images/recipe_pasta_pesto_1795773783699.jpg',
    ingredients: [
      { name: 'Pesto alla Genovese', amount: '90 g', fridgeMatchTerm: 'pesto' },
      { name: 'Pomodorini datterini', amount: '200 g', fridgeMatchTerm: 'pomodor' },
      { name: 'Ricotta romana', amount: '80 g', fridgeMatchTerm: 'ricotta' },
      { name: 'Pasta fresca', amount: '250 g', fridgeMatchTerm: 'paccheri' },
    ],
    steps: [
      'Lessa la pasta fresca in acqua salata e conserva mezzo bicchiere di acqua di cottura prima di scolare.',
      'In una ciotola ampia stempera il pesto alla genovese con la ricotta fresca e due cucchiai di acqua di cottura calda per creare una crema fluida.',
      'Unisci la pasta scolata e i pomodorini datterini tagliati a spicchi a crudo, mescola delicatamente e servi subito.',
    ],
    chefTip:
      'Non scaldare mai il pesto sul fornello diretto: il calore eccessivo ossida il basilico e ne spegne il verde brillante.',
    sourceTag: 'Classico Italiano',
  },
];

export const SAMPLE_RECEIPT_TEXT = `ESSELUNGA SUPERSTORE MILANO
8004567001234 MOZZARELLA DI BUFALA 250G   3,29
2x YOGURT GRECO NATURALE   2,40
8009988776655 POMODORI SAN MARZANO   2,85
PETTO DI POLLO A FETTE   5,90
PASTA FRESCA RAVIOLI RICOTTA   3,45
LATTE FRESCO ALTA QUALITA 1L   1,65
TOTALE EURO   19,54
BANCOMAT   19,54`;

export const SAMPLE_BARCODES = [
  { code: '8004567001234', label: 'Mozzarella di Bufala 250g' },
  { code: '8003219876543', label: 'Salmone Norvegese 250g' },
  { code: '8001122334455', label: 'Latte Fresco Intero 1L' },
  { code: '8007654321098', label: 'Uova Bio Allevamento a Terra 6pz' },
];
