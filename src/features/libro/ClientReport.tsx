import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/utils';
import type { LedgerEntry } from './libro-hooks';

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
  GASTO_COMERCIALIZACION: 'Gasto de Comercialización',
  GASTO_ADMINISTRACION: 'Gasto de Administración',
  GASTO_FINANCIERO: 'Gasto Financiero',
};
// Gastos: NO son costo del producto. Se listan y totalizan aparte del "Costo total".
const GASTO_SECTIONS = ['GASTO_COMERCIALIZACION', 'GASTO_ADMINISTRACION', 'GASTO_FINANCIERO'];
const SECTION_ORDER = [
  'MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS',
  ...GASTO_SECTIONS,
];

function periodLabel(p: string): string {
  if (!p) return 'Todos los períodos';
  const [y, m] = p.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${months[Number(m) - 1] ?? m} ${y}`;
}

/**
 * Reporte imprimible para el cliente. Overlay a pantalla completa; con @media
 * print se oculta todo lo demás y solo se imprime el reporte (Guardar como PDF).
 */
export function ClientReport({
  companyName,
  period,
  entries,
  totalsBySection,
  onClose,
}: {
  companyName: string;
  period: string;
  entries: LedgerEntry[];
  totalsBySection: Record<string, number>;
  onClose: () => void;
}) {
  const sections = SECTION_ORDER.filter((s) => totalsBySection[s] != null);
  // Costos del PRODUCTO = MP + MOD + CIP. Ventas y gastos (no inventariables)
  // se muestran aparte para no inflar el costo unitario.
  const costSections = sections.filter((s) => s !== 'VENTAS' && !GASTO_SECTIONS.includes(s));
  const gastoSections = sections.filter((s) => GASTO_SECTIONS.includes(s));
  const totalCosts = costSections.reduce((sum, s) => sum + (totalsBySection[s] ?? 0), 0);
  const totalGastos = gastoSections.reduce((sum, s) => sum + (totalsBySection[s] ?? 0), 0);
  const totalSales = totalsBySection['VENTAS'] ?? 0;
  const margin = totalSales > 0 ? ((totalSales - totalCosts) / totalSales) * 100 : null;
  const docCount = entries.filter((e) => e.dataEntryId).length;
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-black/40 print:static print:bg-white">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #client-report, #client-report * { visibility: visible !important; }
          #client-report { position: absolute; inset: 0; margin: 0; box-shadow: none !important; }
          .no-print { display: none !important; }
          @page { margin: 18mm; }
        }
      `}</style>

      <div className="mx-auto my-8 max-w-3xl px-4 print:my-0 print:px-0">
        {/* Barra de acciones (no se imprime) */}
        <div className="no-print mb-3 flex justify-end gap-2">
          <Button onClick={() => window.print()} size="sm">
            <Printer className="size-4" /> Imprimir / Guardar PDF
          </Button>
          <Button onClick={onClose} variant="secondary" size="sm">
            <X className="size-4" /> Cerrar
          </Button>
        </div>

        {/* Documento */}
        <div id="client-report" className="rounded-2xl bg-white p-10 shadow-[0_20px_50px_rgba(74,21,27,0.08)] print:rounded-none print:p-0 print:shadow-none">
          {/* Encabezado */}
          <div className="mb-8 flex items-start justify-between border-b border-ink/10 pb-5">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-granate-deep">Reporte de costos</h1>
              <p className="mt-1.5 text-sm font-semibold text-ink-soft">{companyName}</p>
              <p className="text-sm text-ink-soft">Período: {periodLabel(period)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-granate">CosteAR</p>
              <p className="text-[11px] text-ink-soft">Emitido el {today}</p>
            </div>
          </div>

          {/* Resumen de costos */}
          <div className="mb-6 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b-2 border-ink/10 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-ink-soft">
                  <th className="pb-2.5">Elemento del costo</th>
                  <th className="pb-2.5 text-right">Importe</th>
                  <th className="pb-2.5 text-right">% del costo</th>
                </tr>
              </thead>
              <tbody>
                {costSections.map((s) => (
                  <tr key={s} className="border-b border-ink/5">
                    <td className="py-2.5 text-ink">{SECTION_LABELS[s] ?? s}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink">{formatMoney(totalsBySection[s])}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink-soft">
                      {totalCosts > 0 ? `${Math.round(((totalsBySection[s] ?? 0) / totalCosts) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink/20 font-extrabold text-granate-deep">
                  <td className="py-2.5">Costo total</td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(totalCosts)}</td>
                  <td className="py-2.5 text-right text-ink-soft">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ventas y margen, si hay */}
          {totalSales > 0 && (
            <div className="mb-6 rounded-2xl border border-granate/10 bg-granate-tenue/40 p-5 text-sm shadow-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Ventas del período</span><span className="font-semibold tabular-nums text-ink">{formatMoney(totalSales)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Costo total</span><span className="font-semibold tabular-nums text-ink">{formatMoney(totalCosts)}</span></div>
              {margin != null && (
                <div className="mt-1.5 flex justify-between border-t border-granate/10 pt-1.5"><span className="font-bold text-ink">Margen bruto</span><span className="font-extrabold tabular-nums text-granate">{margin.toFixed(1)}%</span></div>
              )}
            </div>
          )}

          {/* Gastos (no forman parte del costo del producto) */}
          {gastoSections.length > 0 && (
            <div className="mb-6 overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b-2 border-ink/10 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-ink-soft">
                    <th className="pb-2.5">Gastos del período (no inventariables)</th>
                    <th className="pb-2.5 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {gastoSections.map((s) => (
                    <tr key={s} className="border-b border-ink/5">
                      <td className="py-2.5 text-ink">{SECTION_LABELS[s] ?? s}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{formatMoney(totalsBySection[s])}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink/20 font-extrabold text-granate-deep">
                    <td className="py-2.5">Total gastos</td>
                    <td className="py-2.5 text-right tabular-nums">{formatMoney(totalGastos)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">
                Los gastos de comercialización, administración y financieros no integran el costo del producto.
              </p>
            </div>
          )}

          {/* Respaldo documental */}
          <div className="rounded-2xl border border-line bg-surface-alt/60 p-4">
            <p className="text-[12px] leading-relaxed text-ink-soft">
              Este reporte está respaldado por <strong className="text-ink">{docCount}</strong> {docCount === 1 ? 'comprobante validado' : 'comprobantes validados'} y revisados.
              Cada importe es trazable a su documento de origen.
            </p>
          </div>

          <p className="mt-8 border-t border-ink/10 pt-3 text-[10px] text-ink-soft/60">
            Generado con CosteAR · {today} · Documento de uso profesional
          </p>
        </div>
      </div>
    </div>
  );
}
