import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TraceCard } from '@/features/cost-structures/DerivationTree';
import { DerivationCard } from '@/components/layout/DerivationCard';
import { useTraceMode } from '@/stores/trace-mode-store';
import { PortalOverlay } from '@/components/ui/PortalOverlay';

/**
 * PANEL LATERAL DE TRAZABILIDAD (U10).
 *
 * Vive en el armazón de la app, no en una pantalla: cualquier valor trazable de
 * cualquier vista abre ESTE panel. Adentro va la ficha que ya existía
 * (`TraceCard`), sin reimplementarla — el origen del dato, cómo se calculó, su
 * historial de versiones y el comprobante son los mismos que muestra el árbol de
 * derivación.
 *
 * Se cierra con Escape o tocando fuera, como cualquier panel modal.
 */
export function TraceDrawer() {
  const dataPointId = useTraceMode((s) => s.openDataPointId);
  const derivation = useTraceMode((s) => s.openDerivation);
  const closeTrace = useTraceMode((s) => s.closeTrace);
  const abierto = !!dataPointId || !!derivation;

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTrace();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [abierto, closeTrace]);

  if (!abierto) return null;

  return (
    <PortalOverlay>
    <>
      <div
        className="fixed inset-0 z-40 bg-granate-deep/40 transition-opacity"
        onClick={closeTrace}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Ficha de trazabilidad del dato"
        className="animate-rise fixed right-0 top-0 z-50 flex h-screen w-[430px] max-w-[92vw] flex-col bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {derivation ? 'Cómo se calculó' : 'Trazabilidad del dato'}
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {derivation
                ? 'La fórmula que se usó y los números que entraron en ella.'
                : 'De dónde sale este número y quién lo cargó.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTrace}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-soft hover:bg-granate-tenue hover:text-granate"
            title="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {derivation ? (
            <DerivationCard detail={derivation} />
          ) : (
            <TraceCard dataPointId={dataPointId!} onClose={closeTrace} />
          )}
        </div>
      </aside>
    </>
    </PortalOverlay>
  );
}
