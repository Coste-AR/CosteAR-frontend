import { FileText, PencilLine, CircleAlert, Sigma } from 'lucide-react';

/**
 * DÓNDE TERMINA LA CADENA — una sola forma de decirlo (T-03).
 *
 * La promesa de CosteAR es que todo número se puede abrir hasta su origen.
 * Cuando la cadena se termina, el producto tiene que DECIRLO, y decir cuál de
 * estas cuatro cosas pasó — porque para quien audita son completamente
 * distintas y hasta ahora las cuatro se veían igual (no se veía nada):
 *
 *   con-comprobante  → ideal: hay una factura atrás.
 *   dato-cargado     → fin de cadena legítimo: lo cargó una persona, a mano.
 *   derivado         → NO es un defecto: es un número calculado, no cargado.
 *                      No tiene ficha porque nadie lo cargó, y está bien.
 *   sin-origen       → DEFECTO de datos: debería tener un dato atrás y no lo
 *                      tiene. Se ve distinto a propósito.
 *
 * Medido en la auditoría del 06/08/2026: en el árbol de Órdenes, 20 de 21 filas
 * visibles eran `sin-origen`, renderizadas como un botón deshabilitado sin una
 * sola palabra de explicación. Un costista que abre tres números y encuentra
 * tres callejones sin salida no concluye "estos datos se cargaron a mano":
 * concluye "esta función no anda", y deja de usarla.
 *
 * Vive acá, compartido, para que el texto no pueda divergir entre el árbol
 * (DerivationTree) y el panel de derivación (DerivationCard). El tono lo fija
 * el diálogo de guardado de Procesos, que ya lo hacía bien: llano, específico,
 * sin jerga.
 */

export type EstadoFinDeCadena = 'con-comprobante' | 'dato-cargado' | 'derivado' | 'sin-origen';

/**
 * Clasifica un nodo que no se descompone más.
 *
 * Ojo con el orden: `derivado` se chequea ANTES que `sin-origen`, porque un
 * número calculado sin ficha es correcto y no se puede reportar como defecto.
 * La señal de que es calculado es que trae fórmula: nadie lo cargó, salió de
 * una cuenta.
 */
export function clasificarFinDeCadena(nodo: {
  dataPointId?: string | null;
  formula?: string | null;
  tieneComprobante?: boolean;
}): EstadoFinDeCadena {
  if (nodo.dataPointId) return nodo.tieneComprobante ? 'con-comprobante' : 'dato-cargado';
  if (nodo.formula) return 'derivado';
  return 'sin-origen';
}

const COPY: Record<EstadoFinDeCadena, { icono: typeof FileText; texto: string; clase: string }> = {
  'con-comprobante': {
    icono: FileText,
    texto: 'Respaldado por un comprobante.',
    clase: 'text-granate',
  },
  'dato-cargado': {
    icono: PencilLine,
    texto: 'Dato cargado a mano. No hay comprobante asociado.',
    clase: 'text-ink-soft',
  },
  derivado: {
    icono: Sigma,
    texto: 'Este número es calculado, no cargado: no tiene ficha propia.',
    clase: 'text-ink-soft',
  },
  'sin-origen': {
    icono: CircleAlert,
    // Se dice QUÉ pasa y POR QUÉ puede pasar, para que no se lea como una falla
    // del sistema sino como lo que es: un dato que entró sin quedar registrado.
    texto: 'Sin origen registrado. Se cargó antes de que existiera la trazabilidad, o se importó sin ella.',
    clase: 'text-warn',
  },
};

/**
 * La leyenda de fin de cadena. `autor` y `fecha` solo se usan en
 * `dato-cargado`, y solo si se conocen — nunca se inventa un autor.
 */
export function FinDeCadena({
  estado,
  autor,
  fecha,
  className,
}: {
  estado: EstadoFinDeCadena;
  autor?: string | null;
  fecha?: string | null;
  className?: string;
}) {
  const { icono: Icono, texto, clase } = COPY[estado];

  const detallado =
    estado === 'dato-cargado' && autor
      ? `Dato cargado a mano por ${autor}${fecha ? ` el ${fecha}` : ''}. No hay comprobante asociado.`
      : texto;

  return (
    <p
      className={[
        'mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed',
        clase,
        className ?? '',
      ].join(' ')}
      data-estado={estado}
    >
      <Icono className="mt-px size-3 shrink-0" aria-hidden />
      <span>{detallado}</span>
    </p>
  );
}
