import { Layers } from 'lucide-react';
import { Select } from '@/components/ui/Select';
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

  const actual = departments.find((d) => d.id === value) ?? departments[0]!;

  return (
    <div className="group inline-flex items-center gap-3 rounded-xl border border-line bg-surface py-1.5 pl-3 pr-1.5 transition-colors hover:border-line-strong">
      <span className="flex items-center gap-2">
        <Layers className="size-4 shrink-0 text-granate" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      </span>

      {/* La posición en la cadena se muestra aparte del desplegable: es el dato
          que ubica al costista ("voy por la 2ª etapa"), no una etiqueta más. */}
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-granate-tenue font-mono-jb text-[11px] font-bold text-granate">
        {actual.sequence}
      </span>

      <Select
        ariaLabel={label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-auto min-w-0 max-w-[15rem] border-none bg-transparent py-0 pl-0 pr-7 text-[13.5px] font-semibold shadow-none"
        options={departments.map((d) => ({ value: d.id, label: `${d.sequence}º — ${d.name}` }))}
      />
    </div>
  );
}
