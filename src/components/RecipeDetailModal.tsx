import { CheckCircle2, ChefHat, Clock, Users, Utensils, X } from 'lucide-react';
import { Recipe, RecipeMatch } from '../types/fridge';
import { formatExpiryLabel } from '../utils/fridgeLogic';

interface RecipeDetailModalProps {
  match: RecipeMatch;
  onClose: () => void;
  onCook: (recipe: Recipe) => void;
}

export function RecipeDetailModal({
  match,
  onClose,
  onCook,
}: RecipeDetailModalProps) {
  const { recipe, matchedItems, missingIngredients } = match;
  const totalTime = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-3 sm:p-6 overflow-y-auto"
    >
      <div className="my-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Top photo header */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100 p-8 text-center">
              <Utensils className="h-10 w-10 text-amber-700 mb-2" aria-hidden="true" />
              <p className="font-display text-2xl font-bold text-stone-900">
                {recipe.title}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi ricetta"
            className="absolute right-4 top-4 rounded-full bg-white/95 p-2 text-stone-800 shadow-sm hover:bg-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3 border-b border-stone-200 pb-5">
            <p className="text-xs font-semibold text-amber-700">
              {recipe.category} · {recipe.sourceTag}
            </p>
            <h2
              id="recipe-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold text-stone-900"
            >
              {recipe.title}
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              {recipe.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs font-medium text-stone-700 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <span>
                  Prep {recipe.prepMinutes}m · Cottura {recipe.cookMinutes}m (Tot.{' '}
                  {totalTime}m)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ChefHat className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <span>Difficoltà: {recipe.difficulty}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <span>{recipe.servings} porzioni</span>
              </span>
            </div>
          </div>

          {/* Ingredienti & Preparazione */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-3">
              <h3 className="font-display text-lg font-bold text-stone-900">
                Ingredienti
              </h3>

              <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-[#FAF9F6]">
                {matchedItems.map((m) => (
                  <li
                    key={`${m.ingredient.name}-${m.fridgeItem.id}`}
                    className="flex items-start justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">
                        {m.ingredient.name}
                      </p>
                      <p className="text-emerald-700 font-medium">
                        In frigo ({formatExpiryLabel(m.daysLeft).toLowerCase()})
                      </p>
                    </div>
                    <span className="font-mono text-stone-600 tabular-nums shrink-0">
                      {m.ingredient.amount}
                    </span>
                  </li>
                ))}

                {missingIngredients.map((ing) => (
                  <li
                    key={ing.name}
                    className="flex items-start justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-stone-800">{ing.name}</p>
                      <p className="text-stone-400">Da aggiungere / dispensa</p>
                    </div>
                    <span className="font-mono text-stone-500 tabular-nums shrink-0">
                      {ing.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-7 space-y-4">
              <h3 className="font-display text-lg font-bold text-stone-900">
                Preparazione passo dopo passo
              </h3>

              <ol className="space-y-3.5">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-mono text-xs font-bold text-amber-800 tabular-nums">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1">
                <p className="text-xs font-bold text-amber-900">
                  Consiglio dello chef
                </p>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  {recipe.chefTip}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200 pt-5">
            <p className="text-xs text-stone-500">
              {matchedItems.length > 0
                ? `Confermando verranno scalati ${matchedItems.length} ingredienti dal tuo frigorifero.`
                : 'Questa ricetta aggiorna la dispensa al termine.'}
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => onCook(recipe)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Ho cucinato questa ricetta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
