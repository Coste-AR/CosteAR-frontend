import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate, formatDateOnly } from '@/lib/utils';
import { useCreateDataPoint, useImputar, useMpMovements } from '../../trazabilidad-hooks';
import { proposeImputation, newTrazableMovements } from '../../imputacion';
import { ImputacionModal } from '../../ImputacionModal';
import { type RawMaterialConfig, type StockMovement } from '../../cost-structure-types';
import type { ImputacionOption, MpMovement } from '../../trazabilidad-types';
import { cleanRawMaterialForForm, cleanRawMaterialForSubmit } from './helpers';

/**
 * Clave natural para casar una fila de la sección (JSON) con su movimiento
 * trazable (data points). La sección no guarda `movementId`, así que se casa por
 * (tipo · detalle · fecha), que es justo lo que la registración copia al label y
 * a `fechaHecho`. Detalle vacío → '(sin detalle)', igual que en el label.
 */
function movementKey(type: string, detail: string | undefined, date: string | undefined): string {
  return `${type}|${(detail ?? '').trim() || '(sin detalle)'}|${date ?? ''}`;
}

/**
 * Dos opciones de imputación (manual §3) reusando `proposeImputation`. Si no se
 * conoce la fecha del hecho, igual se ofrece imputar al período de costo: nunca
 * se deja al costista sin acción posible.
 */
function buildImputacionOptions(fechaHecho: string | null, periodo?: string): ImputacionOption[] {
  if (!periodo) return [];
  if (!fechaHecho) return [{ periodo, label: `Imputar a ${periodo} (devengado)`, recommended: true }];
  const proposal = proposeImputation(fechaHecho, periodo);
  if ('options' in proposal) return proposal.options;
  return [{ periodo: proposal.auto, label: `Imputar a ${proposal.auto} (devengado)`, recommended: true }];
}

/** Pill "Pendiente de imputar": es también el botón que abre el modal (F06). */
function PendingBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Este movimiento todavía no se asignó a un período. Tocá para imputarlo."
      className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn transition-colors hover:border-warn hover:bg-warn/20"
    >
      <Clock className="size-3" /> Pendiente de imputar
    </button>
  );
}

interface Props {
  structureId: string;
  period?: string;
  index: number;
  material: RawMaterialConfig;
  onBack: () => void;
  onSaveMaterial: (mat: RawMaterialConfig) => Promise<void>;
  saving: boolean;
  isProcesses?: boolean;
}

interface ImputacionQueueItem {
  detail: string;
  options: ImputacionOption[];
  dataPointIds: string[];
}

