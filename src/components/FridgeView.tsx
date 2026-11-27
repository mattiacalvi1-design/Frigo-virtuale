import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  ExpiryStatus,
  FridgeItem,
  FridgeShelf,
} from '../types/fridge';
import {
  SHELF_META,
  addDaysToDateString,
  formatExpiryLabel,
  getDaysUntilExpiry,
  getExpiryStatus,
  getTodayDateString,
  sortFridgeItemsByExpiry,
} from '../utils/fridgeLogic';

interface FridgeViewProps {
  items: FridgeItem[];
  warningDays: number;
  readyRecipesCount: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateExpiry: (id: string, newDate: string) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (item: Omit<FridgeItem, 'id' | 'addedAt'>) => void;
  onGoToScanner: () => void;
  onGoToRecipes: () => void;
}

type FilterMode = 'tutti' | 'scadenza' | 'freschi' | 'scaduti';

function StatusBadge({ status, label }: { status: ExpiryStatus; label: string }) {
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 tabular-nums">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 tabular-nums">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 tabular-nums">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 tabular-nums">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function FridgeView({
  items,
  warningDays,
  readyRecipesCount,
  onUpdateQuantity,
  onUpdateExpiry,
  onRemoveItem,
  onAddItem,
  onGoToScanner,
  onGoToRecipes,
}: FridgeViewProps) {
  const todayStr = getTodayDateString();
  const [filterMode, setFilterMode] = useState<FilterMode>('tutti');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'ripiani' | 'lista'>('ripiani');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for manual item addition
  const [newName, setNewName] = useState('');
  const [newShelf, setNewShelf] = useState<FridgeShelf>('latticini');
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState('conf.');
  const [newExpiry, setNewExpiry] = useState(addDaysToDateString(todayStr, 4));
  const [formError, setFormError] = useState('');

  const stats = useMemo(() => {
    let expiring = 0;
    let expired = 0;
    let fresh = 0;

    for (const item of items) {
      const days = getDaysUntilExpiry(item.expiryDate, todayStr);
      const status = getExpiryStatus(days, warningDays);
      if (status === 'expired') expired += 1;
      else if (status === 'urgent' || status === 'warning') expiring += 1;
      else fresh += 1;
    }

    return { total: items.length, expiring, expired, fresh };
  }, [items, warningDays, todayStr]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = sortFridgeItemsByExpiry(items, todayStr);

    return sorted.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) {
        return false;
      }
      const days = getDaysUntilExpiry(item.expiryDate, todayStr);
      const status = getExpiryStatus(days, warningDays);
      if (filterMode === 'scadenza') {
        return status === 'urgent' || status === 'warning';
      }
      if (filterMode === 'freschi') {
        return status === 'fresh';
      }
      if (filterMode === 'scaduti') {
        return status === 'expired';
      }
      return true;
    });
  }, [items, searchQuery, filterMode, warningDays, todayStr]);

  const shelvesGrouped = useMemo(() => {
    const orderedShelves = (Object.keys(SHELF_META) as FridgeShelf[]).sort(
      (a, b) => SHELF_META[a].order - SHELF_META[b].order,
    );

    return orderedShelves
      .map((shelf) => ({
        shelf,
        meta: SHELF_META[shelf],
        items: filteredItems.filter((item) => item.shelf === shelf),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Inserisci il nome del prodotto.');
      return;
    }
    if (!newExpiry) {
      setFormError('Seleziona la data di scadenza.');
      return;
    }

    onAddItem({
      name: trimmed,
      quantity: Math.max(1, newQty),
      unit: newUnit.trim() || 'pz',
      shelf: newShelf,
      expiryDate: newExpiry,
    });
    setNewName('');
    setNewQty(1);
    setFormError('');
    setShowAddModal(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Hero editoriale compatto */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wide text-amber-700">
              Dispensa domestica · Controllo scadenze
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 text-balance">
              Il tuo frigorifero virtuale, sempre sotto controllo.
            </h1>
            <p className="text-base text-stone-600 max-w-xl leading-relaxed">
              Inquadra il codice a barre o fotografa lo scontrino della spesa per
              caricare i prodotti nei ripiani, ricevere avvisi prima della scadenza e
              trasformare gli ingredienti in ricette italiane pronte.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGoToRecipes}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap cursor-pointer"
            >
              <span>Cucina i prodotti in scadenza</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onGoToScanner}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 whitespace-nowrap cursor-pointer"
            >
              <span>Scansiona scontrino</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Aggiungi a mano</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 min-h-[220px]">
          <img
            src="/src/assets/images/hero_cucina_fresca_1795773482849.jpg"
            alt="Ingredienti freschi della spesa disposti su piano in pietra"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Striscia KPI a 4 colonne */}
      <section
        aria-label="Riepilogo frigorifero"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Prodotti in frigo</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-stone-900 tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">
            In scadenza (≤ {warningDays}g)
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {stats.expiring}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Già scaduti</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-red-700 tabular-nums">
            {stats.expired}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Ricette compatibili</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {readyRecipesCount}
          </p>
        </div>
      </section>

      {/* Barra controlli inventario */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          {/* Segmented filter buttons */}
          <div
            role="group"
            aria-label="Filtra per stato di scadenza"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-stone-200/70 p-1"
          >
            {(
              [
                { id: 'tutti', label: `Tutti (${stats.total})` },
                { id: 'scadenza', label: `In scadenza (${stats.expiring})` },
                { id: 'freschi', label: `Freschi (${stats.fresh})` },
                { id: 'scaduti', label: `Scaduti (${stats.expired})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca alimento..."
                aria-label="Cerca alimento nel frigorifero"
                className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-stone-200/70 p-1">
              <button
                type="button"
                onClick={() => setLayoutMode('ripiani')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  layoutMode === 'ripiani'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ripiani Frigo
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('lista')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  layoutMode === 'lista'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Lista Scadenze
              </button>
            </div>
          </div>
        </div>

        {/* Stato vuoto */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center space-y-3">
            <h2 className="font-display text-xl font-semibold text-stone-900">
              Nessun prodotto in questa vista
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Prova a cambiare filtro o scansiona uno scontrino per riempire i ripiani
              del tuo frigorifero virtuale.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              {filterMode !== 'tutti' || searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('tutti');
                    setSearchQuery('');
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer"
                >
                  Mostra tutti i prodotti
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoToScanner}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                >
                  Scansiona scontrino
                </button>
              )}
            </div>
          </div>
        ) : layoutMode === 'ripiani' ? (
          /* Visualizzazione a ripiani del frigorifero virtuale */
          <div
            data-testid="fridge-shelves"
            className="rounded-2xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-200"
          >
            {shelvesGrouped.map(({ shelf, meta, items: shelfItems }) => (
              <div key={shelf} className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-stone-900">
                    {meta.label}
                  </h2>
                  <p className="text-xs text-stone-500 tabular-nums">
                    {meta.tempHint} · {shelfItems.length}{' '}
                    {shelfItems.length === 1 ? 'prodotto' : 'prodotti'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {shelfItems.map((item) => {
                    const daysLeft = getDaysUntilExpiry(item.expiryDate, todayStr);
                    const status = getExpiryStatus(daysLeft, warningDays);
                    return (
                      <FridgeItemCard
                        key={item.id}
                        item={item}
                        daysLeft={daysLeft}
                        status={status}
                        onUpdateQuantity={onUpdateQuantity}
                        onUpdateExpiry={onUpdateExpiry}
                        onRemoveItem={onRemoveItem}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Lista compatta ordinata per scadenza */
          <div className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-200">
            {filteredItems.map((item) => {
              const daysLeft = getDaysUntilExpiry(item.expiryDate, todayStr);
              const status = getExpiryStatus(daysLeft, warningDays);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-stone-900">
                        {item.name}
                      </span>
                      <StatusBadge
                        status={status}
                        label={formatExpiryLabel(daysLeft)}
                      />
                    </div>
                    <p className="text-xs text-stone-500 tabular-nums">
                      {SHELF_META[item.shelf].label} · Scadenza {item.expiryDate}
                      {item.barcode ? ` · EAN ${item.barcode}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="inline-flex items-center rounded-lg border border-stone-200 bg-white">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        aria-label={`Riduci quantità di ${item.name}`}
                        className="p-2 text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="px-2.5 font-mono text-xs font-medium text-stone-900 tabular-nums">
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        aria-label={`Aumenta quantità di ${item.name}`}
                        className="p-2 text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Segna consumato ${item.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Consuma</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modale aggiunta manuale */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2
                id="add-item-title"
                className="font-display text-xl font-bold text-stone-900"
              >
                Aggiungi alimento al frigo
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Chiudi finestra aggiunta"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="manual-name"
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                >
                  Nome alimento
                </label>
                <input
                  id="manual-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Es. Mozzarella di Bufala"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manual-qty"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Quantità
                  </label>
                  <input
                    id="manual-qty"
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={(e) =>
                      setNewQty(Math.max(1, parseInt(e.target.value || '1', 10)))
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono tabular-nums text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-unit"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Unità
                  </label>
                  <input
                    id="manual-unit"
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="conf. / pz / L"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manual-shelf"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Ripiano
                  </label>
                  <select
                    id="manual-shelf"
                    value={newShelf}
                    onChange={(e) => setNewShelf(e.target.value as FridgeShelf)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    {(Object.keys(SHELF_META) as FridgeShelf[]).map((s) => (
                      <option key={s} value={s}>
                        {SHELF_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="manual-expiry"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Data scadenza
                  </label>
                  <input
                    id="manual-expiry"
                    type="date"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono tabular-nums text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                >
                  Salva nel frigo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FridgeItemCard({
  item,
  daysLeft,
  status,
  onUpdateQuantity,
  onUpdateExpiry,
  onRemoveItem,
}: {
  item: FridgeItem;
  daysLeft: number;
  status: ExpiryStatus;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateExpiry: (id: string, newDate: string) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [editingDate, setEditingDate] = useState(false);

  const surfaceTint =
    status === 'expired'
      ? 'bg-red-50/50 border-red-200'
      : status === 'urgent'
        ? 'bg-amber-50/50 border-amber-200'
        : 'bg-[#FAF9F6] border-stone-200';

  return (
    <article
      data-testid="fridge-item-card"
      className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${surfaceTint}`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-900 leading-snug">
            {item.name}
          </h3>
          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            aria-label={`Consuma ${item.name}`}
            title="Segna come consumato"
            className="rounded-md p-1 text-stone-400 hover:bg-stone-200/70 hover:text-stone-800 shrink-0 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <StatusBadge status={status} label={formatExpiryLabel(daysLeft)} />
      </div>

      <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-md border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, -1)}
            aria-label={`Diminuisci quantità di ${item.name}`}
            className="px-2 py-1 text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </button>
          <span className="px-2 font-mono text-xs font-medium text-stone-900 tabular-nums">
            {item.quantity} {item.unit}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, 1)}
            aria-label={`Aumenta quantità di ${item.name}`}
            className="px-2 py-1 text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {editingDate ? (
          <input
            type="date"
            aria-label={`Modifica scadenza di ${item.name}`}
            value={item.expiryDate}
            onChange={(e) => {
              if (e.target.value) {
                onUpdateExpiry(item.id, e.target.value);
              }
              setEditingDate(false);
            }}
            onBlur={() => setEditingDate(false)}
            autoFocus
            className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-xs tabular-nums text-stone-900"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDate(true)}
            aria-label={`Cambia data di scadenza per ${item.name}`}
            className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>{item.expiryDate}</span>
          </button>
        )}
      </div>
    </article>
  );
}
