import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UseFormRegister, UseFieldArrayReturn, UseFormSetValue } from 'react-hook-form';
import { BaseSelect } from './BaseSelect';
import { type AllocationBase } from '../../allocation-base-hooks';
import { centerLabel } from '@/lib/utils';

export function PrimaryAllocationSection({ 
  concepts, 
  register,
  setValue,
  watchedConcepts,
  watchedCenters,
  allocationBases,
  companyId
}: {
  concepts: UseFieldArrayReturn<any, 'concepts'>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watchedConcepts: any[];
  watchedCenters: any[];
  allocationBases: AllocationBase[] | undefined;
  companyId?: string;
}) {
  const [showPasteConcepts, setShowPasteConcepts] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    try {
      const lines = pasteText.split('\n').filter(l => l.trim() !== '');
      const parsedConcepts = lines.map((line, idx) => {
        const parts = line.split('\t');
        if (parts.length < 3) {
          throw new Error(`Fila ${idx + 1}: Debe tener al menos Concepto, Monto Fijo y Monto Variable.`);
        }
        const [name, fixedStr, varStr, ...distStrs] = parts;
        const fixedVal = fixedStr?.trim();
        const varVal = varStr?.trim();
        const fixed = !fixedVal || isNaN(Number(fixedVal)) ? 0 : Number(fixedVal);
        const variable = !varVal || isNaN(Number(varVal)) ? 0 : Number(varVal);

        const distribution: Record<string, number> = {};
        watchedCenters?.forEach((center, cIdx) => {
          const val = distStrs[cIdx];
          if (val && !isNaN(Number(val.trim()))) {
            distribution[center.id] = Number(val.trim());
          }
        });

        return {
          name: name?.trim() || '',
          amount: { fixed, variable },
          distribution,
          allocationMode: 'percent',
          baseCode: ''
        };
      });

      parsedConcepts.forEach(c => concepts.append(c));
      setPasteText('');
      setPasteError(null);
      setShowPasteConcepts(false);
    } catch (e: any) {
      setPasteError(e.message || 'Error al parsear el texto de Excel.');
    }
  };

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
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Conceptos de CIF y prorrateo primario (%)</h4>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowPasteConcepts(!showPasteConcepts)}>
            Pegar de Excel
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => concepts.append({ name: '', amount: { fixed: 0, variable: 0 }, distribution: {}, allocationMode: 'percent', baseCode: '' })}>
            <Plus className="size-3" /> Concepto
          </Button>
        </div>
      </div>

      {showPasteConcepts && (
        <div className="mb-4 rounded-xl border border-line bg-surface-alt p-4 space-y-3 animate-rise">
          <p className="text-[11px] text-ink-soft">
            Copiá las columnas de tu Excel (Concepto, Fijo, Variable, y luego los porcentajes correspondientes a cada centro de costo) y pegalas abajo:
          </p>
          <textarea
            className="w-full h-24 rounded-xl border border-line bg-surface p-2 text-xs font-mono outline-none focus:border-granate text-ink"
            placeholder={`Ejemplo:\nAlquiler\t150000\t0\t60\t40\nFuerza Motriz\t0\t80000\t70\t30`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPasteConcepts(false); setPasteError(null); }}>Cancelar</Button>
            <Button type="button" size="sm" onClick={handlePasteImport}>Procesar e Importar</Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
        <table className="block w-full text-sm sm:table">
          <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Concepto</th>
              <th className="px-3 py-2 text-right font-medium">Fijo $</th>
              <th className="px-3 py-2 text-right font-medium">Variable $</th>
              <th className="w-36 px-3 py-2 text-left font-medium">Modo</th>
              {watchedCenters?.map((c) => (
                <th key={c.id} className="w-20 px-3 py-2 text-right font-medium">{centerLabel(c)} (base)</th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
            {concepts.fields.map((f, i) => {
              const cMode = (watchedConcepts ?? [])[i]?.allocationMode === 'base' ? 'base' : 'percent';
              const cDrivers = (watchedConcepts ?? [])[i]?.distribution as Record<string, any> | undefined;
              return (
              <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                <td data-label="Concepto" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Alquiler, Energía…" {...register(`concepts.${i}.name`)} />
                </td>
                <td data-label="Fijo $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`concepts.${i}.amount.fixed`, { valueAsNumber: true })} />
                </td>
                <td data-label="Variable $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`concepts.${i}.amount.variable`, { valueAsNumber: true })} />
                </td>
                <td data-label="Modo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`concepts.${i}.allocationMode`)}>
                    <option value="percent">Manual (%)</option>
                    <option value="base">Automático (por base)</option>
                  </select>
                </td>
                {cMode === 'base' ? (
                  <td colSpan={watchedCenters?.length ?? 1} className="block sm:table-cell sm:px-2 sm:py-1.5">
                    <div className="rounded-lg border border-dashed border-action/40 bg-surface-alt/40 p-2.5">
                      <div className="mb-2">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Base de distribución</span>
                        <input type="hidden" {...register(`concepts.${i}.baseCode`)} />
                        <BaseSelect
                          bases={allocationBases}
                          companyId={companyId}
                          value={(watchedConcepts ?? [])[i]?.baseCode ?? ''}
                          onSelect={(code) => setValue(`concepts.${i}.baseCode`, code, { shouldDirty: true })}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(watchedCenters ?? []).map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1">
                            <span className="text-[12px] text-ink-soft">{centerLabel(c)}</span>
                            <input type="number" step="any" inputMode="decimal" className="w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
                            <span className="w-12 text-right text-[11px] font-medium text-action">{driverPct(cDrivers, c.id)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10.5px] text-ink-soft">Cargá la unidad de cada centro (ej. m²). El % se deriva solo (unidad ÷ total) y lo aplica el motor.</p>
                    </div>
                  </td>
                ) : (
                  watchedCenters?.map((c) => (
                    <td key={c.id} data-label={`${centerLabel(c)} %`} className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
                    </td>
                  ))
                )}
                <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                  <button type="button" onClick={() => concepts.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
              );
            })}
            {concepts.fields.length === 0 && (
              <tr className="block sm:table-row"><td colSpan={6 + (watchedCenters?.length ?? 0)} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Sin conceptos. Agregá los costos indirectos de fabricación.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">
        En modo <em>Manual (%)</em>, cargá un valor por centro para cada fila — no hace falta que sumen 100: el sistema reparte según la proporción entre centros (valor ÷ total de la fila). En modo <em>Automático (por base)</em>, elegís una base física (ej. superficie) y cargás la unidad de cada centro; el % lo deriva el sistema solo, de la misma forma.
      </p>
    </section>
  );
}
