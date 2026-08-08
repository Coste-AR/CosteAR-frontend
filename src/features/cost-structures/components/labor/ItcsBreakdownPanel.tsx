import { Info, Lock } from 'lucide-react';
import { Money } from '@/components/ui/Money';
import type { ItcsBreakdown } from '../../social-charges-catalog';

/**
 * Desglose del ITCS para la hoja de Mano de Obra.
 *
 * Responde la pregunta que se hace el costista cuando el total no le da igual
 * que su cuenta a mano: "¿de dónde salió este porcentaje?". No calcula nada:
 * muestra, concepto por concepto, el índice que ya devolvió el cálculo.
 */

/**
 * Porcentaje del índice, en formato argentino y con los decimales que el
 * cálculo realmente usó (hasta cuatro). Redondear a dos acá haría que el
 * desglose no cierre contra el total, que es justo lo que se quiere evitar.
 */
export const formatItcsPercent = (n: number | undefined) =>
  n == null
    ? '—'
    : `${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} %`;

const pct = formatItcsPercent;

interface Props {
  breakdown: ItcsBreakdown;
  /** Importes del departamento, para cerrar el círculo entre el índice y los pesos. */
  money?: { basicRemuneration: number; socialChargesCost: number; totalMod: number };
  /** Título del panel. */
  title?: string;
}

export function ItcsBreakdownPanel({ breakdown, money, title }: Props) {
  const { blocks, totalPercent, unavoidablePercent, unavoidableLabels, onlyUnavoidableApplies } = breakdown;

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">{title}</h4>
      )}

      {/* Índice efectivamente aplicado */}
      <div className="rounded-xl border border-granate/20 bg-granate/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          Índice total de cargas sociales aplicado
        </p>
        <p className="text-[22px] font-bold leading-tight text-granate-deep">{pct(totalPercent)}</p>
        <p className="text-[11.5px] leading-snug text-ink-soft">
          Es el porcentaje que se aplicó sobre la remuneración básica para llegar al costo de
          mano de obra. Sale de sumar los cuatro bloques de abajo.
        </p>
      </div>

      {/* El caso que parece un error del sistema y no lo es */}
      {onlyUnavoidableApplies && (
        <div className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-[12.5px] leading-snug text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            Dejaste todas las cargas configurables en cero y, aun así, el índice aplicado
            es <strong>{pct(unavoidablePercent)}</strong>. No es un error de cálculo:{' '}
            {unavoidableLabels.length === 1 ? 'es el ' : 'son las '}
            <strong>{unavoidableLabels.join(' y ')}</strong>, una carga cierta que se devenga por
            ley y que por eso el sistema suma siempre. Si querés que el costo sea exactamente la
            remuneración básica, ese aguinaldo debería estar contemplado en otro lado.
          </span>
        </div>
      )}

      {/* Bloques del índice, con sus conceptos */}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Concepto</th>
              <th className="px-3 py-2 text-right font-medium">Sobre la remuneración básica</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {blocks.map((block) => (
              <BlockRows key={block.key} block={block} />
            ))}
            <tr className="bg-granate/5">
              <td className="px-3 py-2 font-bold text-granate-deep">
                Índice total de cargas sociales aplicado
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums text-granate-deep">
                {pct(totalPercent)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* De porcentaje a pesos: el mismo índice, en plata */}
      {money && (
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            El índice, en pesos
          </p>
          <dl className="space-y-1 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-soft">Remuneración básica</dt>
              <dd className="tabular-nums text-ink"><Money value={money.basicRemuneration} /></dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-soft">
                Cargas sociales — remuneración básica × {pct(totalPercent)}
              </dt>
              <dd className="tabular-nums text-ink"><Money value={money.socialChargesCost} /></dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-1 font-semibold">
              <dt className="text-ink">Costo total de mano de obra</dt>
              <dd className="tabular-nums text-ink"><Money value={money.totalMod} /></dd>
            </div>
          </dl>
        </div>
      )}

      <p className="text-[11px] leading-snug text-ink-soft">
        La cátedra separa las cargas sociales en <strong className="font-medium text-ink">ciertas</strong>{' '}
        (las fija la ley), <strong className="font-medium text-ink">inciertas</strong> (dependen de lo que
        pase en el período) y <strong className="font-medium text-ink">derivadas</strong> (las ciertas que
        se pagan encima de las inciertas remunerativas). Por eso el total puede no coincidir con aplicar
        un porcentaje único estimado a mano: acá cada punto tiene su concepto.
      </p>
    </div>
  );
}

function BlockRows({ block }: { block: ItcsBreakdown['blocks'][number] }) {
  const visibleLines = block.lines.filter((l) => l.percent !== 0 || l.alwaysApplies);

  return (
    <>
      <tr className="bg-surface-alt/50">
        <td className="px-3 py-2">
          <p className="font-semibold text-ink">{block.title}</p>
          <p className="text-[11px] leading-snug text-ink-soft">{block.description}</p>
        </td>
        <td className="px-3 py-2 text-right align-top font-semibold tabular-nums text-ink">
          {pct(block.percent)}
        </td>
      </tr>
      {visibleLines.map((line, i) => (
        <tr key={`${block.key}-${i}`}>
          <td className="py-1.5 pl-6 pr-3">
            <span className="text-ink">{line.label}</span>
            {line.alwaysApplies && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-granate/20 bg-granate/10 px-1.5 py-0.5 align-middle text-[9.5px] font-bold uppercase tracking-wide text-granate-deep">
                <Lock className="size-2.5" /> Se aplica siempre
              </span>
            )}
            {line.detail && <p className="text-[11px] leading-snug text-ink-soft">{line.detail}</p>}
          </td>
          <td className="py-1.5 pr-3 text-right align-top tabular-nums text-ink-soft">
            {pct(line.percent)}
          </td>
        </tr>
      ))}
      {visibleLines.length === 0 && (
        <tr>
          <td className="py-1.5 pl-6 pr-3 text-[11.5px] text-ink-soft" colSpan={2}>
            Sin conceptos cargados en este bloque.
          </td>
        </tr>
      )}
    </>
  );
}
