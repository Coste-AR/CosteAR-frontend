import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  useProcessDepartments,
  useCreateProcessDepartment,
  useUpdateProcessDepartment,
  useDeleteProcessDepartment,
  useReorderProcessDepartments,
} from '../../process-costing-hooks';
import type { ProcessDepartment } from '../../process-costing-types';

/**
 * DEPARTAMENTOS DE PROCESO (U04).
 *
 * No es una lista de nombres: el orden ES la cadena por la que viaja el costo.
 * El 1º transfiere al 2º, el 2º al 3º, y el costo unitario del último es el
 * costo del producto terminado. Por eso la posición se muestra siempre y el
 * reordenamiento es explícito.
 *
 * Reordenar y borrar mueven filas por ID, nunca por posición (fix F02): con
 * índices, mover una fila y guardar mezclaba los datos de dos departamentos.
 *
 * Cuando la estructura ya tiene cálculos, el backend congela la cadena. Acá se
 * deshabilitan los controles ANTES de que el usuario intente, con el motivo a la
 * vista — enterarse por un error después de arrastrar una fila es peor.
 */

export function DepartmentsTab({ structureId, readOnly }: { structureId: string; readOnly: boolean }) {
  const { data, isLoading, error } = useProcessDepartments(structureId);
  const crear = useCreateProcessDepartment(structureId);
  const editar = useUpdateProcessDepartment(structureId);
  const borrar = useDeleteProcessDepartment(structureId);
  const reordenar = useReorderProcessDepartments(structureId);

  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [aBorrar, setABorrar] = useState<ProcessDepartment | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const departments = data?.departments ?? [];
  const cadenaCongelada = data?.chainFrozen ?? false;
  const bloqueado = readOnly || cadenaCongelada;

  const correr = async (fn: () => Promise<unknown>) => {
    setFallo(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setFallo(apiErrorMessage(e));
      return false;
    }
  };

  const agregar = async () => {
    const name = nuevo.trim();
    if (!name) return;
    if (await correr(() => crear.mutateAsync({ name }))) setNuevo('');
  };

  const guardarNombre = async (dept: ProcessDepartment) => {
    const name = nombreEdit.trim();
    if (!name || name === dept.name) {
      setEditando(null);
      return;
    }
    if (await correr(() => editar.mutateAsync({ deptId: dept.id, name }))) setEditando(null);
  };

  /** Mueve por ID, no por índice: la cadena se manda completa y reordenada. */
  const mover = async (deptId: string, delta: -1 | 1) => {
    const ids = departments.map((d) => d.id);
    const i = ids.indexOf(deptId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await correr(() => reordenar.mutateAsync(ids));
  };

  const confirmarBorrado = async () => {
    if (!aBorrar) return;
    if (await correr(() => borrar.mutateAsync(aBorrar.id))) setABorrar(null);
  };

  if (isLoading) {
    return <p className="py-10 text-center text-[13px] text-ink-soft">Cargando departamentos…</p>;
  }
  if (error) {
    return (
      <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
        {apiErrorMessage(error)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {cadenaCongelada && (
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface-alt px-3.5 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-soft" />
          <p className="text-[13px] leading-relaxed text-ink-soft">
            La estructura ya tiene cálculos hechos, así que el <strong>orden</strong> de las etapas
            quedó fijo: es parte de esos resultados. Podés seguir agregando un departamento al final
            y renombrar los que hay — eso no altera lo ya calculado.
          </p>
        </div>
      )}

      {fallo && (
        <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{fallo}</div>
      )}

      {departments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center">
          <p className="text-[13px] text-ink-soft">
            Todavía no hay departamentos. Empezá por la primera etapa del proceso — por ejemplo
            «Cocción» o «Destilado».
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {departments.map((dept, i) => (
            <li
              key={dept.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                i > 0 && 'border-t border-line',
              )}
            >
              <span className="w-9 shrink-0 font-mono-jb text-[13px] font-semibold text-granate">
                {dept.sequence}º
              </span>

              {editando === dept.id ? (
                <>
                  <input
                    autoFocus
                    value={nombreEdit}
                    onChange={(e) => setNombreEdit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void guardarNombre(dept);
                      if (e.key === 'Escape') setEditando(null);
                    }}
                    className="min-w-0 flex-1 rounded-sm border border-line-strong px-2.5 py-1.5 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => void guardarNombre(dept)}
                    className="text-ok hover:opacity-70"
                    title="Guardar"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="text-ink-soft hover:text-ink"
                    title="Cancelar"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">{dept.name}</div>
                    <div className="text-[11.5px] text-ink-soft">
                      {dept.defaultConversionAvanceEqualsMO
                        ? 'Conversión unificada (mano de obra y carga fabril con el mismo avance)'
                        : 'Mano de obra y carga fabril por separado'}
                    </div>
                  </div>

                  <label className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={dept.defaultConversionAvanceEqualsMO}
                      disabled={readOnly}
                      onChange={(e) =>
                        void correr(() =>
                          editar.mutateAsync({
                            deptId: dept.id,
                            conversionUnified: e.target.checked,
                          }),
                        )
                      }
                    />
                    Conversión unificada
                  </label>

                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(dept.id);
                          setNombreEdit(dept.name);
                        }}
                        className="p-1 text-ink-soft hover:text-granate"
                        title="Renombrar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={bloqueado || i === 0}
                        onClick={() => void mover(dept.id, -1)}
                        className="p-1 text-ink-soft hover:text-granate disabled:opacity-25"
                        title={cadenaCongelada ? 'La cadena está fija' : 'Subir una posición'}
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={bloqueado || i === departments.length - 1}
                        onClick={() => void mover(dept.id, 1)}
                        className="p-1 text-ink-soft hover:text-granate disabled:opacity-25"
                        title={cadenaCongelada ? 'La cadena está fija' : 'Bajar una posición'}
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={bloqueado}
                        onClick={() => setABorrar(dept)}
                        className="p-1 text-ink-soft hover:text-danger disabled:opacity-25"
                        title={cadenaCongelada ? 'La cadena está fija' : 'Sacar de la cadena'}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Agregar una etapa al final de la cadena"
              placeholder="Ej: Envasado"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void agregar();
              }}
            />
          </div>
          <Button size="sm" onClick={() => void agregar()} loading={crear.isPending} disabled={!nuevo.trim()}>
            <Plus className="size-4" /> Agregar
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={aBorrar != null}
        tone="danger"
        title={`Sacar "${aBorrar?.name ?? ''}" de la cadena`}
        confirmLabel="Sacar"
        loading={borrar.isPending}
        onConfirm={() => void confirmarBorrado()}
        onCancel={() => setABorrar(null)}
        message={
          <div className="space-y-2">
            <p>
              Las etapas siguientes suben una posición para que la cadena quede continua. Los datos
              cargados de este departamento no se borran: quedan guardados por si lo recuperás.
            </p>
            {fallo && <p className="text-danger">{fallo}</p>}
          </div>
        }
      />
    </div>
  );
}
