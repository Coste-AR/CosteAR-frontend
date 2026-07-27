import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useUpdateCostingSystem } from '../../cost-structure-hooks';
import { CostingSystemSelector, type CostingSystem } from './CostingSystemSelector';

const ETIQUETA: Record<CostingSystem, string> = {
  ORDERS: 'Por órdenes',
  PROCESSES: 'Por procesos',
};

/**
 * Muestra con qué sistema se costea esta estructura y permite cambiarlo (U01).
 *
 * El cambio solo lo acepta el backend mientras la estructura no tenga ningún
 * cálculo hecho: cambiar de sistema con un resultado ya emitido significaría
 * reinterpretar números que ya se comunicaron. Si está bloqueado, el 422 del
 * servidor se muestra tal cual — dice el motivo mejor que cualquier texto que
 * podamos adivinar en el frontend.
 */
export function CostingSystemBadge({
  structureId,
  costingSystem,
  readOnly = false,
}: {
  structureId: string;
  costingSystem: CostingSystem;
  readOnly?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<CostingSystem>(costingSystem);
  const [error, setError] = useState<string | null>(null);
  const cambiar = useUpdateCostingSystem(structureId);

  const abrir = () => {
    setElegido(costingSystem);
    setError(null);
    setAbierto(true);
  };

  const confirmar = async () => {
    setError(null);
    try {
      await cambiar.mutateAsync(elegido);
      setAbierto(false);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const pill =
    'inline-flex items-center self-start rounded-full border border-line bg-surface-alt px-2.5 py-0.5 ' +
    'text-[10.5px] font-medium uppercase tracking-wide text-ink-soft';

  if (readOnly) {
    return <span className={pill}>Costeo: {ETIQUETA[costingSystem]}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`${pill} transition-colors hover:border-granate hover:text-granate`}
        title="Cambiar el sistema de costeo"
      >
        Costeo: {ETIQUETA[costingSystem]}
      </button>

      <ConfirmDialog
        open={abierto}
        title="Sistema de costeo"
        confirmLabel="Cambiar"
        loading={cambiar.isPending}
        onConfirm={() => void confirmar()}
        onCancel={() => setAbierto(false)}
        message={
          <div className="space-y-3">
            <p>
              Define cómo se acumula el costo, así que cambiarlo cambia qué datos se cargan. Solo se
              puede mientras la estructura no tenga ningún cálculo hecho.
            </p>
            <CostingSystemSelector
              value={elegido}
              onChange={setElegido}
              disabled={cambiar.isPending}
              idPrefix="cambiar-sistema-costeo"
              stacked
            />
            {error && (
              <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
            )}
          </div>
        }
      />
    </>
  );
}
