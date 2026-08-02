import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Percent } from '@/components/ui/Money';
import { cn, formatDate } from '@/lib/utils';
import { useStructureRuns, useValidateRun } from '../trazabilidad-hooks';
import type { RunSummary, RunTrigger } from '../trazabilidad-types';

/**
 * HISTORIAL DE CORRIDAS — la pantalla donde se ve absolutamente todo.
 *
 * Muestra TODAS las corridas del período, incluidas las que el sistema calculó
 * solo y nadie miró. Esconderlas dejaría al costista viendo un costo del día 1 y
 * creyendo que no pasó nada los días 2 y 3, cuando en realidad el sistema venía
 * calculando y guardando.
 *
 * Cada fila dice tres cosas que no se pueden confundir entre sí: quién la
 * disparó, si un humano la dio por buena, y cuándo.
 */

const TRIGGER_LABEL: Record<RunTrigger, string> = {
  MANUAL: 'Calculada a mano',
  AUTO_DAILY: 'Automática del sistema',
  CLOSE: 'Cierre del período',
};

export function RunHistoryPanel({ structureId }: { structureId: string }) {
  const { data: runs, isLoading } = useStructureRuns(structureId);
  const validate = useValidateRun(structureId);

  if (isLoading) return <p className="text-sm text-ink-soft">Cargando historial…</p>;

  if (!runs?.length) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-sm text-ink-soft">
            Todavía no hay ninguna corrida. Presioná <strong>Calcular</strong> para crear la primera.
          </p>
        </CardBody>
      </Card>
    );
  }

  const sinValidar = runs.filter((r) => !r.validated).length;

  return (
    <Card>
      <CardHeader
        title="Historial de corridas"
        description={
          sinValidar > 0
            ? `${runs.length} corrida(s) · ${sinValidar} sin validar`
            : `${runs.length} corrida(s) · todas validadas`
        }
      />
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 text-left font-semibold">Corrida</th>
              <th className="px-5 py-3 text-left font-semibold">Período</th>
              <th className="px-5 py-3 text-left font-semibold">Origen</th>
              <th className="px-5 py-3 text-right font-semibold">Margen</th>
              <th className="px-5 py-3 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                onValidate={() => validate.mutate(run.id)}
                validating={validate.isPending && validate.variables === run.id}
              />
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function RunRow({
  run,
  onValidate,
  validating,
}: {
  run: RunSummary;
  onValidate: () => void;
  validating: boolean;
}) {
  return (
    <tr className={cn('hover:bg-surface-alt/50', !run.validated && 'bg-warning/5')}>
      <td className="px-5 py-3">
        <span className="font-medium text-ink">#{run.runN}</span>
        <span className="ml-2 text-[12px] text-ink-soft">{formatDate(run.executedAt)}</span>
      </td>

      <td className="px-5 py-3 text-[12.5px] text-ink-soft">
        {run.periodo?.label ?? (
          // No se inventa un período: estas corridas son anteriores al modelo.
          <span className="italic">Anterior al modelo de períodos</span>
        )}
      </td>

      <td className="px-5 py-3 text-[12.5px] text-ink-soft">
        {TRIGGER_LABEL[run.trigger]}
        {run.trigger !== 'AUTO_DAILY' && <span className="text-ink-soft"> · {run.executedBy}</span>}
      </td>

      <td className="px-5 py-3 text-right">
        {run.grossMarginPct === null ? (
          <span className="text-[12px] text-ink-soft">—</span>
        ) : (
          <Percent value={Number(run.grossMarginPct)} colorize />
        )}
      </td>

      <td className="px-5 py-3 text-right">
        {run.validated ? (
          <span className="rounded-full bg-action/10 px-2.5 py-0.5 text-[11px] font-semibold text-action">
            Validada
          </span>
        ) : (
          <button
            type="button"
            onClick={onValidate}
            disabled={validating}
            className="rounded-full border border-granate px-2.5 py-0.5 text-[11px] font-semibold text-granate hover:bg-granate-tenue disabled:opacity-50"
            title="Dar por buena esta corrida. Queda registrado quién y cuándo, y no se puede deshacer."
          >
            {validating ? 'Validando…' : 'Sin validar — Validar'}
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * Aviso de que lo que se está mirando todavía no lo revisó nadie.
 *
 * Va arriba del resultado, no al pie: si está abajo, la decisión de precio ya se
 * tomó cuando el costista lo lee.
 */
export function ProvisionalBanner({ motivo }: { motivo?: string }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
      <p className="text-[13px] font-semibold text-ink">Resultado provisorio</p>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">
        {motivo ??
          'Este resultado lo calculó el sistema solo y todavía no lo revisó nadie. Revisá los datos del período y validalo antes de tomarlo por bueno.'}
      </p>
    </div>
  );
}
