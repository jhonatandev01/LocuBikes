import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { Bike, BikeCategory } from '../types/bike';
import { formatCurrencyBRL } from '../utils/pricing';
import { HERO_IMAGE_URL } from '../utils/imagePresets';
import { BikeImage } from './BikeImage';
import { DeliveryPartnersMarquee } from './DeliveryPartnersMarquee';

interface StorefrontViewProps {
  bikes: Bike[];
  onRentBike: (bike: Bike) => void;
  onOpenReservations?: () => void;
  onOpenWallet?: () => void;
}

const CATEGORIES: ('Todas' | BikeCategory)[] = ['Todas', 'Urbana', 'Elétrica', 'Gravel', 'Estrada'];

export function StorefrontView({
  bikes,
  onRentBike,
  onOpenReservations,
  onOpenWallet,
}: StorefrontViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | BikeCategory>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const availableCount = useMemo(
    () => bikes.filter((b) => b.status === 'disponivel').length,
    [bikes]
  );

  const lowestHourly = useMemo(() => {
    if (bikes.length === 0) return 0;
    return Math.min(...bikes.map((b) => b.hourlyRate));
  }, [bikes]);

  const filteredBikes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bikes.filter((bike) => {
      if (selectedCategory !== 'Todas' && bike.category !== selectedCategory) return false;
      if (onlyAvailable && bike.status !== 'disponivel') return false;
      if (!q) return true;
      return (
        bike.model.toLowerCase().includes(q) ||
        bike.brand.toLowerCase().includes(q) ||
        bike.specs.toLowerCase().includes(q) ||
        bike.code.toLowerCase().includes(q)
      );
    });
  }, [bikes, selectedCategory, onlyAvailable, searchQuery]);

  const statusLabel = (status: Bike['status']) => {
    if (status === 'disponivel') return 'Disponível';
    if (status === 'alugada') return 'Alugada';
    return 'Em manutenção';
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Section 1: Minimalist Editorial Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-10 w-80 h-80 rounded-full bg-emerald-400/12 dark:bg-emerald-500/10 blur-3xl"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                Aluguel de bicicletas por hora ou diária
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.08] [text-wrap:balance]">
                Mobilidade precisa para cada trajeto.
              </h1>
              <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md">
                Escolha entre modelos urbanos, elétricos, gravel e de estrada revisados antes de cada
                retirada. Reserva imediata com Pix, cartão ou NuPay.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#catalogo"
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Explorar modelos
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                {onOpenReservations && (
                  <button
                    type="button"
                    onClick={onOpenReservations}
                    className="min-h-[44px] inline-flex items-center px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Minhas reservas
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="h-full min-h-[260px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 card-elevated">
                <img
                  src={HERO_IMAGE_URL}
                  alt="Bicicleta urbana minimalista preta apoiada em parede arquitetônica de concreto"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column summary strip directly below hero split */}
          <div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Frota ativa</p>
              <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {bikes.length} unidades
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Prontas para retirada</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {availableCount} disponíveis
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">A partir de</p>
              <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {formatCurrencyBRL(lowestHourly)}/h
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Condição Pix</p>
              <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                5% de desconto
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Moving Delivery Apps Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DeliveryPartnersMarquee
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenPlans={onOpenWallet}
        />
      </div>

      {/* Section 2: Catalog & Filters */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Modelos disponíveis para aluguel
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Capacete e trava U-Lock incluídos em todas as locações. Desconto automático de 10% a
              partir de 3 diárias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search
                className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="catalog-search" className="sr-only">
                Buscar bicicleta por modelo ou marca
              </label>
              <input
                id="catalog-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo ou marca..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>

            <label className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 accent-zinc-900 dark:accent-emerald-500 rounded"
              />
              Apenas disponíveis
            </label>
          </div>
        </div>

        {/* Category segmented control */}
        <div
          className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg w-fit max-w-full overflow-x-auto"
          role="tablist"
          aria-label="Filtrar por categoria"
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Bike Grid */}
        {filteredBikes.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center space-y-3">
            <p className="font-display text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Nenhuma bicicleta encontrada
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ajuste os filtros de categoria ou disponibilidade para visualizar outras unidades.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Todas');
                setSearchQuery('');
                setOnlyAvailable(false);
              }}
              className="mt-2 inline-flex items-center px-4 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredBikes.map((bike) => {
              const isAvailable = bike.status === 'disponivel';
              return (
                <article
                  key={bike.id}
                  data-testid={`bike-card-${bike.id}`}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col card-elevated card-lift hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <BikeImage src={bike.imageUrl} alt={`${bike.brand} ${bike.model}`} />

                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="truncate">
                          {bike.brand} · {bike.category} · Quadro {bike.frameSize}
                        </span>
                        <span
                          className={`font-medium shrink-0 ${
                            isAvailable
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : bike.status === 'alugada'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {statusLabel(bike.status)}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {bike.model}
                      </h3>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {bike.specs}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                          {formatCurrencyBRL(bike.hourlyRate)}
                          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                            /hora
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                          Diária {formatCurrencyBRL(bike.dailyRate)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => onRentBike(bike)}
                        aria-label={
                          isAvailable
                            ? `Alugar ${bike.model}`
                            : `${bike.model} indisponível (${statusLabel(bike.status)})`
                        }
                        className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          isAvailable
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {isAvailable ? 'Alugar' : statusLabel(bike.status)}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
