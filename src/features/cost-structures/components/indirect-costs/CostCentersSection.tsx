import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { UseFormRegister, UseFieldArrayReturn } from 'react-hook-form';

export function CostCentersSection({ centers, register }: {
  centers: UseFieldArrayReturn<any, 'centers'>;
  register: UseFormRegister<any>;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Centros de costo</h4>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => centers.append({ id: `prod${centers.fields.length + 1}`, name: '', type: 'productive' })}>
            <Plus className="size-3" /> Productivo
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => centers.append({ id: `serv${centers.fields.length + 1}`, name: '', type: 'service' })}>
            <Plus className="size-3" /> Servicio
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
        <table className="block w-full text-sm sm:table">
          <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Nombre</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
            {centers.fields.map((f, i) => (
              <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                <td data-label="ID" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm font-mono text-ink focus:border-granate focus:outline-none sm:w-24" placeholder="prod1" {...register(`centers.${i}.id`)} />
                </td>
                <td data-label="Nombre" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre del centro" {...register(`centers.${i}.name`)} />
                </td>
                <td data-label="Tipo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                  <Select
                    className="sm:w-auto"
                    {...register(`centers.${i}.type`)}
                    defaultValue={(f as any).type}
                    options={[
                      { value: 'productive', label: 'Productivo' },
                      { value: 'service', label: 'Servicio' },
                    ]}
                  />
                </td>
                <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                  <button type="button" onClick={() => centers.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
            {centers.fields.length === 0 && (
              <tr className="block sm:table-row"><td colSpan={4} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Agregá al menos un centro productivo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
