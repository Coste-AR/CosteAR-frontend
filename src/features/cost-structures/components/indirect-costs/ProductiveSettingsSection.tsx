import { Plus, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UseFormRegister, UseFieldArrayReturn } from 'react-hook-form';
import { fmtBudget } from './helpers';
import { centerLabel } from '@/lib/utils';

export function ProductiveSettingsSection({
  productiveCenters,
  prodSettings,
  register,
  watchedProdSettings
}: {
  productiveCenters: any[];
  prodSettings: UseFieldArrayReturn<any, 'productiveSettings'>;
  register: UseFormRegister<any>;
  watchedProdSettings: any[];
}) {
  if (productiveCenters.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => prodSettings.append({ centerId: '', budget: { fixed: 0, variable: 0 }, normalCapacity: 0, actualActivity: 0, actualCip: 0 })}
        >
          <Plus className="size-3" /> Agregar
        </Button>
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Cuotas y variaciones por centro productivo
        </h4>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
        <table className="block w-full text-sm sm:table">
          <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
            <tr className="text-[10px]">
              <th className="px-3 py-1.5" />
              <th colSpan={3} className="px-3 py-1.5 text-center font-bold text-action">Presupuestado (calculado)</th>
              <th colSpan={2} className="border-l-2 border-line px-3 py-1.5 text-center font-bold text-ink">Datos reales (fin de mes)</th>
              <th className="px-3 py-1.5" />
            </tr>
            <tr>
              <th className="px-3 py-2 text-left font-medium">Centro</th>
              <th className="bg-surface-alt/60 px-3 py-2 text-right font-medium text-action">
                <span className="inline-flex items-center justify-end gap-1">
                  <Lock className="size-3" /> Presup. fijo $
                </span>
              </th>
              <th className="bg-surface-alt/60 px-3 py-2 text-right font-medium text-action">
                <span className="inline-flex items-center justify-end gap-1">
                  <Lock className="size-3" /> Presup. variable $
                </span>
              </th>
              <th className="px-3 py-2 text-right font-medium">Cap. normal (hs)</th>
              <th className="border-l-2 border-line px-3 py-2 text-right font-medium">Actividad real (hs)</th>
              <th className="px-3 py-2 text-right font-medium">CIP real $</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
            {prodSettings.fields.map((f, i) => (
              <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                <td data-label="Centro" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-auto" {...register(`productiveSettings.${i}.centerId`)}>
                    <option value="">Elegir…</option>
                    {productiveCenters
                      .filter(c => {
                        const usedInOtherRows = (watchedProdSettings ?? [])
                          .some((p, j) => j !== i && p.centerId === c.id);
                        return !usedInOtherRows;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>{centerLabel(c)}</option>
                      ))}
                  </select>
                </td>
                <td data-label="Presup. fijo $ (calculado, no editable)" className="block rounded-lg bg-surface-alt/40 p-1.5 before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-action before:content-[attr(data-label)] sm:table-cell sm:rounded-none sm:bg-surface-alt/40 sm:px-2 sm:py-1.5 sm:before:hidden">
                  <div className="flex w-full items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft sm:w-28" title="Calculado automáticamente por el prorrateo (no editable)">
                    <Lock className="size-3 shrink-0 text-action/50" />
                    <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.fixed)}</span>
                  </div>
                  <input type="hidden" {...register(`productiveSettings.${i}.budget.fixed`, { valueAsNumber: true })} />
                </td>
                <td data-label="Presup. variable $ (calculado, no editable)" className="block rounded-lg bg-surface-alt/40 p-1.5 before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-action before:content-[attr(data-label)] sm:table-cell sm:rounded-none sm:bg-surface-alt/40 sm:px-2 sm:py-1.5 sm:before:hidden">
                  <div className="flex w-full items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft sm:w-28" title="Calculado automáticamente por el prorrateo (no editable)">
                    <Lock className="size-3 shrink-0 text-action/50" />
                    <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.variable)}</span>
                  </div>
                  <input type="hidden" {...register(`productiveSettings.${i}.budget.variable`, { valueAsNumber: true })} />
                </td>
                <td data-label="Cap. normal (hs)" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`productiveSettings.${i}.normalCapacity`, { valueAsNumber: true })} /></td>
                <td data-label="Actividad real (hs) — fin de mes" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:border-l-2 sm:border-line sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`productiveSettings.${i}.actualActivity`, { valueAsNumber: true })} /></td>
                <td data-label="CIP real $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`productiveSettings.${i}.actualCip`, { valueAsNumber: true })} /></td>
                <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                  <button type="button" onClick={() => prodSettings.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
            {prodSettings.fields.length === 0 && (
              <tr className="block sm:table-row"><td colSpan={7} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Cargando centros…</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-soft">
        <Lock className="size-3 text-action/60" />
        El <strong className="font-medium text-action">presupuesto fijo/variable</strong> se calcula automáticamente con el prorrateo (primario + cierre del secundario) al guardar. Solo cargás capacidad normal, actividad real y CIP real.
      </p>
    </section>
  );
}
