import { AppTab } from '../types/fridge';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  alertCount: number;
}

export function Header({ activeTab, onSelectTab, alertCount }: HeaderProps) {
  const navItems: { id: AppTab; label: string }[] = [
    { id: 'frigo', label: 'Frigorifero' },
    { id: 'scansiona', label: 'Scansiona' },
    { id: 'ricette', label: 'Ricette' },
    {
      id: 'avvisi',
      label: alertCount > 0 ? `Avvisi (${alertCount})` : 'Avvisi',
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FAF9F6]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-2.5 sm:py-3.5 sm:px-6">
        {/* Zona 1: Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('frigo')}
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 cursor-pointer"
        >
          FrigoVivo
        </button>

        {/* Zona 2: Navigazione testuale pulita */}
        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
                  isActive
                    ? 'text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-amber-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zona 3: 1 azione primaria */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('scansiona')}
            className="rounded-lg bg-amber-600 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            Scansiona scontrino
          </button>
        </div>
      </div>

      {/* Navigazione compatta mobile */}
      <nav
        aria-label="Navigazione mobile"
        className="flex md:hidden items-center justify-around border-t border-stone-200 bg-[#FAF9F6] px-2 py-1 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`px-2 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'text-amber-700 font-semibold underline decoration-2 underline-offset-4'
                  : 'text-stone-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
