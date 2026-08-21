import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from './Button';
import { PortalOverlay } from './PortalOverlay';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' para acciones destructivas (borrar); 'default' para el resto. */
  tone?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación para operaciones que necesitan un paso explícito antes
 * de ejecutarse (borrar / recuperar). Bloquea el fondo y resalta la acción según
 * el tono. No hay sistema de toasts: la confirmación vive en este modal.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = tone === 'danger';

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                isDanger ? 'bg-danger/10 text-danger' : 'bg-action/10 text-action',
              )}
            >
              {isDanger ? <AlertTriangle className="size-5" /> : <RotateCcw className="size-5" />}
            </div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-ink-soft hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mb-5 text-[13px] leading-relaxed text-ink-soft">{message}</div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
