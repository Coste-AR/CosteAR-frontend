import { apiErrorMessage } from '@/lib/api';
import { useEquivalentProduction, useUnitMovement } from '../../process-costing-hooks';
import type { ProcessDepartment } from '../../process-costing-types';
import { DepartmentSelector } from './DepartmentSelector';

/**
 * PRODUCCIÓN EQUIVALENTE (U06) — solo lectura.
 *
 * Cuántas unidades TERMINADAS equivalen al trabajo hecho en el período. Se
 * deriva del cuadro de movimiento, no se carga.
 *
 * De dónde sale cada número: el TOTAL por elemento lo calcula el servidor (es el
 * que después usa el motor, así que no se recalcula acá). Las filas que lo
 * componen se arman con el cuadro ya resuelto — cada una es la multiplicación
 * que la propia pantalla muestra, así el costista ve de dónde sale el total en
 * vez de tener que creerlo.
 *
 * Las pérdidas NORMALES se muestran atenuadas y marcadas "no entran": las
 * absorben las unidades buenas, así que no suman producción equivalente. Es una
 * de las confusiones clásicas de la cátedra y por eso figuran, en vez de
 * omitirse.
 */
const fmt = (v: number, dec = 0) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function EquivalentProductionTab({
  structureId,
  periodId,
  departments,
  deptId,
  onDeptChange,
}: {
  structureId: string;
  periodId: string | null;
  departments: ProcessDepartment[];
  deptId: string | null;
  onDeptChange: (id: string) => void;
}) {
  const movimiento = useUnitMovement(structureId, deptId, periodId);
  const pe = useEquivalentProduction(structureId, deptId, periodId);

  const cuadro = movimiento.data?.resolved ?? null;

  if (!periodId || departments.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-soft">
        {departments.length === 0
          ? 'Primero cargá los departamentos del proceso.'
          : 'Elegí un período en la barra de arriba.'}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DepartmentSelector departments={departments} value={deptId} onChange={onDeptChange} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
          Solo lectura
        </span>
      </div>

      {pe.isLoading && <p className="py-10 text-center text-[13px] text-ink-soft">Calculando…</p>}

      {pe.error && (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-[13px] text-ink-soft">{apiErrorMessage(pe.error)}</p>
        </div>
      )}

      {pe.data && cuadro && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  Concepto
                </th>
                <th className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  Unidades
                </th>
                {pe.data.columns.map((c) => (
                  <th
                    key={c.element}
                    className="border-b border-line px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
                  >
                    Equiv. {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono-jb">
              <tr className="border-b border-line">
                <td className="px-3 py-2.5 font-sans">Terminadas y transferidas</td>
                <td className="px-3 py-2.5 text-right">{fmt(cuadro.transferredOut)}</td>
                {pe.data.columns.map((c) => (
                  <td key={c.element} className="px-3 py-2.5 text-right">
                    {fmt(cuadro.transferredOut)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <td className="px-3 py-2.5 font-sans">Terminadas y en existencia</td>
                <td className="px-3 py-2.5 text-right">{fmt(cuadro.finishedInStock)}</td>
                {pe.data.columns.map((c) => (
                  <td key={c.element} className="px-3 py-2.5 text-right">
                    {fmt(cuadro.finishedInStock)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <td className="px-3 py-2.5 font-sans">
                  Existencia final <span className="text-[11px] text-ink-soft">(× avance)</span>
                </td>
                <td className="px-3 py-2.5 text-right">{fmt(cuadro.finalWip)}</td>
                {pe.data.columns.map((c) => (
                  <td key={c.element} className="px-3 py-2.5 text-right">
                    {fmt(cuadro.finalWip * c.finalWipAvance)}
                    <span className="ml-1.5 font-sans text-[10.5px] text-ink-soft">
                      {Math.round(c.finalWipAvance * 100)}%
                    </span>
                  </td>
                ))}
              </tr>

              {cuadro.extraordinaryLoss > 0 && (
                <tr className="border-b border-line">
                  <td className="px-3 py-2.5 font-sans">Pérdidas extraordinarias</td>
                  <td className="px-3 py-2.5 text-right">{fmt(cuadro.extraordinaryLoss)}</td>
                  {pe.data.columns.map((c) => (
                    <td key={c.element} className="px-3 py-2.5 text-right">
                      {fmt(cuadro.extraordinaryLoss)}
                    </td>
                  ))}
                </tr>
              )}

              <tr className="border-b border-line opacity-55">
                <td className="px-3 py-2.5 font-sans">
                  Pérdidas normales{' '}
                  <span className="text-[11px] text-ink-soft">(no entran — las absorben las buenas)</span>
                </td>
                <td className="px-3 py-2.5 text-right">{fmt(cuadro.normalLoss)}</td>
                {pe.data.columns.map((c) => (
                  <td key={c.element} className="px-3 py-2.5 text-right">
                    —
                  </td>
                ))}
              </tr>

              <tr className="bg-granate-tenue">
                <td className="px-3 py-3 font-sans font-bold text-granate">Producción equivalente</td>
                <td className="px-3 py-3" />
                {pe.data.columns.map((c) => (
                  <td key={c.element} className="px-3 py-3 text-right font-bold text-granate">
                    {fmt(c.equivalentUnits)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {pe.data && (
        <p className="text-[12px] text-ink-soft">
          Unidades terminadas del período:{' '}
          <strong className="font-mono-jb">{fmt(pe.data.unitsAtFullCompletion)}</strong>. La
          producción equivalente es el denominador con el que se calcula el costo unitario de cada
          elemento.
        </p>
      )}
    </div>
  );
}
