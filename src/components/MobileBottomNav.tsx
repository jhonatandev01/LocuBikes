import { Compass, History, MapPin, QrCode, Wallet } from 'lucide-react';
import type { AppSection } from './Navbar';

interface MobileBottomNavProps {
  activeSection: AppSection;
  hasActiveRide: boolean;
  onNavigate: (section: AppSection) => void;
  onOpenQr: () => void;
}

export function MobileBottomNav({
  activeSection,
  hasActiveRide,
  onNavigate,
  onOpenQr,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navegação inferior do aplicativo"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-5 items-center px-1"
    >
      <button
        type="button"
        onClick={() => onNavigate('mapa')}
        aria-current={activeSection === 'mapa' ? 'page' : undefined}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeSection === 'mapa'
            ? 'text-zinc-900 dark:text-emerald-400 font-semibold'
            : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <MapPin className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px] leading-none tracking-tight">Mapa</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('alugar')}
        aria-current={activeSection === 'alugar' || activeSection === 'reservas' ? 'page' : undefined}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeSection === 'alugar' || activeSection === 'reservas'
            ? 'text-zinc-900 dark:text-emerald-400 font-semibold'
            : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <Compass className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px] leading-none tracking-tight">Explorar</span>
      </button>

      <button
        type="button"
        onClick={onOpenQr}
        aria-label={hasActiveRide ? 'Viagem em andamento' : 'Desbloquear por QR Code'}
        className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold"
      >
        <QrCode className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px] leading-none tracking-tight">
          {hasActiveRide ? 'Em uso' : 'QR Code'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('carteira')}
        aria-current={activeSection === 'carteira' ? 'page' : undefined}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeSection === 'carteira'
            ? 'text-zinc-900 dark:text-emerald-400 font-semibold'
            : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <Wallet className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px] leading-none tracking-tight">Carteira</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('corridas')}
        aria-current={activeSection === 'corridas' ? 'page' : undefined}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeSection === 'corridas'
            ? 'text-zinc-900 dark:text-emerald-400 font-semibold'
            : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <History className="w-5 h-5" aria-hidden="true" />
        <span className="text-[10px] leading-none tracking-tight">Corridas</span>
      </button>
    </nav>
  );
}
