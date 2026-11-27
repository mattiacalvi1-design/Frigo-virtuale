import {
  ExpiryAlert,
  ExpiryStatus,
  FridgeItem,
  FridgeShelf,
  MatchedIngredientDetail,
  Recipe,
  RecipeMatch,
  ScannedDraftItem,
} from '../types/fridge';

export const SHELF_META: Record<
  FridgeShelf,
  { label: string; tempHint: string; order: number }
> = {
  carne_pesce: {
    label: 'Carne e Pesce',
    tempHint: 'Ripiano inferiore · 0–2 °C',
    order: 1,
  },
  latticini: {
    label: 'Latticini e Uova',
    tempHint: 'Ripiano centrale · 2–4 °C',
    order: 2,
  },
  pasta_sughi: {
    label: 'Pasta Fresca e Sughi',
    tempHint: 'Ripiano superiore · 4–5 °C',
    order: 3,
  },
  verdura: {
    label: 'Frutta e Verdura',
    tempHint: 'Cassetto freschezza · 6–8 °C',
    order: 4,
  },
  bevande_altro: {
    label: 'Bevande e Altro',
    tempHint: 'Balconcini porta · 6–9 °C',
    order: 5,
  },
};

export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const dt = new Date(utc);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysUntilExpiry(
  expiryDateStr: string,
  todayStr: string = getTodayDateString(),
): number {
  const [ey, em, ed] = expiryDateStr.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  if (!ey || !em || !ed || !ty || !tm || !td) return 0;
  const expiryUtc = Date.UTC(ey, em - 1, ed);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((expiryUtc - todayUtc) / 86_400_000);
}

export function getExpiryStatus(
  daysLeft: number,
  warningDays: number = 3,
): ExpiryStatus {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 1) return 'urgent';
  if (daysLeft <= warningDays) return 'warning';
  return 'fresh';
}

export function formatExpiryLabel(daysLeft: number): string {
  if (daysLeft < -1) return `Scaduto da ${Math.abs(daysLeft)} giorni`;
  if (daysLeft === -1) return 'Scaduto ieri';
  if (daysLeft === 0) return 'Scade oggi';
  if (daysLeft === 1) return 'Scade domani';
  return `Tra ${daysLeft} giorni`;
}

export function sortFridgeItemsByExpiry(
  items: FridgeItem[],
  todayStr: string = getTodayDateString(),
): FridgeItem[] {
  return [...items].sort((a, b) => {
    const da = getDaysUntilExpiry(a.expiryDate, todayStr);
    const db = getDaysUntilExpiry(b.expiryDate, todayStr);
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name, 'it');
  });
}

export function buildExpiryAlerts(
  items: FridgeItem[],
  warningDays: number = 3,
  todayStr: string = getTodayDateString(),
): ExpiryAlert[] {
  const sorted = sortFridgeItemsByExpiry(items, todayStr);
  const alerts: ExpiryAlert[] = [];

  for (const item of sorted) {
    const daysLeft = getDaysUntilExpiry(item.expiryDate, todayStr);
    if (daysLeft > warningDays) continue;
    const status = getExpiryStatus(daysLeft, warningDays);

    let title = `${item.name} in scadenza`;
    let message = `${formatExpiryLabel(daysLeft)} · Ripiano ${SHELF_META[item.shelf].label}`;

    if (status === 'expired') {
      title = `${item.name} è scaduto`;
      message = `${formatExpiryLabel(daysLeft)} · Controlla prima di consumare o rimuovilo.`;
    } else if (status === 'urgent') {
      title = `${item.name}: consumo prioritario`;
      message = `${formatExpiryLabel(daysLeft)} · Ideale da cucinare subito.`;
    }

    alerts.push({
      id: `alert-${item.id}-${item.expiryDate}`,
      item,
      daysLeft,
      status,
      title,
      message,
    });
  }

  return alerts;
}

export function estimateShelfAndDays(productName: string): {
  shelf: FridgeShelf;
  days: number;
  unit: string;
} {
  const lower = productName.toLowerCase();

  if (
    /(salmone|pesce|merluzzo|orata|tonno fresco|gamber|pollo|tacchino|manzo|macinato|prosciutto|speck|bresaola|salsiccia|bistecca)/.test(
      lower,
    )
  ) {
    return { shelf: 'carne_pesce', days: 2, unit: 'conf.' };
  }

  if (
    /(burrata|mozzarella|ricotta|mascarpone|latte|yogurt|stracchino|philadelphia|robiola|panna|uova|parmigiano|pecorino|burro|formaggio)/.test(
      lower,
    )
  ) {
    const isHardCheese = /(parmigiano|pecorino|grana|uova)/.test(lower);
    return {
      shelf: 'latticini',
      days: isHardCheese ? 14 : 4,
      unit: lower.includes('latte') ? 'L' : lower.includes('uova') ? 'pz' : 'conf.',
    };
  }

  if (
    /(paccheri|trofie|ravioli|tortellini|gnocchi|pasta fresca|sfoglia|pesto|sugo|ragu|passata|hummus)/.test(
      lower,
    )
  ) {
    return { shelf: 'pasta_sughi', days: 7, unit: 'conf.' };
  }

  if (
    /(pomodor|zucchin|spinaci|insalata|rucola|fragol|mirtill|lampon|limon|carot|peperon|melanzan|funghi|basilico|prezzemolo|avocado|mele|pere)/.test(
      lower,
    )
  ) {
    const delicate = /(spinaci|rucola|fragol|lampon|mirtill|funghi|basilico)/.test(lower);
    return { shelf: 'verdura', days: delicate ? 2 : 5, unit: 'conf.' };
  }

  return { shelf: 'bevande_altro', days: 10, unit: 'pz' };
}

