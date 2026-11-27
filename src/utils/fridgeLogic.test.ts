import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateString,
  buildExpiryAlerts,
  consumeRecipeIngredients,
  getDaysUntilExpiry,
  getExpiryStatus,
  matchRecipesToFridge,
  parseReceiptTextLines,
} from './fridgeLogic';
import { FridgeItem, Recipe } from '../types/fridge';

const TODAY = '2026-11-27';

test('getDaysUntilExpiry computes exact calendar day differences', () => {
  assert.equal(getDaysUntilExpiry('2026-11-27', TODAY), 0);
  assert.equal(getDaysUntilExpiry('2026-11-28', TODAY), 1);
  assert.equal(getDaysUntilExpiry('2026-11-25', TODAY), -2);
  assert.equal(addDaysToDateString(TODAY, 4), '2026-12-01');
});

test('getExpiryStatus classifies expired, urgent, warning, and fresh accurately', () => {
  assert.equal(getExpiryStatus(-1, 3), 'expired');
  assert.equal(getExpiryStatus(0, 3), 'urgent');
  assert.equal(getExpiryStatus(1, 3), 'urgent');
  assert.equal(getExpiryStatus(3, 3), 'warning');
  assert.equal(getExpiryStatus(4, 3), 'fresh');
});

test('buildExpiryAlerts orders alerts by urgency and respects warningDays threshold', () => {
  const items: FridgeItem[] = [
    {
      id: '1',
      name: 'Parmigiano Reggiano',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: '2026-12-10',
      addedAt: TODAY,
    },
    {
      id: '2',
      name: 'Burrata Pugliese',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: '2026-11-27',
      addedAt: TODAY,
    },
    {
      id: '3',
      name: 'Spinaci Freschi',
      quantity: 1,
      unit: 'conf.',
      shelf: 'verdura',
      expiryDate: '2026-11-26',
      addedAt: TODAY,
    },
  ];

  const alerts = buildExpiryAlerts(items, 3, TODAY);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].item.name, 'Spinaci Freschi');
  assert.equal(alerts[0].status, 'expired');
  assert.equal(alerts[1].item.name, 'Burrata Pugliese');
  assert.equal(alerts[1].status, 'urgent');
});

test('parseReceiptTextLines extracts food products and strips prices/totals', () => {
  const receipt = `
    SUPERMERCATO CONAD MILANO
    8001234567890 BURRATA PUGLIESE 250G   3,49
    2x POMODORINI DATTERINI   2,90
    SALMONE NORVEGESE FRESCO   6,50
    TOTALE EURO 12,89
    CONTANTI 20,00
  `;

  const parsed = parseReceiptTextLines(receipt, TODAY);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].barcode, '8001234567890');
  assert.equal(parsed[0].shelf, 'latticini');
  assert.equal(parsed[1].quantity, 2);
  assert.equal(parsed[1].shelf, 'verdura');
  assert.equal(parsed[2].shelf, 'carne_pesce');
});

test('matchRecipesToFridge ranks recipes using expiring ingredients first', () => {
  const items: FridgeItem[] = [
    {
      id: 'b1',
      name: 'Burrata Pugliese',
      quantity: 1,
      unit: 'conf.',
      shelf: 'latticini',
      expiryDate: '2026-11-27', // expires today -> urgent
      addedAt: TODAY,
    },
    {
      id: 'p1',
      name: 'Pomodorini Datterini',
      quantity: 2,
      unit: 'conf.',
      shelf: 'verdura',
      expiryDate: '2026-11-28', // expires tomorrow -> urgent
      addedAt: TODAY,
    },
    {
      id: 'u1',
      name: 'Uova Bio',
      quantity: 6,
      unit: 'pz',
      shelf: 'latticini',
      expiryDate: '2026-12-08', // fresh
      addedAt: TODAY,
    },
  ];

  const recipes: Recipe[] = [
    {
      id: 'r-uova',
      title: 'Uova al Tegamino',
      subtitle: 'Semplice',
      category: 'Secondi',
      prepMinutes: 5,
      cookMinutes: 5,
      difficulty: 'Facile',
      servings: 2,
      ingredients: [{ name: 'Uova Bio', amount: '4 pz', fridgeMatchTerm: 'uova' }],
      steps: ['Cuoci le uova'],
      chefTip: 'Fuoco dolce',
      sourceTag: 'Tradizione',
    },
    {
      id: 'r-burrata',
      title: 'Pasta Pomodorini e Burrata',
      subtitle: 'Cremosa',
      category: 'Primi Piatti',
      prepMinutes: 10,
      cookMinutes: 12,
      difficulty: 'Facile',
      servings: 2,
      ingredients: [
        { name: 'Burrata', amount: '250 g', fridgeMatchTerm: 'burrata' },
        { name: 'Pomodorini', amount: '300 g', fridgeMatchTerm: 'pomodor' },
        { name: 'Basilico', amount: '1 mazzo', fridgeMatchTerm: 'basilico' },
      ],
      steps: ['Cuoci pasta e condisci'],
      chefTip: 'Burrata a crudo',
      sourceTag: 'Salva-Spreco',
    },
  ];

  const ranked = matchRecipesToFridge(recipes, items, TODAY);
  assert.equal(ranked[0].recipe.id, 'r-burrata');
  assert.equal(ranked[0].expiringUsedCount, 2);

  const { updatedItems, consumedNames } = consumeRecipeIngredients(
    items,
    recipes[1],
    TODAY,
  );
  assert.deepEqual(consumedNames, ['Burrata Pugliese', 'Pomodorini Datterini']);
  assert.equal(updatedItems.find((i) => i.id === 'b1'), undefined);
  assert.equal(updatedItems.find((i) => i.id === 'p1')?.quantity, 1);
});
