import { useEffect } from 'react';
import { Building2, FileText, Factory } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { cn } from '@/lib/utils';
import { parseAIAnalysis, fmt, DOC_TYPE_OPTIONS, SECTION_LABELS } from './helpers';
import type { DataEntry } from '../validaciones-hooks';
import { useProcessDepartments } from '@/features/cost-structures/process-costing-hooks';

/** Solo estos tres tienen un lugar seguro donde acumular $ en Costeo por Procesos. */
const PROCESS_COST_SECTIONS = new Set(['MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS']);

interface Props {
  reviewing: {
    entry: DataEntry;
    action: "APPROVED" | "REJECTED" | "CORRECTED";
  };
  note: string;
  setNote: (val: string) => void;
  correctedContent: string;
  setCorrectedContent: (val: string) => void;
  correctedType: string;
  setCorrectedType: (val: string) => void;
  correctedSection: string;
  setCorrectedSection: (val: string) => void;
  processDepartmentId: string | null;
  setProcessDepartmentId: (val: string | null) => void;
  setLightboxSrc: (val: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function ReviewValidationModal({
  reviewing,
  note,
  setNote,
  correctedContent,
  setCorrectedContent,
  correctedType,
  setCorrectedType,
  correctedSection,
  setCorrectedSection,
  processDepartmentId,
  setProcessDepartmentId,
  setLightboxSrc,
  onCancel,
  onConfirm,
  isPending
}: Props) {
  const ai = parseAIAnalysis(reviewing.entry.reviewNote);
  const ed = ai?.extractedData as Record<string, unknown> | undefined;
  const amt = ed?.totalAmount ?? ed?.netAmount;

  const targetStructure = reviewing.entry.targetCostStructure;
  const isProcessCosting = targetStructure?.costingSystem === 'PROCESSES';
  const finalSection =
    reviewing.action === 'CORRECTED' && correctedSection
      ? correctedSection
      : (reviewing.entry.classificationAudits?.[0]?.costSection ?? '');
  const showDepartmentPicker =
    reviewing.action !== 'REJECTED' && isProcessCosting && PROCESS_COST_SECTIONS.has(finalSection);

  const { data: departmentsData } = useProcessDepartments(
    targetStructure?.id ?? '',
    showDepartmentPicker,
  );
  const departments = departmentsData?.departments ?? [];

  // Regla de oro de la cátedra: la Materia Prima entra casi siempre por el
  // primer departamento de la cadena — se pre-selecciona, pero el costista
  // puede cambiarlo. Para MOD/CIF no hay un default razonable: cada
  // departamento agrega su propia mano de obra y carga fabril.
  useEffect(() => {
    if (!showDepartmentPicker || processDepartmentId || departments.length === 0) return;
    if (finalSection === 'MATERIA_PRIMA') {
      const first = departments.find((d) => d.sequence === 1);
      if (first) setProcessDepartmentId(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDepartmentPicker, departments, finalSection]);

  return (
    <PortalOverlay>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-[0_25px_60px_rgba(74,21,27,0.15)] animate-rise max-h-[92vh] overflow-y-auto sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[17px] font-extrabold text-granate-deep">
            Revisar entrada
          </h3>
          <span className="flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 text-[12px] font-bold text-granate shadow-sm">
            <Building2 className="size-3.5" />
            {reviewing.entry.connection.company.name}
          </span>
        </div>

        {typeof amt === "number" && amt > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-amber-700">
              Se registrará en el libro de costos
            </p>
            <p className="mt-0.5 font-mono-jb text-lg font-bold tabular-nums text-amber-900">
              {fmt(amt)}
            </p>
            <p className="text-[11px] text-amber-700">
              Verificá que coincida con el comprobante antes de aprobar.
            </p>
          </div>
        )}

        {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) &&
          reviewing.entry.fileMimeType?.startsWith("image/") && (
            <button
              type="button"
              onClick={() =>
                setLightboxSrc(
                  reviewing.entry.fileUrl ??
                    `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`,
                )
              }
              className="mb-4 w-full focus:outline-none"
            >
              <img
                src={
                  reviewing.entry.fileUrl ??
                  `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`
                }
                alt={reviewing.entry.fileName ?? "documento"}
                className="w-full rounded-2xl object-contain max-h-64 border border-line bg-surface-alt cursor-zoom-in hover:opacity-90 transition-opacity"
              />
            </button>
          )}

        {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) &&
          reviewing.entry.fileMimeType === "application/pdf" && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-surface-alt p-3.5">
              <FileText className="size-5 text-ink-soft" />
              <a
                href={reviewing.entry.fileUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-action hover:underline"
              >
                {reviewing.entry.fileName}
              </a>
            </div>
          )}

        <div className="mb-4 rounded-2xl border border-line bg-zinc-50/60 p-4 text-sm text-ink whitespace-pre-wrap">
          {reviewing.entry.rawContent}
        </div>

        {reviewing.action === "CORRECTED" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Tipo correcto"
                value={correctedType}
                onChange={(e) => setCorrectedType(e.target.value)}
                placeholder="— sin cambiar —"
                options={Object.entries(DOC_TYPE_OPTIONS).map(([v, l]) => ({ value: v, label: l }))}
              />
              <Select
                label="Sección correcta"
                value={correctedSection}
                onChange={(e) => setCorrectedSection(e.target.value)}
                placeholder="— sin cambiar —"
                options={Object.entries(SECTION_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </div>
            <div className="mb-4">
              <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                Contenido corregido
              </label>
              <textarea
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none min-h-20"
                placeholder="Escribí la versión corregida del dato…"
                value={correctedContent}
                onChange={(e) => setCorrectedContent(e.target.value)}
              />
            </div>
          </>
        )}

        {showDepartmentPicker && (
          <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-violet-700">
              <Factory className="size-3.5" /> Costeo por Procesos · {SECTION_LABELS[finalSection] ?? finalSection}
            </p>
            <p className="mt-1 text-[11.5px] text-violet-800">
              ¿A qué departamento de <strong>{targetStructure?.productName}</strong> pertenece este monto? Sin elegirlo,
              queda pendiente de asignar.
            </p>
            <Select
              className="mt-2.5 border-violet-200"
              ariaLabel="Departamento"
              value={processDepartmentId ?? ''}
              onChange={(e) => setProcessDepartmentId(e.target.value || null)}
              placeholder="— sin asignar (queda pendiente) —"
              options={departments.map((d) => ({ value: d.id, label: `${d.sequence}. ${d.name}` }))}
            />
            {departments.length === 0 && (
              <p className="mt-2 text-[11px] text-violet-700">
                Esta estructura todavía no tiene departamentos cargados — creálos desde Costeo por Procesos.
              </p>
            )}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
            Nota (opcional)
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
            placeholder="Ej: actualizado en estructura de costos de Oct 2025"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            loading={isPending}
            className={cn(
              "w-full sm:w-auto",
              reviewing.action === "APPROVED" &&
                "bg-green-600 hover:bg-green-700",
              reviewing.action === "REJECTED" &&
                "bg-danger hover:bg-danger/90",
              reviewing.action === "CORRECTED" &&
                "bg-action hover:bg-action/90",
            )}
          >
            {reviewing.action === "APPROVED" && "Confirmar aprobación"}
            {reviewing.action === "REJECTED" && "Confirmar rechazo"}
            {reviewing.action === "CORRECTED" && "Guardar corrección"}
          </Button>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
