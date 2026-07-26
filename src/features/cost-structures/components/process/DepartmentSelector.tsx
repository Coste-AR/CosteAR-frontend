import type { ProcessDepartment } from '../../process-costing-types';

/**
 * Elige sobre qué etapa se está trabajando (U05-U08).
 *
 * Casi todas las pantallas de Procesos son "de UN departamento": el cuadro de
 * movimiento, la producción equivalente, el informe. El selector vive en el
 * encabezado de cada una, como en el mockup, y el valor elegido se comparte
 * entre pestañas para no perder el contexto al cambiar de vista.
 */
export function DepartmentSelector({
  departments,
  value,
  onChange,
  label = 'Departamento',
}: {
  departments: ProcessDepartment[];
  value: string | null;
  onChange: (deptId: string) => void;
  label?: string;
}) {
  if (departments.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
      <span className="shrink-0">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-line-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
      >
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.sequence}º — {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}
