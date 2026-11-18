import type { BikeCategory, RideBillingMode, Station } from '../types/bike';
import { roundCurrency } from './pricing';

export const UNLOCK_FEE_BRL = 2.5;

export const DEFAULT_USER_COORDS = {
  lat: -23.5614,
  lng: -46.6559,
  label: 'Av. Paulista · São Paulo',
};

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function formatDistanceBR(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(10, Math.round(distanceKm * 1000))} m`;
  }
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

export function estimateWalkMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 4.8) * 60));
}

export function parseBikeQrCode(rawInput: string): string | null {
  const cleaned = (rawInput || '').trim().toUpperCase();
  if (!cleaned) return null;

  // Accept URLs like https://locubikes.com.br/qr/LOC-01 or LOCUBIKE-LOC-01 or LOC-01
  const urlMatch = /\/([A-Z]{2,5}-\d{1,4})\/?$/.exec(cleaned);
  if (urlMatch) return urlMatch[1];

  const prefixMatch = /^LOCUBIKE-([A-Z]{2,5}-\d{1,4})$/.exec(cleaned);
  if (prefixMatch) return prefixMatch[1];

  const directMatch = /^([A-Z]{2,5}-\d{1,4})$/.exec(cleaned);
  if (directMatch) return directMatch[1];

  return null;
}

export function calculateRideCost(params: {
  hourlyRate: number;
  elapsedMinutes: number;
  billingMode: RideBillingMode;
  freeMinutesIncluded?: number;
  extraMinuteDiscountPct?: number;
  paymentMethod: 'carteira' | 'pix' | 'cartao' | 'assinatura';
}): number {
  const safeMinutes = Math.max(1, Math.ceil(params.elapsedMinutes));
  const perMinuteRate = Math.max(0.2, params.hourlyRate / 60);

  if (params.billingMode === 'assinatura') {
    const freeWindow = Math.max(0, params.freeMinutesIncluded ?? 45);
    if (safeMinutes <= freeWindow) {
      return 0;
    }
    const extraMinutes = safeMinutes - freeWindow;
    const discountFactor = 1 - Math.min(0.5, Math.max(0, (params.extraMinuteDiscountPct ?? 0) / 100));
    return roundCurrency(extraMinutes * perMinuteRate * discountFactor);
  }

  const rawTotal = UNLOCK_FEE_BRL + safeMinutes * perMinuteRate;
  if (params.paymentMethod === 'pix') {
    return roundCurrency(rawTotal * 0.95);
  }
  return roundCurrency(rawTotal);
}

export function calculateRideStats(params: {
  durationMinutes: number;
  category: BikeCategory;
  distanceKmOverride?: number;
}): {
  distanceKm: number;
  caloriesBurned: number;
  co2SavedKg: number;
} {
  const mins = Math.max(1, Math.round(params.durationMinutes));
  const avgSpeedKmH: Record<BikeCategory, number> = {
    Urbana: 14.5,
    Elétrica: 20.5,
    Gravel: 17.5,
    Estrada: 23.0,
  };
  const kcalPerMin: Record<BikeCategory, number> = {
    Urbana: 6.4,
    Elétrica: 3.9,
    Gravel: 7.8,
    Estrada: 9.2,
  };

  const distanceKm =
    params.distanceKmOverride !== undefined
      ? Math.max(0.2, Math.round(params.distanceKmOverride * 100) / 100)
      : Math.max(0.3, Math.round(((avgSpeedKmH[params.category] * mins) / 60) * 10) / 10);

  const caloriesBurned = Math.max(8, Math.round(kcalPerMin[params.category] * mins));
  const co2SavedKg = Math.max(0.05, Math.round(distanceKm * 0.19 * 100) / 100);

  return { distanceKm, caloriesBurned, co2SavedKg };
}

export interface RiderLevelInfo {
  levelName: string;
  nextLevelName: string | null;
  progressPct: number;
  kmRemaining: number;
}

export function getRiderLevel(totalKm: number): RiderLevelInfo {
  if (totalKm < 15) {
    return {
      levelName: 'Ciclista Iniciante',
      nextLevelName: 'Explorador Urbano',
      progressPct: Math.min(100, Math.round((totalKm / 15) * 100)),
      kmRemaining: Math.max(0, Math.round((15 - totalKm) * 10) / 10),
    };
  }
  if (totalKm < 50) {
    return {
      levelName: 'Explorador Urbano',
      nextLevelName: 'Pedal Constante',
      progressPct: Math.min(100, Math.round(((totalKm - 15) / 35) * 100)),
      kmRemaining: Math.max(0, Math.round((50 - totalKm) * 10) / 10),
    };
  }
  if (totalKm < 120) {
    return {
      levelName: 'Pedal Constante',
      nextLevelName: 'Embaixador LocuBikes',
      progressPct: Math.min(100, Math.round(((totalKm - 50) / 70) * 100)),
      kmRemaining: Math.max(0, Math.round((120 - totalKm) * 10) / 10),
    };
  }
  return {
    levelName: 'Embaixador LocuBikes',
    nextLevelName: null,
    progressPct: 100,
    kmRemaining: 0,
  };
}

export function detectCardBrand(cardNumber: string): 'Visa' | 'Mastercard' | 'Elo' {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('5')) return 'Mastercard';
  if (digits.startsWith('6') || digits.startsWith('4011')) return 'Elo';
  return 'Visa';
}

export function sortStationsByDistance<T extends Station>(
  stations: T[],
  userLat: number,
  userLng: number
): (T & { distanceKm: number; walkMinutes: number })[] {
  return stations
    .map((station) => {
      const distanceKm = haversineDistanceKm(userLat, userLng, station.lat, station.lng);
      return {
        ...station,
        distanceKm,
        walkMinutes: estimateWalkMinutes(distanceKm),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
