import { useState } from 'react';
import { Inbox, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/api';
import {
  useUnassignedDataEntries,
  useAssignDepartment,
  type UnassignedDataEntry,
} from '@/features/validaciones/validaciones-hooks';
import { useProcessDepartments } from '../../process-costing-hooks';

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
};

/**
 * DOCUMENTOS PENDIENTES DE ASIGNAR (integración clasificador ↔ Procesos).
 *
 * Un documento clasificado (MP/MOD/CIF) que se aprobó en Validaciones sin
 * elegir departamento no pierde su monto — queda visible ACÁ hasta que
 * alguien lo asigne. El departamento SIEMPRE es una decisión del costista:
 * esta pantalla nunca sugiere ni aprueba nada por su cuenta.
 */
export function PendingDocumentsTab({ structureId }: { structureId: string }) {
  const { data: entries, isLoading, error } = useUnassignedDataEntries(structureId);
  const { data: deptData } = useProcessDepartments(structureId);
  const departments = deptData?.departments ?? [];
  const asignar = useAssignDepartment();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [fallo, setFallo] = useState<string | null>(null);

  const asignarEntry = async (entry: UnassignedDataEntry) => {
    const deptId = selected[entry.id];
    if (!deptId) return;
    setFallo(null);
    try {
      const result = await asignar.mutateAsync({ entryId: entry.id, processDepartmentId: deptId });
      if (result.populationWarning) {
        toast(result.populationWarning, { icon: '⚠️', duration: 8000 });
      } else {
        toast.success('Monto acumulado en el departamento.');
      }
    } catch (e) {
      setFallo(apiErrorMessage(e));
    }
  };

  if (isLoading) {
    return <p className="py-10 text-center text-[13px] text-ink-soft">Cargando…</p>;
  }
  if (error) {
    return (
      <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
        {apiErrorMessage(error)}
      </div>
    );
  }

  const items = entries ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center">
        <Inbox className="mx-auto mb-2 size-6 text-ink-soft" />
        <p className="text-[13px] text-ink-soft">
          No hay documentos pendientes de asignar. Todo lo aprobado en Validaciones ya tiene su
          departamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {departments.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
          Todavía no hay departamentos cargados — creá al menos uno en la pestaña «Departamentos»
          para poder asignar estos documentos.
        </div>
      )}

      {fallo && (
        <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{fallo}</div>
      )}

      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        {items.map((entry, i) => {
          const audit = entry.classificationAudits[0];
          const section = audit?.costSection ?? '';
          return (
            <li
              key={entry.id}
              className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-bold text-violet-700">
                    {SECTION_LABELS[section] ?? section}
                  </span>
                  {entry.fileName && (
                    <span className="flex items-center gap-1 text-[11px] text-ink-soft">
                      <FileText className="size-3" /> {entry.fileName}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[13px] text-ink">{entry.rawContent}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink focus:border-granate focus:outline-none"
                  value={selected[entry.id] ?? ''}
                  onChange={(e) => setSelected((s) => ({ ...s, [entry.id]: e.target.value }))}
                  disabled={departments.length === 0}
                >
                  <option value="">Elegí un departamento…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.sequence}. {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selected[entry.id] || asignar.isPending}
                  onClick={() => void asignarEntry(entry)}
                  className="rounded-xl bg-granate px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-granate-deep disabled:opacity-40"
                >
                  Asignar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
