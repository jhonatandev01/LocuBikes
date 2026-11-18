import { useMemo, useState } from 'react';
import { Check, Copy, CreditCard, QrCode, Store, X } from 'lucide-react';
import type { Bike, PaymentMethod, Rental, RentalUnit } from '../types/bike';
import {
  calculateRentalBreakdown,
  formatCardExpiry,
  formatCardNumber,
  formatCpf,
  formatCurrencyBRL,
  formatPhoneBR,
  generatePixPayload,
  onlyDigits,
  validateCardPayment,
  validateCustomerForm,
} from '../utils/pricing';
import { PixQrCode } from './PixQrCode';

interface BookingModalProps {
  bike: Bike | null;
  pendingRental?: Rental | null;
  onClose: () => void;
  onSuccess: (rental: Rental, isNewRental: boolean) => void;
  onSubmitNewRental: (payload: {
    bikeId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string;
    rentalUnit: RentalUnit;
    duration: number;
    pickupDate: string;
    includeInsurance: boolean;
    includePhoneMount: boolean;
    paymentMethod: PaymentMethod;
    installments?: number;
    cardLast4?: string;
  }) => Promise<Rental>;
  onSettlePendingPayment: (
    rentalId: string,
    method: PaymentMethod,
    installments: number,
    cardLast4?: string
  ) => Promise<Rental>;
}

