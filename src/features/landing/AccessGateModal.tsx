import { useState, useEffect } from 'react';
import { X, Lock, Key } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AccessGateModal({ onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/access-gate', { password });
      onSuccess();
    } catch (e) {
      setError(apiErrorMessage(e) || 'Contraseña incorrecta');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <style>{`
        @keyframes gateShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-line/80 bg-surface/90 p-8 text-ink shadow-[0_30px_70px_rgba(74,21,27,0.12)] backdrop-blur-xl"
        style={{ animation: shake ? 'gateShake .4s' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-5 top-5 text-ink-soft/70 transition-all hover:text-ink hover:bg-surface-alt p-1.5 rounded-full border border-line/40 cursor-pointer"
        >
          <X className="size-4.5" />
        </button>

        {/* Lock Icon Badge */}
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-granate-tenue text-granate shadow-inner">
          <Lock className="size-5.5" />
        </div>

        {/* Title & Info */}
        <h2 className="mb-2 text-2xl font-extrabold leading-tight text-ink">
          Área de Acceso Restringido
        </h2>
        <p className="mb-6 text-xs leading-relaxed text-ink-soft">
          Para ver el panel del equipo de CosteAR, ingresá la contraseña autorizada.
        </p>

        {/* Form Input */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft/75">
            Contraseña del Equipo
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Ingresá la clave del equipo"
              className="w-full rounded-2xl border border-line bg-surface/60 pl-11 pr-4 py-3.5 text-sm text-ink placeholder-ink-soft/40 outline-none transition-all focus:border-granate focus:ring-1 focus:ring-granate"
            />
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-ink-soft/45" />
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs font-semibold text-danger flex items-center gap-1.5 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-danger inline-block" /> {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={submit}
          disabled={password.trim().length === 0 || loading}
          className="mt-6 w-full rounded-full py-4 text-xs font-bold text-white bg-action shadow-lg shadow-action/20 transition-all hover:bg-action-soft hover:shadow-xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Verificando…' : 'Acceder al Equipo'}
        </button>
      </div>
    </div>
  );
}
