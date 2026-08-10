import { AlertTriangle, Info } from 'lucide-react';
import { Money } from '@/components/ui/Money';
import { formatHours, type IdleCapacitySummary } from './idle-capacity';

/**
 * LA LÍNEA DE CAPACIDAD OCIOSA.
 *
 * El costo de las horas pagadas que no se pudieron asignar a ninguna orden. Va
 * SIEMPRE en su propia línea, con sus horas y sus pesos: si se disolviera en la
 * tarifa, las órdenes absorberían un costo que no es suyo y nadie podría verlo.
 *
 * No calcula: muestra lo que armó `buildIdleCapacity` a partir de las horas
 * cargadas y del cálculo persistido.
 */

/**
 * Qué pasa hoy con este importe. Es el mismo texto en la hoja de Mano de Obra y
 * en el Resultado: el costista no puede leer dos historias distintas del mismo
 * número. Dice lo que ES —el costo queda absorbido en el producto— y avisa que
 * el tratamiento definitivo todavía se está definiendo.
 */
export function IdleCapacityDestinationNote({ compact }: { compact?: boolean }) {
  return (
    <p className={compact ? 'text-[10.5px] leading-snug text-ink-soft' : 'text-[11.5px] leading-snug text-ink-soft'}>
      <strong className="font-semibold text-ink">Destino contable: en definición.</strong>{' '}
      Hoy este costo queda <strong className="font-medium text-ink">absorbido en el costo del producto</strong>:
      el total de Mano de Obra Directa del estado de costos lo incluye. La cátedra (Clase 10) lo trata
      como <em>una pérdida de la empresa, no un costo del producto</em>. Cuál de los dos tratamientos
      queda es una definición pendiente: mientras tanto la línea se muestra aparte para que se sepa
      cuánto del costo del producto es capacidad ociosa.
    </p>
  );
}

/** La distinción que más se confunde: ociosidad no es ausentismo pago. */
function IdleVsAbsenceNote() {
  return (
    <p className="text-[11px] leading-snug text-ink-soft">
      No confundir con el <strong className="font-medium text-ink">ausentismo pago (IAP)</strong>: ahí
      el operario no está en planta (vacaciones, enfermedad, feriados) y su costo ya viaja dentro del
      índice de cargas sociales. Acá el operario <strong className="font-medium text-ink">está presente
      y cobra</strong>, pero no hay trabajo que asignarle. Los dos conviven.
    </p>
  );
}

interface Props {
  summary: IdleCapacitySummary;
  /** Muestra el detalle departamento por departamento. */
  showDepartments?: boolean;
}

export function IdleCapacityPanel({ summary, showDepartments = true }: Props) {
  const conOciosidad = summary.departments.filter((d) => d.hasIdleCapacity);

  return (
    <div className="space-y-2.5 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          Capacidad ociosa — horas pagadas sin trabajo asignado
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[18px] font-bold leading-tight text-ink">
            {formatHours(summary.idleHours)}
          </span>
          {summary.idleCost != null && (
            <span className="text-[18px] font-bold leading-tight text-ink">
              <Money value={summary.idleCost} />
            </span>
          )}
          <span className="text-[11px] text-ink-soft">
            {summary.idleSharePercent.toLocaleString('es-AR', { maximumFractionDigits: 1 })} % de la
            presencia en fábrica
          </span>
        </div>
      </div>

      <dl className="space-y-1 border-t border-warn/20 pt-2 text-[12px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Horas pagadas — presencia en fábrica</dt>
          <dd className="tabular-nums text-ink">{formatHours(summary.paidHours)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Horas netas productivas — imputables a las órdenes</dt>
          <dd className="tabular-nums text-ink">{formatHours(summary.productiveHours)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 font-semibold">
          <dt className="text-ink">Horas ociosas</dt>
          <dd className="tabular-nums text-ink">{formatHours(summary.idleHours)}</dd>
        </div>
        {summary.idleCost != null && (
          <>
            <div className="flex items-baseline justify-between gap-3 border-t border-warn/20 pt-1">
              <dt className="text-ink-soft">Costo total de mano de obra</dt>
              <dd className="tabular-nums text-ink"><Money value={summary.fullMod} /></dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">Mano de obra imputable a las órdenes</dt>
              <dd className="tabular-nums text-ink"><Money value={summary.applicableMod} /></dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 font-semibold">
              <dt className="text-ink">Costo de la capacidad ociosa</dt>
              <dd className="tabular-nums text-ink"><Money value={summary.idleCost} /></dd>
            </div>
          </>
        )}
      </dl>

      {showDepartments && conOciosidad.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Departamento</th>
                <th className="px-3 py-1.5 text-right font-medium">Pagadas</th>
                <th className="px-3 py-1.5 text-right font-medium">Netas productivas</th>
                <th className="px-3 py-1.5 text-right font-medium">Ociosas</th>
                <th className="px-3 py-1.5 text-right font-medium">Costo ocioso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {conOciosidad.map((d, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 text-ink">{d.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{formatHours(d.paidHours)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{formatHours(d.productiveHours)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium text-ink">{formatHours(d.idleHours)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                    {d.idleCost != null ? <Money value={d.idleCost} /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.idleCost == null && (
        <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink">
          <Info className="mt-0.5 size-3.5 shrink-0 text-warn" />
          <span>Presioná <strong>Calcular</strong> para ver cuánto cuestan esas horas ociosas.</span>
        </p>
      )}

      {summary.hasExceeded && (
        <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            En algún departamento cargaste más horas netas productivas que horas pagadas. No se puede
            producir más de lo que se paga: el cálculo las recorta al valor de las horas pagadas y ese
            departamento queda sin capacidad ociosa.
          </span>
        </p>
      )}

      <IdleVsAbsenceNote />
      <IdleCapacityDestinationNote />
    </div>
  );
}

/**
 * Versión de una línea para el Detalle MOD del Resultado, donde el espacio es
 * una columna angosta. Mismo número, mismo rótulo, misma advertencia.
 */
export function IdleCapacityResultLine({ summary }: { summary: IdleCapacitySummary }) {
  return (
    <div className="space-y-1 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2">
      <div className="flex justify-between gap-2">
        <span className="font-medium text-ink">Capacidad ociosa</span>
        <span className="font-medium text-ink">
          {summary.idleCost != null ? <Money value={summary.idleCost} /> : '—'}
        </span>
      </div>
      <div className="flex justify-between gap-2 text-[11px] text-ink-soft">
        <span>Horas ociosas — pagadas sin trabajo asignado</span>
        <span className="tabular-nums">{formatHours(summary.idleHours)}</span>
      </div>
      <div className="flex justify-between gap-2 text-[11px] text-ink-soft">
        <span>Mano de obra imputable a las órdenes</span>
        <span className="tabular-nums">
          {summary.applicableMod != null ? <Money value={summary.applicableMod} /> : '—'}
        </span>
      </div>
      <IdleCapacityDestinationNote compact />
    </div>
  );
}
