import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react';
import type { Bike, BikeStatus } from '../types/bike';
import { formatCurrencyBRL } from '../utils/pricing';

interface FleetManagerViewProps {
  bikes: Bike[];
  onAddBike: () => void;
  onEditBike: (bike: Bike) => void;
  onToggleStatus: (bike: Bike, nextStatus: BikeStatus) => Promise<void>;
  onDeleteBike: (bikeId: string) => Promise<void>;
}

export function FleetManagerView({
  bikes,
  onAddBike,
  onEditBike,
  onToggleStatus,
  onDeleteBike,
}: FleetManagerViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | BikeStatus>('todos');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const counts = useMemo(() => {
    return {
      total: bikes.length,
      disponivel: bikes.filter((b) => b.status === 'disponivel').length,
      alugada: bikes.filter((b) => b.status === 'alugada').length,
      manutencao: bikes.filter((b) => b.status === 'manutencao').length,
    };
  }, [bikes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bikes.filter((b) => {
      if (statusFilter !== 'todos' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.code.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q) ||
        b.brand.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }, [bikes, search, statusFilter]);

  const handleToggleMaintenance = async (bike: Bike) => {
    if (bike.status === 'alugada') return;
    setBusyId(bike.id);
    setErrorMsg('');
    try {
      const next: BikeStatus = bike.status === 'manutencao' ? 'disponivel' : 'manutencao';
      await onToggleStatus(bike, next);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setErrorMsg('');
    try {
      await onDeleteBike(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao excluir bicicleta.');
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: BikeStatus) => {
    if (s === 'disponivel') return 'Disponível';
    if (s === 'alugada') return 'Alugada';
    return 'Manutenção';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gestão da Frota
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre novos modelos, atualize valores de hora e diária, e controle revisões.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddBike}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nova Bicicleta
        </button>
      </div>

      {/* 4-Column Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total na frota</p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {counts.total}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Disponíveis</p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {counts.disponivel}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Em locação</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
            {counts.alugada}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Em manutenção</p>
          <p className="mt-1 font-display text-2xl font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
            {counts.manutencao}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg w-fit max-w-full overflow-x-auto"
          role="tablist"
          aria-label="Filtrar frota por status"
        >
          {(
            [
              { id: 'todos', label: 'Todas' },
              { id: 'disponivel', label: 'Disponíveis' },
              { id: 'alugada', label: 'Alugadas' },
              { id: 'manutencao', label: 'Manutenção' },
            ] as { id: 'todos' | BikeStatus; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="fleet-search" className="sr-only">
            Buscar na frota
          </label>
          <input
            id="fleet-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, modelo ou marca..."
            className="w-full sm:w-80 pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
          />
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      {/* Fleet Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-zinc-950/60">
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4">Modelo e Especificações</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-right">Hora / Diária</th>
                <th className="py-3 px-4 text-right">Km</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma unidade corresponde aos filtros atuais.
                  </td>
                </tr>
              ) : (
                filtered.map((bike) => {
                  const isBusy = busyId === bike.id;
                  return (
                    <tr
                      key={bike.id}
                      data-testid={`fleet-row-${bike.code}`}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {bike.code}
                      </td>
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={bike.imageUrl}
                            alt={bike.model}
                            className="w-12 h-9 object-cover rounded border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {bike.brand} {bike.model}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                              {bike.specs}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {bike.category} · {bike.frameSize}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-900 dark:text-zinc-100 tabular-nums whitespace-nowrap">
                        <div>{formatCurrencyBRL(bike.hourlyRate)}/h</div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {formatCurrencyBRL(bike.dailyRate)}/dia
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {bike.mileageKm} km
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            bike.status === 'disponivel'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : bike.status === 'alugada'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {statusLabel(bike.status)}
                        </span>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-[140px]">
                          {bike.maintenanceNote}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditBike(bike)}
                            aria-label={`Editar ${bike.model}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            Editar
                          </button>

                          {bike.status !== 'alugada' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleMaintenance(bike)}
                              aria-label={
                                bike.status === 'manutencao'
                                  ? `Liberar ${bike.model} da manutenção`
                                  : `Enviar ${bike.model} para manutenção`
                              }
                              title={
                                bike.status === 'manutencao'
                                  ? 'Marcar como disponível'
                                  : 'Colocar em manutenção'
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                              {bike.status === 'manutencao' ? 'Liberar' : 'Revisão'}
                            </button>
                          )}

                          {bike.status !== 'alugada' &&
                            (confirmDeleteId === bike.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(bike.id)}
                                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(bike.id)}
                                aria-label={`Excluir ${bike.model}`}
                                className="inline-flex items-center justify-center w-8 h-8 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
