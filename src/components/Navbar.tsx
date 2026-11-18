import { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';

export type AppSection =
  | 'mapa'
  | 'alugar'
  | 'reservas'
  | 'carteira'
  | 'corridas'
  | 'frota'
  | 'pagamentos';
export type ThemeMode = 'light' | 'dark';

interface NavbarProps {
  isCompanyMode: boolean;
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const CUSTOMER_NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'alugar', label: 'Explorar' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'corridas', label: 'Corridas' },
];

const COMPANY_NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'frota', label: 'Frota' },
  { id: 'reservas', label: 'Locações' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'alugar', label: 'Vitrine' },
];

export function Navbar({
  isCompanyMode,
  activeSection,
  onNavigate,
  onPrimaryAction,
  primaryActionLabel,
  theme,
  onToggleTheme,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = isCompanyMode ? COMPANY_NAV_ITEMS : CUSTOMER_NAV_ITEMS;

  const handleSelect = (section: AppSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Linked LocuBikes logo */}
        <button
          type="button"
          onClick={() => handleSelect(isCompanyMode ? 'frota' : 'mapa')}
          aria-label="LocuBikes — Ir para início"
          className="h-9 md:h-10 w-32 md:w-36 overflow-hidden flex items-center shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
        >
          <img
            src="/assets/aistudio/image_764752a4_836e0011.jpg"
            alt="LocuBikes"
            className="w-full h-full object-cover object-center dark:invert dark:hue-rotate-180 dark:mix-blend-screen"
          />
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Navegação principal">
          {navItems.map((item) => {
            const isActive =
              activeSection === item.id ||
              (!isCompanyMode && item.id === 'alugar' && activeSection === 'reservas');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-zinc-900 dark:bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Switch + Primary Action */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="inline-flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onPrimaryAction}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
          >
            {primaryActionLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Navegação móvel"
          className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 flex flex-col gap-1"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {!isCompanyMode && (
            <button
              type="button"
              onClick={() => handleSelect('reservas')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'reservas'
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Minhas Reservas
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onPrimaryAction();
            }}
            className="mt-2 w-full px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            {primaryActionLabel}
          </button>
        </nav>
      )}
    </header>
  );
}
