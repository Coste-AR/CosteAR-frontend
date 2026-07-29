import { useState, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { InteractiveDotGrid } from '@/components/layout/InteractiveDotGrid';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRegister, type RegisterPayload, type ProfessionalType } from './auth-hooks';
import { apiErrorMessage, api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = ['Cuenta', 'Datos profesionales', 'Tu cartera', 'Preferencias'] as const;

const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: 'CONTADOR_PUBLICO', label: 'Contador Público' },
  { value: 'LIC_ADMINISTRACION', label: 'Lic. en Administración' },
  { value: 'CONSULTOR_INDEPENDIENTE', label: 'Consultor independiente' },
  { value: 'ANALISTA_INTERNO', label: 'Analista interno' },
  { value: 'OTRO', label: 'Otro' },
];

interface ClientDraft {
  name: string;
  industry: string;
  cuit: string;
}

type Draft = {
  name: string;
  email: string;
  password: string;
  cuit: string;
  dni: string;
  professionalType: ProfessionalType | '';
  licenseNumber: string;
  province: string;
  hasClients: boolean | null;
  clients: ClientDraft[];
  marginThresholdPct: number;
};

const EMPTY: Draft = {
  name: '',
  email: '',
  password: '',
  cuit: '',
  dni: '',
  professionalType: '',
  licenseNumber: '',
  province: 'Tucumán',
  hasClients: null,
  clients: [],
  marginThresholdPct: 15,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [cuitTaken, setCuitTaken] = useState(false);
  const [emailCheckFailed, setEmailCheckFailed] = useState(false);
  const [cuitCheckFailed, setCuitCheckFailed] = useState(false);
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cuitCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatCuit = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  };

  const CUIT_COMPLETE = /^\d{2}-\d{8}-\d$/;

  const runEmailCheck = async (val: string) => {
    try {
      const res = await api.get<{ data: { available: boolean } }>(`/auth/check-email?email=${encodeURIComponent(val)}`);
      setEmailTaken(!res.data.data.available);
      setEmailCheckFailed(false);
    } catch {
      // La verificación en sí falló (red, 500, etc.) — no sabemos si el email
      // está disponible o no. No podemos asumir que sí: eso dejaría avanzar a
      // la usuaria como si estuviera confirmado, para recién enterarse del
      // conflicto en el submit final con un error crudo.
      setEmailCheckFailed(true);
      toast.error('No pudimos verificar el email. Revisá tu conexión y reintentá.');
    }
  };

  const runCuitCheck = async (formatted: string) => {
    try {
      const res = await api.get<{ data: { available: boolean } }>(`/auth/check-cuit?cuit=${encodeURIComponent(formatted)}`);
      setCuitTaken(!res.data.data.available);
      setCuitCheckFailed(false);
    } catch {
      setCuitCheckFailed(true);
      toast.error('No pudimos verificar el CUIT. Revisá tu conexión y reintentá.');
    }
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const finalValue = key === 'cuit' ? formatCuit(value as string) as Draft[K] : value;
    setDraft((d) => ({ ...d, [key]: finalValue }));

    if (key === 'email') {
      setEmailTaken(false);
      setEmailCheckFailed(false);
      if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
      const val = value as string;
      if (/\S+@\S+\.\S+/.test(val)) {
        emailCheckRef.current = setTimeout(() => { void runEmailCheck(val); }, 600);
      }
    }
    if (key === 'cuit') {
      setCuitTaken(false);
      setCuitCheckFailed(false);
      if (cuitCheckRef.current) clearTimeout(cuitCheckRef.current);
      const formatted = formatCuit(value as string);
      if (CUIT_COMPLETE.test(formatted)) {
        cuitCheckRef.current = setTimeout(() => { void runCuitCheck(formatted); }, 400);
      }
    }
  };

  const canContinue = (): boolean => {
    if (step === 0) return (
      draft.name.length >= 2 &&
      EMAIL_RE.test(draft.email) &&
      CUIT_RE_COMPLETE.test(draft.cuit) &&
      validateCuit(draft.cuit) &&
      passwordStrength(draft.password) === 4 &&
      !emailTaken &&
      !cuitTaken &&
      !emailCheckFailed &&
      !cuitCheckFailed
    );
    if (step === 1) return !!draft.professionalType;
    if (step === 2) return draft.hasClients !== null;
    return true;
  };

  const submit = async () => {
    setError(null);
    const payload: RegisterPayload = {
      name: draft.name,
      email: draft.email,
      password: draft.password,
      cuit: draft.cuit,
      dni: draft.dni || undefined,
      professionalType: draft.professionalType as ProfessionalType,
      licenseNumber: draft.licenseNumber || undefined,
      province: draft.province,
      marginThresholdPct: draft.marginThresholdPct,
      initialClients: draft.hasClients
        ? draft.clients
            .filter((c) => c.name.trim().length >= 2)
            .map((c) => ({
              name: c.name.trim(),
              industry: c.industry.trim() || undefined,
              cuit: c.cuit.trim() || undefined,
            }))
        : undefined,
    };
    try {
      await register.mutateAsync(payload);
      await navigate({ to: '/dashboard' });
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      if ((e as { response?: { status?: number } })?.response?.status === 409) {
        setStep(0);
      }
    }
  };

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
            Registro
          </span>
        </div>

        <Stepper step={step} />

        <div className="mt-8 space-y-6">
          {step === 0 && (
            <StepAccount
              draft={draft}
              set={set}
              emailTaken={emailTaken}
              cuitTaken={cuitTaken}
              emailCheckFailed={emailCheckFailed}
              cuitCheckFailed={cuitCheckFailed}
              onRetryEmail={() => runEmailCheck(draft.email)}
              onRetryCuit={() => runCuitCheck(draft.cuit)}
            />
          )}
          {step === 1 && <StepProfessional draft={draft} set={set} />}
          {step === 2 && <StepClients draft={draft} set={set} />}
          {step === 3 && <StepPreferences draft={draft} set={set} />}
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12px] font-semibold text-danger animate-fade-in">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line/40 pt-6">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} className="rounded-full">
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()} className="rounded-full px-6 py-2.5">
              Continuar <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={register.isPending} className="rounded-full px-6 py-2.5">
              Crear cuenta
            </Button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-granate font-bold hover:text-action transition-colors">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="relative mb-8">
      {/* Background track connecting lines */}
      <div className="absolute left-[12.5%] right-[12.5%] top-4 -translate-y-1/2 h-0.5 bg-line z-0">
        <div 
          className="h-full bg-granate transition-all duration-500 ease-out" 
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Steps circles and labels container */}
      <div className="relative z-10 flex justify-between w-full">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center flex-1">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 border bg-surface',
                i < step
                  ? 'bg-granate border-granate text-white shadow-sm'
                  : i === step
                    ? 'bg-action border-action text-white shadow-md shadow-action/25 scale-105'
                    : 'border-line text-ink-soft'
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span 
              className={cn(
                'text-[10px] mt-2 font-bold tracking-tight text-center leading-none',
                i === step ? 'text-ink font-extrabold' : 'text-ink-soft/75'
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type SetFn = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_RULES = [
  { label: 'Mínimo 10 caracteres', test: (p: string) => p.length >= 10 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
];

function passwordStrength(p: string): number {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

const CUIT_RE_COMPLETE = /^\d{2}-\d{8}-\d$/;

function validateCuit(cuit: string): boolean {
  const digits = cuit.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  if (remainder === 1) return false;
  const expectedVerifier = remainder === 0 ? 0 : 11 - remainder;
  return Number(digits[10]) === expectedVerifier;
}

function StepAccount({
  draft,
  set,
  emailTaken,
  cuitTaken,
  emailCheckFailed,
  cuitCheckFailed,
  onRetryEmail,
  onRetryCuit,
}: {
  draft: Draft;
  set: SetFn;
  emailTaken: boolean;
  cuitTaken: boolean;
  emailCheckFailed: boolean;
  cuitCheckFailed: boolean;
  onRetryEmail: () => void;
  onRetryCuit: () => void;
}) {
  const emailInvalid = draft.email.length > 0 && !EMAIL_RE.test(draft.email);
  const cuitDigits = draft.cuit.replace(/\D/g, '');
  const cuitTyping = cuitDigits.length > 0 && cuitDigits.length < 11;
  const cuitComplete = CUIT_RE_COMPLETE.test(draft.cuit);
  const cuitValid = cuitComplete && validateCuit(draft.cuit);

  const strength = passwordStrength(draft.password);
  const strengthColors = ['bg-danger', 'bg-danger', 'bg-yellow-400', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte'];

  return (
    <>
      <h2 className="text-xl font-bold text-ink">Creá tu cuenta</h2>
      <Input label="Nombre y apellido" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <div>
        <Input label="Email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
        {emailInvalid && !emailTaken && (
          <p className="mt-1 text-[12px] text-danger">Ingresá un email válido (ej: nombre@dominio.com)</p>
        )}
        {emailTaken && !emailInvalid && (
          <p className="mt-1 text-[12px] text-danger">Ya existe una cuenta con ese email. <Link to="/login" className="underline">Iniciá sesión</Link></p>
        )}
        {emailCheckFailed && (
          <p className="mt-1 text-[12px] text-danger">
            No pudimos verificar el email.{' '}
            <button type="button" onClick={onRetryEmail} className="underline font-semibold">Reintentar</button>
          </p>
        )}
      </div>
      <div>
        <Input label="CUIT/CUIL" placeholder="20-12345678-9" value={draft.cuit} onChange={(e) => set('cuit', e.target.value)} />
        {cuitTyping && (
          <p className="mt-1 text-[12px] text-yellow-600">Formato incompleto ({11 - cuitDigits.length} dígitos restantes)</p>
        )}
        {cuitComplete && !cuitValid && !cuitTaken && (
          <p className="mt-1 text-[12px] text-danger">CUIT inválido (dígito verificador incorrecto)</p>
        )}
        {cuitTaken && (
          <p className="mt-1 text-[12px] text-danger">Este CUIT ya está registrado. <Link to="/login" className="underline">Iniciá sesión</Link></p>
        )}
        {cuitCheckFailed && (
          <p className="mt-1 text-[12px] text-danger">
            No pudimos verificar el CUIT.{' '}
            <button type="button" onClick={onRetryCuit} className="underline font-semibold">Reintentar</button>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Input label="Contraseña" type="password" value={draft.password} onChange={(e) => set('password', e.target.value)} />
        {draft.password.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-1 gap-1">
              {[1, 2, 3, 4].map((v) => (
                <div key={v} className={cn('h-full flex-1 rounded-sm bg-line', strength >= v && strengthColors[strength])} />
              ))}
            </div>
            <p className="text-[11px] font-medium text-ink-soft">
              Seguridad: <span className="font-bold text-ink">{strengthLabels[strength]}</span>
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px] text-ink-soft">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(draft.password);
            return (
              <div key={r.label} className={cn('flex items-center gap-1.5', ok ? 'text-emerald-600' : 'opacity-70')}>
                <Check className={cn('size-3.5', ok ? 'opacity-100' : 'opacity-0')} />
                <span>{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function StepProfessional({ draft, set }: { draft: Draft; set: SetFn }) {
  return (
    <>
      <h2 className="text-xl font-bold text-ink">Datos profesionales</h2>
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
          Tipo de profesional
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROFESSIONAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('professionalType', t.value)}
              className={cn(
                'rounded-md border px-4 py-3 text-left text-xs font-medium transition-all hover:bg-surface-alt',
                draft.professionalType === t.value
                  ? 'border-granate bg-granate-tenue text-granate shadow-sm'
                  : 'border-line text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="DNI (opcional)"
          value={draft.dni}
          onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))}
        />
        <Input
          label="Matrícula (opcional)"
          value={draft.licenseNumber}
          onChange={(e) => set('licenseNumber', e.target.value)}
        />
      </div>

      <Input
        label="Provincia de actuación"
        value={draft.province}
        onChange={(e) => set('province', e.target.value)}
      />
    </>
  );
}

function StepClients({ draft, set }: { draft: Draft; set: SetFn }) {
  const addClient = () => set('clients', [...draft.clients, { name: '', industry: '', cuit: '' }]);
  const updateClient = (i: number, patch: Partial<ClientDraft>) =>
    set('clients', draft.clients.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeClient = (i: number) => set('clients', draft.clients.filter((_, idx) => idx !== i));

  return (
    <>
      <h2 className="text-xl font-bold text-ink">Tu cartera</h2>
      <p className="text-sm text-ink-soft">¿Ya tenés clientes (PyMEs) que querés cargar ahora?</p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            set('hasClients', true);
            if (draft.clients.length === 0) addClient();
          }}
          className={cn(
            'rounded-md border px-4 py-3 text-sm font-medium transition-colors',
            draft.hasClients === true
              ? 'border-granate bg-granate-tenue text-granate'
              : 'border-line text-ink hover:bg-surface-alt',
          )}
        >
          Sí, cargar ahora
        </button>
        <button
          type="button"
          onClick={() => set('hasClients', false)}
          className={cn(
            'rounded-md border px-4 py-3 text-sm font-medium transition-colors',
            draft.hasClients === false
              ? 'border-granate bg-granate-tenue text-granate'
              : 'border-line text-ink hover:bg-surface-alt',
          )}
        >
          Más tarde
        </button>
      </div>

      {draft.hasClients && (
        <div className="space-y-3">
          {draft.clients.map((c, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
                  Cliente {i + 1}
                </span>
                <button type="button" onClick={() => removeClient(i)} className="text-ink-soft hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input placeholder="Nombre" value={c.name} onChange={(e) => updateClient(i, { name: e.target.value })} />
                <Input placeholder="Rubro" value={c.industry} onChange={(e) => updateClient(i, { industry: e.target.value })} />
                <Input placeholder="CUIT (opc.)" value={c.cuit} onChange={(e) => updateClient(i, { cuit: e.target.value })} />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addClient}>
            <Plus className="size-4" /> Agregar otro cliente
          </Button>
        </div>
      )}
    </>
  );
}

function StepPreferences({ draft, set }: { draft: Draft; set: SetFn }) {
  return (
    <>
      <h2 className="text-xl font-bold text-ink">Preferencias</h2>
      <Input
        label="Umbral de alerta de margen (%)"
        type="number"
        step="0.1"
        numeric
        hint="Te avisamos cuando el margen de un cliente caiga por debajo de este valor"
        value={draft.marginThresholdPct}
        onChange={(e) => set('marginThresholdPct', Number(e.target.value))}
      />
      <div className="rounded-md bg-surface-alt p-4 text-[13px] text-ink-soft">
        Vas a poder activar la <strong className="text-ink">verificación en dos pasos (2FA)</strong> desde
        tu perfil una vez dentro, para máxima seguridad de tu cuenta.
      </div>
    </>
  );
}
