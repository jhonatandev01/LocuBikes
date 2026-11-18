import { useMemo, useState } from 'react';
import { Award, Flame, Leaf, MapPin, Route, Timer } from 'lucide-react';
import type { RideBillingMode, RideRecord } from '../types/bike';
import { getRiderLevel } from '../utils/mobility';
import { formatCurrencyBRL } from '../utils/pricing';
import { BikeImage } from './BikeImage';

interface RideHistoryViewProps {
  rides: RideRecord[];
  onGoToMap: () => void;
}

export function RideHistoryView({ rides, onGoToMap }: RideHistoryViewProps) {
  const [filterMode, setFilterMode] = useState<'todas' | RideBillingMode>('todas');

  const totals = useMemo(() => {
    const totalKm = rides.reduce((acc, r) => acc + r.distanceKm, 0);
    const totalMinutes = rides.reduce((acc, r) => acc + r.durationMinutes, 0);
    const totalCalories = rides.reduce((acc, r) => acc + r.caloriesBurned, 0);
    const totalCo2 = rides.reduce((acc, r) => acc + r.co2SavedKg, 0);
    const totalSpent = rides.reduce((acc, r) => acc + r.amountPaid, 0);
    return {
      totalKm: Math.round(totalKm * 10) / 10,
      totalMinutes,
      totalCalories,
      totalCo2: Math.round(totalCo2 * 10) / 10,
      totalSpent,
    };
  }, [rides]);

  const levelInfo = useMemo(() => getRiderLevel(totals.totalKm), [totals.totalKm]);

  const filteredRides = useMemo(() => {
    if (filterMode === 'todas') return rides;
    return rides.filter((r) => r.billingMode === filterMode);
  }, [rides, filterMode]);

  const achievements = [
    {
      label: 'Primeira Pedalada',
      detail: '1+ corrida concluída',
      unlocked: rides.length >= 1,
    },
    {
      label: '20 km na Cidade',
      detail: '20 km acumulados',
      unlocked: totals.totalKm >= 20,
    },
    {
      label: 'Queima Ativa',
      detail: '500+ kcal gastas',
      unlocked: totals.totalCalories >= 500,
    },
    {
      label: 'Ar Mais Limpo',
      detail: '4+ kg de CO₂ evitados',
      unlocked: totals.totalCo2 >= 4,
    },
  ];

  const methodText = (method: RideRecord['paymentMethod']) => {
    if (method === 'carteira') return 'Carteira Digital';
    if (method === 'pix') return 'PIX';
    if (method === 'nupay') return 'NuPay (Nubank)';
    if (method === 'cartao') return 'Cartão';
    return 'Assinatura Mensal';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Histórico de Corridas
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Acompanhe sua evolução em quilômetros percorridos, calorias e economia de emissões.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToMap}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
        >
          Iniciar nova corrida
        </button>
      </div>

      {/* Light Gamification Card */}
      <section
        aria-label="Nível e conquistas do ciclista"
        className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-6 space-y-5 card-elevated"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" aria-hidden="true" />
              Nível de mobilidade
            </p>
            <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {levelInfo.levelName}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {levelInfo.nextLevelName
                ? `Faltam ${levelInfo.kmRemaining.toFixed(1).replace('.', ',')} km para alcançar ${levelInfo.nextLevelName}`
                : 'Nível máximo alcançado na plataforma'}
            </p>
          </div>

          <div className="w-full md:w-72 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
              <span>Progresso do nível</span>
              <span className="font-semibold">{levelInfo.progressPct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {achievements.map((item) => (
            <div
              key={item.label}
              className={`p-3 rounded-xl border ${
                item.unlocked
                  ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 opacity-60'
              }`}
            >
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {item.unlocked ? `Conquistado · ${item.detail}` : item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" aria-hidden="true" />
            Distância total
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {totals.totalKm.toFixed(1).replace('.', ',')} km
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" aria-hidden="true" />
            Tempo pedalado
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {totals.totalMinutes} min
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Calorias gastas
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {totals.totalCalories} kcal
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            CO₂ evitado
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {totals.totalCo2.toFixed(1).replace('.', ',')} kg
          </p>
        </div>
      </div>

      {/* Filter Tabs & Ride List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl w-fit"
            role="tablist"
            aria-label="Filtrar corridas por modalidade"
          >
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'tempo', label: 'Por tempo' },
                { id: 'assinatura', label: 'Assinatura' },
              ] as { id: 'todas' | RideBillingMode; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filterMode === tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Total gasto: <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrencyBRL(totals.totalSpent)}</strong>
          </p>
        </div>

        {filteredRides.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-2">
            <p className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Nenhuma corrida nesta modalidade ainda
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Desbloqueie uma bike pelo QR Code no mapa para registrar sua próxima viagem.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRides.map((ride) => (
              <article
                key={ride.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 card-elevated card-lift"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0">
                    <BikeImage src={ride.bikeImageUrl} alt={`${ride.bikeBrand} ${ride.bikeModel}`} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(ride.startedAt).toLocaleDateString('pt-BR')} · {ride.bikeCode} ·{' '}
                      {methodText(ride.paymentMethod)}
                    </p>
                    <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {ride.bikeBrand} {ride.bikeModel}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      {ride.stationStartName} → {ride.stationEndName || ride.stationStartName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:flex sm:items-center gap-4 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800 shrink-0">
                  <div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Distância</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {ride.distanceKm.toFixed(1).replace('.', ',')} km
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Tempo</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {ride.durationMinutes} min
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Calorias</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                      {ride.caloriesBurned} kcal
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Valor</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                      {formatCurrencyBRL(ride.amountPaid)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
