import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { Money } from '@/components/ui/Money';
import { formatHours, type IdleCapacityBucket, type IdleCapacitySummary } from './idle-capacity';

/**
 * LA LÍNEA DE CAPACIDAD OCIOSA.
 *
 * El costo de las horas pagadas que no se pudieron asignar a ninguna orden. Va
 * SIEMPRE en su propia línea, con sus horas y sus pesos, y ABIERTA POR TIPO DE
 * IMPRODUCTIVIDAD: si se mostrara como un número solo, el costista sabría que
 * perdió plata pero no por qué, que es lo único accionable.
 *
 * No calcula: muestra lo que armó `buildIdleCapacity` a partir de las horas
 * cargadas y del cálculo persistido.
 */

/**
 * Qué pasa con este importe. Es el mismo texto en la hoja de Mano de Obra y en
 * el Resultado: el costista no puede leer dos historias distintas del mismo
 * número. Un cálculo viejo, hecho cuando el costo se absorbía en el producto,
 * sigue explicándose como lo que fue.
 */
export function IdleCapacityDestinationNote({
  compact,
  destination = 'perdida-del-periodo',
}: {
  compact?: boolean;
  destination?: IdleCapacitySummary['destination'];
}) {
  const cls = compact
    ? 'text-[10.5px] leading-snug text-ink-soft'
    : 'text-[11.5px] leading-snug text-ink-soft';

  if (destination === 'absorbido-en-el-producto') {
    return (
      <p className={cls}>
        <strong className="font-semibold text-ink">Cálculo anterior:</strong> este resultado se
        generó cuando el costo ocioso quedaba{' '}
        <strong className="font-medium text-ink">absorbido en el costo del producto</strong>.
        Volvé a calcular para pasarlo al estado de resultados, como manda la cátedra.
      </p>
    );
  }

  return (
    <p className={cls}>
      <strong className="font-semibold text-ink">Es una pérdida del período, no un costo del
      producto.</strong>{' '}
      Este importe <strong className="font-medium text-ink">no integra el costo de producción</strong>:
      va al estado de resultados como otro egreso. El cliente no tiene culpa de la ineficiencia
      interna, así que no se le puede cargar (cátedra, Clase 10).
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

/** Qué significa cada tipo, en los términos de la cátedra. */
const AYUDA_POR_TIPO: Record<IdleCapacityBucket['tipo'], string> = {
  'tiempos-perdidos-informados':
    'La empresa conoce la causa y la registra en la planilla de producción: corte de energía, ' +
    'rotura de máquina, falta de materia prima, mantenimiento programado, descanso.',
  'improductividad-oculta':
    'No se informa: surge de comparar las horas netas productivas contra el tiempo estándar de ' +
    'producción de la oficina técnica. Se trabajó, pero por debajo de lo que debería haber llevado.',
};

/**
 * EL CARTEL. La capacidad ociosa no puede ser un renglón más: es plata perdida.
 * Se muestra arriba de todo, con el importe, el desglose y el nivel que mandó el
 * motor (crítico a partir del 20 % de la presencia en fábrica).
 */
export function IdleCapacityAlertBanner({
  summary,
  compact,
}: {
  summary: IdleCapacitySummary;
  compact?: boolean;
}) {
  const alerta = summary.alert;
  if (!alerta) return null;

  const critico = alerta.level === 'critico';
  const Icono = critico ? OctagonAlert : AlertTriangle;

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-2.5 rounded-xl border-l-4 px-4 py-3',
        critico
          ? 'border-l-danger border border-danger/30 bg-danger/10'
          : 'border-l-warn border border-warn/30 bg-warn/10',
      ].join(' ')}
    >
      <Icono className={`mt-0.5 size-5 shrink-0 ${critico ? 'text-danger' : 'text-warn'}`} />
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-bold text-ink">
          <span>{alerta.title}</span>
          <span className="text-[15px]">
            <Money value={alerta.cost} />
          </span>
          <span className="text-[11px] font-medium text-ink-soft">
            {alerta.sharePercent.toLocaleString('es-AR', { maximumFractionDigits: 1 })} % de la
            presencia en fábrica
          </span>
        </p>
        {!compact && (
          <p className="text-[11.5px] leading-snug text-ink">{alerta.message}</p>
        )}
        <IdleCapacityDestinationNote compact destination={summary.destination} />
      </div>
    </div>
  );
}

