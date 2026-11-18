import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, CreditCard, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import type { Bike, CustomerAccountState } from '../types/bike';
import { parseBikeQrCode, UNLOCK_FEE_BRL } from '../utils/mobility';
import { formatCurrencyBRL } from '../utils/pricing';
import { NuPayCheckoutModal } from './NuPayCheckoutModal';

interface QrUnlockModalProps {
  bikes: Bike[];
  initialBike: Bike | null;
  customerAccount: CustomerAccountState;
  onClose: () => void;
  onUnlock: (
    qrInput: string,
    paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay' | 'assinatura'
  ) => Promise<void>;
  onGoToWallet: () => void;
}

export function QrUnlockModal({
  bikes,
  initialBike,
  customerAccount,
  onClose,
  onUnlock,
  onGoToWallet,
}: QrUnlockModalProps) {
  const availableBikes = useMemo(
    () => bikes.filter((b) => b.status === 'disponivel'),
    [bikes]
  );

  const [qrInput, setQrInput] = useState(
    initialBike ? initialBike.qrToken || `LOCUBIKE-${initialBike.code}` : availableBikes[0]?.qrToken || 'LOCUBIKE-LOC-01'
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const defaultMethod = customerAccount.activeSubscription
    ? 'assinatura'
    : customerAccount.walletBalance >= 5
      ? 'carteira'
      : customerAccount.savedCards.length > 0
        ? 'cartao'
        : 'pix';

  const [paymentMethod, setPaymentMethod] = useState<
    'carteira' | 'pix' | 'cartao' | 'nupay' | 'assinatura'
  >(defaultMethod);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [nuPayOpen, setNuPayOpen] = useState(false);
  const [nuPayUnlocked, setNuPayUnlocked] = useState(false);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const parsedCode = parseBikeQrCode(qrInput);
  const matchedBike = useMemo(
    () => (parsedCode ? bikes.find((b) => b.code.toUpperCase() === parsedCode) : undefined),
    [bikes, parsedCode]
  );

  const subscriptionEligible = Boolean(
    customerAccount.activeSubscription &&
      matchedBike &&
      (matchedBike.category !== 'Elétrica' || customerAccount.activeSubscription.includesElectric)
  );

  const handleToggleCamera = async () => {
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setCameraStatus('');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Câmera indisponível neste dispositivo. Selecione ou digite o código abaixo.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraStatus('Câmera ativa. Aponte para o QR Code no guidão da bicicleta.');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraStatus('Permissão de câmera não concedida. Use os códigos rápidos ou digite abaixo.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (paymentMethod === 'nupay') {
      setNuPayOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await onUnlock(qrInput, paymentMethod);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível desbloquear a bicicleta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/65 surface-glass flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-unlock-title"
    >
      <div className="bg-white/95 dark:bg-zinc-900/95 surface-glass border border-zinc-200/90 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden my-0 sm:my-auto max-h-[92vh] flex flex-col shadow-[0_28px_70px_-18px_rgba(9,9,11,0.34)]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <div>
              <h2
                id="qr-unlock-title"
                className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Desbloquear por QR Code
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Escaneie a etiqueta da bicicleta para iniciar a viagem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitor de QR Code"
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Scanner Viewfinder */}
            <div className="relative rounded-2xl bg-zinc-950 text-white p-3.5 flex flex-col items-center justify-center gap-2.5 overflow-hidden min-h-[136px]">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
              ) : null}

              <div className="relative z-10 w-28 h-28 rounded-2xl border-2 border-emerald-400/80 flex flex-col items-center justify-center bg-zinc-900/75 backdrop-blur-xs">
                <QrCode className="w-11 h-11 text-emerald-400" aria-hidden="true" />
                <span className="mt-1 font-mono text-[11px] font-semibold tracking-wider text-white">
                  {parsedCode || 'AGUARDANDO QR'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleCamera}
                className="relative z-10 min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                {cameraActive ? 'Pausar câmera' : 'Ativar câmera'}
              </button>

              {cameraStatus && (
                <p className="relative z-10 text-[11px] text-zinc-300 text-center max-w-xs">
                  {cameraStatus}
                </p>
              )}
            </div>

            {/* QR Code Input + Nearby Quick Selectors */}
            <div className="space-y-2">
              <label
                htmlFor="qr-code-input"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Código QR da bicicleta
              </label>
              <input
                id="qr-code-input"
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Ex: LOCUBIKE-LOC-01 ou LOC-01"
                className="w-full h-10 px-3.5 text-sm font-mono uppercase bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-emerald-400"
              />

              <div className="flex flex-wrap gap-1.5">
                {availableBikes.slice(0, 4).map((bike) => {
                  const selected = parsedCode === bike.code;
                  return (
                    <button
                      key={bike.id}
                      type="button"
                      onClick={() => setQrInput(bike.qrToken || `LOCUBIKE-${bike.code}`)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        selected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                          : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                      }`}
                    >
                      {bike.code} · {bike.model}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matched Bike Preview */}
            {matchedBike && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {matchedBike.stationName} · {matchedBike.category}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {matchedBike.brand} {matchedBike.model}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                    Desbloqueio {formatCurrencyBRL(UNLOCK_FEE_BRL)} +{' '}
                    {formatCurrencyBRL(matchedBike.hourlyRate / 60)}/min
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    matchedBike.status === 'disponivel'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {matchedBike.status === 'disponivel' ? 'Pronta' : 'Indisponível'}
                </span>
              </div>
            )}

            {/* Integrated Payment Choice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Forma de cobrança
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToWallet();
                  }}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Gerenciar carteira e planos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customerAccount.activeSubscription && (
                  <button
                    type="button"
                    disabled={!subscriptionEligible}
                    onClick={() => setPaymentMethod('assinatura')}
                    className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                      paymentMethod === 'assinatura'
                        ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 disabled:opacity-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {customerAccount.activeSubscription.planName}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {subscriptionEligible
                          ? `${customerAccount.activeSubscription.freeMinutesPerRide} min inclusos`
                          : 'Não cobre bike Elétrica'}
                      </p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod('carteira')}
                  className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    paymentMethod === 'carteira'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/70'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-zinc-700 dark:text-zinc-200 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Carteira Digital
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      Saldo: {formatCurrencyBRL(customerAccount.walletBalance)}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    paymentMethod === 'pix'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/70'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      PIX ao final
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      5% de desconto no valor
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('nupay')}
                  className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    paymentMethod === 'nupay'
                      ? 'border-[#820AD1] bg-purple-50/90 dark:bg-[#240C3D] shadow-[0_8px_20px_-10px_rgba(130,10,209,0.45)]'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-purple-400'
                  }`}
                >
                  <span className="w-6 h-5 rounded bg-[#820AD1] text-white font-display text-[10px] font-bold inline-flex items-center justify-center mt-0.5 shrink-0">
                    Nu
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      NuPay (Nubank)
                    </p>
                    <p className="text-[11px] text-[#820AD1] dark:text-purple-300">
                      Débito NuConta ou Crédito
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao')}
                  className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    paymentMethod === 'cartao'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/70'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-zinc-700 dark:text-zinc-200 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Cartão cadastrado
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {customerAccount.savedCards[0]
                        ? `${customerAccount.savedCards[0].brand} •••• ${customerAccount.savedCards[0].last4}`
                        : 'Nenhum cartão salvo'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}
          </div>

          <div className="px-5 sm:px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-zinc-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !matchedBike || matchedBike.status !== 'disponivel'}
              className={`min-h-[44px] px-5 py-2 text-xs font-semibold disabled:opacity-50 rounded-xl transition-colors ${
                paymentMethod === 'nupay'
                  ? 'text-white bg-[#820AD1] hover:bg-[#6D08B0]'
                  : 'text-white dark:text-zinc-950 bg-zinc-900 dark:bg-emerald-400 hover:bg-zinc-800 dark:hover:bg-emerald-300'
              }`}
            >
              {submitting
                ? 'Desbloqueando...'
                : paymentMethod === 'nupay'
                  ? 'Autorizar com NuPay'
                  : 'Desbloquear bicicleta'}
            </button>
          </div>
        </form>
      </div>

      {nuPayOpen && matchedBike && (
        <NuPayCheckoutModal
          open={nuPayOpen}
          amount={UNLOCK_FEE_BRL}
          title={`Desbloqueio QR · ${matchedBike.code}`}
          subtitle={`${matchedBike.brand} ${matchedBike.model} (+ tarifa por min ao encerrar)`}
          allowInstallments={false}
          onClose={() => {
            setNuPayOpen(false);
            if (nuPayUnlocked) {
              onClose();
            }
          }}
          onAuthorize={async () => {
            await onUnlock(qrInput, 'nupay');
            setNuPayUnlocked(true);
          }}
        />
      )}
    </div>
  );
}
