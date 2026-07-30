import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCurrentTerms, useAcceptTerms } from './auth-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { apiErrorMessage } from '@/lib/api';

/**
 * Gate obligatorio post-login — mismo patrón que ChangePasswordPage (primer
 * login de operadores invitados). El router redirige acá cuando
 * `user.needsTermsAcceptance` es true: no se puede navegar a ninguna otra
 * pantalla hasta aceptar. Cubre tanto usuarios nuevos que de alguna forma
 * llegaron sin aceptar, como usuarios existentes cuando se publica una
 * versión nueva de los Términos.
 */
export function AcceptTermsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: terms, isLoading, isError } = useCurrentTerms();
  const acceptTerms = useAcceptTerms();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!terms || !checked) return;
    setError(null);
    try {
      await acceptTerms.mutateAsync(terms.id);
      if (user?.role === 'EMPRESA_OPERATOR') {
        await navigate({ to: '/portal' });
      } else {
        await navigate({ to: '/dashboard' });
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12">
      <div className="flex w-full max-w-xl flex-col rounded-2xl border border-line bg-surface shadow-sm animate-rise">
        <div className="border-b border-line px-8 py-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-action font-bold text-white">C</div>
            <span className="text-xl font-bold tracking-tight text-granate">CosteAR</span>
          </div>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-action/10">
            <FileText className="size-5 text-action" />
          </div>
          <h1 className="text-xl font-bold text-ink">
            {terms && terms.version > 1 ? 'Actualizamos los Términos y Condiciones' : 'Términos y Condiciones'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Antes de seguir, necesitamos que los leas y los aceptes de nuevo.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-8 py-5 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
          {isLoading && <p className="text-ink-soft">Cargando…</p>}
          {isError && (
            <p className="font-semibold text-danger">
              No pudimos cargar los Términos y Condiciones. Recargá la página.
            </p>
          )}
          {terms?.content}
        </div>

        <div className="border-t border-line px-8 py-5">
          <label className="flex items-start gap-3 text-[13px] text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-granate"
              checked={checked}
              disabled={!terms}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              Leí y acepto los Términos y Condiciones{terms ? ` (v${terms.version})` : ''}.
            </span>
          </label>

          {error && (
            <div className="mt-3 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
          )}

          <Button
            className="mt-4 w-full"
            onClick={handleAccept}
            loading={acceptTerms.isPending}
            disabled={!checked || !terms}
          >
            Aceptar y continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
