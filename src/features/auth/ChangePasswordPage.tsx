import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { KeyRound, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSetFirstPassword } from './auth-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { label: 'Mínimo 10 caracteres', test: (p: string) => p.length >= 10 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
];

function passwordStrength(p: string): number {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setFirstPassword = useSetFirstPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const strengthColors = ['bg-danger', 'bg-danger', 'bg-yellow-400', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte'];
  const canSubmit = strength === 4 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await setFirstPassword.mutateAsync(password);
      // needsTermsAcceptance ya venía en el user del login (antes de este
      // cambio de contraseña) — si hace falta, va primero: ver los Términos
      // antes que el portal/dashboard, no después.
      if (user?.needsTermsAcceptance) {
        await navigate({ to: '/accept-terms' });
      } else if (user?.role === 'EMPRESA_OPERATOR') {
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
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 shadow-sm animate-rise">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-action font-bold text-white">C</div>
          <span className="text-xl font-bold tracking-tight text-granate">CosteAR</span>
        </div>

        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-action/10">
          <KeyRound className="size-5 text-action" />
        </div>
        <h1 className="mt-3 text-xl font-bold text-ink">Cambiá tu contraseña</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Es tu primer ingreso. Elegí una contraseña segura para continuar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {PASSWORD_RULES.map((_, i) => (
                    <div
                      key={i}
                      className={cn('h-1 flex-1 rounded-full transition-colors', i < strength ? strengthColors[strength] : 'bg-line')}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-ink-soft">{strengthLabels[strength]}</p>
                <div className="space-y-1">
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.label} className={cn('flex items-center gap-1.5 text-[12px]', rule.test(password) ? 'text-green-500' : 'text-ink-soft')}>
                      <div className={cn('size-3 rounded-full border', rule.test(password) ? 'bg-green-500 border-green-500' : 'border-line')} />
                      {rule.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Input
              label="Confirmá la contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm.length > 0 && password !== confirm && (
              <p className="mt-1 text-[12px] text-danger">Las contraseñas no coinciden</p>
            )}
            {confirm.length > 0 && password === confirm && strength === 4 && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-green-600">
                <Check className="size-3" /> Todo listo
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
          )}

          <Button type="submit" className="w-full" loading={setFirstPassword.isPending} disabled={!canSubmit}>
            Guardar y continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
