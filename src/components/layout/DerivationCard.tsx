import { CornerDownRight, FileText } from 'lucide-react';
import { useTraceMode, type DerivationDetail } from '@/stores/trace-mode-store';
import { cn } from '@/lib/utils';
import { FinDeCadena, clasificarFinDeCadena } from '@/components/ui/FinDeCadena';

/**
 * CÓMO SE CALCULÓ UN NÚMERO (U10, rama de derivación).
 *
 * Un derivado no tiene ficha de dato: no lo cargó nadie. Lo que hay para
 * mostrar es la CUENTA — la fórmula y los números que entraron en ella. Esta
 * vista abre esa cuenta hasta donde llegue, y cuando toca una hoja que SÍ fue
 * cargada a mano, ofrece saltar a su ficha.
 *
 * Es la respuesta a "de dónde salió este costo unitario": no un número más, sino
 * la cadena completa hasta la factura del proveedor.
 */

const fmt = (v: number | null, unit: string | null): string => {
  if (v == null) return '—';
  const n = v.toLocaleString('es-AR', { maximumFractionDigits: 4 });
  if (!unit) return n;
  if (unit === '$') return `$${n}`;
  if (unit === '%') return `${n}%`;
  return `${n} ${unit}`;
};

function Nodo({ node, depth }: { node: DerivationDetail; depth: number }) {
  const openTrace = useTraceMode((s) => s.openTrace);
  const esDato = !!node.dataPointId;

  return (
    <div>
      <div
        className={cn(
          'rounded-lg border bg-surface px-3 py-2 transition-colors',
          esDato ? 'border-line hover:border-action/40' : 'border-line',
        )}
        style={{ marginLeft: depth === 0 ? 0 : 12 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-1.5">
            {depth > 0 && (
              <CornerDownRight className="mt-0.5 size-3 shrink-0 text-line-strong" aria-hidden />
            )}
            <span className="text-[13px] font-medium text-ink">{node.label}</span>
          </div>
          <span className="shrink-0 font-mono-jb text-[13px] font-semibold text-ink">
            {fmt(node.value, node.unit)}
          </span>
        </div>

        {node.formula && (
          <div className="mt-1 font-mono-jb text-[11px] leading-relaxed text-ink-soft">
            {node.formula}
          </div>
        )}

        {esDato && (
          <button
            type="button"
            onClick={() => openTrace(node.dataPointId!)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-granate-tenue px-2 py-1 text-[11px] font-semibold text-granate transition-colors hover:bg-granate hover:text-white"
          >
            <FileText className="size-3" aria-hidden />
            Ver la ficha de este dato
          </button>
        )}

        {/* T-03 — sólo las HOJAS declaran fin de cadena. Un nodo que se sigue
            descomponiendo no termina acá: termina más abajo, y ahí lo dirá. */}
        {node.children.length === 0 && (
          <FinDeCadena estado={clasificarFinDeCadena(node)} />
        )}
      </div>

      {node.children.length > 0 && (
        <div className="mt-1.5 space-y-1.5 border-l border-line pl-2">
          {node.children.map((hijo, i) => (
            <Nodo key={`${hijo.label}-${i}`} node={hijo} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DerivationCard({ detail }: { detail: DerivationDetail }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-l-4 border-line border-l-granate bg-surface-alt/40 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          Resultado del cálculo
        </div>
        <div className="mt-0.5 text-[14px] font-semibold text-ink">{detail.label}</div>
        <div className="mt-1 font-mono-jb text-[24px] font-bold text-granate">
          {fmt(detail.value, detail.unit)}
        </div>
        {detail.formula && (
          <div className="mt-2 rounded-md bg-surface px-2.5 py-1.5 font-mono-jb text-[11.5px] text-ink-soft">
            {detail.formula}
          </div>
        )}
      </div>

      {detail.children.length > 0 ? (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Con qué números se calculó
          </div>
          <div className="space-y-1.5">
            {detail.children.map((hijo, i) => (
              <Nodo key={`${hijo.label}-${i}`} node={hijo} depth={0} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[13px] text-ink-soft">
            Este número no se descompone más: es el resultado directo de la fórmula de arriba.
          </p>
          {/* Lo de arriba habla de PROFUNDIDAD ("no baja más"); esto habla de
              PROCEDENCIA ("de dónde salió"). Son dos preguntas distintas y al
              costista le importan las dos. */}
          <FinDeCadena estado={clasificarFinDeCadena(detail)} />
        </div>
      )}
    </div>
  );
}
