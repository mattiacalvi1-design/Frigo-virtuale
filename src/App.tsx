import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Header } from './components/Header';
import { FridgeView } from './components/FridgeView';
import { ScannerView } from './components/ScannerView';
import { RecipesView } from './components/RecipesView';
import { AlertsView } from './components/AlertsView';
import { createInitialFridgeItems, INITIAL_RECIPES } from './data/seedData';
import { AppTab, FridgeItem, Recipe } from './types/fridge';
import {
  buildExpiryAlerts,
  consumeRecipeIngredients,
  getTodayDateString,
  matchRecipesToFridge,
} from './utils/fridgeLogic';

const STORAGE_FRIDGE_KEY = 'frigovivo_items_v1';
const STORAGE_RECIPES_KEY = 'frigovivo_recipes_v1';
const STORAGE_WARNING_DAYS_KEY = 'frigovivo_warning_days_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('frigo');

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FRIDGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback to initial seeded fridge items
    }
    return createInitialFridgeItems();
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECIPES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial curated recipes
    }
    return INITIAL_RECIPES;
  });

  const [warningDays, setWarningDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WARNING_DAYS_KEY);
      if (saved) {
        const num = parseInt(saved, 10);
        if (num >= 1 && num <= 7) return num;
      }
    } catch {
      // ignore
    }
    return 3;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FRIDGE_KEY, JSON.stringify(fridgeItems));
    } catch {
      // ignore storage quota errors
    }
  }, [fridgeItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECIPES_KEY, JSON.stringify(recipes));
    } catch {
      // ignore
    }
  }, [recipes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WARNING_DAYS_KEY, String(warningDays));
    } catch {
      // ignore
    }
  }, [warningDays]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const todayStr = getTodayDateString();

  const alerts = useMemo(
    () => buildExpiryAlerts(fridgeItems, warningDays, todayStr),
    [fridgeItems, warningDays, todayStr],
  );

  const recipeMatches = useMemo(
    () => matchRecipesToFridge(recipes, fridgeItems, todayStr),
    [recipes, fridgeItems, todayStr],
  );

  const readyRecipesCount = useMemo(
    () => recipeMatches.filter((m) => m.matchedItems.length >= 2).length,
    [recipeMatches],
  );

  function handleUpdateQuantity(id: string, delta: number) {
    setFridgeItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function handleUpdateExpiry(id: string, newDate: string) {
    setFridgeItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, expiryDate: newDate } : item,
      ),
    );
    setToastMessage('Data di scadenza aggiornata.');
  }

  function handleRemoveItem(id: string) {
    const target = fridgeItems.find((i) => i.id === id);
    setFridgeItems((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      setToastMessage(`${target.name} rimosso dal frigorifero.`);
    }
  }

  function handleAddSingleItem(newItem: Omit<FridgeItem, 'id' | 'addedAt'>) {
    const created: FridgeItem = {
      ...newItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: new Date().toISOString(),
    };
    setFridgeItems((prev) => [created, ...prev]);
    setToastMessage(`${created.name} aggiunto al frigorifero.`);
  }

  function handleCommitScannedItems(
    scanned: Omit<FridgeItem, 'id' | 'addedAt'>[],
  ) {
    const nowIso = new Date().toISOString();
    const created: FridgeItem[] = scanned.map((s, idx) => ({
      ...s,
      id: `scan-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      addedAt: nowIso,
    }));
    setFridgeItems((prev) => [...created, ...prev]);
    setActiveTab('frigo');
    setToastMessage(
      `${created.length} ${created.length === 1 ? 'prodotto aggiunto' : 'prodotti aggiunti'} al frigorifero virtuale.`,
    );

    // Trigger browser notification if permitted and any scanned item has very short shelf life
    const urgentNew = created.filter(
      (item) =>
        buildExpiryAlerts([item], warningDays, todayStr).length > 0,
    );
    if (
      urgentNew.length > 0 &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('FrigoVivo · Nuove scadenze rilevate', {
        body: `${urgentNew[0].name} richiede consumo rapido (${urgentNew[0].expiryDate}).`,
      });
    }
  }

  function handleCookRecipe(recipe: Recipe) {
    const { updatedItems, consumedNames } = consumeRecipeIngredients(
      fridgeItems,
      recipe,
      todayStr,
    );
    setFridgeItems(updatedItems);
    if (consumedNames.length > 0) {
      setToastMessage(
        `Ricetta completata! Scalati dal frigo: ${consumedNames.join(', ')}.`,
      );
    } else {
      setToastMessage(`Ricetta "${recipe.title}" segnata come cucinata.`);
    }
  }

  function handleAddAiRecipes(generated: Recipe[]) {
    setRecipes((prev) => [...generated, ...prev]);
    setToastMessage(
      `${generated.length} nuove ricette consigliate aggiunte in cima al ricettario.`,
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertCount={alerts.length}
      />

      {/* Striscia avviso scadenza imminente (sotto l'header, mai sopra) */}
      {alerts.length > 0 && !dismissedBanner && activeTab === 'frigo' && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 text-xs">
            <div className="flex items-center gap-2 text-amber-950 min-w-0">
              <AlertTriangle
                className="h-4 w-4 text-amber-700 shrink-0"
                aria-hidden="true"
              />
              <p className="truncate sm:hidden">
                <strong>{alerts.length} avvisi di scadenza</strong>
              </p>
              <p className="hidden sm:block truncate">
                <strong>
                  {alerts.length}{' '}
                  {alerts.length === 1 ? 'alimento richiede' : 'alimenti richiedono'}{' '}
                  attenzione:
                </strong>{' '}
                {alerts
                  .slice(0, 3)
                  .map((a) => a.item.name)
                  .join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('ricette')}
                className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 whitespace-nowrap cursor-pointer"
              >
                Vedi ricette
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('avvisi')}
                className="font-semibold text-stone-700 hover:text-stone-950 whitespace-nowrap cursor-pointer"
              >
                Apri avvisi
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                aria-label="Nascondi avviso scadenze"
                className="text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'frigo' && (
          <FridgeView
            items={fridgeItems}
            warningDays={warningDays}
            readyRecipesCount={readyRecipesCount}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateExpiry={handleUpdateExpiry}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddSingleItem}
            onGoToScanner={() => setActiveTab('scansiona')}
            onGoToRecipes={() => setActiveTab('ricette')}
          />
        )}

        {activeTab === 'scansiona' && (
          <ScannerView onCommitItems={handleCommitScannedItems} />
        )}

        {activeTab === 'ricette' && (
          <RecipesView
            fridgeItems={fridgeItems}
            recipeMatches={recipeMatches}
            onCookRecipe={handleCookRecipe}
            onAddAiRecipes={handleAddAiRecipes}
          />
        )}

        {activeTab === 'avvisi' && (
          <AlertsView
            alerts={alerts}
            warningDays={warningDays}
            onChangeWarningDays={setWarningDays}
            onRemoveItem={handleRemoveItem}
            onGoToRecipes={() => setActiveTab('ricette')}
          />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-5 sm:px-6 text-xs text-stone-500">
          <span>FrigoVivo · Gestione dispensa e ricette anti-spreco</span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('frigo')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Frigorifero
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scansiona')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Scansiona
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ricette')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Ricette
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('avvisi')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Avvisi
            </button>
          </div>
        </div>
      </footer>

      {/* Notifica toast di conferma azioni */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-stone-800 bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-lg"
        >
          <CheckCircle2
            className="h-4 w-4 text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