type ModalStep = 'details' | 'payment' | 'receipt';

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function BookingModal({
  bike,
  pendingRental,
  onClose,
  onSuccess,
  onSubmitNewRental,
  onSettlePendingPayment,
}: BookingModalProps) {
  const isSettleMode = Boolean(pendingRental && !bike);

  const [step, setStep] = useState<ModalStep>(isSettleMode ? 'payment' : 'details');
  const [rentalUnit, setRentalUnit] = useState<RentalUnit>('dia');
  const [duration, setDuration] = useState<number>(1);
  const [pickupDate, setPickupDate] = useState<string>(getTodayIsoDate);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  const [includePhoneMount, setIncludePhoneMount] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [confirmedRental, setConfirmedRental] = useState<Rental | null>(null);

  const breakdown = useMemo(() => {
    if (pendingRental) {
      return {
        baseRate: pendingRental.subtotal / pendingRental.duration,
        subtotal: pendingRental.subtotal,
        insuranceFee: 0,
        phoneMountFee: 0,
        extrasTotal: pendingRental.extrasTotal,
        longRentalDiscount: 0,
        pixDiscount: 0,
        discountTotal: pendingRental.discountTotal,
        totalAmount: pendingRental.totalAmount,
      };
    }
    if (!bike) {
      return null;
    }
    return calculateRentalBreakdown({
      hourlyRate: bike.hourlyRate,
      dailyRate: bike.dailyRate,
      rentalUnit,
      duration,
      includeInsurance,
      includePhoneMount,
      paymentMethod,
    });
  }, [bike, pendingRental, rentalUnit, duration, includeInsurance, includePhoneMount, paymentMethod]);

  const previewPixCode = useMemo(() => {
    const amount = breakdown?.totalAmount ?? 0;
    const code = pendingRental?.reservationCode ?? 'LOC-NEW';
    return generatePixPayload(code, amount);
  }, [breakdown, pendingRental]);

  if (!bike && !pendingRental) return null;

  const titleModel = bike
    ? `${bike.brand} ${bike.model}`
    : `${pendingRental?.bikeBrand} ${pendingRental?.bikeModel}`;

  const handleContinueToPayment = () => {
    const validationErrors = validateCustomerForm({
      customerName,
      customerEmail,
      customerPhone,
      customerCpf,
      pickupDate,
      duration,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setSubmitError('');
      setStep('payment');
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(previewPixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } catch {
      setPixCopied(true);
    }
  };

  const handleFinishBooking = async () => {
    if (paymentMethod === 'cartao') {
      const cardErrors = validateCardPayment({
        cardNumber,
        cardHolder,
        expiry: cardExpiry,
        cvv: cardCvv,
      });
      setErrors(cardErrors);
      if (Object.keys(cardErrors).length > 0) return;
    } else {
      setErrors({});
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const last4 = paymentMethod === 'cartao' ? onlyDigits(cardNumber).slice(-4) : undefined;
      let result: Rental;
      if (pendingRental) {
        result = await onSettlePendingPayment(pendingRental.id, paymentMethod, installments, last4);
        setConfirmedRental(result);
        onSuccess(result, false);
      } else if (bike) {
        result = await onSubmitNewRental({
          bikeId: bike.id,
          customerName,
          customerEmail,
          customerPhone,
          customerCpf,
          rentalUnit,
          duration,
          pickupDate,
          includeInsurance,
          includePhoneMount,
          paymentMethod,
          installments,
          cardLast4: last4,
        });
        setConfirmedRental(result);
        onSuccess(result, true);
      }
      setStep('receipt');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao confirmar reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {step === 'details' && 'Etapa 1 de 2 · Período e dados do cliente'}
              {step === 'payment' && (isSettleMode ? 'Pagamento pendente' : 'Etapa 2 de 2 · Pagamento')}
              {step === 'receipt' && 'Confirmação da locação'}
            </p>
            <h2
              id="booking-modal-title"
              className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate"
            >
              {titleModel}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de reserva"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Details */}
        {step === 'details' && bike && breakdown && (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Rental Mode & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Modalidade
                </span>
                <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRentalUnit('hora')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                      rentalUnit === 'hora'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Por Hora
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalUnit('dia')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                      rentalUnit === 'dia'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Diária
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-duration"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Quantidade ({rentalUnit === 'hora' ? 'horas' : 'dias'})
                </label>
                <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => setDuration((d) => Math.max(1, d - 1))}
                    aria-label="Diminuir duração"
                    className="w-10 h-9 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    -
                  </button>
                  <input
                    id="booking-duration"
                    type="number"
                    min={1}
                    max={30}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    className="w-full text-center text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-transparent tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDuration((d) => Math.min(30, d + 1))}
                    aria-label="Aumentar duração"
                    className="w-10 h-9 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    +
                  </button>
                </div>
                {errors.duration && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.duration}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-pickup-date"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Data de retirada
                </label>
                <input
                  id="booking-pickup-date"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                {errors.pickupDate && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.pickupDate}</p>
                )}
              </div>
            </div>

            {/* Optional Accessories */}
            <div className="space-y-2.5">
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Proteção e acessórios (capacete e trava U-Lock já inclusos)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeInsurance}
                    onChange={(e) => setIncludeInsurance(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-zinc-900 dark:accent-emerald-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                      Seguro Proteção Total
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                      +{formatCurrencyBRL(rentalUnit === 'hora' ? 6 : 18)}/{rentalUnit}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePhoneMount}
                    onChange={(e) => setIncludePhoneMount(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-zinc-900 dark:accent-emerald-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                      Suporte para Celular
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                      +{formatCurrencyBRL(12)} fixo
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nome completo
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Marina Oliveira"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                {errors.customerName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="customer-email"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  E-mail
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="marina@exemplo.com.br"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                {errors.customerEmail && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerEmail}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Telefone / WhatsApp
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneBR(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                {errors.customerPhone && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerPhone}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="customer-cpf"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  CPF
                </label>
                <input
                  id="customer-cpf"
                  type="text"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                {errors.customerCpf && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerCpf}</p>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Locação ({duration} {rentalUnit === 'hora' ? 'h' : 'dia(s)'})
                  {breakdown.extrasTotal > 0 ? ` + opcionais (${formatCurrencyBRL(breakdown.extrasTotal)})` : ''}
                  {breakdown.longRentalDiscount > 0 ? ` − 10% longa duração` : ''}
                </p>
                <p className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrencyBRL(breakdown.totalAmount)}
                  {paymentMethod === 'pix' && (
                    <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                      com 5% Pix
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  className="px-5 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
                >
                  Ir para pagamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && breakdown && (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Payment Method Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-3.5 rounded-lg border text-left transition-colors ${
                  paymentMethod === 'pix'
                    ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800/80'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <QrCode className="w-4 h-4 text-zinc-900 dark:text-zinc-100" aria-hidden="true" />
                  {!isSettleMode && (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      -5%
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">Pix</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Aprovação imediata</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`p-3.5 rounded-lg border text-left transition-colors ${
                  paymentMethod === 'cartao'
                    ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800/80'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-zinc-900 dark:text-zinc-100" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Cartão de Crédito
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Até 3x sem juros</p>
              </button>

              {!isSettleMode && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('presencial')}
                  className={`p-3.5 rounded-lg border text-left transition-colors ${
                    paymentMethod === 'presencial'
                      ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800/80'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <Store className="w-4 h-4 text-zinc-900 dark:text-zinc-100" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Na Retirada
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Pagar na loja física</p>
                </button>
              )}
            </div>

            {/* Method-specific Content */}
            {paymentMethod === 'pix' && (
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                <PixQrCode payload={previewPixCode} />
                <div className="flex-1 space-y-3 min-w-0 w-full">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Escaneie o QR Code ou copie o código Pix
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      O pagamento é confirmado instantaneamente e sua bicicleta fica garantida.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                    {previewPixCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  >
                    {pixCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                        Código Pix copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copiar Pix Copia e Cola
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === 'cartao' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="card-number"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Número do cartão
                  </label>
                  <input
                    id="card-number"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                  {errors.cardNumber && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cardNumber}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="card-holder"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Nome impresso no cartão
                  </label>
                  <input
                    id="card-holder"
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="MARINA OLIVEIRA"
                    className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                  {errors.cardHolder && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cardHolder}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="card-expiry"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Validade (MM/AA)
                  </label>
                  <input
                    id="card-expiry"
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                    placeholder="08/29"
                    className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                  {errors.expiry && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.expiry}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="card-cvv"
                      className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      CVV
                    </label>
                    <input
                      id="card-cvv"
                      type="text"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(onlyDigits(e.target.value).slice(0, 4))}
                      placeholder="123"
                      className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                    />
                    {errors.cvv && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cvv}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="card-installments"
                      className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      Parcelas
                    </label>
                    <select
                      id="card-installments"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full h-10 px-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                    >
                      <option value={1}>1x {formatCurrencyBRL(breakdown.totalAmount)}</option>
                      <option value={2}>2x {formatCurrencyBRL(breakdown.totalAmount / 2)}</option>
                      <option value={3}>3x {formatCurrencyBRL(breakdown.totalAmount / 3)}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'presencial' && (
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Reserva garantida para pagamento no balcão
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  A unidade ficará reservada em seu nome para retirada em {pickupDate}. O pagamento
                  poderá ser concluído presencialmente via Pix, débito ou crédito, ou a qualquer
                  momento na aba Reservas.
                </p>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300"
              >
                {submitError}
              </div>
            )}

            {/* Payment Footer */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total a pagar</p>
                <p className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrencyBRL(breakdown.totalAmount)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isSettleMode && (
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  >
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinishBooking}
                  className="px-5 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 transition-colors"
                >
                  {submitting
                    ? 'Processando...'
                    : paymentMethod === 'presencial'
                      ? 'Confirmar Reserva'
                      : 'Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Receipt */}
        {step === 'receipt' && confirmedRental && (
          <div className="p-6 space-y-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {confirmedRental.paymentStatus === 'pago'
                      ? 'Pagamento confirmado'
                      : 'Reserva confirmada · Pagamento na retirada'}
                  </p>
                  <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">
                    Código {confirmedRental.reservationCode}
                  </h3>
                </div>
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrencyBRL(confirmedRental.totalAmount)}
                </span>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Bicicleta</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {confirmedRental.bikeBrand} {confirmedRental.bikeModel} ({confirmedRental.bikeCode})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Cliente</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {confirmedRental.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Retirada e Duração</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {confirmedRental.pickupDate} · {confirmedRental.duration}{' '}
                    {confirmedRental.rentalUnit === 'hora' ? 'hora(s)' : 'dia(s)'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Pagamento</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                    {confirmedRental.paymentMethod}
                    {confirmedRental.cardLast4 ? ` (final ${confirmedRental.cardLast4})` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
