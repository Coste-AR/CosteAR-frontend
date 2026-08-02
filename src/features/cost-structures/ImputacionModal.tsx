import { cn } from '@/lib/utils';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import type { ImputacionOption } from './trazabilidad-types';

/**
 * Doble período (D.3): cuando la fecha de un movimiento cae fuera del
 * período de costo de la estructura, hay que decidir a qué período se
 * imputa. Nunca se decide solo — siempre pregunta.
 */
export function ImputacionModal({
  open, detail, options, onChoose, onCancel, loading,
}: {
  open: boolean;
  detail?: string;
  options: ImputacionOption[];
  onChoose: (periodo: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h3 className="mb-1 text-[15px] font-bold text-granate-deep">¿A qué período imputamos este dato?</h3>
        <p className="mb-4 text-[12.5px] text-ink-soft">
          {detail ? `"${detail}" tiene` : 'Este movimiento tiene'} una fecha que cae fuera del período de costo de esta estructura.
        </p>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.periodo}
              type="button"
              disabled={loading}
              onClick={() => onChoose(o.periodo)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-[13px] transition-colors disabled:opacity-50',
                o.recommended ? 'border-granate bg-granate-tenue text-granate-deep' : 'border-line hover:bg-surface-alt text-ink',
              )}
            >
              {o.label}
              {o.recommended && <span className="ml-2 rounded-full bg-granate px-2 py-0.5 text-[9px] font-bold uppercase text-white">Recomendado</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} disabled={loading} className="mt-4 text-[12px] text-ink-soft hover:text-ink">
          Decidir más tarde
        </button>
      </div>
    </div>
    </PortalOverlay>
  );
}
