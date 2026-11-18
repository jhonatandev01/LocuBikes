import type { PaymentMethod, RentalUnit } from '../types/bike';

export interface PricingInput {
  hourlyRate: number;
  dailyRate: number;
  rentalUnit: RentalUnit;
  duration: number;
  includeInsurance: boolean;
  includePhoneMount: boolean;
  paymentMethod: PaymentMethod;
}

export interface PricingBreakdown {
  baseRate: number;
  subtotal: number;
  insuranceFee: number;
  phoneMountFee: number;
  extrasTotal: number;
  longRentalDiscount: number;
  pixDiscount: number;
  discountTotal: number;
  totalAmount: number;
}

export interface CustomerFormInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  pickupDate: string;
  duration: number;
}

export interface CardInput {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}

export const INSURANCE_DAILY_FEE = 18;
export const INSURANCE_HOURLY_FEE = 6;
export const PHONE_MOUNT_FLAT_FEE = 12;

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateRentalBreakdown(input: PricingInput): PricingBreakdown {
  const safeDuration = Math.max(1, Math.floor(input.duration || 1));
  const baseRate = input.rentalUnit === 'hora' ? Math.max(0, input.hourlyRate) : Math.max(0, input.dailyRate);
  const subtotal = roundCurrency(baseRate * safeDuration);

  const insuranceFee = input.includeInsurance
    ? roundCurrency(
        input.rentalUnit === 'hora'
          ? INSURANCE_HOURLY_FEE * safeDuration
          : INSURANCE_DAILY_FEE * safeDuration
      )
    : 0;

  const phoneMountFee = input.includePhoneMount ? PHONE_MOUNT_FLAT_FEE : 0;
  const extrasTotal = roundCurrency(insuranceFee + phoneMountFee);

  // 10% discount on base rental when booking 3+ days
  const longRentalDiscount =
    input.rentalUnit === 'dia' && safeDuration >= 3 ? roundCurrency(subtotal * 0.1) : 0;

  const prePixTotal = Math.max(0, roundCurrency(subtotal + extrasTotal - longRentalDiscount));

  // 5% instant Pix discount
  const pixDiscount = input.paymentMethod === 'pix' ? roundCurrency(prePixTotal * 0.05) : 0;
  const discountTotal = roundCurrency(longRentalDiscount + pixDiscount);
  const totalAmount = Math.max(0, roundCurrency(prePixTotal - pixDiscount));

  return {
    baseRate,
    subtotal,
    insuranceFee,
    phoneMountFee,
    extrasTotal,
    longRentalDiscount,
    pixDiscount,
    discountTotal,
    totalAmount,
  };
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhoneBR(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatCardExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function validateCustomerForm(input: CustomerFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.customerName || input.customerName.trim().length < 3) {
    errors.customerName = 'Informe seu nome completo.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.customerEmail || !emailRegex.test(input.customerEmail.trim())) {
    errors.customerEmail = 'Informe um e-mail válido.';
  }

  const phoneDigits = onlyDigits(input.customerPhone || '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.customerPhone = 'Informe um telefone com DDD (10 ou 11 dígitos).';
  }

  const cpfDigits = onlyDigits(input.customerCpf || '');
  if (cpfDigits.length !== 11 || /^(\d)\1{10}$/.test(cpfDigits)) {
    errors.customerCpf = 'Informe um CPF válido com 11 dígitos.';
  }

  if (!input.pickupDate) {
    errors.pickupDate = 'Selecione a data de retirada.';
  }

  if (!Number.isFinite(input.duration) || input.duration < 1 || input.duration > 30) {
    errors.duration = 'A duração deve ser entre 1 e 30.';
  }

  return errors;
}

export function validateCardPayment(input: CardInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const digits = onlyDigits(input.cardNumber || '');
  if (digits.length < 13 || digits.length > 16) {
    errors.cardNumber = 'Número do cartão inválido.';
  }

  if (!input.cardHolder || input.cardHolder.trim().length < 3) {
    errors.cardHolder = 'Informe o nome impresso no cartão.';
  }

  const expiryMatch = /^(\d{2})\/(\d{2})$/.exec((input.expiry || '').trim());
  if (!expiryMatch) {
    errors.expiry = 'Validade inválida (MM/AA).';
  } else {
    const month = Number(expiryMatch[1]);
    if (month < 1 || month > 12) {
      errors.expiry = 'Mês de validade inválido.';
    }
  }

  const cvvDigits = onlyDigits(input.cvv || '');
  if (cvvDigits.length < 3 || cvvDigits.length > 4) {
    errors.cvv = 'CVV deve ter 3 ou 4 dígitos.';
  }

  return errors;
}

export function generatePixPayload(reservationCode: string, amount: number): string {
  const cleanCode = reservationCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12);
  const amountStr = amount.toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136pagamentos@locubikes.com.br520400005303986540${amountStr.length}${amountStr}5802BR5909LOCUBIKES6009SAO PAULO62120508${cleanCode}6304A1B2`;
}

export function validateBikeInput(input: {
  code: string;
  model: string;
  brand: string;
  hourlyRate: number;
  dailyRate: number;
  specs: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.code || input.code.trim().length < 2) {
    errors.code = 'Informe o código da unidade (ex: LOC-07).';
  }
  if (!input.model || input.model.trim().length < 2) {
    errors.model = 'Informe o nome do modelo.';
  }
  if (!input.brand || input.brand.trim().length < 2) {
    errors.brand = 'Informe a marca.';
  }
  if (!Number.isFinite(input.hourlyRate) || input.hourlyRate <= 0) {
    errors.hourlyRate = 'Valor por hora deve ser maior que zero.';
  }
  if (!Number.isFinite(input.dailyRate) || input.dailyRate <= 0) {
    errors.dailyRate = 'Valor da diária deve ser maior que zero.';
  }
  if (!input.specs || input.specs.trim().length < 4) {
    errors.specs = 'Descreva as especificações técnicas.';
  }
  return errors;
}

export function validateLoginInput(input: {
  email: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email.trim())) {
    errors.email = 'Informe um e-mail corporativo válido.';
  }
  if (!input.password || input.password.trim().length < 6) {
    errors.password = 'Informe a senha (mínimo de 6 caracteres).';
  }
  return errors;
}
