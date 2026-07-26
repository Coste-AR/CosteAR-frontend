import { ClipboardList, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CostingSystem = 'ORDERS' | 'PROCESSES';

/**
 * Selector del SISTEMA DE COSTEO (U01).
 *
 * No es una preferencia de pantalla: define cómo se acumula el costo, y por eso
 * cambia toda la estructura de la carga. Se elige una vez, al crear, y solo se
 * puede cambiar mientras la estructura no tenga ningún cálculo hecho.
 *
 * Dos tarjetas en vez de un desplegable: la diferencia entre los dos sistemas es
 * conceptual, no una etiqueta, así que cada opción necesita su explicación a la
 * vista en el momento de elegir.
 */

const OPCIONES: {
  value: CostingSystem;
  label: string;
  detalle: string;
  ejemplo: string;
  Icon: typeof ClipboardList;
}[] = [
  {
    value: 'ORDERS',
    label: 'Por Órdenes de Fabricación',
    detalle:
      'El costo se acumula por cada orden o lote identificable. Sirve cuando cada trabajo es distinto y se puede señalar.',
    ejemplo: 'Muebles a medida, imprenta, obra civil.',
    Icon: ClipboardList,
  },
  {
    value: 'PROCESSES',
    label: 'Por Procesos (Costeo Continuo)',
    detalle:
      'El costo se acumula por departamento y se promedia sobre la producción del período. Sirve cuando la producción es continua y las unidades son iguales entre sí.',
    ejemplo: 'Alimentos, bebidas, química, textil.',
    Icon: Factory,
  },
];

export function CostingSystemSelector({
  value,
  onChange,
  disabled = false,
  idPrefix = 'costing-system',
  stacked = false,
}: {
  value: CostingSystem;
  onChange: (value: CostingSystem) => void;
  disabled?: boolean;
  idPrefix?: string;
  /** Una tarjeta debajo de la otra — para contenedores angostos (ej. un modal). */
  stacked?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-[13px] font-medium text-ink">Sistema de costeo</legend>
      <div className={cn('grid gap-3', !stacked && 'sm:grid-cols-2')}>
        {OPCIONES.map(({ value: v, label, detalle, ejemplo, Icon }) => {
          const seleccionada = value === v;
          return (
            <label
              key={v}
              htmlFor={`${idPrefix}-${v}`}
              className={cn(
                'flex cursor-pointer gap-3 rounded-md border p-4 text-left transition-colors',
                seleccionada
                  ? 'border-granate bg-granate-tenue'
                  : 'border-line bg-surface hover:border-line-strong',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={`${idPrefix}-${v}`}
                type="radio"
                name={idPrefix}
                value={v}
                checked={seleccionada}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <Icon
                aria-hidden
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  seleccionada ? 'text-granate' : 'text-ink-soft',
                )}
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-[13px] font-medium',
                    seleccionada ? 'text-granate' : 'text-ink',
                  )}
                >
                  {label}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{detalle}</p>
                <p className="mt-1 text-[12px] italic text-ink-soft/80">{ejemplo}</p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
