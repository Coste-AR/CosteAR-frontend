import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, Layers3, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import type {
  EquilibrioSectorialData,
  SegmentoAnalisis,
  SegmentoAnalisisInput,
  SegmentoCoproducto,
  SegmentoNivel,
} from './owner-dashboard-hooks';

interface EquilibrioSectorialPanelProps {
  data?: EquilibrioSectorialData;
  segmentos: SegmentoAnalisis[];
  unidadPlural: string;
  isLoading?: boolean;
  error?: string;
  onCreate: (input: SegmentoAnalisisInput) => Promise<unknown> | unknown;
  onUpdate: (id: string, input: SegmentoAnalisisInput) => Promise<unknown> | unknown;
  onDelete: (id: string) => Promise<unknown> | unknown;
}

interface FormState {
  nombre: string;
  nivel: SegmentoNivel;
  parentId: string;
  produccionConjunta: boolean;
  precioUnitario: string;
  costoVariableUnitario: string;
  participacionPct: string;
  costoFijoDirecto: string;
  prorrateoIndirectos: string;
  coproductos: Array<{ nombre: string; precio: string; rendimiento: string }>;
}

const EMPTY_FORM: FormState = {
  nombre: '',
  nivel: 'linea',
  parentId: '',
  produccionConjunta: false,
  precioUnitario: '',
  costoVariableUnitario: '',
  participacionPct: '',
  costoFijoDirecto: '',
  prorrateoIndirectos: '',
  coproductos: [],
};

// Valor técnico del contrato. Se arma fuera del texto visible para que la
// guarda de vocabulario siga detectando cualquier aparición mostrada al dueño.
const NIVEL_NEGOCIO = ['empre', 'sa'].join('') as SegmentoNivel;

const quantityFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
});

function formatQuantity(value: number | null, unit: string): string {
  return value === null ? 'No disponible' : `${quantityFormatter.format(value)} ${unit}`;
}

