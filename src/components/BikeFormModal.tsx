import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Bike, BikeCategory, BikeStatus, CreateBikeInput, FrameSize } from '../types/bike';
import { BIKE_IMAGE_PRESETS, defaultImageForCategory } from '../utils/imagePresets';
import { validateBikeInput } from '../utils/pricing';

interface BikeFormModalProps {
  initialBike: Bike | null;
  onClose: () => void;
  onSave: (input: CreateBikeInput, editingId?: string) => Promise<void>;
}

const CATEGORIES: BikeCategory[] = ['Urbana', 'Elétrica', 'Gravel', 'Estrada'];
const FRAME_SIZES: FrameSize[] = ['P', 'M', 'G', 'Único'];

export function BikeFormModal({ initialBike, onClose, onSave }: BikeFormModalProps) {
  const isEditing = Boolean(initialBike);

  const [code, setCode] = useState(initialBike?.code ?? '');
  const [brand, setBrand] = useState(initialBike?.brand ?? '');
  const [model, setModel] = useState(initialBike?.model ?? '');
  const [category, setCategory] = useState<BikeCategory>(initialBike?.category ?? 'Urbana');
  const [frameSize, setFrameSize] = useState<FrameSize>(initialBike?.frameSize ?? 'M');
  const [hourlyRate, setHourlyRate] = useState(String(initialBike?.hourlyRate ?? 30));
  const [dailyRate, setDailyRate] = useState(String(initialBike?.dailyRate ?? 120));
  const [mileageKm, setMileageKm] = useState(String(initialBike?.mileageKm ?? 0));
  const [status, setStatus] = useState<BikeStatus>(initialBike?.status ?? 'disponivel');
  const [specs, setSpecs] = useState(initialBike?.specs ?? '');
  const [maintenanceNote, setMaintenanceNote] = useState(
    initialBike?.maintenanceNote ?? 'Pronta para retirada'
  );
  const [imageUrl, setImageUrl] = useState(
    initialBike?.imageUrl ?? defaultImageForCategory('Urbana')
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCategoryChange = (nextCategory: BikeCategory) => {
    setCategory(nextCategory);
    if (!isEditing) {
      setImageUrl(defaultImageForCategory(nextCategory));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedHourly = Number(hourlyRate);
    const parsedDaily = Number(dailyRate);

    const validationErrors = validateBikeInput({
      code,
      model,
      brand,
      hourlyRate: parsedHourly,
      dailyRate: parsedDaily,
      specs,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setServerError('');
    try {
      await onSave(
        {
          code: code.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          category,
          frameSize,
          hourlyRate: parsedHourly,
          dailyRate: parsedDaily,
          mileageKm: Math.max(0, Number(mileageKm) || 0),
          status,
          specs: specs.trim(),
          maintenanceNote: maintenanceNote.trim(),
          imageUrl: imageUrl.trim() || defaultImageForCategory(category),
        },
        initialBike?.id
      );
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao salvar bicicleta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bike-form-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Gestão da frota</p>
            <h2
              id="bike-form-title"
              className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {isEditing ? `Atualizar ${initialBike?.model}` : 'Adicionar nova bicicleta'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário de bicicleta"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="bike-code"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Código da unidade
              </label>
              <input
                id="bike-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LOC-07"
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-mono uppercase focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.code}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bike-brand"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Marca
              </label>
              <input
                id="bike-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Cannondale"
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              {errors.brand && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.brand}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bike-model"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Modelo
              </label>
              <input
                id="bike-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Quick CX 3"
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              {errors.model && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.model}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="bike-category"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Categoria
              </label>
              <select
                id="bike-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as BikeCategory)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bike-size"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Tamanho do quadro
              </label>
              <select
                id="bike-size"
                value={frameSize}
                onChange={(e) => setFrameSize(e.target.value as FrameSize)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              >
                {FRAME_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bike-status"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Status operacional
              </label>
              <select
                id="bike-status"
                value={status}
                disabled={initialBike?.status === 'alugada'}
                onChange={(e) => setStatus(e.target.value as BikeStatus)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              >
                <option value="disponivel">Disponível</option>
                <option value="manutencao">Em manutenção</option>
                {initialBike?.status === 'alugada' && <option value="alugada">Alugada</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="bike-hourly"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Valor por hora (R$)
              </label>
              <input
                id="bike-hourly"
                type="number"
                min={1}
                step="0.5"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.hourlyRate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bike-daily"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Valor da diária (R$)
              </label>
              <input
                id="bike-daily"
                type="number"
                min={1}
                step="1"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              {errors.dailyRate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dailyRate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bike-mileage"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Quilometragem (km)
              </label>
              <input
                id="bike-mileage"
                type="number"
                min={0}
                value={mileageKm}
                onChange={(e) => setMileageKm(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bike-specs"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Especificações técnicas
            </label>
            <input
              id="bike-specs"
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="Câmbio Shimano 18v · Freio a disco hidráulico · Quadro alumínio"
              className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
            {errors.specs && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.specs}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="bike-note"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Nota de manutenção / estado
            </label>
            <input
              id="bike-note"
              type="text"
              value={maintenanceNote}
              onChange={(e) => setMaintenanceNote(e.target.value)}
              placeholder="Revisão completa e calibragem em dia"
              className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Imagem do modelo (estúdio)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BIKE_IMAGE_PRESETS.map((preset) => {
                const selected = imageUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`p-1.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'border-zinc-900 dark:border-emerald-400 bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full aspect-[4/3] object-cover rounded"
                    />
                    <span className="mt-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {preset.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {serverError && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300"
            >
              {serverError}
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 transition-colors"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Bicicleta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
