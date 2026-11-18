import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryCharging,
  Bike as BikeIcon,
  CalendarClock,
  CheckCircle2,
  Compass,
  Flame,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  QrCode,
  Timer,
} from 'lucide-react';
import type { Bike, BikeCategory, CustomerAccountState, RideRecord, Station } from '../types/bike';
import {
  calculateRideCost,
  calculateRideStats,
  DEFAULT_USER_COORDS,
  estimateWalkMinutes,
  formatDistanceBR,
  haversineDistanceKm,
  sortStationsByDistance,
} from '../utils/mobility';
import { formatCurrencyBRL } from '../utils/pricing';
import { BikeImage } from './BikeImage';

interface CustomerMapViewProps {
  bikes: Bike[];
  stations: Station[];
  customerAccount: CustomerAccountState;
  onScanQrForBike: (bike?: Bike) => void;
  onRentBikeHourly: (bike: Bike) => void;
  onFinishRide: (rideId: string, endStationId: string, elapsedMinutesOverride: number) => Promise<RideRecord>;
  onOpenWallet: () => void;
  onOpenHistory: () => void;
}

const REFERENCE_POINTS = [
  { label: 'Av. Paulista', lat: -23.5614, lng: -46.6559 },
  { label: 'Jardins', lat: -23.5638, lng: -46.6675 },
  { label: 'Ibirapuera', lat: -23.5831, lng: -46.6582 },
  { label: 'Faria Lima', lat: -23.5704, lng: -46.6872 },
];

const CATEGORIES: ('Todas' | BikeCategory)[] = ['Todas', 'Urbana', 'Elétrica', 'Gravel', 'Estrada'];

// Simplified vector street segments & parks around Paulista / Jardins / Pinheiros / Ibirapuera
const MAJOR_ROADS: [number, number, number, number][] = [
  // Av. Paulista corridor
  [-23.5562, -46.6635, -23.5712, -46.6442],
  // Av. Brig. Faria Lima corridor
  [-23.5610, -46.6952, -23.5920, -46.6801],
  // Av. Rebouças / Consolação
  [-23.5530, -46.6620, -23.5780, -46.6845],
  // Av. Brasil / Pedro Álvares Cabral
  [-23.5680, -46.6820, -23.5880, -46.6480],
  // Av. 23 de Maio / Vergueiro
  [-23.5580, -46.6410, -23.5920, -46.6350],
  // Av. Nove de Julho
  [-23.5535, -46.6540, -23.5875, -46.6710],
  // Rua Oscar Freire
  [-23.5685, -46.6780, -23.5585, -46.6615],
  // Av. República do Líbano
  [-23.5760, -46.6695, -23.5950, -46.6615],
];

const BIKE_LANES: [number, number, number, number][] = [
  [-23.5562, -46.6635, -23.5712, -46.6442], // Ciclovia Paulista
  [-23.5610, -46.6952, -23.5920, -46.6801], // Ciclovia Faria Lima
  [-23.5770, -46.6395, -23.5890, -46.6378], // Ciclovia Vergueiro
  [-23.5815, -46.6625, -23.5862, -46.6535], // Ciclovia Ibirapuera
];

