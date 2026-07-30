import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { InteractiveDotGrid } from '@/components/layout/InteractiveDotGrid';

interface LoginForm {
  identifier: string;
  password: string;
  twoFactorCode?: string;
}

/** True si el valor parece ser un CUIT/CUIL (solo dígitos y guiones, sin letras). */
function looksLikeCuit(val: string): boolean {
  // El guion al final de la clase ya es literal: escaparlo no cambia qué matchea.
  return /^[\d-]+$/.test(val);
}

/** Formatea dígitos a XX-XXXXXXXX-X mientras se escribe. */
function formatCuit(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState, watch, setValue } = useForm<LoginForm>();

  const identifierValue = watch('identifier', '');

  // Se considera email si contiene @ O si tiene letras (está escribiendo un email sin @ aún)
  const hasLetters = /[a-zA-Z]/.test(identifierValue);
  const isEmail = identifierValue.includes('@') || hasLetters;
  const isCuitMode = !isEmail && looksLikeCuit(identifierValue);

  const cuitDigits = identifierValue.replace(/\D/g, '');
  const cuitTyping = isCuitMode && cuitDigits.length > 0 && cuitDigits.length < 11;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await login.mutateAsync(values);
      if (result?.user?.mustChangePassword) {
        await navigate({ to: '/change-password' });
      } else if (result?.user?.needsTermsAcceptance) {
        await navigate({ to: '/accept-terms' });
      } else if (result?.user?.role === 'ADMIN') {
        window.location.href = 'http://localhost:5176';
      } else {
        await navigate({ to: '/dashboard' });
      }
    } catch (e) {
      const msg = apiErrorMessage(e);
      if (msg.toLowerCase().includes('dos factores') || msg.includes('TWO_FACTOR')) {
        setNeeds2fa(true);
        setError('Ingresá el código de tu app de autenticación');
      } else {
        setError(msg);
      }
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12 overflow-hidden">
      {/* Dynamic Floating Background Glows */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.05); }
        }
        .animate-orb-1 {
          animation: orbFloat1 12s ease-in-out infinite;
        }
        .animate-orb-2 {
          animation: orbFloat2 15s ease-in-out infinite;
        }
      `}</style>

      {/* Interactive 3D Dot Grid Background */}
      <InteractiveDotGrid />

      {/* Ambient Glows */}
      <div 
        className="pointer-events-none absolute left-[-10%] top-[-10%] h-[550px] w-[550px] rounded-full bg-granate-tenue opacity-70 blur-[130px] animate-orb-1 z-0" 
      />
      <div 
        className="pointer-events-none absolute right-[-5%] bottom-[-5%] h-[500px] w-[500px] rounded-full bg-action-soft/10 opacity-55 blur-[120px] animate-orb-2 z-0" 
      />

      {/* Main glass card container with deep floating shadow */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-line/60 bg-surface/80 p-8 sm:p-10 shadow-[0_32px_80px_rgba(74,21,27,0.08),_0_8px_24px_rgba(179,25,41,0.04)] backdrop-blur-md animate-rise">
        
        {/* Logo and Brand */}
        <div className="mb-8 flex items-center justify-between border-b border-line/40 pb-5">
          <div className="flex items-center gap-2.5">
            <CosteARLogo className="h-9 w-auto text-granate" />
            <span className="text-xl font-extrabold tracking-tight text-granate">CosteAR</span>
          </div>
          <span className="text-[10px] font-bold text-ink-soft/70 uppercase tracking-wider bg-surface-alt border border-line/50 px-2.5 py-1 rounded-full">
            Acceso
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-granate-deep">Ingresá a tu cuenta</h1>
            <p className="text-xs text-ink-soft">Gestioná las estructuras de costos de tu cartera</p>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                label="CUIT/CUIL o email"
                autoComplete="username"
                placeholder="20-12345678-9 o usuario@mail.com"
                inputMode={isEmail ? 'email' : 'numeric'}
                {...register('identifier', { required: true })}
                onChange={(e) => {
                  const val = e.target.value;
                  const formatted = looksLikeCuit(val) && !val.includes('@')
                    ? formatCuit(val)
                    : val;
                  setValue('identifier', formatted, { shouldValidate: false });
                }}
              />
              {cuitTyping && (
                <p className="mt-1 text-[11px] font-semibold text-amber-600">
                  Faltan {11 - cuitDigits.length} dígitos
                </p>
              )}
            </div>

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                className="pr-10"
                {...register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute bottom-0 right-0 flex h-11 w-10 items-center justify-center text-ink-soft hover:text-granate"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {needs2fa && (
              <Input
                label="Código de verificación"
                inputMode="numeric"
                placeholder="000000"
                numeric
                {...register('twoFactorCode')}
              />
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12px] font-semibold text-danger animate-fade-in">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full py-4 text-xs font-bold shadow-lg shadow-action/10"
            loading={formState.isSubmitting}
            disabled={!identifierValue.trim() || !watch('password')}
          >
            Ingresar al Panel
          </Button>

          <div className="flex items-center justify-between text-xs pt-4 border-t border-line/40">
            <Link to="/forgot-password" className="text-ink-soft hover:text-granate transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link to="/register" className="text-granate font-bold hover:text-action transition-colors">
              Crear cuenta
            </Link>
          </div>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-ink-soft/70">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Conexión cifrada de extremo a extremo
        </p>
      </div>
    </div>
  );
}
