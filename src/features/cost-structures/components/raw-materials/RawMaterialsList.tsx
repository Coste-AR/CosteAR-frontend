import { type ReactNode } from 'react';
import { Plus, Trash2, Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TraceableValue } from '@/components/ui/TraceableValue';
import { type RawMaterialConfig } from '../../cost-structure-types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDataPointIdByFieldKey } from '../../trazabilidad-hooks';
import { mpFieldKey } from './helpers';

interface Props {
  structureId?: string;
  materials: RawMaterialConfig[];
  saving: boolean;
  toDelete: number | null;
  setToDelete: (val: number | null) => void;
  setSelected: (val: number | null) => void;
  addMaterial: () => void;
  onConfirmDelete: () => Promise<void>;
}

/** Cómo se le nombra una materia prima al costista (nunca por su id interno). */
function nombreMp(m: RawMaterialConfig, index: number): string {
  return m.name?.trim() || m.code?.trim() || `Materia prima ${index + 1}`;
}

/**
 * UN VALOR DE LA LISTA CON SU FICHA (T-05).
 *
 * La fila entera es clickeable —abre la materia prima—, así que el click sobre
 * el valor se corta acá: tocar un número marcado abre SU ficha y no navega. Sin
 * esto, la ficha se abriría y la pantalla cambiaría abajo al mismo tiempo.
 *
 * Sin `dataPointId` no se envuelve nada: el número se muestra pelado, que es lo
 * correcto para una materia prima que todavía no se guardó (no hay dato que
 * mirar). El guardia de `TraceableValue` cubre lo mismo un nivel más adentro.
 */
function ValorDeLista({
  dataPointId,
  title,
  children,
}: {
  dataPointId?: string;
  title: string;
  children: ReactNode;
}) {
  if (!dataPointId) return <>{children}</>;
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <TraceableValue dataPointId={dataPointId} title={title} className="!px-1.5 !py-0.5">
        {children}
      </TraceableValue>
    </span>
  );
}

export function RawMaterialsList({ structureId, materials, saving, toDelete, setToDelete, setSelected, addMaterial, onConfirmDelete }: Props) {
  // T-05 — de acá sale la ficha de cada número de la lista. Los datos ya existen
  // desde que el guardado de la sección los reconcilia; lo que faltaba era el
  // vínculo entre el campo que se muestra y el dato que lo respalda.
  const dpByKey = useDataPointIdByFieldKey(structureId);

  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Materias primas de la estructura</h4>
          <p className="text-[11px] text-ink-soft">Cada materia prima con su codificación real de mercado, su ficha PPP y su lote de Wilson propio.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={addMaterial}>
          <Plus className="size-3" /> Agregar materia prima
        </Button>
      </div>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-12 text-center">
          <Package className="size-8 text-idle" />
          <p className="text-sm text-ink-soft">Todavía no cargaste materias primas.</p>
          <Button type="button" size="sm" onClick={addMaterial}><Plus className="size-3" /> Agregar la primera</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Código</th>
                <th className="px-3 py-2 text-left font-medium">Materia prima</th>
                <th className="px-3 py-2 text-left font-medium">Unidad</th>
                <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                <th className="px-3 py-2 text-right font-medium">Costo unit. (C)</th>
                <th className="px-3 py-2 text-right font-medium">Ex. inicial</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {materials.map((m, i) => {
                // F09-1 — "Completa" exige IDENTIFICACIÓN real, no solo datos de
                // cálculo. Mínimo: nombre + unidad (el código de mercado y el
                // proveedor son opcionales; ver DECISIONES.md). Sin identificación
                // la MP nunca cuenta como completa aunque tenga costo y movimientos.
                const identified = !!m.name?.trim() && !!m.unit?.trim();
                const hasContent = (m.wilson?.unitCost ?? 0) > 0 && (m.movements?.length ?? 0) > 0;
                const complete = identified && hasContent;
                return (
                  <tr key={m.id ?? i} className="cursor-pointer hover:bg-surface-alt/40" onClick={() => setSelected(i)}>
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-soft">{m.code || '—'}</td>
                    <td className="px-3 py-2 font-medium text-ink">{m.name || <span className="text-ink-soft italic">Sin nombre</span>}</td>
                    <td className="px-3 py-2 text-ink-soft">{m.unit || '—'}</td>
                    <td className="px-3 py-2 text-ink-soft">{m.supplier || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {m.wilson?.unitCost ? (
                        <ValorDeLista
                          dataPointId={dpByKey.get(mpFieldKey(m, i, 'wilson.costo_unitario'))}
                          title={`Costo unitario (C) · ${nombreMp(m, i)}`}
                        >
                          {m.wilson.unitCost.toLocaleString('es-AR')}
                        </ValorDeLista>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">
                      <ValorDeLista
                        dataPointId={dpByKey.get(mpFieldKey(m, i, 'existencia_inicial.cantidad'))}
                        title={`Existencia inicial · ${nombreMp(m, i)}`}
                      >
                        {(m.initialStock?.quantity ?? 0).toLocaleString('es-AR')}
                      </ValorDeLista>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${complete ? 'border-ok/20 bg-ok/10 text-ok' : 'border-idle/20 bg-idle/10 text-idle'}`}>
                        {complete ? 'Completa' : 'Incompleta'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setToDelete(i); }} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                        <ChevronRight className="size-4 text-ink-soft" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar materia prima"
        message="¿Eliminar esta materia prima de la estructura? Sus datos cargados se quitan del cálculo."
        confirmLabel="Eliminar"
        loading={saving}
        onConfirm={onConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
