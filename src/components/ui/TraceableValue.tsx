import { Search } from 'lucide-react';
import { useTraceMode, type DerivationDetail } from '@/stores/trace-mode-store';
import { cn } from '@/lib/utils';

/** Un nodo del árbol de derivación, como lo devuelve la API de trazabilidad. */
interface ArbolNode {
  label: string;
  formula: string | null;
  value: number | null;
  unit: string | null;
  sourceDpVersionIds: string[];
  children: ArbolNode[];
}

/**
 * Traduce un nodo del árbol a lo que muestra el panel. La primera hoja con
 * `sourceDpVersionIds` es el dato cargado que respalda ese renglón.
 */
export function toDerivation(node: ArbolNode): DerivationDetail {
  return {
    label: node.label,
    formula: node.formula,
    value: node.value,
    unit: node.unit,
    dataPointId: node.sourceDpVersionIds[0] ?? null,
    children: node.children.map(toDerivation),
  };
}

/**
 * UN VALOR CON ORIGEN RASTREABLE (U10).
 *
 * Envuelve cualquier número respaldado por un `DataPoint` o por un nodo de
 * derivación. Es el único envoltorio: si cambia el resalte o la forma de abrir
 * la ficha, cambia acá y en toda la app a la vez.
 *
 * ESTÉTICA — por qué así. La primera versión era un subrayado punteado y poco
 * más: no se leía como algo tocable. Se rehizo con el patrón que usan hoy las
 * apps de datos (Linear, Stripe, Notion) para los valores "inspeccionables":
 *
 *   · una PASTILLA con fondo propio, no texto suelto — el área clickeable se ve
 *     y es lo bastante grande para acertarle;
 *   · un ícono de lupa SIEMPRE visible cuando el modo está activo, que es la
 *     señal universal de "acá hay más detrás";
 *   · en hover, el fondo se intensifica, aparece un anillo y el elemento se
 *     levanta un pelo: tres señales a la vez de que responde al mouse;
 *   · `cursor: pointer` explícito y anillo de foco para teclado.
 *
 * Con el modo APAGADO no desaparece: queda discreto (sin fondo) pero conserva
 * el hover completo, así el que ya sabe que puede tocar, toca.
 */
export function TraceableValue({
  dataPointId,
  derivation,
  children,
  className,
  title,
}: {
  /** Un dato CARGADO: abre su ficha (quién, cuándo, comprobante, versiones). */
  dataPointId?: string | null;
  /** Un DERIVADO: abre la cuenta — fórmula y números que entraron. */
  derivation?: DerivationDetail | null;
  children: React.ReactNode;
  className?: string;
  /** Qué representa el valor, para el tooltip y los lectores de pantalla. */
  title?: string;
}) {
  const on = useTraceMode((s) => s.on);
  const openTrace = useTraceMode((s) => s.openTrace);
  const openNode = useTraceMode((s) => s.openNode);

  // Sin origen no se envuelve: un número sin respaldo no debe parecer trazable.
  // Es deliberado — el modo sirve justamente para distinguirlos.
  if (!dataPointId && !derivation) return <>{children}</>;

  const abrir = () => (derivation ? openNode(derivation) : openTrace(dataPointId!));
  const leyenda = derivation ? 'ver cómo se calculó' : 'ver de dónde sale';

  return (
    <button
      type="button"
      onClick={abrir}
      title={title ? `${title} — ${leyenda}` : `Tocá para ${leyenda}`}
      className={cn(
        'group/trace relative inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg',
        'px-2 py-1 text-left align-middle transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50',
        // Estado base según el modo.
        on
          ? 'bg-granate-tenue ring-1 ring-granate/15'
          : 'ring-1 ring-transparent hover:bg-granate-tenue',
        // Hover: fondo más fuerte + anillo de acción + leve elevación.
        'hover:-translate-y-px hover:bg-granate-tenue hover:shadow-sm hover:ring-action/40',
        'active:translate-y-0 active:shadow-none',
        className,
      )}
    >
      <span className={cn('min-w-0', on && 'underline decoration-action/50 decoration-dotted underline-offset-4')}>
        {children}
      </span>
      <Search
        aria-hidden
        className={cn(
          'size-3 shrink-0 text-action transition-opacity duration-150',
          on ? 'opacity-70' : 'opacity-0 group-hover/trace:opacity-100',
        )}
      />
    </button>
  );
}

/**
 * Aviso de que el modo está activo. Va arriba del contenido de la pantalla, como
 * en el mockup: sin él, el resalte parece un error de estilos.
 */
export function TraceModeLegend() {
  const on = useTraceMode((s) => s.on);
  if (!on) return null;

  return (
    <div className="animate-rise mb-4 flex w-fit items-center gap-2.5 rounded-full bg-granate px-4 py-2 text-[12px] font-medium text-white shadow-sm">
      <Search className="size-3.5 shrink-0 text-white/80" aria-hidden />
      Modo trazabilidad activo — cada valor resaltado tiene origen rastreable. Tocá cualquiera para
      ver su ficha.
    </div>
  );
}
