import { useState, type FormEvent } from 'react';
import { Lock, X } from 'lucide-react';
import { validateLoginInput } from '../utils/pricing';

interface CompanyLoginModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function CompanyLoginModal({ onClose, onLogin }: CompanyLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateLoginInput({ email, password });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      await onLogin(email.trim(), password);
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-login-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
            <h2
              id="company-login-title"
              className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Acesso da Empresa
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar login da empresa"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Área restrita para gestão da frota, atualização de modelos, devoluções e controle de
            pagamentos.
          </p>

          <div>
            <label
              htmlFor="company-email"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              E-mail
            </label>
            <input
              id="company-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@locubikes.com.br"
              className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="company-password"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Senha
            </label>
            <input
              id="company-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
            )}
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">Credenciais de acesso</p>
            <p className="font-mono">admin@locubikes.com.br · locubikes2026</p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300"
            >
              {serverError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