export function MaterialDetailForm({ structureId, period, material, onBack, onSaveMaterial, saving, isProcesses }: Props) {
  const { register, control, handleSubmit, reset, watch, formState: { isDirty } } = useForm<RawMaterialConfig>({
    defaultValues: cleanRawMaterialForForm(material) as any,
  });

  const loadedRef = useRef<string | null>(null);
  const baseMovementsCountRef = useRef(0);
  useEffect(() => {
    if (!material) return;
    const snapshot = JSON.stringify(material);
    if (snapshot === loadedRef.current) return;
    loadedRef.current = snapshot;
    baseMovementsCountRef.current = material.movements?.length ?? 0;
    reset(cleanRawMaterialForForm(material));
  }, [material, reset]);

  const { fields: movements, append, remove } = useFieldArray({ control, name: 'movements' });

  const [pending, setPending] = useState<RawMaterialConfig | null>(null);

  const createDataPoint = useCreateDataPoint(structureId);
  const imputar = useImputar(structureId);
  const qc = useQueryClient();
  const [imputacionQueue, setImputacionQueue] = useState<ImputacionQueueItem[]>([]);
  const currentImputacion = imputacionQueue[0];

  // F06 — estado de imputación real de cada movimiento (fuente de verdad de lo
  // "pendiente"). Vive en los data points, no en el JSON de la sección.
  const { data: mpMovements } = useMpMovements(structureId);
  // F07 — TODOS los movimientos trazables por clave natural (no solo los
  // pendientes): cada fila necesita su `fecha_captación` (server) para mostrarla
  // read-only, además del estado de imputación.
  const movementByKey = new Map<string, MpMovement>();
  for (const mv of mpMovements ?? []) {
    movementByKey.set(movementKey(mv.type, mv.detail, mv.fechaHecho ?? ''), mv);
  }
  // Movimientos guardados en la sección (clave estable, no la fila en edición).
  const savedKeys = new Set(
    (material.movements ?? []).map((m) => movementKey(m.type, m.detail, m.date)),
  );
  // Pendientes que el motor cuenta pero que NO tienen fila en esta sección
  // (desincronización histórica): se muestran igual para no ocultar ninguno.
  const orphanPending = (mpMovements ?? []).filter(
    (mv) => mv.pending && !savedKeys.has(movementKey(mv.type, mv.detail, mv.fechaHecho ?? '')),
  );

  /** Encola la imputación de un movimiento (reusa el ImputacionModal ya montado). */
  function openImputacion(mv: { detail: string; fechaHecho: string | null; dataPointIds: string[] }) {
    setImputacionQueue((q) => [
      ...q,
      {
        detail: mv.detail,
        options: buildImputacionOptions(mv.fechaHecho, period),
        dataPointIds: mv.dataPointIds,
      },
    ]);
  }

  // Recibe la lista de movimientos nuevos YA calculada (con `baseCount`
  // capturado antes de guardar; ver `newTrazableMovements`). No la recalcula
  // acá: al llegar a este punto el guardado ya subió el contador base y el
  // slice daría vacío (ese era el bug F04).
  async function registerTrazableMovements(newMovements: StockMovement[]) {
    const queueItems: ImputacionQueueItem[] = [];

    for (const m of newMovements) {
      try {
        const movementId = crypto.randomUUID();
        const label = `${m.type === 'purchase' ? 'Compra' : 'Consumo'} — ${m.detail || '(sin detalle)'}`;
        const dataPointIds: string[] = [];

        const cantidadDp = await createDataPoint.mutateAsync({
          element: 'MP',
          fieldKey: m.type === 'purchase' ? 'mp.compra.cantidad' : 'mp.consumo.cantidad',
          label,
          unit: 'u',
          sourceArea: m.type === 'purchase' ? 'deposito' : 'planta',
          method: 'manual',
          valueNum: m.quantity,
          valueJson: { movementId, role: 'cantidad' },
          fechaHecho: m.date,
        });
        dataPointIds.push(cantidadDp.id);

        if (m.type === 'purchase') {
          const precioDp = await createDataPoint.mutateAsync({
            element: 'MP',
            fieldKey: 'mp.compra.precio',
            label,
            unit: '$',
            sourceArea: 'contaduria',
            method: 'manual',
            valueNum: m.unitCost ?? 0,
            valueJson: { movementId, role: 'precio' },
            fechaHecho: m.date,
          });
          dataPointIds.push(precioDp.id);
        }

        if (!period) continue;
        const proposal = proposeImputation(m.date, period);
        if ('auto' in proposal) {
          await Promise.all(
            dataPointIds.map((id) => imputar.mutateAsync({ dataPointId: id, periodo: proposal.auto, sourceArea: 'costista' })),
          );
        } else {
          queueItems.push({ detail: label, options: proposal.options, dataPointIds });
        }
      } catch {
        // Un fallo puntual registrando trazabilidad de ESTE movimiento no debe tapar que la sección se guardó bien.
      }
    }

    if (queueItems.length > 0) setImputacionQueue((q) => [...q, ...queueItems]);
    // Refrescar el estado de imputación de la ficha: los movimientos recién
    // creados (y los que queden pendientes si el costista decide "más tarde")
    // tienen que verse marcados sin recargar la página (F06).
    void qc.invalidateQueries({ queryKey: ['structures', structureId, 'mp-movements'] });
  }

  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    try {
      const lines = pasteText.split('\n').filter(l => l.trim() !== '');
      const parsedMovements = lines.map((line, idx) => {
        const parts = line.split('\t');
        if (parts.length < 4) {
          throw new Error(`Fila ${idx + 1}: Debe tener al menos Fecha, Tipo, Detalle y Cantidad.`);
        }

        const [dateStr, typeStr, detail, qtyStr, priceStr] = parts;

        let type: 'purchase' | 'consumption' = 'purchase';
        const cleanType = typeStr?.toLowerCase().trim();
        if (cleanType === 'consumo' || cleanType === 'consumption' || cleanType === 'consumido') {
          type = 'consumption';
        }

        let date = dateStr?.trim() || '';
        if (date.includes('/')) {
          const [d, m, y] = date.split('/');
          if (d && m && y) {
            date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }

        const qtyVal = qtyStr?.trim();
        const priceVal = priceStr?.trim();
        const quantity = !qtyVal || isNaN(Number(qtyVal)) ? 0 : Number(qtyVal);
        const unitCost = !priceVal || isNaN(Number(priceVal)) ? 0 : Number(priceVal);

        return {
          date,
          type,
          detail: detail?.trim() || '',
          quantity,
          unitCost: type === 'consumption' ? 0 : unitCost,
        };
      });

      parsedMovements.forEach(m => append(m));
      setPasteText('');
      setPasteError(null);
      setShowPasteArea(false);
    } catch (e: any) {
      setPasteError(e.message || 'Error al parsear el texto de Excel. Verificá el formato.');
    }
  };

  const onSubmit = async (data: any) => {
    setPending(cleanRawMaterialForSubmit(data));
  };

  const nameWatch = watch('name');

  return (
    <>
    <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-[13px] text-granate hover:text-action">
      <ArrowLeft className="size-3.5" /> Volver a la lista de materias primas
    </button>
    <h3 className="mb-3 text-lg font-bold text-granate-deep">{nameWatch || 'Nueva materia prima'}</h3>

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Identificación</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Código de mercado" placeholder="Ej: MP-001 / SKU real" {...register('code')} />
          <Input label="Nombre" placeholder="Ej: Chapa BWG 18" {...register('name')} />
          <Input label="Unidad" placeholder="Ej: kg, u, m²" {...register('unit')} />
          <Input label="Proveedor habitual" placeholder="Ej: Acindar" {...register('supplier')} />
        </div>
      </section>

      {!isProcesses && (
        <section>
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
            Lote óptimo de Wilson
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Demanda anual (R)" type="number" step="1" numeric placeholder="Ej: 15000" info="Unidades totales de materia prima que consumís en el año. Número entero." {...register('wilson.annualDemand', { valueAsNumber: true })} />
            <Input label="Costo de pedido (S) $" type="number" step="0.01" numeric placeholder="Ej: 8500" info="Costo fijo de emitir una orden de compra (gestión, flete fijo, etc.). En pesos." {...register('wilson.orderCost', { valueAsNumber: true })} />
            <Input label="Tasa de mantenimiento (K)" type="number" step="0.1" numeric suffix="%" placeholder="Ej: 30" info="Costo anual de mantener stock como porcentaje del valor del inventario. Se escribe en porcentaje (ej: 30 = 30%)." {...register('wilson.holdingRate', { valueAsNumber: true })} />
            <Input label="Costo unitario (C) $" type="number" step="0.01" numeric placeholder="Ej: 1200" info="Costo de una unidad de materia prima. En pesos." {...register('wilson.unitCost', { valueAsNumber: true })} />
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Política de stock
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Consumo mínimo/día (Cm)" type="number" step="0.1" numeric placeholder="Ej: 30" info="Consumo más bajo esperado por día. Sirve para el cálculo del stock de seguridad." {...register('stockPolicy.minConsumption', { valueAsNumber: true })} />
          <Input label="Consumo máximo/día (CM)" type="number" step="0.1" numeric placeholder="Ej: 60" info="Consumo más alto esperado por día." {...register('stockPolicy.maxConsumption', { valueAsNumber: true })} />
          <Input label="Plazo mín. reposición (días)" type="number" step="1" numeric placeholder="Ej: 4" info="Días mínimos que tarda en llegar un pedido. Número entero." {...register('stockPolicy.minLeadTime', { valueAsNumber: true })} />
          <Input label="Plazo máx. reposición (días)" type="number" step="1" numeric placeholder="Ej: 10" info="Días máximos que tarda en llegar un pedido. Número entero." {...register('stockPolicy.maxLeadTime', { valueAsNumber: true })} />
          <Input label="Stock de reserva (Sr)" type="number" step="1" numeric placeholder="Ej: 150" info="Stock de seguridad mínimo que querés mantener siempre. Número entero." {...register('stockPolicy.safetyStock', { valueAsNumber: true })} />
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Existencia inicial
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Cantidad inicial" type="number" step="1" numeric placeholder="Ej: 400" info="Unidades de materia prima en stock al inicio del período. Número entero." {...register('initialStock.quantity', { valueAsNumber: true })} />
          <Input label="Costo unitario inicial $" type="number" step="0.01" numeric placeholder="Ej: 1150" info="Costo por unidad de la existencia inicial. En pesos." {...register('initialStock.unitCost', { valueAsNumber: true })} />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
            Movimientos (ficha PPP)
          </h4>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowPasteArea(!showPasteArea)}
            >
              Pegar de Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => append({ date: '', type: 'purchase', detail: '', quantity: 0, unitCost: 0 })}
            >
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
        </div>

        {showPasteArea && (
          <div className="mb-4 rounded-xl border border-line bg-surface-alt p-4 space-y-3 animate-rise">
            <p className="text-[11px] text-ink-soft">
              Copiá las columnas de tu Excel (Fecha, Tipo [Compra/Consumo], Detalle, Cantidad, Precio Unitario [compra]) y pegalas abajo:
            </p>
            <textarea
              className="w-full h-24 rounded-xl border border-line bg-surface p-2 text-xs font-mono outline-none focus:border-granate text-ink"
              placeholder={`Ejemplo:\n01/11/2026\tCompra\tFactura A-123\t100\t1500\n05/11/2026\tConsumo\tPara producción\t50\t0`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPasteArea(false); setPasteError(null); }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={handlePasteImport}>Procesar e Importar</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha del hecho</th>
                <th className="px-3 py-2 text-left font-medium">Fecha de captación</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Detalle</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Costo unit. $</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
              {movements.map((field, i) => {
                const isConsumption = watch(`movements.${i}.type`) === 'consumption';
                // Estado pendiente por el movimiento GUARDADO (clave estable):
                // así el badge no parpadea mientras se edita una fila sin guardar.
                const saved = material.movements?.[i];
                const mv = saved
                  ? movementByKey.get(movementKey(saved.type, saved.detail, saved.date))
                  : undefined;
                const pend = mv?.pending ? mv : undefined;
                return (
                  <tr key={field.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <td data-label="Fecha del hecho" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input type="date" title="Cuándo ocurrió el hecho económico (fecha de la factura/remito). La ponés vos." className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`movements.${i}.date`)} />
                    </td>
                    <td data-label="Fecha de captación" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      {mv ? (
                        <span className="text-[13px] text-ink-soft" title="La fija el sistema cuando el dato entra (no se edita)">{formatDate(mv.fechaCaptacion)}</span>
                      ) : (
                        <span className="text-[12px] italic text-idle" title="Se fija en el servidor al guardar este movimiento">Al guardar</span>
                      )}
                    </td>
                    <td data-label="Tipo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-auto" {...register(`movements.${i}.type`)}>
                        <option value="purchase">Compra</option>
                        <option value="consumption">Consumo</option>
                      </select>
                    </td>
                    <td data-label="Detalle" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Detalle…" {...register(`movements.${i}.detail`)} />
                      {pend && (
                        <div className="mt-1">
                          <PendingBadge
                            onClick={() =>
                              openImputacion({ detail: pend.detail, fechaHecho: pend.fechaHecho, dataPointIds: pend.dataPointIds })
                            }
                          />
                        </div>
                      )}
                    </td>
                    <td data-label="Cantidad" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`movements.${i}.quantity`, { valueAsNumber: true })} />
                    </td>
                    <td data-label="Costo unit. $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input
                        type="number"
                        step="0.01"
                        disabled={isConsumption}
                        className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none disabled:opacity-50 disabled:bg-surface-alt sm:w-28"
                        placeholder={isConsumption ? 'PPP' : 'Monto...'}
                        {...register(`movements.${i}.unitCost`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                      <button type="button" onClick={() => remove(i)} className="text-ink-soft hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && orphanPending.length === 0 && (
                <tr className="block sm:table-row"><td colSpan={7} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Sin movimientos — agregá compras y consumos.</td></tr>
              )}
              {/* F06 — pendientes que el motor cuenta pero sin fila propia en esta
                  sección (desincronización histórica). Se muestran igual, en solo
                  lectura, para que ningún dato sin imputar quede invisible. */}
              {orphanPending.map((mv) => (
                <tr key={mv.movementId} className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn/5 p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-warn/5 sm:p-0">
                  <td data-label="Fecha del hecho" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-2 sm:before:hidden text-[13px] text-ink">{formatDateOnly(mv.fechaHecho)}</td>
                  <td data-label="Fecha de captación" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-2 sm:before:hidden text-[13px] text-ink-soft">{formatDate(mv.fechaCaptacion)}</td>
                  <td data-label="Tipo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-2 sm:before:hidden text-[13px] text-ink">{mv.type === 'purchase' ? 'Compra' : 'Consumo'}</td>
                  <td data-label="Detalle" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-2 sm:before:hidden">
                    <span className="text-[13px] text-ink">{mv.detail}</span>
                    <div className="mt-1">
                      <PendingBadge
                        onClick={() =>
                          openImputacion({ detail: mv.detail, fechaHecho: mv.fechaHecho, dataPointIds: mv.dataPointIds })
                        }
                      />
                    </div>
                  </td>
                  <td className="hidden sm:table-cell" />
                  <td className="hidden sm:table-cell" />
                  <td className="hidden sm:table-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-2">
        {isDirty && (
          <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
          </p>
        )}
        <Button type="submit" loading={saving} className="w-full">
          Guardar Materia Prima
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={!!pending}
      title="Actualizar Materia Prima"
      message="¿Querés actualizar los datos de Materia Prima?"
      confirmLabel="Guardar"
      loading={saving}
      onConfirm={async () => {
        if (!pending) return;
        // D.3: capturar los movimientos nuevos ANTES de guardar. Guardar
        // re-sincroniza el prop `material` y sube `baseMovementsCountRef` al
        // total nuevo; si se calculara después, el slice daría vacío y no se
        // registraría ningún dato trazable (bug F04).
        const nuevos = newTrazableMovements(pending.movements, baseMovementsCountRef.current);
        await onSaveMaterial(pending);
        reset(cleanRawMaterialForForm(pending));
        void registerTrazableMovements(nuevos);
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />

    <ImputacionModal
      open={!!currentImputacion}
      detail={currentImputacion?.detail}
      options={currentImputacion?.options ?? []}
      loading={imputar.isPending}
      onChoose={async (periodo) => {
        if (!currentImputacion) return;
        await Promise.all(
          currentImputacion.dataPointIds.map((id) => imputar.mutateAsync({ dataPointId: id, periodo, sourceArea: 'costista' })),
        );
        setImputacionQueue((q) => q.slice(1));
      }}
      onCancel={() => setImputacionQueue((q) => q.slice(1))}
    />
    </>
  );
}
