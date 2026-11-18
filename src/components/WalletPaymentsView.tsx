import { useState, type FormEvent } from 'react';
import { Check, CreditCard, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import type { CustomerAccountState, SubscriptionPlan } from '../types/bike';
import {
  formatCardExpiry,
  formatCardNumber,
  formatCurrencyBRL,
  generatePixPayload,
  validateCardPayment,
} from '../utils/pricing';
import { NuPayCheckoutModal } from './NuPayCheckoutModal';
import { PixQrCode } from './PixQrCode';

interface WalletPaymentsViewProps {
  customerAccount: CustomerAccountState;
  onTopUpWallet: (amount: number, method: 'pix' | 'cartao' | 'nupay') => Promise<void>;
  onAddCard: (input: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
  }) => Promise<void>;
  onRemoveCard: (cardId: string) => Promise<void>;
  onSubscribePlan: (
    planId: SubscriptionPlan['id'],
    paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay'
  ) => Promise<void>;
  onCancelSubscription: () => Promise<void>;
}

const TOPUP_PRESETS = [25, 50, 100];

export function WalletPaymentsView({
  customerAccount,
  onTopUpWallet,
  onAddCard,
  onRemoveCard,
  onSubscribePlan,
  onCancelSubscription,
}: WalletPaymentsViewProps) {
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [topUpMethod, setTopUpMethod] = useState<'pix' | 'cartao' | 'nupay'>('pix');
  const [topUpPixPreview, setTopUpPixPreview] = useState<string | null>(null);
  const [topUpBusy, setTopUpBusy] = useState(false);

  const [nuPayPrompt, setNuPayPrompt] = useState<{
    amount: number;
    title: string;
    subtitle: string;
    kind: 'topup' | 'sub';
    planId?: SubscriptionPlan['id'];
  } | null>(null);

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [cardBusy, setCardBusy] = useState(false);

  const [subPaymentMethod, setSubPaymentMethod] = useState<
    'carteira' | 'pix' | 'cartao' | 'nupay'
  >('carteira');
  const [subBusyId, setSubBusyId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleConfirmTopUp = async () => {
    setFeedback(null);
    if (topUpMethod === 'nupay') {
      setNuPayPrompt({
        amount: topUpAmount,
        title: 'Recarga Carteira Digital LocuBikes',
        subtitle: 'Crédito imediato para corridas e passes',
        kind: 'topup',
      });
      return;
    }

    if (topUpMethod === 'pix' && !topUpPixPreview) {
      setTopUpPixPreview(generatePixPayload(`WALLET${topUpAmount}`, topUpAmount));
      return;
    }

    setTopUpBusy(true);
    try {
      await onTopUpWallet(topUpAmount, topUpMethod);
      setTopUpPixPreview(null);
      setFeedback({
        type: 'ok',
        text: `Crédito de ${formatCurrencyBRL(topUpAmount)} adicionado à sua carteira digital.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao adicionar saldo.',
      });
    } finally {
      setTopUpBusy(false);
    }
  };

  const handleSaveCard = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateCardPayment({
      cardNumber,
      cardHolder,
      expiry: cardExpiry,
      cvv: cardCvv,
    });
    setCardErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCardBusy(true);
    setFeedback(null);
    try {
      await onAddCard({
        cardNumber,
        cardHolder,
        expiry: cardExpiry,
        cvv: cardCvv,
      });
      setCardNumber('');
      setCardHolder('');
      setCardExpiry('');
      setCardCvv('');
      setShowCardForm(false);
      setFeedback({ type: 'ok', text: 'Cartão cadastrado com sucesso.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível cadastrar o cartão.',
      });
    } finally {
      setCardBusy(false);
    }
  };

  const handleSubscribe = async (planId: SubscriptionPlan['id']) => {
    setFeedback(null);
    if (subPaymentMethod === 'nupay') {
      const plan = customerAccount.subscriptionPlans.find((p) => p.id === planId);
      if (plan) {
        setNuPayPrompt({
          amount: plan.priceMonthly,
          title: `Assinatura · ${plan.name}`,
          subtitle: `Renovação mensal · ${plan.freeMinutesPerRide} min livres por viagem`,
          kind: 'sub',
          planId: plan.id,
        });
        return;
      }
    }

    setSubBusyId(planId);
    try {
      await onSubscribePlan(planId, subPaymentMethod);
      setFeedback({ type: 'ok', text: 'Assinatura mensal ativada com sucesso.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível ativar o plano.',
      });
    } finally {
      setSubBusyId(null);
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-12 w-72 h-44 rounded-full bg-[#820AD1]/10 blur-3xl -z-10"
      />
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Carteira e Pagamentos
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gerencie seu saldo digital, recargas via PIX, cartões cadastrados e passes mensais.
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Top Grid: Digital Wallet + Saved Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Digital Wallet & Top-up */}
        <section className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-6 space-y-6 card-elevated">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Carteira Digital LocuBikes
              </p>
              <p
                data-testid="wallet-balance-value"
                className="mt-1 font-display text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums"
              >
                {formatCurrencyBRL(customerAccount.walletBalance)}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Adicionar crédito à carteira
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPUP_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setTopUpAmount(val);
                    setTopUpPixPreview(null);
                  }}
                  className={`min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl border transition-colors tabular-nums ${
                    topUpAmount === val
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                      : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  + {formatCurrencyBRL(val)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTopUpMethod('pix');
                  setTopUpPixPreview(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  topUpMethod === 'pix'
                    ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Via PIX instantâneo
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopUpMethod('nupay');
                  setTopUpPixPreview(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  topUpMethod === 'nupay'
                    ? 'border-[#820AD1] bg-purple-50 dark:bg-[#240C3D] text-[#820AD1] dark:text-purple-200 shadow-[0_8px_20px_-10px_rgba(130,10,209,0.45)]'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-purple-400'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-[#820AD1] text-white font-display text-[10px] font-bold">
                  Nu
                </span>
                NuPay (Nubank)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopUpMethod('cartao');
                  setTopUpPixPreview(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  topUpMethod === 'cartao'
                    ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Cartão cadastrado
              </button>
            </div>

            {topUpPixPreview && (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                <PixQrCode payload={topUpPixPreview} />
                <div className="space-y-1.5 text-center sm:text-left">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    PIX Copia e Cola pronto ({formatCurrencyBRL(topUpAmount)})
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono break-all line-clamp-2">
                    {topUpPixPreview}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={topUpBusy}
              onClick={handleConfirmTopUp}
              className={`w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold disabled:opacity-60 rounded-xl transition-all ${
                topUpMethod === 'nupay'
                  ? 'text-white bg-[#820AD1] hover:bg-[#6D08B0] shadow-[0_10px_24px_-10px_rgba(130,10,209,0.65)]'
                  : 'text-white dark:text-zinc-950 bg-zinc-900 dark:bg-emerald-400 hover:bg-zinc-800 dark:hover:bg-emerald-300'
              }`}
            >
              {topUpBusy
                ? 'Processando...'
                : topUpMethod === 'nupay'
                  ? `Pagar ${formatCurrencyBRL(topUpAmount)} com NuPay`
                  : topUpMethod === 'pix' && !topUpPixPreview
                    ? `Gerar PIX de ${formatCurrencyBRL(topUpAmount)}`
                    : `Confirmar recarga de ${formatCurrencyBRL(topUpAmount)}`}
            </button>
          </div>
        </section>

        {/* Saved Credit Cards */}
        <section className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-6 space-y-5 card-elevated">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                Cartões Cadastrados
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cobrança automática ao encerrar a corrida ou renovar assinatura
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCardForm((prev) => !prev)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {showCardForm ? 'Fechar' : 'Novo cartão'}
            </button>
          </div>

          {showCardForm && (
            <form
              onSubmit={handleSaveCard}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <div>
                <label
                  htmlFor="wallet-card-number"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Número do cartão
                </label>
                <input
                  id="wallet-card-number"
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="5412 7500 8912 3456"
                  className="w-full h-10 px-3 text-sm font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                {cardErrors.cardNumber && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {cardErrors.cardNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="wallet-card-holder"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nome impresso
                </label>
                <input
                  id="wallet-card-holder"
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="MARINA SILVA"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                {cardErrors.cardHolder && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {cardErrors.cardHolder}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="wallet-card-expiry"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Validade
                  </label>
                  <input
                    id="wallet-card-expiry"
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                    placeholder="09/29"
                    className="w-full h-10 px-3 text-sm font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                  {cardErrors.expiry && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {cardErrors.expiry}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="wallet-card-cvv"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    CVV
                  </label>
                  <input
                    id="wallet-card-cvv"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className="w-full h-10 px-3 text-sm font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                  {cardErrors.cvv && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{cardErrors.cvv}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={cardBusy}
                className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
              >
                {cardBusy ? 'Salvando...' : 'Salvar cartão'}
              </button>
            </form>
          )}

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {customerAccount.savedCards.length === 0 ? (
              <p className="py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                Nenhum cartão cadastrado ainda.
              </p>
            ) : (
              customerAccount.savedCards.map((card) => (
                <div
                  key={card.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                      {card.brand} •••• {card.last4}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {card.holderName} · Validade {card.expiry}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveCard(card.id)}
                    aria-label={`Remover cartão final ${card.last4}`}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Monthly Subscriptions */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Assinaturas Mensais
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Pedale todo dia com minutos inclusos e isenção da taxa de desbloqueio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Pagar assinatura com:</span>
            <select
              aria-label="Forma de pagamento para assinatura"
              value={subPaymentMethod}
              onChange={(e) =>
                setSubPaymentMethod(
                  e.target.value as 'carteira' | 'pix' | 'cartao' | 'nupay'
                )
              }
              className="h-10 pl-3 pr-8 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100"
            >
              <option value="carteira">Carteira Digital</option>
              <option value="nupay">NuPay (Nubank)</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão Cadastrado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customerAccount.subscriptionPlans.map((plan) => {
            const isActivePlan = customerAccount.activeSubscription?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-6 flex flex-col justify-between gap-6 card-elevated card-lift ${
                  isActivePlan
                    ? 'border-emerald-500 dark:border-emerald-400'
                    : 'border-zinc-200/90 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    {isActivePlan && (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Plano ativo
                      </span>
                    )}
                  </div>

                  <p className="font-display text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {formatCurrencyBRL(plan.priceMonthly)}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      /mês
                    </span>
                  </p>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {plan.description}
                  </p>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Até {plan.freeMinutesPerRide} min grátis por viagem ·{' '}
                    {plan.includesElectric ? 'Inclui bikes Elétricas' : 'Bikes Urbanas, Gravel e Estrada'} ·{' '}
                    {plan.extraMinuteDiscountPct}% off em minutos extras
                  </p>
                </div>

                {isActivePlan ? (
                  <button
                    type="button"
                    onClick={onCancelSubscription}
                    className="min-h-[44px] w-full px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                  >
                    Cancelar assinatura mensal
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={subBusyId === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    className="min-h-[44px] w-full px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 rounded-xl transition-colors"
                  >
                    {subBusyId === plan.id ? 'Ativando...' : `Assinar ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {nuPayPrompt && (
        <NuPayCheckoutModal
          open={Boolean(nuPayPrompt)}
          amount={nuPayPrompt.amount}
          title={nuPayPrompt.title}
          subtitle={nuPayPrompt.subtitle}
          allowInstallments={false}
          onClose={() => setNuPayPrompt(null)}
          onAuthorize={async (confirmation) => {
            if (nuPayPrompt.kind === 'topup') {
              await onTopUpWallet(nuPayPrompt.amount, 'nupay');
              setFeedback({
                type: 'ok',
                text: `Recarga de ${formatCurrencyBRL(nuPayPrompt.amount)} aprovada pelo NuPay (${confirmation.transactionId}).`,
              });
            } else if (nuPayPrompt.kind === 'sub' && nuPayPrompt.planId) {
              await onSubscribePlan(nuPayPrompt.planId, 'nupay');
              setFeedback({
                type: 'ok',
                text: `Assinatura ativada pelo NuPay (${confirmation.transactionId}).`,
              });
            }
          }}
        />
      )}
    </div>
  );
}