export function CustomerMapView({
  bikes,
  stations,
  customerAccount,
  onScanQrForBike,
  onRentBikeHourly,
  onFinishRide,
  onOpenWallet,
  onOpenHistory,
}: CustomerMapViewProps) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string }>(
    DEFAULT_USER_COORDS
  );
  const [gpsStatus, setGpsStatus] = useState<'padrao' | 'buscando' | 'ativo'>('padrao');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: -23.5705,
    lng: -46.6635,
  });
  const [zoom, setZoom] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | BikeCategory>('Todas');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    stations[0]?.id ?? null
  );
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  // Active ride live timer & completion state
  const activeRide = customerAccount.activeRide;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [endStationId, setEndStationId] = useState<string>(stations[1]?.id || stations[0]?.id || '');
  const [finishingRide, setFinishingRide] = useState(false);
  const [rideFinishError, setRideFinishError] = useState('');
  const [justFinishedRide, setJustFinishedRide] = useState<RideRecord | null>(null);

  // Dragging pan state
  const dragRef = useRef<{ startX: number; startY: number; startLat: number; startLng: number } | null>(
    null
  );

  useEffect(() => {
    if (!activeRide) {
      setElapsedSeconds(0);
      return;
    }
    const updateTick = () => {
      const diffSec = Math.max(
        1,
        Math.floor((Date.now() - new Date(activeRide.startedAt).getTime()) / 1000)
      );
      setElapsedSeconds(diffSec);
    };
    updateTick();
    const timer = window.setInterval(updateTick, 1000);
    return () => window.clearInterval(timer);
  }, [activeRide]);

  useEffect(() => {
    if (!endStationId && stations.length > 0) {
      setEndStationId(stations[0].id);
    }
  }, [stations, endStationId]);

  const handleRequestGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserCoords(DEFAULT_USER_COORDS);
      setMapCenter({ lat: DEFAULT_USER_COORDS.lat, lng: DEFAULT_USER_COORDS.lng });
      setGpsStatus('ativo');
      return;
    }
    setGpsStatus('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // If browser returns coordinates far from São Paulo service zone (e.g. headless datacenter), anchor to Paulista with active status
        const distFromZone = haversineDistanceKm(
          latitude,
          longitude,
          DEFAULT_USER_COORDS.lat,
          DEFAULT_USER_COORDS.lng
        );
        if (distFromZone > 35) {
          setUserCoords({
            lat: DEFAULT_USER_COORDS.lat,
            lng: DEFAULT_USER_COORDS.lng,
            label: 'GPS ativo · Av. Paulista (área de cobertura)',
          });
          setMapCenter({ lat: DEFAULT_USER_COORDS.lat, lng: DEFAULT_USER_COORDS.lng });
        } else {
          setUserCoords({
            lat: latitude,
            lng: longitude,
            label: 'Sua localização atual via GPS',
          });
          setMapCenter({ lat: latitude, lng: longitude });
        }
        setGpsStatus('ativo');
      },
      () => {
        setUserCoords({
          lat: DEFAULT_USER_COORDS.lat,
          lng: DEFAULT_USER_COORDS.lng,
          label: 'Av. Paulista · Centro de referência',
        });
        setMapCenter({ lat: DEFAULT_USER_COORDS.lat, lng: DEFAULT_USER_COORDS.lng });
        setGpsStatus('ativo');
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );
  };

  const handleSelectReference = (pt: { label: string; lat: number; lng: number }) => {
    setUserCoords({ lat: pt.lat, lng: pt.lng, label: `${pt.label} · Referência` });
    setMapCenter({ lat: pt.lat, lng: pt.lng });
    setGpsStatus('ativo');
    const nearest = sortStationsByDistance(stations, pt.lat, pt.lng)[0];
    if (nearest) {
      setSelectedStationId(nearest.id);
      const nearestBike = bikes.find((b) => b.status === 'disponivel' && b.stationId === nearest.id);
      setSelectedBikeId(nearestBike?.id ?? null);
    }
  };

  const sortedStations = useMemo(
    () => sortStationsByDistance(stations, userCoords.lat, userCoords.lng),
    [stations, userCoords]
  );

  const availableBikes = useMemo(() => {
    return bikes
      .filter((b) => {
        if (b.status !== 'disponivel') return false;
        if (categoryFilter !== 'Todas' && b.category !== categoryFilter) return false;
        return true;
      })
      .map((bike) => {
        const lat = bike.lat ?? DEFAULT_USER_COORDS.lat;
        const lng = bike.lng ?? DEFAULT_USER_COORDS.lng;
        const distanceKm = haversineDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
        return {
          ...bike,
          distanceKm,
          walkMinutes: estimateWalkMinutes(distanceKm),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [bikes, categoryFilter, userCoords]);

  const selectedStation = useMemo(
    () => sortedStations.find((s) => s.id === selectedStationId) ?? sortedStations[0] ?? null,
    [sortedStations, selectedStationId]
  );

  const selectedBike = useMemo(() => {
    if (selectedBikeId) {
      return availableBikes.find((b) => b.id === selectedBikeId) ?? null;
    }
    if (selectedStation) {
      return availableBikes.find((b) => b.stationId === selectedStation.id) ?? availableBikes[0] ?? null;
    }
    return availableBikes[0] ?? null;
  }, [availableBikes, selectedBikeId, selectedStation]);

  // Project lat/lng onto 800x520 SVG map viewport
  const MAP_W = 800;
  const MAP_H = 520;
  const project = (lat: number, lng: number) => {
    const scaleLng = 11500 * zoom;
    const scaleLat = 12800 * zoom;
    const x = MAP_W / 2 + (lng - mapCenter.lng) * scaleLng;
    const y = MAP_H / 2 - (lat - mapCenter.lat) * scaleLat;
    return { x, y };
  };

  const activeBike = activeRide ? bikes.find((b) => b.id === activeRide.bikeId) : undefined;
  const simulatedRideMinutes = Math.max(12, Math.ceil(elapsedSeconds / 60));
  const liveRideCost = activeRide
    ? calculateRideCost({
        hourlyRate: activeBike?.hourlyRate ?? 32,
        elapsedMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        billingMode: activeRide.billingMode,
        freeMinutesIncluded: customerAccount.activeSubscription?.freeMinutesPerRide,
        extraMinuteDiscountPct: customerAccount.activeSubscription?.extraMinuteDiscountPct,
        paymentMethod: activeRide.paymentMethod,
      })
    : 0;
  const liveRideStats = activeRide
    ? calculateRideStats({
        durationMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        category: activeRide.bikeCategory,
      })
    : null;

  const formatChronometer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndActiveRide = async () => {
    if (!activeRide) return;
    setFinishingRide(true);
    setRideFinishError('');
    try {
      const finished = await onFinishRide(
        activeRide.id,
        endStationId || stations[0]?.id || 'st-paulista',
        simulatedRideMinutes
      );
      setJustFinishedRide(finished);
    } catch (err) {
      setRideFinishError(err instanceof Error ? err.message : 'Erro ao encerrar viagem.');
    } finally {
      setFinishingRide(false);
    }
  };

  const userPoint = project(userCoords.lat, userCoords.lng);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      {/* Live Active Ride Banner */}
      {activeRide && (
        <section
          aria-label="Viagem em andamento"
          className="bg-zinc-900 dark:bg-zinc-900 text-white border border-zinc-800 dark:border-emerald-700/60 rounded-2xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                Viagem em andamento · {activeRide.bikeCode}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-white">
                {activeRide.bikeBrand} {activeRide.bikeModel}
              </h2>
              <p className="text-xs text-zinc-400">
                Retirada em {activeRide.stationStartName} ·{' '}
                {activeRide.billingMode === 'assinatura'
                  ? `Coberto pelo ${customerAccount.activeSubscription?.planName ?? 'Passe Mensal'}`
                  : `Cobrança por tempo de uso (${activeRide.paymentMethod.toUpperCase()})`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800">
              <div>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" aria-hidden="true" />
                  Tempo
                </p>
                <p className="mt-0.5 font-mono text-lg sm:text-xl font-semibold tabular-nums">
                  {formatChronometer(elapsedSeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  Calorias
                </p>
                <p className="mt-0.5 font-mono text-lg sm:text-xl font-semibold tabular-nums">
                  {liveRideStats?.caloriesBurned ?? 8} kcal
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">Parcial</p>
                <p className="mt-0.5 font-mono text-lg sm:text-xl font-semibold text-emerald-400 tabular-nums">
                  {formatCurrencyBRL(liveRideCost)}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <label
                htmlFor="end-station-select"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Estação de devolução
              </label>
              <select
                id="end-station-select"
                value={endStationId}
                onChange={(e) => setEndStationId(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-400"
              >
                {sortedStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({formatDistanceBR(st.distanceKm)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={finishingRide}
              onClick={handleEndActiveRide}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              {finishingRide ? 'Encerrando...' : 'Encerrar viagem e travar bike'}
            </button>
          </div>

          {rideFinishError && (
            <p role="alert" className="text-xs text-red-400">
              {rideFinishError}
            </p>
          )}
        </section>
      )}

      {/* Completed Ride Summary Card */}
      {justFinishedRide && !activeRide && (
        <section
          aria-label="Resumo da corrida concluída"
          className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Viagem concluída com sucesso · {justFinishedRide.bikeModel}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                {justFinishedRide.durationMinutes} min · {justFinishedRide.distanceKm.toFixed(1).replace('.', ',')} km ·{' '}
                {justFinishedRide.caloriesBurned} kcal queimadas · Total pago:{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatCurrencyBRL(justFinishedRide.amountPaid)}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenHistory}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Ver histórico
            </button>
            <button
              type="button"
              onClick={() => setJustFinishedRide(null)}
              className="min-h-[44px] px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Dispensar
            </button>
          </div>
        </section>
      )}

      {/* Top Quick Context Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{userCoords.label}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{availableBikes.length} bikes prontas perto de você</span>
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 [text-wrap:balance]">
            Encontre e desbloqueie sua próxima bike
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenWallet}
            className="min-h-[44px] px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors tabular-nums whitespace-nowrap"
          >
            Carteira: <strong className="text-zinc-900 dark:text-zinc-50">{formatCurrencyBRL(customerAccount.walletBalance)}</strong>
          </button>

          <button
            type="button"
            onClick={handleRequestGps}
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors whitespace-nowrap"
          >
            <LocateFixed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {gpsStatus === 'buscando' ? 'Localizando...' : 'Minha localização'}
          </button>

          <button
            type="button"
            onClick={() => onScanQrForBike(selectedBike ?? undefined)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-emerald-500 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-400 transition-colors whitespace-nowrap"
          >
            <QrCode className="w-4 h-4" aria-hidden="true" />
            Desbloquear QR Code
          </button>
        </div>
      </div>

      {/* Category filter + Quick GPS anchor buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl w-fit max-w-full overflow-x-auto"
          role="tablist"
          aria-label="Filtrar mapa por categoria"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mr-1">
            Mover ponto GPS:
          </span>
          {REFERENCE_POINTS.map((pt) => (
            <button
              key={pt.label}
              type="button"
              onClick={() => handleSelectReference(pt)}
              className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors whitespace-nowrap shrink-0"
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive Map (left 8 cols) + Nearest Stations & Bikes List (right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Interactive Map Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div
            data-testid="interactive-bike-map"
            className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-[#eef1ee] dark:bg-[#111615] select-none touch-none"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startLat: mapCenter.lat,
                startLng: mapCenter.lng,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current) return;
              const dx = e.clientX - dragRef.current.startX;
              const dy = e.clientY - dragRef.current.startY;
              setMapCenter({
                lat: dragRef.current.startLat + dy / (12800 * zoom),
                lng: dragRef.current.startLng - dx / (11500 * zoom),
              });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerLeave={() => {
              dragRef.current = null;
            }}
          >
            {/* Vector Street Grid + Parks + Ciclovias */}
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              {/* Subtle city block grid */}
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 65}
                  y1={0}
                  x2={i * 65}
                  y2={MAP_H}
                  className="stroke-zinc-300/45 dark:stroke-zinc-800/70"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * 65}
                  x2={MAP_W}
                  y2={i * 65}
                  className="stroke-zinc-300/45 dark:stroke-zinc-800/70"
                  strokeWidth="1"
                />
              ))}

              {/* Parque Ibirapuera & Trianon green areas */}
              {(() => {
                const ibira = project(-23.5875, -46.6578);
                const trianon = project(-23.5621, -46.6572);
                return (
                  <>
                    <ellipse
                      cx={ibira.x}
                      cy={ibira.y}
                      rx={86 * zoom}
                      ry={58 * zoom}
                      className="fill-emerald-200/55 dark:fill-emerald-950/55 stroke-emerald-300 dark:stroke-emerald-800/60"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={trianon.x - 26 * zoom}
                      y={trianon.y - 16 * zoom}
                      width={52 * zoom}
                      height={32 * zoom}
                      rx="6"
                      className="fill-emerald-200/55 dark:fill-emerald-950/55"
                    />
                  </>
                );
              })()}

              {/* Major Avenues */}
              {MAJOR_ROADS.map(([lat1, lng1, lat2, lng2], idx) => {
                const p1 = project(lat1, lng1);
                const p2 = project(lat2, lng2);
                return (
                  <line
                    key={`rd-${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className="stroke-white dark:stroke-zinc-800"
                    strokeWidth={8 * Math.min(1.4, zoom)}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Dedicated Bike Lanes (Ciclovias) */}
              {BIKE_LANES.map(([lat1, lng1, lat2, lng2], idx) => {
                const p1 = project(lat1, lng1);
                const p2 = project(lat2, lng2);
                return (
                  <line
                    key={`bl-${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className="stroke-emerald-500/75 dark:stroke-emerald-400/70"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Geolocation proximity ring around user */}
              <circle
                cx={userPoint.x}
                cy={userPoint.y}
                r={125 * zoom}
                className="fill-emerald-500/5 stroke-emerald-500/35 dark:stroke-emerald-400/30"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </svg>

            {/* User GPS Marker */}
            <div
              style={{
                left: `${(userPoint.x / MAP_W) * 100}%`,
                top: `${(userPoint.y / MAP_H) * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
              aria-hidden="true"
            >
              <span className="absolute -inset-2.5 rounded-full bg-blue-500/20" />
              <span className="relative block w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-950 shadow-md" />
            </div>

            {/* Station Pins */}
            {sortedStations.map((station) => {
              const pt = project(station.lat, station.lng);
              const leftPct = (pt.x / MAP_W) * 100;
              const topPct = (pt.y / MAP_H) * 100;
              if (leftPct < 6 || leftPct > 94 || topPct < 10 || topPct > 90) return null;

              const stationBikes = availableBikes.filter((b) => b.stationId === station.id);
              const isSelected = selectedStation?.id === station.id;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => {
                    setSelectedStationId(station.id);
                    setSelectedBikeId(stationBikes[0]?.id ?? null);
                  }}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  aria-label={`${station.name}, ${stationBikes.length} bicicletas disponíveis, a ${formatDistanceBR(station.distanceKm)}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 min-h-[40px] px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-2 transition-transform hover:scale-105 ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-emerald-500 text-white dark:text-zinc-950 border-zinc-900 dark:border-emerald-400 scale-105'
                      : 'bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <BikeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold tabular-nums">{stationBikes.length}</span>
                  <span className="hidden sm:inline text-[11px] font-medium max-w-[110px] truncate">
                    {station.neighborhood}
                  </span>
                </button>
              );
            })}

            {/* Map Legend & Zoom Controls */}
            <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                Você
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500" aria-hidden="true" />
                Ciclovia
              </span>
            </div>

            <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
              <button
                type="button"
                aria-label="Aproximar mapa"
                onClick={() => setZoom((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
                className="w-11 h-11 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Afastar mapa"
                onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                className="w-11 h-11 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selected Bike / Station Spotlight Card */}
          {selectedBike ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden shrink-0">
                <BikeImage
                  src={selectedBike.imageUrl}
                  alt={`${selectedBike.brand} ${selectedBike.model}`}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {selectedBike.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedBike.stationName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                    {formatDistanceBR(selectedBike.distanceKm)} ({selectedBike.walkMinutes} min a pé)
                  </span>
                </div>

                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {selectedBike.brand} {selectedBike.model}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>
                    Por uso: {formatCurrencyBRL(selectedBike.hourlyRate / 60)}/min (+ R$ 2,50 desbloqueio)
                  </span>
                  {selectedBike.batteryPercent !== undefined && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                      <BatteryCharging className="w-3.5 h-3.5" aria-hidden="true" />
                      Bateria {selectedBike.batteryPercent}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onScanQrForBike(selectedBike)}
                  className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-emerald-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-emerald-300 transition-colors whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                  Desbloquear QR
                </button>
                <button
                  type="button"
                  onClick={() => onRentBikeHourly(selectedBike)}
                  className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors whitespace-nowrap"
                >
                  <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                  Reservar hora/dia
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhuma bicicleta disponível nesta estação para a categoria selecionada. Escolha outra
              estação ou limpe o filtro.
            </div>
          )}
        </div>

        {/* Nearby Stations & Bikes List */}
        <aside
          aria-label="Estações e bicicletas mais próximas"
          className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 max-h-[640px] overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Mais próximas agora
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ordenadas por distância em tempo real
              </p>
            </div>
            <Navigation className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedStations.map((station) => {
              const stationBikes = availableBikes.filter((b) => b.stationId === station.id);
              const isSelected = selectedStation?.id === station.id;

              return (
                <div key={station.id} className="py-3.5 first:pt-1 last:pb-1 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStationId(station.id);
                      setSelectedBikeId(stationBikes[0]?.id ?? null);
                      setMapCenter({ lat: station.lat, lng: station.lng });
                    }}
                    className={`w-full text-left rounded-xl p-2.5 transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800/80'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        {station.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {station.address}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatDistanceBR(station.distanceKm)}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {stationBikes.length} {stationBikes.length === 1 ? 'bike' : 'bikes'}
                      </p>
                    </div>
                  </button>

                  {isSelected && stationBikes.length > 0 && (
                    <div className="pl-2 space-y-1.5">
                      {stationBikes.map((bike) => (
                        <div
                          key={bike.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedBikeId(bike.id)}
                            className="text-left min-w-0 flex-1"
                          >
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {bike.code} · {bike.model}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {bike.category} · {formatCurrencyBRL(bike.hourlyRate)}/h
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => onScanQrForBike(bike)}
                            className="min-h-[36px] px-3 py-1.5 text-[11px] font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors shrink-0"
                          >
                            QR
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
