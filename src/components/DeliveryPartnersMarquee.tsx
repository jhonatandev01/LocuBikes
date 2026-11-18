import { useState } from 'react';
import { ArrowRight, Bike as BikeIcon } from 'lucide-react';
import type { BikeCategory } from '../types/bike';

export interface DeliveryPartnerApp {
  id: string;
  name: string;
  shortMark: string;
  logoSrc?: string;
  logoFit?: 'cover' | 'contain';
  accentBg: string;
  accentText: string;
  segment: string;
  recommendedCategory: BikeCategory;
  routeProfile: string;
  tip: string;
}

const DELIVERY_APPS: DeliveryPartnerApp[] = [
  {
    id: 'ifood',
    name: 'iFood Entregador',
    shortMark: 'iF',
    logoSrc: '/assets/aistudio/image_5d05786d.png',
    logoFit: 'cover',
    accentBg: '#9B1C1C',
    accentText: '#FFFFFF',
    segment: 'Restaurantes e mercados',
    recommendedCategory: 'Elétrica',
    routeProfile: 'Rotas médias de 2 a 6 km · Alta frequência no almoço e jantar',
    tip: 'Bikes elétricas mantêm ritmo estável em subidas sem fadiga com bag térmica.',
  },
  {
    id: 'rappi',
    name: 'Rappi Entregador',
    shortMark: 'Ra',
    logoSrc: '/assets/aistudio/image_0378a381.png',
    logoFit: 'cover',
    accentBg: '#FF3B4E',
    accentText: '#FFFFFF',
    segment: 'Turbo 10 min e farmácias',
    recommendedCategory: 'Urbana',
    routeProfile: 'Coletas rápidas entre bairros centrais e jardins',
    tip: 'Modelos urbanos leves agilizam entradas em ciclovias e cruzamentos.',
  },
  {
    id: 'uber',
    name: 'Uber Direct & Eats',
    shortMark: 'Ue',
    logoSrc: '/assets/aistudio/image_df4ea234.png',
    logoFit: 'cover',
    accentBg: '#06C167',
    accentText: '#09090B',
    segment: 'Comércio local e express',
    recommendedCategory: 'Elétrica',
    routeProfile: 'Pedidos ponto a ponto em corredores comerciais',
    tip: 'Autonomia de até 75 km para cobrir turnos completos sem recarga.',
  },
  {
    id: 'lalamove',
    name: 'Lalamove Bike',
    shortMark: 'La',
    logoSrc: '/assets/aistudio/image_ba5800dd.png',
    logoFit: 'cover',
    accentBg: '#F26722',
    accentText: '#FFFFFF',
    segment: 'Documentos e pacotes leves',
    recommendedCategory: 'Urbana',
    routeProfile: 'Entregas corporativas entre Av. Paulista e Faria Lima',
    tip: 'Suporte para celular no guidão e trava U-Lock facilitam paradas frequentes.',
  },
  {
    id: 'loggi',
    name: 'Loggi Última Milha',
    shortMark: 'Lg',
    logoSrc: '/assets/aistudio/image_48412c98.png',
    logoFit: 'contain',
    accentBg: '#00BAFF',
    accentText: '#FFFFFF',
    segment: 'E-commerce e envelopes',
    recommendedCategory: 'Gravel',
    routeProfile: 'Pequenos lotes em vias mistas e ciclovias de bairro',
    tip: 'Pneus largos absorvem buracos e paralelepípedos mantendo estabilidade.',
  },
  {
    id: 'zedelivery',
    name: 'Zé Delivery',
    shortMark: 'Zé',
    accentBg: '#F59E0B',
    accentText: '#09090B',
    segment: 'Bebidas e conveniência',
    recommendedCategory: 'Elétrica',
    routeProfile: 'Entregas noturnas e fins de semana em raios curtos',
    tip: 'Assistência elétrica ajuda no transporte de carga pesada na bag.',
  },
  {
    id: '99entrega',
    name: '99Entrega Bike',
    shortMark: '99',
    accentBg: '#FACC15',
    accentText: '#09090B',
    segment: 'Encomendas urbanas',
    recommendedCategory: 'Urbana',
    routeProfile: 'Envios rápidos sob demanda na zona expandida',
    tip: 'Diárias econômicas com manutenção preventiva inclusa pela LocuBikes.',
  },
];

