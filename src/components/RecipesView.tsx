import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChefHat,
  Clock,
  Flame,
  Loader2,
  Sparkles,
  Utensils,
} from 'lucide-react';
import {
  FridgeItem,
  Recipe,
  RecipeCategory,
  RecipeMatch,
} from '../types/fridge';
import {
  formatExpiryLabel,
  getDaysUntilExpiry,
  getTodayDateString,
  sortFridgeItemsByExpiry,
} from '../utils/fridgeLogic';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RecipesViewProps {
  fridgeItems: FridgeItem[];
  recipeMatches: RecipeMatch[];
  onCookRecipe: (recipe: Recipe) => void;
  onAddAiRecipes: (recipes: Recipe[]) => void;
}

type CategoryFilter = 'Tutte' | 'Salva-Spreco' | RecipeCategory;

export function RecipesView({
  fridgeItems,
  recipeMatches,
  onCookRecipe,
  onAddAiRecipes,
}: RecipesViewProps) {
  const todayStr = getTodayDateString();
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('Tutte');
  const [selectedMatch, setSelectedMatch] = useState<RecipeMatch | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const expiringHighlights = useMemo(() => {
    return sortFridgeItemsByExpiry(fridgeItems, todayStr)
      .map((item) => ({
        item,
        daysLeft: getDaysUntilExpiry(item.expiryDate, todayStr),
      }))
      .filter((entry) => entry.daysLeft <= 3 && entry.daysLeft >= 0)
      .slice(0, 5);
  }, [fridgeItems, todayStr]);

  const filteredMatches = useMemo(() => {
    if (categoryFilter === 'Tutte') return recipeMatches;
    if (categoryFilter === 'Salva-Spreco') {
      return recipeMatches.filter((m) => m.expiringUsedCount > 0);
    }
    return recipeMatches.filter((m) => m.recipe.category === categoryFilter);
  }, [recipeMatches, categoryFilter]);

  async function handleGenerateAiRecipes() {
    if (fridgeItems.length === 0) {
      setAiError('Aggiungi prima qualche ingrediente al frigorifero.');
      return;
    }
    setIsGenerating(true);
    setAiError('');
    try {
      const sorted = sortFridgeItemsByExpiry(fridgeItems, todayStr).map(
        (item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          daysLeft: getDaysUntilExpiry(item.expiryDate, todayStr),
        }),
      );

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: sorted }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile generare nuove ricette.');
      }

      const validCats = new Set<RecipeCategory>([
        'Primi Piatti',
        'Secondi',
        'Contorni',
        'Dolci & Colazione',
      ]);

      const generated: Recipe[] = (data.recipes || []).map(
        (
          r: {
            title: string;
            subtitle: string;
            category: string;
            prepMinutes: number;
            cookMinutes: number;
            difficulty: string;
            servings: number;
            chefTip: string;
            ingredients: Array<{
              name: string;
              amount: string;
              fridgeMatchTerm: string;
            }>;
            steps: string[];
          },
          idx: number,
        ) => ({
          id: `ai-recipe-${Date.now()}-${idx}`,
          title: r.title,
          subtitle: r.subtitle,
          category: validCats.has(r.category as RecipeCategory)
            ? (r.category as RecipeCategory)
            : 'Primi Piatti',
          prepMinutes: Math.max(5, Number(r.prepMinutes) || 10),
          cookMinutes: Math.max(0, Number(r.cookMinutes) || 15),
          difficulty:
            r.difficulty === 'Media' || r.difficulty === 'Elaborata'
              ? r.difficulty
              : 'Facile',
          servings: Math.max(1, Number(r.servings) || 2),
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          chefTip: r.chefTip || 'Servi ben caldo.',
          sourceTag: 'Creata su misura per il tuo frigo',
          isAiGenerated: true,
        }),
      );

      if (generated.length === 0) {
        setAiError('Nessuna ricetta ricevuta. Riprova tra un momento.');
      } else {
        onAddAiRecipes(generated);
      }
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Errore nella generazione delle ricette.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Intestazione editoriale stile magazine culinario italiano */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-amber-700">
              Ricettario di casa · Priorità anti-spreco
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 text-balance">
              Ricette consigliate per svuotare il frigo con gusto
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Ogni ricetta è ordinata in automatico in base alle scadenze dei tuoi
              alimenti: in cima trovi i piatti che salvano subito i prodotti più
              delicati.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateAiRecipes}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isGenerating
                ? 'Elaborazione menu...'
                : 'Genera nuove ricette con il tuo frigo'}
            </span>
          </button>
        </div>

        {expiringHighlights.length > 0 && (
          <div className="border-t border-stone-200 pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ingredienti prioritari in scadenza:</span>
            </span>
            <span className="text-stone-700">
              {expiringHighlights
                .map(
                  (e) =>
                    `${e.item.name} (${formatExpiryLabel(e.daysLeft).toLowerCase()})`,
                )
                .join(' · ')}
            </span>
          </div>
        )}

        {aiError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            {aiError}
          </p>
        )}
      </section>

      {/* Filtri per categoria */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div
          role="group"
          aria-label="Filtra ricette per portata"
          className="inline-flex items-center gap-1 rounded-lg bg-stone-200/70 p-1"
        >
          {(
            [
              'Tutte',
              'Salva-Spreco',
              'Primi Piatti',
              'Secondi',
              'Contorni',
              'Dolci & Colazione',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs font-mono text-stone-500 tabular-nums whitespace-nowrap shrink-0">
          {filteredMatches.length}{' '}
          {filteredMatches.length === 1 ? 'ricetta' : 'ricette'}
        </p>
      </div>

      {/* Griglia ricette editoriali */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center space-y-3">
          <ChefHat className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-stone-900">
            Nessuna ricetta in questa categoria
          </h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Puoi mostrare tutte le ricette oppure generare nuove proposte su misura
            usando gli ingredienti del tuo frigo.
          </p>
          <button
            type="button"
            onClick={() => setCategoryFilter('Tutte')}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            Mostra tutte le ricette
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => {
            const { recipe, matchedItems, expiringUsedCount, matchPercent } =
              match;
            const totalTime = recipe.prepMinutes + recipe.cookMinutes;
            const showFallback = !recipe.imageUrl || failedImages[recipe.id];

            return (
              <article
                key={recipe.id}
                data-testid="recipe-card"
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                {/* Immagine 4:3 o fallback editoriale curato */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                  {!showFallback ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [recipe.id]: true,
                        }))
                      }
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100/70 p-6 text-center">
                      <Utensils
                        className="h-9 w-9 text-amber-700/80 mb-2"
                        aria-hidden="true"
                      />
                      <span className="font-display text-base font-semibold text-stone-800 line-clamp-2">
                        {recipe.title}
                      </span>
                      <span className="mt-1 text-xs text-stone-500">
                        {recipe.category}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2.5">
                    {/* Metadata lineare senza pill */}
                    <p className="text-xs font-medium text-stone-500 tabular-nums">
                      {recipe.category} · {totalTime} min · {recipe.difficulty}
                    </p>

                    <h2 className="font-display text-xl font-bold leading-snug text-stone-900">
                      {recipe.title}
                    </h2>

                    <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                      {recipe.subtitle}
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-stone-200 pt-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="font-semibold text-stone-800">
                          {matchedItems.length}/{recipe.ingredients.length}{' '}
                          ingredienti nel frigo ({matchPercent}%)
                        </span>
                        {expiringUsedCount > 0 && (
                          <span className="font-semibold text-amber-700">
                            Salva {expiringUsedCount}{' '}
                            {expiringUsedCount === 1 ? 'cibo' : 'cibi'}
                          </span>
                        )}
                      </div>

                      {matchedItems.length > 0 && (
                        <p className="text-xs text-stone-500 line-clamp-1">
                          Usa:{' '}
                          {matchedItems
                            .slice(0, 3)
                            .map((m) => m.fridgeItem.name)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                      className="w-full inline-flex items-center justify-between rounded-lg border border-stone-300 bg-[#FAF9F6] px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:border-amber-600 hover:bg-amber-50 cursor-pointer"
                    >
                      <span>Scopri preparazione</span>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{recipe.servings} porz.</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <RecipeDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onCook={(recipe) => {
            onCookRecipe(recipe);
            setSelectedMatch(null);
          }}
        />
      )}
    </div>
  );
}