const NON_FOOD_RECEIPT_LINES =
  /(totale|subtotale|contanti|resto|carta|bancomat|visa|mastercard|iva|imponibile|sconto|tessera|punti|grazie|arrivederci|cassa|operatore|data|ora|p\.iva|cf:|scontrino|documento|shopper|sacchetto|supermercato|superstore|esselunga|conad|carrefour|coop|lidl|eurospin|pam|iper|via\s|piazza\s|s\.r\.l|s\.p\.a)/i;

export function parseReceiptTextLines(
  rawText: string,
  todayStr: string = getTodayDateString(),
): ScannedDraftItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 3);

  const items: ScannedDraftItem[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (NON_FOOD_RECEIPT_LINES.test(line)) continue;

    // Detect optional leading barcode
    let barcode: string | undefined;
    let working = line;
    const barcodeMatch = working.match(/^(\d{8,14})\s+(.+)$/);
    if (barcodeMatch) {
      barcode = barcodeMatch[1];
      working = barcodeMatch[2];
    }

    // Detect optional quantity prefix like "2x " or "2 x "
    let quantity = 1;
    const qtyMatch = working.match(/^(\d+)\s*[xX×]\s+(.+)$/);
    if (qtyMatch) {
      quantity = Math.max(1, parseInt(qtyMatch[1], 10));
      working = qtyMatch[2];
    }

    // Strip trailing prices like "3,49", "€ 2.90", "3.49 EUR"
    working = working
      .replace(/(?:€|eur)?\s*\d+[.,]\d{2}\s*(?:€|eur|[a-zA-Z])?$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!working || /^\d+$/.test(working)) continue;

    // Normalize casing to Title Case in Italian
    const cleanName = working
      .toLowerCase()
      .replace(/(^|\s)([a-zàèéìòù])/g, (_, sep, ch) => sep + ch.toUpperCase());

    const estimate = estimateShelfAndDays(cleanName);
    items.push({
      tempId: `draft-${idx}-${Date.now()}`,
      name: cleanName,
      quantity,
      unit: estimate.unit,
      shelf: estimate.shelf,
      estimatedDays: estimate.days,
      expiryDate: addDaysToDateString(todayStr, estimate.days),
      barcode,
    });
  }

  return items;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function doesFridgeItemMatchTerm(
  itemName: string,
  matchTerm: string,
): boolean {
  const normItem = normalizeToken(itemName);
  const normTerm = normalizeToken(matchTerm);
  if (!normTerm) return false;
  if (normItem.includes(normTerm) || normTerm.includes(normItem)) {
    return true;
  }
  const termWords = normTerm.split(/\s+/).filter((w) => w.length >= 4);
  return termWords.some((word) => normItem.includes(word));
}

export function matchRecipesToFridge(
  recipes: Recipe[],
  fridgeItems: FridgeItem[],
  todayStr: string = getTodayDateString(),
): RecipeMatch[] {
  const matches: RecipeMatch[] = recipes.map((recipe) => {
    const matchedItems: MatchedIngredientDetail[] = [];
    const missingIngredients = [];

    for (const ingredient of recipe.ingredients) {
      const candidates = fridgeItems.filter((item) =>
        doesFridgeItemMatchTerm(item.name, ingredient.fridgeMatchTerm),
      );
      if (candidates.length > 0) {
        // Pick soonest expiring candidate
        const best = sortFridgeItemsByExpiry(candidates, todayStr)[0];
        const daysLeft = getDaysUntilExpiry(best.expiryDate, todayStr);
        const status = getExpiryStatus(daysLeft);
        matchedItems.push({
          ingredient,
          fridgeItem: best,
          daysLeft,
          status,
        });
      } else {
        missingIngredients.push(ingredient);
      }
    }

    const totalCount = Math.max(1, recipe.ingredients.length);
    const matchPercent = Math.round((matchedItems.length / totalCount) * 100);

    let urgencyScore = matchPercent;
    let expiringUsedCount = 0;

    for (const m of matchedItems) {
      if (m.status === 'urgent') {
        urgencyScore += m.daysLeft === 0 ? 100 : 75;
        expiringUsedCount += 1;
      } else if (m.status === 'warning') {
        urgencyScore += 35;
        expiringUsedCount += 1;
      } else if (m.status === 'fresh') {
        urgencyScore += 10;
      } else if (m.status === 'expired') {
        urgencyScore += 5;
      }
    }

    return {
      recipe,
      matchedItems: [...matchedItems].sort((a, b) => a.daysLeft - b.daysLeft),
      missingIngredients,
      expiringUsedCount,
      matchPercent,
      urgencyScore,
    };
  });

  return matches.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
    return b.matchPercent - a.matchPercent;
  });
}

export function consumeRecipeIngredients(
  fridgeItems: FridgeItem[],
  recipe: Recipe,
  todayStr: string = getTodayDateString(),
): { updatedItems: FridgeItem[]; consumedNames: string[] } {
  let working = fridgeItems.map((item) => ({ ...item }));
  const consumedNames: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const matching = sortFridgeItemsByExpiry(
      working.filter((item) =>
        doesFridgeItemMatchTerm(item.name, ingredient.fridgeMatchTerm),
      ),
      todayStr,
    );

    if (matching.length === 0) continue;
    const target = matching[0];
    consumedNames.push(target.name);

    if (target.quantity > 1) {
      working = working.map((item) =>
        item.id === target.id ? { ...item, quantity: item.quantity - 1 } : item,
      );
    } else {
      working = working.filter((item) => item.id !== target.id);
    }
  }

  return { updatedItems: working, consumedNames };
}
