import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRideCost,
  calculateRideStats,
  formatDistanceBR,
  getRiderLevel,
  haversineDistanceKm,
  parseBikeQrCode,
} from './mobility';

test('calculates Haversine distance and formats meters vs km', () => {
  const dist = haversineDistanceKm(-23.5614, -46.6559, -23.5632, -46.6542);
  assert.ok(dist > 0.1 && dist < 0.5);
  assert.equal(formatDistanceBR(0.32), '320 m');
  assert.equal(formatDistanceBR(2.45), '2,5 km');
});

test('parses bike QR codes from plain codes, prefixed tokens and URLs', () => {
  assert.equal(parseBikeQrCode('LOC-01'), 'LOC-01');
  assert.equal(parseBikeQrCode('locubike-loc-02'), 'LOC-02');
  assert.equal(parseBikeQrCode('https://locubikes.com.br/qr/LOC-05'), 'LOC-05');
  assert.equal(parseBikeQrCode('INVALIDO'), null);
});

test('calculates per-minute ride cost with unlock fee and Pix discount', () => {
  const cardCost = calculateRideCost({
    hourlyRate: 30, // R$ 0,50/min
    elapsedMinutes: 20,
    billingMode: 'tempo',
    paymentMethod: 'cartao',
  });
  // R$ 2,50 unlock + 20 * 0,50 = R$ 12,50
  assert.equal(cardCost, 12.5);

  const pixCost = calculateRideCost({
    hourlyRate: 30,
    elapsedMinutes: 20,
    billingMode: 'tempo',
    paymentMethod: 'pix',
  });
  // 5% Pix discount -> 11.88
  assert.equal(pixCost, 11.88);
});

test('applies monthly subscription free window and charges only extra minutes', () => {
  const withinWindow = calculateRideCost({
    hourlyRate: 30,
    elapsedMinutes: 35,
    billingMode: 'assinatura',
    freeMinutesIncluded: 45,
    paymentMethod: 'assinatura',
  });
  assert.equal(withinWindow, 0);

  const beyondWindow = calculateRideCost({
    hourlyRate: 30, // 0,50/min
    elapsedMinutes: 55, // 10 extra minutes
    billingMode: 'assinatura',
    freeMinutesIncluded: 45,
    extraMinuteDiscountPct: 20,
    paymentMethod: 'assinatura',
  });
  // 10 * 0,50 * 0,80 = 4.00
  assert.equal(beyondWindow, 4);
});

test('computes ride calories, distance, CO2 savings and rider level', () => {
  const stats = calculateRideStats({ durationMinutes: 30, category: 'Urbana' });
  assert.ok(stats.distanceKm > 5);
  assert.ok(stats.caloriesBurned > 150);
  assert.ok(stats.co2SavedKg > 1);

  const lvl = getRiderLevel(26.4);
  assert.equal(lvl.levelName, 'Explorador Urbano');
  assert.equal(lvl.nextLevelName, 'Pedal Constante');
});
