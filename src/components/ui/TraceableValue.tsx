import { useTraceMode } from '@/stores/trace-mode-store';
import { cn } from '@/lib/utils';

/**
 * UN VALOR CON ORIGEN RASTREABLE (U10).
 *
 * Envuelve cualquier número que esté respaldado por un `DataPoint` o por un nodo
 * de derivación. Es el único envoltorio: si mañana cambia el resalte o la forma
 * de abrir la ficha, cambia acá y en toda la app a la vez.
 *
 * Comportamiento:
 *   · Modo trazabilidad APAGADO — se ve como el resto del texto, pero sigue
 *     siendo clickeable. El que ya sabe que puede tocar, toca.
 *   · Modo ENCENDIDO — fondo tenue y subrayado punteado granate, para que se vea
 *     de un golpe qué parte de la pantalla tiene respaldo y qué parte no.
 *   · Sin `dataPointId` no envuelve nada: un número sin origen no debe parecer
 *     trazable. Eso es deliberado — el modo sirve justamente para distinguirlos.
 */
export function TraceableValue({
  dataPointId,
  children,
  className,
  title,
}: {
  dataPointId: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  /** Qué representa el valor, para el tooltip y los lectores de pantalla. */
  title?: string;
}) {
  const on = useTraceMode((s) => s.on);
  const openTrace = useTraceMode((s) => s.openTrace);

  if (!dataPointId) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => openTrace(dataPointId)}
      title={title ? `${title} — ver de dónde sale` : 'Ver de dónde sale este dato'}
      className={cn(
        'group relative rounded-[3px] px-0.5 transition-colors',
        'hover:bg-granate-tenue hover:underline hover:decoration-action hover:decoration-dotted hover:underline-offset-4',
        on && 'bg-granate-tenue underline decoration-action-soft decoration-dotted underline-offset-4',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          'ml-0.5 align-super text-[9px] text-action transition-opacity',
          on ? 'opacity-55' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        ⌕
      </span>
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
    <div className="mb-4 flex w-fit items-center gap-2.5 rounded-full bg-granate px-3.5 py-2 text-[12px] font-medium text-white">
      <span className="size-3 rounded-[3px] border border-dotted border-white bg-action-soft" />
      Modo trazabilidad activo — cada valor resaltado tiene origen rastreable. Tocá cualquiera para
      ver su ficha.
    </div>
  );
}