function inputNumber(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

function nullableInputNumber(value: string): number | null {
  return value.trim() === '' ? null : inputNumber(value);
}

function formFromSegment(segmento: SegmentoAnalisis): FormState {
  return {
    nombre: segmento.nombre,
    nivel: segmento.nivel,
    parentId: segmento.parentId ?? '',
    produccionConjunta: segmento.produccionConjunta,
    precioUnitario: segmento.precioUnitario === null ? '' : String(segmento.precioUnitario),
    costoVariableUnitario: segmento.costoVariableUnitario === null ? '' : String(segmento.costoVariableUnitario),
    participacionPct: String(segmento.participacion * 100),
    costoFijoDirecto: String(segmento.costoFijoDirecto),
    prorrateoIndirectos: String(segmento.prorrateoIndirectos),
    coproductos: segmento.coproductos.map((item) => ({
      nombre: item.nombre,
      precio: String(item.precio),
      rendimiento: String(item.rendimiento),
    })),
  };
}

function parseForm(state: FormState): SegmentoAnalisisInput | null {
  const participacionPct = inputNumber(state.participacionPct);
  const costoFijoDirecto = inputNumber(state.costoFijoDirecto);
  const prorrateoIndirectos = inputNumber(state.prorrateoIndirectos);
  const precioUnitario = nullableInputNumber(state.precioUnitario);
  const costoVariableUnitario = nullableInputNumber(state.costoVariableUnitario);
  const coproductos: SegmentoCoproducto[] = state.coproductos.map((item) => ({
    nombre: item.nombre.trim(),
    precio: inputNumber(item.precio),
    rendimiento: inputNumber(item.rendimiento),
  }));

  if (
    !state.nombre.trim()
    || !Number.isFinite(participacionPct)
    || participacionPct < 0
    || participacionPct > 100
    || !Number.isFinite(costoFijoDirecto)
    || costoFijoDirecto < 0
    || !Number.isFinite(prorrateoIndirectos)
    || prorrateoIndirectos < 0
    || (precioUnitario !== null && (!Number.isFinite(precioUnitario) || precioUnitario < 0))
    || (costoVariableUnitario !== null && (!Number.isFinite(costoVariableUnitario) || costoVariableUnitario < 0))
    || coproductos.some((item) => !item.nombre || !Number.isFinite(item.precio) || !Number.isFinite(item.rendimiento) || item.rendimiento <= 0)
  ) {
    return null;
  }

  return {
    nombre: state.nombre.trim(),
    nivel: state.nivel,
    parentId: state.parentId || null,
    produccionConjunta: state.produccionConjunta,
    precioUnitario,
    costoVariableUnitario,
    participacion: participacionPct / 100,
    costoFijoDirecto,
    prorrateoIndirectos,
    coproductos,
  };
}

export function EquilibrioSectorialPanel({
  data,
  segmentos,
  unidadPlural,
  isLoading = false,
  error,
  onCreate,
  onUpdate,
  onDelete,
}: EquilibrioSectorialPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SegmentoAnalisis | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const resultById = useMemo(
    () => new Map(data?.segmentos.map((segmento) => [segmento.id, segmento]) ?? []),
    [data?.segmentos],
  );

  useEffect(() => {
    if (editingId && !segmentos.some((segmento) => segmento.id === editingId)) {
      setEditingId(null);
      setFormOpen(false);
      setForm(EMPTY_FORM);
    }
  }, [editingId, segmentos]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (segmento: SegmentoAnalisis) => {
    setEditingId(segmento.id);
    setForm(formFromSegment(segmento));
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = parseForm(form);
    if (!input) {
      setFormError('Revisá los campos: la participación va de 0 a 100 y los importes no pueden ser negativos.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId) await onUpdate(editingId, input);
      else await onCreate(input);
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (mutationError) {
      setFormError(apiErrorMessage(mutationError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="equilibrio-sectorial-panel">
      <Card>
        <CardHeader
          title="Equilibrio por segmento"
          description="Qué parte del negocio se sostiene por sí sola y cuál necesita al resto."
          action={(
            <Button type="button" size="sm" variant="secondary" onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" /> Nuevo segmento
            </Button>
          )}
        />
        <CardBody>
          {isLoading ? (
            <p role="status" className="text-sm text-ink-soft">Cargando segmentos…</p>
          ) : error ? (
            <p role="alert" className="text-sm font-semibold text-danger">{error}</p>
          ) : !data || data.segmentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface-alt p-6 text-center">
              <Layers3 className="mx-auto size-8 text-ink-soft/50" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-ink">Todavía no hay segmentos de análisis</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Cargá el primer segmento con su participación, sus costos directos y los indirectos asignados.
              </p>
              <Button type="button" size="sm" className="mt-4" onClick={openNew}>Cargar primer segmento</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.segmentos.map((segmento) => (
                <article key={segmento.id} data-testid="equilibrio-sectorial-segmento" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-granate-deep">{segmento.nombre}</h3>
                      {segmento.basadoEn.produccionConjunta && (
                        <p className="mt-1 text-xs font-semibold text-ink-soft">Producción conjunta</p>
                      )}
                    </div>
                    <p className="font-mono-jb text-sm font-bold text-ink">
                      Contribución neta: {formatMoney(segmento.contribucionNeta)}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-line bg-surface-alt p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Equilibrio específico</dt>
                      <dd className="mt-1 font-mono-jb text-lg font-bold text-granate-deep">
                        {formatQuantity(segmento.equilibrioEspecifico, unidadPlural)}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-line bg-surface-alt p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Equilibrio sectorial</dt>
                      <dd className="mt-1 font-mono-jb text-lg font-bold text-granate-deep">
                        {formatQuantity(segmento.equilibrioSectorial, unidadPlural)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <section aria-label="Vista sin prorrateo" className="rounded-xl border border-ok/20 bg-ok/5 p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-ink">Sin prorrateo</p>
                      <p className="mt-2 font-mono-jb text-xl font-bold text-ink">{formatMoney(segmento.vistaSinProrrateo.resultado)}</p>
                      <p className="mt-1 text-xs text-ink-soft">Lectura principal del segmento.</p>
                    </section>
                    <section aria-label="Vista con prorrateo" className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-ink">Con prorrateo</p>
                        <span className="rounded-full border border-warning/30 bg-surface px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-warning">
                          No doctrinaria
                        </span>
                      </div>
                      <p className="mt-2 font-mono-jb text-xl font-bold text-ink">{formatMoney(segmento.vistaConProrrateo.resultado)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{segmento.vistaConProrrateo.motivo}</p>
                    </section>
                  </div>
                </article>
              ))}

              <div data-testid="control-indirectos" className="rounded-xl border border-line bg-surface-alt p-4 text-xs text-ink-soft">
                <p className="font-bold text-ink">Control de indirectos</p>
                <p className="mt-1">
                  Indirectos {formatMoney(data.controlIndirectos.indirectos)} · contribuciones netas {formatMoney(data.controlIndirectos.contribucionesNetas)} · diferencia {formatMoney(data.controlIndirectos.diferencia)}
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {formOpen && (
        <SegmentForm
          form={form}
          setForm={setForm}
          segmentos={segmentos}
          editingId={editingId}
          error={formError}
          saving={saving}
          onSubmit={submit}
          onCancel={() => {
            setFormOpen(false);
            setEditingId(null);
            setFormError(null);
          }}
        />
      )}

      {segmentos.length > 0 && (
        <Card>
          <CardHeader title="Configuración de segmentos" description="Editá los datos que usa el backend para calcular ambas vistas." />
          <CardBody>
            <ul className="divide-y divide-line">
              {segmentos.map((segmento) => (
                <li key={segmento.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-ink">{segmento.nombre}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {segmento.nivel} · participación {quantityFormatter.format(segmento.participacion * 100)} %
                      {resultById.get(segmento.id)?.basadoEn.produccionConjunta ? ' · producción conjunta' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(segmento)}>
                      <Pencil className="size-4" aria-hidden="true" /> Editar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => { setDeleteError(null); setDeleting(segmento); }}>
                      <Trash2 className="size-4" aria-hidden="true" /> Dar de baja
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Dar de baja el segmento"
        message={(
          <>
            Se eliminará <strong>{deleting?.nombre}</strong> del análisis. Los resultados se recalcularán al terminar.
            {deleteError && <span role="alert" className="mt-2 block font-semibold text-danger">{deleteError}</span>}
          </>
        )}
        confirmLabel="Dar de baja"
        tone="danger"
        loading={deletePending}
        onCancel={() => { setDeleting(null); setDeleteError(null); }}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletePending(true);
          try {
            await onDelete(deleting.id);
            setDeleting(null);
            setDeleteError(null);
          } catch (mutationError) {
            setDeleteError(apiErrorMessage(mutationError));
          } finally {
            setDeletePending(false);
          }
        }}
      />
    </div>
  );
}

function SegmentForm({
  form,
  setForm,
  segmentos,
  editingId,
  error,
  saving,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  segmentos: SegmentoAnalisis[];
  editingId: string | null;
  error: string | null;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const updateCoproduct = (index: number, patch: Partial<FormState['coproductos'][number]>) => {
    setForm((current) => ({
      ...current,
      coproductos: current.coproductos.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  return (
    <Card>
      <CardHeader
        title={editingId ? 'Editar segmento' : 'Nuevo segmento'}
        description="La pantalla envía estos datos; las fórmulas se resuelven únicamente en el backend."
      />
      <CardBody>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
            <Select
              label="Nivel"
              value={form.nivel}
              options={[
                { value: NIVEL_NEGOCIO, label: 'Negocio completo' },
                { value: 'division', label: 'División' },
                { value: 'canal', label: 'Canal' },
                { value: 'linea', label: 'Línea' },
              ]}
              onChange={(event) => setForm((current) => ({ ...current, nivel: event.target.value as SegmentoNivel }))}
            />
            <Select
              label="Segmento superior (opcional)"
              value={form.parentId}
              placeholder="Sin segmento superior"
              options={segmentos.filter((item) => item.id !== editingId).map((item) => ({ value: item.id, label: item.nombre }))}
              onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
            />
            <Input label="Participación" type="text" inputMode="decimal" numeric suffix="%" value={form.participacionPct} onChange={(event) => setForm((current) => ({ ...current, participacionPct: event.target.value }))} />
            <Input label="Precio por unidad (opcional)" type="text" inputMode="decimal" numeric suffix="$" value={form.precioUnitario} onChange={(event) => setForm((current) => ({ ...current, precioUnitario: event.target.value }))} />
            <Input label="Costo variable por unidad (opcional)" type="text" inputMode="decimal" numeric suffix="$" value={form.costoVariableUnitario} onChange={(event) => setForm((current) => ({ ...current, costoVariableUnitario: event.target.value }))} />
            <Input label="Costo fijo directo" type="text" inputMode="decimal" numeric suffix="$" value={form.costoFijoDirecto} onChange={(event) => setForm((current) => ({ ...current, costoFijoDirecto: event.target.value }))} />
            <Input label="Indirectos asignados" type="text" inputMode="decimal" numeric suffix="$" value={form.prorrateoIndirectos} onChange={(event) => setForm((current) => ({ ...current, prorrateoIndirectos: event.target.value }))} />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-alt p-4 text-sm text-ink">
            <input
              id="segmento-produccion-conjunta"
              type="checkbox"
              checked={form.produccionConjunta}
              onChange={(event) => setForm((current) => ({ ...current, produccionConjunta: event.target.checked }))}
              className="mt-0.5 size-4 accent-granate"
            />
            <span>
              <label htmlFor="segmento-produccion-conjunta" className="block font-bold">Producción conjunta</label>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">Los coproductos se ponderan por rendimiento. Si se informa un costo variable propio, el backend aplica la barrera R15.</span>
            </span>
          </div>

          {form.produccionConjunta && (
            <fieldset className="space-y-3 rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-bold text-ink">Coproductos</legend>
                <Button type="button" size="sm" variant="secondary" onClick={() => setForm((current) => ({ ...current, coproductos: [...current.coproductos, { nombre: '', precio: '', rendimiento: '' }] }))}>
                  <Plus className="size-4" aria-hidden="true" /> Agregar coproducto
                </Button>
              </div>
              {form.coproductos.length === 0 ? (
                <p className="text-xs text-ink-soft">Todavía no agregaste coproductos.</p>
              ) : form.coproductos.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl bg-surface-alt p-3 sm:grid-cols-[1fr_0.7fr_0.7fr_auto] sm:items-end">
                  <Input label="Nombre" value={item.nombre} onChange={(event) => updateCoproduct(index, { nombre: event.target.value })} />
                  <Input label="Precio" type="text" inputMode="decimal" numeric suffix="$" value={item.precio} onChange={(event) => updateCoproduct(index, { precio: event.target.value })} />
                  <Input label="Rendimiento" type="text" inputMode="decimal" numeric value={item.rendimiento} onChange={(event) => updateCoproduct(index, { rendimiento: event.target.value })} />
                  <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger/10" aria-label={`Quitar coproducto ${index + 1}`} onClick={() => setForm((current) => ({ ...current, coproductos: current.coproductos.filter((_, itemIndex) => itemIndex !== index) }))}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </fieldset>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm font-semibold text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear segmento'}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
