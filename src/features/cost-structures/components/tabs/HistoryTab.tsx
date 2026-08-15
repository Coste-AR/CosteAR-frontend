import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Money, Percent } from '@/components/ui/Money';
import { useCalculationHistory } from '../../cost-structure-hooks';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { RunHistoryPanel } from '../RunHistoryPanel';
import { LateDataInbox } from '../LateDataInbox';
import { LateDataPolicySelector } from '../LateDataPolicySelector';

/**
 * Pestaña Historial. Arriba, lo que requiere una decisión (datos atrasados) y el
 * historial de CORRIDAS —que incluye las automáticas sin validar—; abajo, el
 * historial legado de cálculos, que sigue igual.
 *
 * El orden no es casual: primero lo que está esperando a una persona.
 */
export function HistoryTab({ structureId }: { structureId: string }) {
  return (
    <div className="space-y-4">
      <LateDataInbox />
      {/* Debajo de la bandeja a propósito: primero lo que espera una decisión,
          y recién después la forma de dejar de tener que tomarla cada vez. */}
      <LateDataPolicySelector structureId={structureId} />
      <RunHistoryPanel structureId={structureId} />
      <LegacyCalculationHistory structureId={structureId} />
    </div>
  );
}

function LegacyCalculationHistory({ structureId }: { structureId: string }) {
  const { data: history, isLoading } = useCalculationHistory(structureId);
  if (isLoading) return <p className="text-sm text-ink-soft">Cargando…</p>;
  if (!history?.length) return null;
  return (
    <Card>
      <CardHeader title="Historial de cálculos" description="Últimos 50 snapshots" />
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              {['Fecha','Costo prod.','COGS','Margen'].map((h, i) => (
                <th key={h} className={cn('px-6 py-3 font-semibold', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((c: any, i: number) => (
              <tr key={c.id} className={cn('hover:bg-surface-alt/50', i === 0 && 'bg-action/5')}>
                <td className="px-6 py-3 text-ink">
                  {formatDate(c.calculatedAt)}
                  {i === 0 && <span className="ml-2 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-semibold text-action">Último</span>}
                </td>
                {/* Esta tabla lee `cost_calculations`, cuyas columnas son PLANAS
                    (`productionCost`, `calculatedAt`). Estaba escrita contra la
                    forma de una CORRIDA (`c.results.productionCost`,
                    `c.executedAt`), que es otro contrato: la fila no tiene
                    `results`, así que la pantalla explotaba con
                    "Cannot read properties of undefined (reading 'productionCost')".

                    No saltaba porque el historial venía vacío —solo el endpoint
                    legado escribía esa tabla y ya casi no se usaba— y el
                    `if (!history?.length) return null` de arriba cortaba antes.
                    T-07 hizo que la corrida única escriba la fila, el historial
                    dejó de estar vacío y el bug despertó. */}
                <td className="px-6 py-3 text-right"><Money value={Number(c.productionCost)} /></td>
                <td className="px-6 py-3 text-right"><Money value={Number(c.costOfGoodsSold)} /></td>
                <td className="px-6 py-3 text-right"><Percent value={Number(c.grossMarginPct)} colorize /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