/** El desglose por TIPO de improductividad, con sus motivos si se cargaron. */
export function IdleCapacityBreakdown({ summary }: { summary: IdleCapacitySummary }) {
  if (summary.breakdown.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        Por tipo de improductividad — Clase 10
      </p>
      {summary.breakdown.map((b) => (
        <div key={b.tipo} className="space-y-0.5">
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="font-medium text-ink">{b.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {formatHours(b.hours)}
              {b.cost > 0 && (
                <>
                  {' · '}
                  <Money value={b.cost} />
                </>
              )}
            </span>
          </div>
          <p className="text-[10.5px] leading-snug text-ink-soft">{AYUDA_POR_TIPO[b.tipo]}</p>
          {b.reasons.length > 0 && (
            <ul className="mt-0.5 space-y-0.5 border-l-2 border-line pl-2.5">
              {b.reasons.map((r, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="text-ink-soft">{r.reason}</span>
                  <span className="shrink-0 tabular-nums text-ink-soft">
                    {formatHours(r.hours)}
                    {r.cost > 0 && (
                      <>
                        {' · '}
                        <Money value={r.cost} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  summary: IdleCapacitySummary;
  /** Muestra el detalle departamento por departamento. */
  showDepartments?: boolean;
}

export function IdleCapacityPanel({ summary, showDepartments = true }: Props) {
  const conOciosidad = summary.departments.filter((d) => d.hasIdleCapacity);
  const hayEstandar = summary.departments.some((d) => d.standardHours !== undefined);

  return (
    <div className="space-y-2.5">
      <IdleCapacityAlertBanner summary={summary} />

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
            <dt className="text-ink-soft">
              (−) Tiempos perdidos informados
            </dt>
            <dd className="tabular-nums text-ink">
              {formatHours(summary.paidHours - summary.productiveHours)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Horas netas productivas</dt>
            <dd className="tabular-nums text-ink">{formatHours(summary.productiveHours)}</dd>
          </div>
          {hayEstandar && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">(−) Improductividad oculta</dt>
                <dd className="tabular-nums text-ink">
                  {formatHours(summary.productiveHours - summary.chargeableHours)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">
                  Horas imputables a las órdenes — tiempo estándar
                </dt>
                <dd className="tabular-nums text-ink">{formatHours(summary.chargeableHours)}</dd>
              </div>
            </>
          )}
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
                <dt className="text-ink">Pérdida por capacidad ociosa</dt>
                <dd className="tabular-nums text-ink"><Money value={summary.idleCost} /></dd>
              </div>
            </>
          )}
        </dl>

        <IdleCapacityBreakdown summary={summary} />

        {showDepartments && conOciosidad.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Departamento</th>
                  <th className="px-3 py-1.5 text-right font-medium">Pagadas</th>
                  <th className="px-3 py-1.5 text-right font-medium">Netas productivas</th>
                  <th className="px-3 py-1.5 text-right font-medium">Perdidas informadas</th>
                  <th className="px-3 py-1.5 text-right font-medium">Improd. oculta</th>
                  <th className="px-3 py-1.5 text-right font-medium">Ociosas</th>
                  <th className="px-3 py-1.5 text-right font-medium">Pérdida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {conOciosidad.map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-ink">{d.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{formatHours(d.paidHours)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{formatHours(d.productiveHours)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{formatHours(d.informedLostHours)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">
                      {d.standardHours === undefined ? '—' : formatHours(d.hiddenIdleHours)}
                    </td>
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
        <IdleCapacityDestinationNote destination={summary.destination} />
      </div>
    </div>
  );
}

/**
 * Versión de una línea para el Detalle MOD del Resultado, donde el espacio es
 * una columna angosta. Mismo número, mismo rótulo, misma advertencia.
 */
export function IdleCapacityResultLine({ summary }: { summary: IdleCapacitySummary }) {
  return (
    <div className="space-y-1.5">
      <IdleCapacityAlertBanner summary={summary} compact />
      <div className="space-y-1 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2">
        <div className="flex justify-between gap-2">
          <span className="font-medium text-ink">Pérdida por capacidad ociosa</span>
          <span className="font-medium text-ink">
            {summary.idleCost != null ? <Money value={summary.idleCost} /> : '—'}
          </span>
        </div>
        {summary.breakdown.map((b) => (
          <div key={b.tipo} className="flex justify-between gap-2 text-[11px] text-ink-soft">
            <span>{b.label}</span>
            <span className="tabular-nums">
              {formatHours(b.hours)}
              {b.cost > 0 && (
                <>
                  {' · '}
                  <Money value={b.cost} />
                </>
              )}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-2 border-t border-warn/20 pt-1 text-[11px] text-ink-soft">
          <span>Mano de obra imputable a las órdenes</span>
          <span className="tabular-nums">
            {summary.applicableMod != null ? <Money value={summary.applicableMod} /> : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
