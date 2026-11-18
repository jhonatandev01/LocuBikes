import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRentalBreakdown,
  validateCustomerForm,
  validateCardPayment,
  validateBikeInput,
  validateLoginInput,
  generatePixPayload,
  formatCpf,
  formatPhoneBR,
} from './pricing';

test('calculates hourly rental without extras or discounts', () => {
  const result = calculateRentalBreakdown({
    hourlyRate: 35,
    dailyRate: 140,
    rentalUnit: 'hora',
    duration: 3,
    includeInsurance: false,
    includePhoneMount: false,
    paymentMethod: 'cartao',
  });

  assert.equal(result.subtotal, 105);
  assert.equal(result.extrasTotal, 0);
  assert.equal(result.discountTotal, 0);
  assert.equal(result.totalAmount, 105);
});

test('applies 10% multi-day discount for 3+ days and 5% Pix discount on net amount', () => {
  const result = calculateRentalBreakdown({
    hourlyRate: 40,
    dailyRate: 150,
    rentalUnit: 'dia',
    duration: 4,
    includeInsurance: true,
    includePhoneMount: true,
    paymentMethod: 'pix',
  });

  // subtotal = 150 * 4 = 600
  // insurance = 18 * 4 = 72; phone mount = 12; extrasTotal = 84
  // longRentalDiscount = 10% of 600 = 60
  // prePixTotal = 600 + 84 - 60 = 624
  // pixDiscount = 5% of 624 = 31.20
  // total = 592.80
  assert.equal(result.subtotal, 600);
  assert.equal(result.extrasTotal, 84);
  assert.equal(result.longRentalDiscount, 60);
  assert.equal(result.pixDiscount, 31.2);
  assert.equal(result.totalAmount, 592.8);
});

test('validates customer form fields and rejects invalid CPF or email', () => {
  const invalidErrors = validateCustomerForm({
    customerName: 'Jo',
    customerEmail: 'invalido',
    customerPhone: '11999',
    customerCpf: '11111111111',
    pickupDate: '',
    duration: 0,
  });

  assert.ok(invalidErrors.customerName);
  assert.ok(invalidErrors.customerEmail);
  assert.ok(invalidErrors.customerPhone);
  assert.ok(invalidErrors.customerCpf);
  assert.ok(invalidErrors.pickupDate);
  assert.ok(invalidErrors.duration);

  const validErrors = validateCustomerForm({
    customerName: 'Marina Oliveira',
    customerEmail: 'marina@exemplo.com.br',
    customerPhone: '11987654321',
    customerCpf: '12345678909',
    pickupDate: '2026-11-20',
    duration: 2,
  });

  assert.deepEqual(validErrors, {});
});

test('validates credit card fields', () => {
  const badCard = validateCardPayment({
    cardNumber: '4111',
    cardHolder: 'A',
    expiry: '13/28',
    cvv: '1',
  });

  assert.ok(badCard.cardNumber);
  assert.ok(badCard.cardHolder);
  assert.ok(badCard.expiry);
  assert.ok(badCard.cvv);

  const goodCard = validateCardPayment({
    cardNumber: '4111 1111 1111 1111',
    cardHolder: 'MARINA OLIVEIRA',
    expiry: '08/29',
    cvv: '456',
  });

  assert.deepEqual(goodCard, {});
});

test('validates bike model creation/update input', () => {
  const errors = validateBikeInput({
    code: '',
    model: 'A',
    brand: '',
    hourlyRate: 0,
    dailyRate: -10,
    specs: 'ok',
  });
  assert.ok(errors.code);
  assert.ok(errors.model);
  assert.ok(errors.brand);
  assert.ok(errors.hourlyRate);
  assert.ok(errors.dailyRate);
  assert.ok(errors.specs);
});

test('formats CPF, phone and builds deterministic Pix payload', () => {
  assert.equal(formatCpf('12345678901'), '123.456.789-01');
  assert.equal(formatPhoneBR('11987654321'), '(11) 98765-4321');
  const pix = generatePixPayload('LOC-1042', 142.5);
  assert.ok(pix.includes('BR.GOV.BCB.PIX'));
  assert.ok(pix.includes('142.50'));
  assert.ok(pix.includes('LOC1042'));
});

test('validates company login email and password', () => {
  const invalid = validateLoginInput({ email: 'admin', password: '123' });
  assert.ok(invalid.email);
  assert.ok(invalid.password);

  const valid = validateLoginInput({
    email: 'admin@locubikes.com.br',
    password: 'locubikes2026',
  });
  assert.deepEqual(valid, {});
});
