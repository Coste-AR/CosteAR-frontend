import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { apiErrorMessage } from '@/lib/api';
import { useJointCosts, useSaveJointCosts } from '../../process-costing-hooks';
import type {
  ByProductKind,
  JointAllocationMethod,
  JointProductInput,
  ProcessDepartment,
} from '../../process-costing-types';
import { DepartmentSelector } from './DepartmentSelector';

/**
 * COSTOS CONJUNTOS (U07).
 *
 * Cuando de una misma materia y un mismo proceso salen VARIOS productos, hasta
 * el punto de separación el costo es uno solo e indivisible. Repartirlo entre
 * los productos no es un cálculo objetivo: es un CRITERIO, y por eso la pantalla
 * arranca por elegir el método y explica qué asume cada uno.
 *
 * Un departamento se vuelve punto de separación cuando se le cargan productos
 * acá — no hay un interruptor aparte que haya que acordarse de prender.
 *
 * Si un método deja a un producto con costo asignado MAYOR que su valor de
 * mercado, el resultado se muestra igual, marcado como pérdida. Ocultarlo sería
 * esconder justamente la señal que hace elegir otro criterio.
 */

const METODOS: {
  value: JointAllocationMethod;
  label: string;
  criterio: string;
  pide: string;
}[] = [
  {
    value: 'NET_REALIZABLE_VALUE',
    label: 'Valor neto de realización',
    criterio:
      'Reparte según lo que cada producto puede realizar una vez descontados sus gastos de venta. Es el más usado: no premia ni castiga por gastos posteriores al punto de separación.',
    pide: 'precio de mercado y gastos de comercialización',
  },
  {
    value: 'MARKET_VALUE',
    label: 'Valor de mercado',
    criterio:
      'Reparte según el precio de venta en el punto de separación. Asume que el que más vale debe absorber más costo.',
    pide: 'precio de mercado',
  },
  {
    value: 'PHYSICAL_UNITS',
    label: 'Unidades físicas',
    criterio:
      'Reparte en proporción a las unidades obtenidas. Simple, pero puede cargarle el mismo costo a un producto caro y a uno barato.',
    pide: 'solo las unidades',
  },
  {
    value: 'TECHNICAL_YIELD',
    label: 'Rendimiento técnico',
    criterio:
      'Reparte según un coeficiente técnico de rendimiento definido por producción. Sirve cuando las unidades no son comparables entre sí.',
    pide: 'rendimiento por producto',
  },
];

const KINDS: { value: ByProductKind; label: string }[] = [
  { value: 'coproduct', label: 'Coproducto' },
  { value: 'byproduct', label: 'Subproducto' },
  { value: 'waste', label: 'Desecho' },
];

const fmt = (v: number, dec = 2) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const num = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const x = Number(v.replace(',', '.'));
  return Number.isFinite(x) ? x : undefined;
};

interface FilaProducto {
  productName: string;
  kind: ByProductKind;
  unitsObtained: string;
  yieldPct: string;
  marketPrice: string;
  sellingCostVarPct: string;
  sellingCostFixedPerUnit: string;
}

const filaVacia = (): FilaProducto => ({
  productName: '',
  kind: 'coproduct',
  unitsObtained: '',
  yieldPct: '',
  marketPrice: '',
  sellingCostVarPct: '',
  sellingCostFixedPerUnit: '',
});

