import { Fragment } from 'react';
import { Trash2 } from 'lucide-react';
import { UseFormRegister, UseFieldArrayReturn, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import { BaseSelect } from './BaseSelect';
import { type AllocationBase } from '../../allocation-base-hooks';
import { centerLabel } from '@/lib/utils';

export function SecondaryAllocationSection({
  serviceCenters,
  targetCenters,
  serviceDists,
  register,
  setValue,
  getValues,
  watchedServiceDists,
  allocationBases,
  companyId
}: {
  serviceCenters: any[];
  targetCenters: any[];
  serviceDists: UseFieldArrayReturn<any, 'serviceDistributions'>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
  watchedServiceDists: any[];
  allocationBases: AllocationBase[] | undefined;
  companyId?: string;
}) {
  if (serviceCenters.length === 0) return null;

  const driverPct = (drivers: Record<string, any> | undefined, centerId: string): string => {
    if (!drivers) return '—';
    const total = Object.values(drivers).reduce((a: number, v) => a + (Number(v) || 0), 0);
    const val = Number(drivers[centerId]) || 0;
    if (total <= 0 || val <= 0) return '—';
    return `${((val / total) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Prorrateo secundario — distribución de servicios (%)
        </h4>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft">
        <strong className="font-medium text-ink">El orden de las filas es el orden de cierre</strong> (método escalonado):
        el primero cierra primero. Un servicio puede repartir a otro servicio que <em>todavía no cerró</em> — no puede
        repartir a uno que ya cerró (por eso su columna aparece bloqueada más abajo). Usá las flechas para reordenar.
      </p>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft">
        <strong className="font-medium text-ink">Modo de reparto</strong>: <em>Manual (%)</em> = tipeás los porcentajes por centro.
        <em> Automático (por base)</em> = elegís una base física (ej. horas-máquina) y cargás la unidad de cada centro; el porcentaje lo deriva el sistema solo.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
        <table className="block w-full text-sm sm:table">
          <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
            <tr>
              <th className="w-8 px-2 py-2 text-center font-medium" rowSpan={2}>#</th>
              <th className="w-40 px-3 py-2 text-left font-medium" rowSpan={2}>Centro de servicio</th>
              <th className="w-36 px-3 py-2 text-left font-medium" rowSpan={2}>Modo</th>
              {targetCenters.map((c) => (
                <th key={c.id} className="px-3 py-2 text-center font-medium" colSpan={2}>
                  {centerLabel(c)}{c.type === 'service' && <span className="ml-1 text-[9px] text-ink-soft">(servicio)</span>}
                </th>
              ))}
              <th className="w-8 px-3 py-2" rowSpan={2} />
            </tr>
            <tr>
              {targetCenters.map((c) => (
                <Fragment key={c.id}>
                  <th className="w-24 px-2 py-1 text-center font-medium text-[10px] text-ink-soft">Fijo %</th>
                  <th className="w-24 px-2 py-1 text-center font-medium text-[10px] text-ink-soft">Var %</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
            {serviceDists.fields.map((f, i) => {
              const rowMode = (watchedServiceDists ?? [])[i]?.distributionMode ?? 'manual';
              const rowDrivers = (watchedServiceDists ?? [])[i]?.toProductive as Record<string, any> | undefined;
              // DEFECT 1 — valor VIVO del <select> leído del form (no del watch,
              // que puede ir un tick atrasado al reordenar/eliminar). Se usa para
              // garantizar que el centro ya elegido SIEMPRE esté entre las
              // opciones: un <select> nativo que no encuentra su valor entre sus
              // <option> se resetea solo a "Elegir…" — ese era el bug.
              const selfId = getValues(`serviceDistributions.${i}.serviceCenterId`) as string | undefined;
              // DEFECT 3 — escalonado: los servicios de las filas 0..i ya
              // cerraron para esta fila (el orden de filas = orden de cierre), así
              // que sus columnas se bloquean. Incluye el propio centro de la fila.
              // Se recalcula en cada render, con lo que sigue al reordenamiento.
              const closedServiceIds = new Set<string>(
                (watchedServiceDists ?? [])
                  .slice(0, i + 1)
                  .map((d) => d?.serviceCenterId)
                  .filter((x): x is string => !!x)
              );
              return (
              <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                <td data-label="Orden de cierre" className="flex items-center gap-1 before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-granate-tenue text-[11px] font-bold text-granate-deep">{i + 1}</span>
                  <span className="flex flex-col">
                    <button type="button" disabled={i === 0} onClick={() => serviceDists.move(i, i - 1)} className="text-ink-soft hover:text-granate disabled:opacity-20" aria-label="Subir">▲</button>
                    <button type="button" disabled={i === serviceDists.fields.length - 1} onClick={() => serviceDists.move(i, i + 1)} className="text-ink-soft hover:text-granate disabled:opacity-20" aria-label="Bajar">▼</button>
                  </span>
                </td>
                <td data-label="Centro de servicio" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`serviceDistributions.${i}.serviceCenterId`)}>
                    <option value="">Elegir…</option>
                    {serviceCenters
                      .filter(c => {
                        if (c.id === selfId) return true; // el centro ya elegido en ESTA fila jamás se quita de la lista
                        const usedInOtherRows = (watchedServiceDists ?? [])
                          .some((d, j) => j !== i && d.serviceCenterId === c.id);
                        return !usedInOtherRows;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>{centerLabel(c)}</option>
                      ))}
                  </select>
                </td>
                <td data-label="Modo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`serviceDistributions.${i}.distributionMode`)}>
                    <option value="manual">Manual (%)</option>
                    <option value="base">Automático (por base)</option>
                  </select>
                </td>
                {rowMode === 'base' ? (
                  <td colSpan={targetCenters.length * 2} className="block sm:table-cell sm:px-2 sm:py-1.5">
                    <div className="rounded-lg border border-dashed border-action/40 bg-surface-alt/40 p-2.5">
                      <div className="mb-2">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Base de distribución</span>
                        <input type="hidden" {...register(`serviceDistributions.${i}.baseCode`)} />
                        <BaseSelect
                          bases={allocationBases}
                          companyId={companyId}
                          value={(watchedServiceDists ?? [])[i]?.baseCode ?? ''}
                          onSelect={(code) => setValue(`serviceDistributions.${i}.baseCode`, code, { shouldDirty: true })}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {targetCenters.filter((c) => !closedServiceIds.has(c.id)).map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1">
                            <span className="text-[12px] text-ink-soft">{centerLabel(c)}</span>
                            <input type="number" step="any" inputMode="decimal" className="w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductive.${c.id}`, { valueAsNumber: true })} />
                            <span className="w-12 text-right text-[11px] font-medium text-action">{driverPct(rowDrivers, c.id)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10.5px] text-ink-soft">Cargá la unidad de cada centro (ej. horas). El % se deriva solo (unidad ÷ total) y lo aplica el motor al fijo y al variable.</p>
                    </div>
                  </td>
                ) : (
                  targetCenters.map((c) => {
                  // DEFECT 3 — bloqueada si es un servicio que ya cerró para esta
                  // fila (filas 0..i, incluyéndose a sí misma). Se renderiza "—":
                  // no puede recibir reparto (regla del escalonado).
                  const isBlocked = closedServiceIds.has(c.id);
                  return (
                  <Fragment key={c.id}>
                    <td data-label={`${centerLabel(c)} — Fijo %`} className="block text-left before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                      {isBlocked ? <span className="block text-center text-ink-soft/40">—</span> :
                      <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveFixed.${c.id}`, { valueAsNumber: true })} />}
                    </td>
                    <td data-label={`${centerLabel(c)} — Var %`} className="block text-left before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                      {isBlocked ? <span className="block text-center text-ink-soft/40">—</span> :
                      <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveVariable.${c.id}`, { valueAsNumber: true })} />}
                    </td>
                  </Fragment>
                  );
                })
                )}
                <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                  <button type="button" onClick={() => serviceDists.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
              );
            })}
            {serviceDists.fields.length === 0 && (
              <tr className="block sm:table-row"><td colSpan={3 + targetCenters.length * 2 + 1} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Cargando distribuciones…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