interface DeliveryPartnersMarqueeProps {
  onSelectCategory?: (category: BikeCategory) => void;
  onOpenPlans?: () => void;
}

export function DeliveryPartnersMarquee({
  onSelectCategory,
  onOpenPlans,
}: DeliveryPartnersMarqueeProps) {
  const [selectedApp, setSelectedApp] = useState<DeliveryPartnerApp>(DELIVERY_APPS[0]);

  const trackItems = [...DELIVERY_APPS, ...DELIVERY_APPS];

  return (
    <section
      aria-label="Aplicativos de entrega compatíveis com bicicleta"
      className="relative rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 card-elevated p-5 sm:p-7 overflow-hidden space-y-5"
    >
      {/* Subtle atmospheric blur accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-emerald-400/12 dark:bg-emerald-500/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-purple-500/10 dark:bg-purple-600/10 blur-2xl"
      />

      <div className="relative space-y-1">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 [text-wrap:balance]">
          Aplicativos de entrega para rodar de bike
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Alugue por diária, turno ou assinatura mensal e trabalhe nos principais apps sem custo
          de combustível.
        </p>
      </div>

      {/* Continuous Compositor-Only Moving Carousel */}
      <div
        className="relative overflow-hidden -mx-1 px-1 py-1.5 locu-marquee-container"
        style={{ contain: 'layout paint' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent"
        />
        <div className="locu-marquee-track gap-3.5">
          {trackItems.map((app, index) => {
            const isSelected = selectedApp.id === app.id;
            return (
              <button
                key={`${app.id}-${index}`}
                type="button"
                onClick={() => setSelectedApp(app)}
                className={`min-w-[235px] sm:min-w-[260px] p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3.5 shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-950 border-zinc-900 dark:border-emerald-400 shadow-[0_12px_28px_-10px_rgba(9,9,11,0.18)]'
                    : 'bg-white/90 dark:bg-zinc-950/70 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs'
                }`}
              >
                <div
                  style={{ backgroundColor: app.accentBg, color: app.accentText }}
                  className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-display font-bold text-sm tracking-tight shrink-0 shadow-sm border border-black/5 dark:border-white/10"
                  aria-hidden="true"
                >
                  {app.logoSrc ? (
                    <img
                      src={app.logoSrc}
                      alt=""
                      loading="lazy"
                      className={`w-full h-full ${
                        app.logoFit === 'contain' ? 'object-contain px-0.5' : 'object-cover'
                      }`}
                    />
                  ) : (
                    app.shortMark
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {app.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {app.segment}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Bike {app.recommendedCategory}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected App Operational Spotlight */}
      <div className="relative p-4 sm:p-5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-950/75 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            style={{ backgroundColor: selectedApp.accentBg, color: selectedApp.accentText }}
            className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-xs border border-black/5 dark:border-white/10"
            aria-hidden="true"
          >
            {selectedApp.logoSrc ? (
              <img
                src={selectedApp.logoSrc}
                alt=""
                className={`w-full h-full ${
                  selectedApp.logoFit === 'contain' ? 'object-contain px-0.5' : 'object-cover'
                }`}
              />
            ) : (
              selectedApp.shortMark
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedApp.name}
              </h3>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                ·
              </span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Categoria recomendada: {selectedApp.recommendedCategory}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {selectedApp.routeProfile}. {selectedApp.tip}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSelectCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory(selectedApp.recommendedCategory)}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-emerald-400 hover:bg-zinc-800 dark:hover:bg-emerald-300 rounded-xl transition-colors whitespace-nowrap"
            >
              <BikeIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Ver bikes {selectedApp.recommendedCategory}
            </button>
          )}
          {onOpenPlans && (
            <button
              type="button"
              onClick={onOpenPlans}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl transition-colors whitespace-nowrap"
            >
              Assinar passe
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
