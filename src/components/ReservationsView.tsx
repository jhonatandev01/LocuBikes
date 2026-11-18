import { useMemo, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import type { Rental, RentalStatus } from '../types/bike';
import { formatCurrencyBRL } from '../utils/pricing';
import { BikeImage } from './BikeImage';

interface ReservationsViewProps {
  isCompanyMode: boolean;
  rentals: Rental[];
  onCompleteRental: (rentalId: string) => Promise<void>;
  onCancelRental: (rentalId: string) => Promise<void>;
  onPayPendingRental: (rental: Rental) => void;
  onBrowseBikes: () => void;
  onLookupCustomerRentals: (query: string) => Promise<void>;
}

type StatusFilter = 'todas' | RentalStatus;

export function ReservationsView({
  isCompanyMode,
  rentals,
  onCompleteRental,
  onCancelRental,
  onPayPendingRental,
  onBrowseBikes,
  onLookupCustomerRentals,
}: ReservationsViewProps) {
  const [filter, setFilter] = useState<StatusFilter>('todas');
  const [search, setSearch] = useState('');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rentals.filter((r) => {
      if (filter !== 'todas' && r.rentalStatus !== filter) return false;
      if (!q) return true;
      return (
        r.reservationCode.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.bikeModel.toLowerCase().includes(q)
      );
    });
  }, [rentals, filter, search]);

  const statusText = (status: RentalStatus) => {
    if (status === 'ativa') return 'Ativa';
    if (status === 'pendente') return 'Aguardando pagamento';
    if (status === 'concluida') return 'Concluída';
    return 'Cancelada';
  };

  const paymentLabel = (rental: Rental) => {
    const method =
      rental.paymentMethod === 'pix'
        ? 'Pix'
        : rental.paymentMethod === 'cartao'
          ? `Cartão ${rental.installments}x`
          : 'Presencial';
    const state =
      rental.paymentStatus === 'pago'
        ? 'Pago'
        : rental.paymentStatus === 'pendente'
          ? 'Pendente'
          : 'Estornado';
    return `${method} · ${state}`;
  };

  const handleLookupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setActionError('');
    try {
      await onLookupCustomerRentals(lookupInput.trim());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao buscar reserva.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    setBusyId(id);
    setActionError('');
    try {
      await onCompleteRental(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao concluir devolução.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setBusyId(id);
    setActionError('');
    try {
      await onCancelRental(id);
      setConfirmCancelId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao cancelar reserva.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isCompanyMode ? 'Locações da Empresa' : 'Minhas Reservas'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isCompanyMode
              ? 'Acompanhe retiradas ativas, pagamentos pendentes e conclua devoluções para liberar a frota.'
              : 'Acompanhe suas reservas realizadas ou consulte por código da reserva e CPF.'}
          </p>
        </div>

        {isCompanyMode ? (
          <div className="relative">
            <Search
              className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="reservations-search" className="sr-only">
              Buscar por código ou cliente
            </label>
            <input
              id="reservations-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código, cliente ou modelo..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>
        ) : (
          <form onSubmit={handleLookupSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="customer-lookup" className="sr-only">
                Consultar reserva por código ou CPF
              </label>
              <input
                id="customer-lookup"
                type="search"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="Código (ex: LOC-4810) ou CPF..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="px-4 py-2 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              {lookupLoading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>
        )}
      </div>

      {/* Filter tabs */}
      <div
        className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg w-fit max-w-full overflow-x-auto"
        role="tablist"
        aria-label="Filtrar reservas por status"
      >
        {(
          [
            { id: 'todas', label: 'Todas' },
            { id: 'ativa', label: 'Ativas' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'concluida', label: 'Concluídas' },
            { id: 'cancelada', label: 'Canceladas' },
          ] as { id: StatusFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === tab.id
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300"
        >
          {actionError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center space-y-3">
          <p className="font-display text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {isCompanyMode
              ? 'Nenhuma locação nesta categoria'
              : 'Nenhuma reserva encontrada'}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isCompanyMode
              ? 'As novas reservas realizadas pelos clientes aparecerão aqui.'
              : 'Alugue uma bicicleta no catálogo ou informe seu código de reserva / CPF acima.'}
          </p>
          <button
            type="button"
            onClick={onBrowseBikes}
            className="mt-2 inline-flex items-center px-4 py-2 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            Ver catálogo de bikes
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rental) => {
            const isWorking = busyId === rental.id;
            const canManage = rental.rentalStatus === 'ativa' || rental.rentalStatus === 'pendente';
            return (
              <article
                key={rental.id}
                data-testid={`rental-row-${rental.reservationCode}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="w-24 shrink-0 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <BikeImage
                      src={rental.bikeImageUrl}
                      alt={rental.bikeModel}
                      aspectClass="aspect-[4/3]"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {rental.reservationCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rental.pickupDate}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-medium ${
                          rental.rentalStatus === 'ativa'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : rental.rentalStatus === 'pendente'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {statusText(rental.rentalStatus)}
                      </span>
                    </div>

                    <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {rental.bikeBrand} {rental.bikeModel} ({rental.bikeCode})
                    </h2>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Cliente:{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {rental.customerName}
                      </span>{' '}
                      · {rental.duration} {rental.rentalUnit === 'hora' ? 'hora(s)' : 'dia(s)'} ·{' '}
                      {paymentLabel(rental)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Total</p>
                    <p className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                      {formatCurrencyBRL(rental.totalAmount)}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      {rental.paymentStatus === 'pendente' && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => onPayPendingRental(rental)}
                          className="px-3.5 py-2 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                        >
                          Pagar agora
                        </button>
                      )}

                      {isCompanyMode && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleComplete(rental.id)}
                          className="px-3.5 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors whitespace-nowrap"
                        >
                          {isWorking ? 'Salvando...' : 'Concluir Devolução'}
                        </button>
                      )}

                      {confirmCancelId === rental.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleCancel(rental.id)}
                            className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="px-2.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(rental.id)}
                          aria-label={`Cancelar reserva ${rental.reservationCode}`}
                          className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