export function JointCostsTab({
  structureId,
  periodId,
  departments,
  deptId,
  onDeptChange,
  readOnly,
}: {
  structureId: string;
  periodId: string | null;
  departments: ProcessDepartment[];
  deptId: string | null;
  onDeptChange: (id: string) => void;
  readOnly: boolean;
}) {
  const { data, isLoading, isError: isFetchError, error: fetchError } = useJointCosts(structureId, deptId, periodId);
  const guardar = useSaveJointCosts(structureId, periodId);

  const [metodo, setMetodo] = useState<JointAllocationMethod>('NET_REALIZABLE_VALUE');
  const [total, setTotal] = useState('');
  const [filas, setFilas] = useState<FilaProducto[]>([filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    // Si el fetch falló no hay que pisar el formulario con los valores por
    // defecto: se vería igual que "todavía no tiene reparto", que es el
    // estado vacío legítimo, no un error transitorio.
    if (isFetchError) return;
    if (data?.saved) {
      setMetodo(data.saved.method);
      setTotal(String(data.saved.jointCostTotal));
    } else {
      setMetodo('NET_REALIZABLE_VALUE');
      setTotal('');
    }
    if (data?.result?.lines.length) {
      setFilas(
        data.result.lines.map((l) => ({
          ...filaVacia(),
          productName: l.productName,
          unitsObtained: String(l.unitsObtained),
        })),
      );
    } else {
      setFilas([filaVacia()]);
    }
    setError(null);
  }, [data, deptId, periodId, isFetchError]);

  const metodoActual = METODOS.find((m) => m.value === metodo)!;
  const pideRendimiento = metodo === 'TECHNICAL_YIELD';
  const pidePrecio = metodo === 'MARKET_VALUE' || metodo === 'NET_REALIZABLE_VALUE';
  const pideGastos = metodo === 'NET_REALIZABLE_VALUE';

  const setFila = (i: number, campo: keyof FilaProducto, v: string) =>
    setFilas((f) => f.map((fila, j) => (j === i ? { ...fila, [campo]: v } : fila)));

  const completas = filas.filter((f) => f.productName.trim() && (num(f.unitsObtained) ?? 0) > 0);
  const puedeGuardar =
    !readOnly && !!deptId && (num(total) ?? 0) > 0 && completas.length >= 1;

  const enviar = async () => {
    setError(null);
    const products: JointProductInput[] = completas.map((f) => ({
      productName: f.productName.trim(),
      kind: f.kind,
      unitsObtained: num(f.unitsObtained)!,
      yieldPct: pideRendimiento ? num(f.yieldPct) : undefined,
      marketPrice: pidePrecio ? num(f.marketPrice) : undefined,
      sellingCostVarPct: pideGastos
        ? (() => {
            const x = num(f.sellingCostVarPct);
            return x === undefined ? undefined : x / 100;
          })()
        : undefined,
      sellingCostFixedPerUnit: pideGastos ? num(f.sellingCostFixedPerUnit) : undefined,
    }));

    try {
      await guardar.mutateAsync({
        deptId: deptId!,
        method: metodo,
        jointCostTotal: num(total)!,
        products,
      });
      setConfirmando(false);
    } catch (e) {
      setError(apiErrorMessage(e));
      setConfirmando(false);
    }
  };

  if (!periodId || departments.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-soft">
        {departments.length === 0
          ? 'Primero cargá los departamentos del proceso.'
          : 'Elegí un período en la barra de arriba.'}
      </p>
    );
  }
  // Fetch falló: distinto del estado vacío legítimo ("todavía no tiene
  // reparto"), así que no sigue al formulario — se corta acá con el error.
  if (isFetchError) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DepartmentSelector
            departments={departments}
            value={deptId}
            onChange={onDeptChange}
            label="Punto de separación en"
          />
        </div>
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-[13px] text-ink-soft">
            No se pudo cargar el reparto de costos conjuntos: {apiErrorMessage(fetchError)}
          </p>
        </div>
      </div>
    );
  }

  const resultado = data?.result ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DepartmentSelector
          departments={departments}
          value={deptId}
          onChange={onDeptChange}
          label="Punto de separación en"
        />
        {isLoading && <span className="text-[12px] text-ink-soft">Cargando…</span>}
      </div>

      {!data?.exists && !readOnly && (
        <p className="text-[12.5px] text-ink-soft">
          Este departamento todavía no tiene reparto de costos conjuntos. Cargá los productos que
          salen de acá y se vuelve punto de separación.
        </p>
      )}

      {error && <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>}

      {/* ── MÉTODO ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-granate">
          ▸ Criterio de reparto
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {METODOS.map((m) => (
            <label
              key={m.value}
              className={`cursor-pointer rounded-md border p-3 transition-colors ${
                metodo === m.value
                  ? 'border-granate bg-granate-tenue'
                  : 'border-line hover:border-line-strong'
              } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="metodo-conjuntos"
                className="sr-only"
                checked={metodo === m.value}
                disabled={readOnly}
                onChange={() => setMetodo(m.value)}
              />
              <div
                className={`text-[13px] font-medium ${metodo === m.value ? 'text-granate' : 'text-ink'}`}
              >
                {m.label}
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{m.criterio}</p>
            </label>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-soft">
          Este criterio pide: <strong>{metodoActual.pide}</strong>.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <label className="text-[13px] text-ink">Costo conjunto total del período</label>
          <input
            inputMode="decimal"
            value={total}
            disabled={readOnly}
            onChange={(e) => setTotal(e.target.value)}
            className="w-40 rounded-sm border border-line-strong px-2.5 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
          />
        </div>
      </div>

      {/* ── PRODUCTOS ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Productos del punto de separación
          </div>
          {!readOnly && (
            <Button size="sm" variant="ghost" onClick={() => setFilas((f) => [...f, filaVacia()])}>
              <Plus className="size-3.5" /> Agregar producto
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {filas.map((fila, i) => (
            <div key={i} className="grid items-end gap-2 border-b border-line pb-3 last:border-b-0 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className="text-[11px] text-ink-soft">Producto</label>
                <input
                  value={fila.productName}
                  disabled={readOnly}
                  onChange={(e) => setFila(i, 'productName', e.target.value)}
                  className="w-full rounded-sm border border-line-strong px-2.5 py-1.5 text-[13px] disabled:bg-surface-alt"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-ink-soft">Tipo</label>
                <Select
                  ariaLabel="Tipo"
                  value={fila.kind}
                  disabled={readOnly}
                  onChange={(e) => setFila(i, 'kind', e.target.value)}
                  className="h-9 text-[13px]"
                  options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-ink-soft">Unidades</label>
                <input
                  inputMode="decimal"
                  value={fila.unitsObtained}
                  disabled={readOnly}
                  onChange={(e) => setFila(i, 'unitsObtained', e.target.value)}
                  className="w-full rounded-sm border border-line-strong px-2.5 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
                />
              </div>
              {pideRendimiento && (
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-ink-soft">Rendimiento</label>
                  <input
                    inputMode="decimal"
                    value={fila.yieldPct}
                    disabled={readOnly}
                    onChange={(e) => setFila(i, 'yieldPct', e.target.value)}
                    className="w-full rounded-sm border border-line-strong px-2.5 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
                  />
                </div>
              )}
              {pidePrecio && (
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-ink-soft">Precio mercado</label>
                  <input
                    inputMode="decimal"
                    value={fila.marketPrice}
                    disabled={readOnly}
                    onChange={(e) => setFila(i, 'marketPrice', e.target.value)}
                    className="w-full rounded-sm border border-line-strong px-2.5 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
                  />
                </div>
              )}
              {pideGastos && (
                <>
                  <div className="sm:col-span-1">
                    <label className="text-[11px] text-ink-soft">Gto. var. %</label>
                    <input
                      inputMode="decimal"
                      value={fila.sellingCostVarPct}
                      disabled={readOnly}
                      onChange={(e) => setFila(i, 'sellingCostVarPct', e.target.value)}
                      className="w-full rounded-sm border border-line-strong px-2 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[11px] text-ink-soft">Gto. fijo/u</label>
                    <input
                      inputMode="decimal"
                      value={fila.sellingCostFixedPerUnit}
                      disabled={readOnly}
                      onChange={(e) => setFila(i, 'sellingCostFixedPerUnit', e.target.value)}
                      className="w-full rounded-sm border border-line-strong px-2 py-1.5 text-right font-mono-jb text-[13px] disabled:bg-surface-alt"
                    />
                  </div>
                </>
              )}
              {!readOnly && filas.length > 1 && (
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => setFilas((f) => f.filter((_, j) => j !== i))}
                    className="p-1.5 text-ink-soft hover:text-danger"
                    title="Sacar producto"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              disabled={!puedeGuardar}
              loading={guardar.isPending}
              onClick={() => setConfirmando(true)}
            >
              Guardar reparto
            </Button>
          </div>
        )}
      </div>

      {/* ── RESULTADO ─────────────────────────────────────────────── */}
      {resultado && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-[15px] font-semibold text-ink">Reparto del costo conjunto</h3>
            <span className="text-[12px] text-ink-soft">
              Costo conjunto:{' '}
              <strong className="font-mono-jb text-ink">${fmt(resultado.jointCostTotal)}</strong>
            </span>
          </div>
          <table className="mt-3 w-full text-[13.5px]">
            <thead>
              <tr>
                {['Producto', 'Base', '% part.', 'Costo asignado', 'Costo unit.'].map((h, i) => (
                  <th
                    key={h}
                    className={`border-b border-line px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft ${i === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono-jb">
              {resultado.lines.map((l) => {
                // El costo asignado supera lo que el producto puede realizar:
                // el método elegido lo deja en pérdida. Se muestra, no se oculta.
                const enPerdida = l.allocationBase > 0 && l.allocatedCost > l.allocationBase;
                return (
                  <tr key={l.productName} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2.5 font-sans">
                      {l.productName}
                      {enPerdida && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10.5px] font-semibold text-warn">
                          <AlertTriangle className="size-3" /> en pérdida
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmt(l.allocationBase)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(l.participationPct * 100, 1)}%</td>
                    <td className="px-3 py-2.5 text-right">{fmt(l.allocatedCost)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(l.unitCost, 3)}</td>
                  </tr>
                );
              })}
              <tr className="bg-granate-tenue">
                <td className="px-3 py-3 font-sans font-bold text-granate">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right font-bold text-granate">100%</td>
                <td className="px-3 py-3 text-right font-bold text-granate">
                  {fmt(resultado.totalAllocated)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmando}
        title="Guardar el reparto de costos conjuntos"
        confirmLabel="Guardar"
        loading={guardar.isPending}
        onConfirm={() => void enviar()}
        onCancel={() => setConfirmando(false)}
        message={
          <p>
            El criterio elegido cambia cuánto costo carga cada producto y, con eso, su margen. Queda
            registrado quién lo eligió y cuándo.
          </p>
        }
      />
    </div>
  );
}
