import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Fingerprint,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import type { NuPayConfirmation, NuPayFundingSource } from '../types/bike';
import { calculateNuPayInstallments, generateNuPayTransactionId } from '../utils/mobility';
import { formatCurrencyBRL } from '../utils/pricing';

interface NuPayCheckoutModalProps {
  open: boolean;
  amount: number;
  title: string;
  subtitle: string;
  customerLabel?: string;
  allowInstallments?: boolean;
  onClose: () => void;
  onAuthorize: (confirmation: NuPayConfirmation) => Promise<void>;
}

type NuPayStage = 'review' | 'processing' | 'approved';

export function NuPayCheckoutModal({
  open,
  amount,
  title,
  subtitle,
  customerLabel = 'Conta Nubank ••• 4829',
  allowInstallments = true,
  onClose,
  onAuthorize,
}: NuPayCheckoutModalProps) {
  const [fundingSource, setFundingSource] = useState<NuPayFundingSource>('saldo_nu');
  const [installments, setInstallments] = useState<number>(1);
  const [authMethod, setAuthMethod] = useState<'biometria' | 'senha'>('biometria');
  const [pin, setPin] = useState('');
  const [stage, setStage] = useState<NuPayStage>('review');
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<NuPayConfirmation | null>(null);

  const installmentOptions = useMemo(() => {
    if (!allowInstallments) {
      return [{ count: 1, installmentValue: amount, interestFree: true }];
    }
    return calculateNuPayInstallments(amount);
  }, [allowInstallments, amount]);

  if (!open) return null;

  const selectedOption =
    installmentOptions.find((opt) => opt.count === installments) ?? installmentOptions[0];

  const handleConfirmNuPay = async () => {
    setErrorMsg('');
    if (authMethod === 'senha' && pin.replace(/\D/g, '').length !== 4) {
      setErrorMsg('Digite os 4 dígitos da sua senha de autorização NuPay.');
      return;
    }

    setStage('processing');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
      const confirmation: NuPayConfirmation = {
        transactionId: generateNuPayTransactionId(),
        fundingSource,
        installments: fundingSource === 'saldo_nu' ? 1 : selectedOption.count,
        authorizedAt: new Date().toISOString(),
      };
      await onAuthorize(confirmation);
      setReceipt(confirmation);
      setStage('approved');
    } catch (err) {
      setStage('review');
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível autorizar o pagamento pelo NuPay.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-zinc-950/70 surface-glass flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nupay-modal-title"
    >
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white dark:bg-[#140722] border border-purple-200/80 dark:border-purple-900/60 shadow-[0_28px_70px_-15px_rgba(130,10,209,0.42)] my-0 sm:my-auto max-h-[92vh] flex flex-col">
        {/* Authentic Nubank Signature Purple Header with Subtle Atmospheric Blur */}
        <div className="relative overflow-hidden bg-[#820AD1] text-white px-6 pt-5 pb-6 shrink-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full bg-[#B453FF]/45 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-[#4A037C]/60 blur-2xl"
          />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {/* Nubank Nu stylized mark */}
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-sm">
                <span className="font-display font-bold text-base tracking-tighter text-white">
                  Nu
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-purple-100/90 leading-tight">
                  Ambiente protegido Nubank
                </p>
                <h2 id="nupay-modal-title" className="font-display text-lg font-bold tracking-tight">
                  NuPay Checkout
                </h2>
              </div>
            </div>

            {stage !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar checkout NuPay"
                className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="relative mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-purple-100/85 truncate">{title}</p>
              <p className="text-[11px] text-purple-200/80 truncate">{subtitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-purple-100/80">Valor</p>
              <p className="font-display text-2xl font-bold tabular-nums tracking-tight">
                {formatCurrencyBRL(amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        {stage === 'review' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Merchant & Account Strip */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-[#210D37] border border-purple-100 dark:border-purple-900/50 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#820AD1] dark:text-purple-300">
                    Beneficiário verificado
                  </p>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    LocuBikes Mobilidade Urbana Ltda
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-purple-200/70 truncate">
                    {customerLabel}
                  </p>
                </div>
                <ShieldCheck
                  className="w-5 h-5 text-[#820AD1] dark:text-purple-300 shrink-0"
                  aria-hidden="true"
                />
              </div>

              {/* Funding Source Selector */}
              <div className="space-y-2.5">
                <span className="block text-xs font-semibold text-zinc-700 dark:text-purple-100">
                  Como você quer pagar no Nubank?
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFundingSource('saldo_nu');
                      setInstallments(1);
                    }}
                    className={`min-h-[56px] p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      fundingSource === 'saldo_nu'
                        ? 'border-[#820AD1] bg-purple-50/90 dark:bg-[#2B1048] shadow-[0_8px_22px_-10px_rgba(130,10,209,0.4)]'
                        : 'border-zinc-200 dark:border-purple-900/50 bg-white dark:bg-[#190A2B] hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#820AD1]/10 dark:bg-[#820AD1]/35 text-[#820AD1] dark:text-purple-200 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                          Saldo da conta Nubank
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-purple-200/75 tabular-nums">
                          Disponível: R$ 1.842,50 · Débito à vista
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#820AD1] dark:text-purple-300 shrink-0">
                      Instantâneo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFundingSource('credito_nu')}
                    className={`min-h-[56px] p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      fundingSource === 'credito_nu'
                        ? 'border-[#820AD1] bg-purple-50/90 dark:bg-[#2B1048] shadow-[0_8px_22px_-10px_rgba(130,10,209,0.4)]'
                        : 'border-zinc-200 dark:border-purple-900/50 bg-white dark:bg-[#190A2B] hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#820AD1]/10 dark:bg-[#820AD1]/35 text-[#820AD1] dark:text-purple-200 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                          Cartão de crédito Nubank (NuPay)
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-purple-200/75 tabular-nums">
                          Limite NuPay extra: R$ 4.200,00 · Sem digitar CVV
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#820AD1] dark:text-purple-300 shrink-0">
                      {allowInstallments ? 'Até 12x' : '1x'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Installments when Credit is chosen */}
              {fundingSource === 'credito_nu' && allowInstallments && installmentOptions.length > 1 && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="nupay-installments"
                    className="block text-xs font-semibold text-zinc-700 dark:text-purple-100"
                  >
                    Parcelamento no crédito Nubank
                  </label>
                  <select
                    id="nupay-installments"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full h-11 px-3.5 text-sm bg-white dark:bg-[#190A2B] border border-purple-200 dark:border-purple-800 rounded-xl text-zinc-900 dark:text-white tabular-nums focus:outline-none focus:border-[#820AD1]"
                  >
                    {installmentOptions.map((opt) => (
                      <option key={opt.count} value={opt.count}>
                        {opt.count}x de {formatCurrencyBRL(opt.installmentValue)}{' '}
                        {opt.interestFree ? 'sem juros' : 'no NuPay'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Biometric or 4-digit NuPay PIN confirmation */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-purple-100">
                    Autorização no aplicativo
                  </span>
                  <div className="flex items-center gap-1 p-0.5 bg-purple-100/70 dark:bg-[#230E3B] rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('biometria');
                        setErrorMsg('');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        authMethod === 'biometria'
                          ? 'bg-white dark:bg-[#820AD1] text-[#820AD1] dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-purple-200'
                      }`}
                    >
                      Biometria Nu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('senha');
                        setErrorMsg('');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        authMethod === 'senha'
                          ? 'bg-white dark:bg-[#820AD1] text-[#820AD1] dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-purple-200'
                      }`}
                    >
                      Senha 4 dígitos
                    </button>
                  </div>
                </div>

                {authMethod === 'biometria' ? (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#190A2B] border border-zinc-200/80 dark:border-purple-900/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#820AD1]/12 dark:bg-[#820AD1]/35 flex items-center justify-center shrink-0">
                      <Fingerprint
                        className="w-5 h-5 text-[#820AD1] dark:text-purple-300"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-purple-100/85 leading-relaxed">
                      Ao confirmar abaixo, sua solicitação será validada instantaneamente via
                      biometria criptografada do NuPay.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="nupay-pin-input"
                      className="block text-[11px] text-zinc-500 dark:text-purple-200/80"
                    >
                      Digite a senha de 4 dígitos do seu cartão Nubank (simulação)
                    </label>
                    <div className="relative">
                      <Lock
                        className="w-4 h-4 text-[#820AD1] dark:text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        id="nupay-pin-input"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full h-11 pl-10 pr-4 text-base tracking-[0.45em] font-mono bg-white dark:bg-[#190A2B] border border-purple-200 dark:border-purple-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-[#820AD1]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
                >
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-zinc-100 dark:border-purple-900/50 bg-white/95 dark:bg-[#140722]/95 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-purple-100 bg-zinc-100 dark:bg-[#230E3B] hover:bg-zinc-200 dark:hover:bg-[#2F144F] rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmNuPay}
                className="flex-1 min-h-[46px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#820AD1] hover:bg-[#6D08B0] rounded-full shadow-[0_10px_24px_-8px_rgba(130,10,209,0.65)] transition-all active:scale-[0.99]"
              >
                Pagar {formatCurrencyBRL(amount)} com NuPay
              </button>
            </div>
          </div>
        )}

        {stage === 'processing' && (
          <div className="p-10 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#820AD1]/10 dark:bg-[#820AD1]/30 flex items-center justify-center relative">
              <Smartphone
                className="w-7 h-7 text-[#820AD1] dark:text-purple-200 animate-pulse"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Conectando ao aplicativo Nubank...
              </h3>
              <p className="text-xs text-zinc-500 dark:text-purple-200/80 max-w-xs mx-auto leading-relaxed">
                Validando {fundingSource === 'saldo_nu' ? 'saldo em conta' : 'limite NuPay'} e
                criptografando a autorização da compra.
              </p>
            </div>
          </div>
        )}

        {stage === 'approved' && receipt && (
          <div className="p-6 space-y-5">
            <div className="p-5 rounded-2xl bg-purple-50/80 dark:bg-[#210D37] border border-purple-200/70 dark:border-purple-800/60 text-center space-y-2.5">
              <CheckCircle2
                className="w-11 h-11 text-emerald-600 dark:text-emerald-400 mx-auto"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-[#820AD1] dark:text-purple-300">
                Pagamento aprovado pelo NuPay
              </p>
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                {formatCurrencyBRL(amount)}
              </p>
              <p className="text-xs text-zinc-600 dark:text-purple-200/80">
                {receipt.fundingSource === 'saldo_nu'
                  ? 'Debitado do saldo da conta Nubank'
                  : `Cartão Nubank em ${receipt.installments}x`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#190A2B] border border-zinc-200/80 dark:border-purple-900/50 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-purple-200/70">Comprovante NuPay</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                  {receipt.transactionId}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-purple-200/70">Estabelecimento</span>
                <span className="font-medium text-zinc-900 dark:text-white">LocuBikes</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-purple-200/70">Data e hora</span>
                <span className="font-mono text-zinc-700 dark:text-purple-100 tabular-nums">
                  {new Date(receipt.authorizedAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[46px] px-5 py-2.5 text-sm font-semibold text-white bg-[#820AD1] hover:bg-[#6D08B0] rounded-full shadow-[0_10px_24px_-8px_rgba(130,10,209,0.55)] transition-colors"
            >
              Concluir e voltar à LocuBikes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
