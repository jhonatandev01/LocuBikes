import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { PaymentMethod, PaymentStatus, Transaction } from '../types/bike';
import { formatCurrencyBRL } from '../utils/pricing';

interface PaymentsViewProps {
  transactions: Transaction[];
}

export function PaymentsView({ transactions }: PaymentsViewProps) {
  const [methodFilter, setMethodFilter] = useState<'todos' | PaymentMethod>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | PaymentStatus>('todos');

  const summary = useMemo(() => {
    const paid = transactions.filter((t) => t.status === 'pago');
    const totalPaid = paid.reduce((acc, t) => acc + t.amount, 0);
    const pixTotal = paid
      .filter((t) => t.method === 'pix')
      .reduce((acc, t) => acc + t.amount, 0);
    const cardTotal = paid
      .filter((t) => t.method === 'cartao')
      .reduce((acc, t) => acc + t.amount, 0);
    const pendingTotal = transactions
      .filter((t) => t.status === 'pendente')
      .reduce((acc, t) => acc + t.amount, 0);
    return { totalPaid, pixTotal, cardTotal, pendingTotal };
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (methodFilter !== 'todos' && t.method !== methodFilter) return false;
      if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, methodFilter, statusFilter]);

  const handleExportCsv = () => {
    const headers = ['Reserva', 'Cliente', 'Bicicleta', 'Metodo', 'Parcelas', 'Valor_BRL', 'Status', 'Data'];
    const rows = filtered.map((t) => [
      t.reservationCode,
      `"${t.customerName.replace(/"/g, '""')}"`,
      `"${t.bikeModel.replace(/"/g, '""')}"`,
      t.method,
      String(t.installments),
      t.amount.toFixed(2),
      t.status,
      t.createdAt,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `locubikes-pagamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatMethod = (method: PaymentMethod, installments: number) => {
    if (method === 'pix') return 'Pix';
    if (method === 'nupay') return installments > 1 ? `NuPay (${installments}x)` : 'NuPay';
    if (method === 'cartao') return `Cartão (${installments}x)`;
    if (method === 'carteira') return 'Carteira';
    if (method === 'assinatura') return 'Assinatura';
    return 'Na Retirada';
  };

  const formatStatus = (status: PaymentStatus) => {
    if (status === 'pago') return 'Pago';
    if (status === 'pendente') return 'Pendente';
    return 'Estornado';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Pagamentos e Receita
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Extrato completo das locações, corridas por QR Code, recargas e assinaturas recebidas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      {/* 4-column financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Receita confirmada</p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {formatCurrencyBRL(summary.totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Recebimentos Pix</p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatCurrencyBRL(summary.pixTotal)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Cartão de Crédito</p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {formatCurrencyBRL(summary.cardTotal)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">A receber (pendente)</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
            {formatCurrencyBRL(summary.pendingTotal)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg overflow-x-auto max-w-full"
          role="tablist"
          aria-label="Filtrar por método de pagamento"
        >
          {(
            [
              { id: 'todos', label: 'Todos os métodos' },
              { id: 'pix', label: 'Pix' },
              { id: 'nupay', label: 'NuPay' },
              { id: 'cartao', label: 'Cartão' },
              { id: 'carteira', label: 'Carteira' },
              { id: 'assinatura', label: 'Assinatura' },
              { id: 'presencial', label: 'Na Retirada' },
            ] as { id: 'todos' | PaymentMethod; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={methodFilter === tab.id}
              onClick={() => setMethodFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                methodFilter === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="payment-status-filter" className="sr-only">
            Filtrar por status do pagamento
          </label>
          <select
            id="payment-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'todos' | PaymentStatus)}
            className="h-10 pl-3 pr-8 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
          >
            <option value="todos">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="estornado">Estornado</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-zinc-950/60">
                <th className="py-3 px-4">Reserva</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Bicicleta</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma transação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {tx.reservationCode}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {tx.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {tx.bikeModel}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatMethod(tx.method, tx.installments)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          tx.status === 'pago'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : tx.status === 'pendente'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {formatStatus(tx.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums whitespace-nowrap">
                      {formatCurrencyBRL(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
