import { useState, type FormEvent } from 'react';
import { AlertTriangle, Lock, Pencil, Plus, Scale, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/api';
import {
  useCreateDesperdicio,
  useDeleteDesperdicio,
  useDesperdicios,
  useUpdateDesperdicio,
  type Desperdicio,
  type DesperdicioInput,
} from '../../desperdicio-hooks';
import {
  validateDesperdicioDraft,
  type DesperdicioDraft,
  type DesperdicioErrors,
} from '../../desperdicio-validation';

const EMPTY_DRAFT: DesperdicioDraft = {
  concepto: '',
  valor: '',
  valorRecupero: '',
  naturaleza: '',
  motivo: '',
};

const NATURE_OPTIONS = [
  { value: '', label: 'Sin declarar por ahora' },
  { value: 'normal', label: 'Normal — la absorben las unidades buenas' },
  { value: 'extraordinaria', label: 'Extraordinaria — pérdida del período' },
];

function draftFrom(item: Desperdicio): DesperdicioDraft {
  return {
    concepto: item.concepto,
    valor: String(item.valor),
    valorRecupero: String(item.valorRecupero),
    naturaleza:
      item.naturaleza === 'NORMAL'
        ? 'normal'
        : item.naturaleza === 'EXTRAORDINARIA'
          ? 'extraordinaria'
          : '',
    motivo: item.motivo ?? '',
  };
}

function impactText(item: Desperdicio) {
  if (item.naturaleza === null) {
    return 'No entra al cálculo hasta que declares si fue normal o extraordinario.';
  }
  if (item.naturaleza === 'NORMAL') {
    return 'Las unidades buenas absorben la pérdida; el recupero reduce el costo.';
  }
  return 'Sale del costo del producto y se lleva como pérdida del período.';
}

function NatureBadge({ nature }: { nature: Desperdicio['naturaleza'] }) {
  if (nature === null) return <StatusBadge status="warn">Pendiente de declarar</StatusBadge>;
  if (nature === 'NORMAL') return <StatusBadge status="ok">Normal</StatusBadge>;
  return <StatusBadge status="danger">Extraordinario</StatusBadge>;
}

export function WasteTab({
  periodId,
  periodLabel,
  readOnly,
  onChanged,
}: {
  periodId: string | null;
  periodLabel?: string;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const { data = [], isLoading, isError } = useDesperdicios(periodId);
  const createWaste = useCreateDesperdicio(periodId);
  const updateWaste = useUpdateDesperdicio(periodId);
  const deleteWaste = useDeleteDesperdicio(periodId);
  const [editor, setEditor] = useState<Desperdicio | 'new' | null>(null);
  const [draft, setDraft] = useState<DesperdicioDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DesperdicioErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Desperdicio | null>(null);

  const pendingCount = data.filter((item) => item.naturaleza === null).length;
  const saving = createWaste.isPending || updateWaste.isPending;

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setServerError(null);
    setEditor('new');
  };

  const openEdit = (item: Desperdicio) => {
    setDraft(draftFrom(item));
    setErrors({});
    setServerError(null);
    setEditor(item);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
  };

  const setField = <K extends keyof DesperdicioDraft>(key: K, value: DesperdicioDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateDesperdicioDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: DesperdicioInput = {
      concepto: draft.concepto.trim(),
      valor: Number(draft.valor),
      valorRecupero: draft.valorRecupero.trim() === '' ? 0 : Number(draft.valorRecupero),
      naturaleza: draft.naturaleza || null,
      motivo: draft.motivo.trim() || null,
    };

    try {
      if (editor === 'new') await createWaste.mutateAsync(input);
      else if (editor) await updateWaste.mutateAsync({ id: editor.id, input });
      setEditor(null);
      onChanged();
      toast.success('Desperdicio guardado. Volvé a calcular para actualizar el resultado.');
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWaste.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      onChanged();
      toast.success('Desperdicio dado de baja. Volvé a calcular para actualizar el resultado.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (!periodId) {
    return (
      <Card>
        <CardBody className="py-16 text-center">
          <Scale className="mx-auto size-10 text-idle" />
          <p className="mt-3 text-sm text-ink-soft">Abrí un período para cargar sus desperdicios.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <section data-testid="waste-period" className="space-y-4">
      {readOnly && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] text-ink">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
          <span>
            Este período está cerrado. Podés consultar sus desperdicios, pero para cargar,
            corregir o dar de baja uno primero tenés que reabrirlo.
          </span>
        </div>
      )}
      <Card>
        <CardHeader
          title="Desperdicios del período"
          description={`Registrá lo que se perdió en ${periodLabel ?? 'el período seleccionado'} y declaralo cuando tengas el criterio.`}
          action={
            <Button
              size="sm"
              onClick={openCreate}
              disabled={readOnly}
              title={readOnly ? 'Primero tenés que reabrir el período.' : undefined}
            >
              <Plus className="size-4" aria-hidden /> Cargar desperdicio
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface-alt p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Sin declarar</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">Queda pendiente y no entra al cálculo.</p>
            </div>
            <div className="rounded-xl border border-ok/20 bg-ok/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ok">Normal</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">La absorben las unidades buenas.</p>
            </div>
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-danger">Extraordinario</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">Sale del costo y va a pérdida del mes.</p>
            </div>
          </div>

          {pendingCount > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold text-warn">
                  {pendingCount} {pendingCount === 1 ? 'desperdicio pendiente' : 'desperdicios pendientes'} de declarar
                </p>
                <p className="mt-0.5 text-[12px] text-ink">No entran al cálculo hasta que alguien decida su naturaleza.</p>
              </div>
            </div>
          )}

          {isLoading && <p className="py-8 text-center text-sm text-ink-soft">Cargando desperdicios…</p>}
          {isError && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">
              No pudimos cargar los desperdicios del período. Intentá de nuevo.
            </p>
          )}
          {!isLoading && !isError && data.length === 0 && (
            <div className="py-10 text-center">
              <Scale className="mx-auto size-9 text-idle" aria-hidden />
              <p className="mt-3 text-sm font-medium text-ink">Todavía no hay desperdicios cargados.</p>
              <p className="mt-1 text-[12px] text-ink-soft">Si este mes no hubo pérdidas, no hace falta agregar nada.</p>
            </div>
          )}

          {data.length > 0 && (
            <ul className="divide-y divide-line" aria-label="Desperdicios cargados">
              {data.map((item) => (
                <li key={item.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{item.concepto}</p>
                      <NatureBadge nature={item.naturaleza} />
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{impactText(item)}</p>
                    {item.motivo && <p className="mt-1 text-[12px] text-ink">Motivo: {item.motivo}</p>}
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-alt px-3 py-2.5 text-right">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Perdido</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink"><Money value={item.valor} /></dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Recupero</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink"><Money value={item.valorRecupero} /></dd>
                    </div>
                  </dl>
                  {!readOnly && (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        aria-label={`Editar ${item.concepto}`}
                        className="rounded-lg p-2 text-granate transition-colors hover:bg-granate-tenue"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`Dar de baja ${item.concepto}`}
                        className="rounded-lg p-2 text-danger transition-colors hover:bg-danger/10"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {editor && (
        <PortalOverlay>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="waste-editor-title"
              className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="waste-editor-title" className="text-lg font-bold text-granate-deep">
                    {editor === 'new' ? 'Cargar desperdicio' : 'Corregir desperdicio'}
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                    Podés guardarlo sin declarar su naturaleza. En ese estado queda pendiente y no entra al cálculo.
                  </p>
                </div>
                <button type="button" onClick={closeEditor} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-alt hover:text-ink">
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Qué se perdió"
                  value={draft.concepto}
                  onChange={(event) => setField('concepto', event.target.value)}
                  error={errors.concepto}
                  placeholder="Ej.: recortes de material"
                  maxLength={201}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Valor de lo perdido"
                    type="number"
                    min="0"
                    step="0.01"
                    numeric
                    suffix="$"
                    value={draft.valor}
                    onChange={(event) => setField('valor', event.target.value)}
                    error={errors.valor}
                  />
                  <Input
                    label="Recupero"
                    type="number"
                    min="0"
                    step="0.01"
                    numeric
                    suffix="$"
                    value={draft.valorRecupero}
                    onChange={(event) => setField('valorRecupero', event.target.value)}
                    error={errors.valorRecupero}
                    hint="Lo obtenido al vender o recuperar el desperdicio."
                  />
                </div>
                <Select
                  label="Naturaleza"
                  value={draft.naturaleza}
                  options={NATURE_OPTIONS}
                  onChange={(event) => setField('naturaleza', event.target.value as DesperdicioDraft['naturaleza'])}
                  hint="Si todavía no lo sabés, dejalo sin declarar: no se asumirá que es normal."
                />
                <Textarea
                  label="Motivo de la clasificación (opcional)"
                  value={draft.motivo}
                  onChange={(event) => setField('motivo', event.target.value)}
                  error={errors.motivo}
                  placeholder="Qué pasó y por qué se considera normal o extraordinario"
                  maxLength={1001}
                />
                {serverError && (
                  <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{serverError}</p>
                )}
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={closeEditor} disabled={saving}>Cancelar</Button>
                  <Button type="submit" loading={saving}>Guardar desperdicio</Button>
                </div>
              </form>
            </div>
          </div>
        </PortalOverlay>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Dar de baja el desperdicio"
        message={
          <span>
            Se dará de baja <strong>{deleteTarget?.concepto}</strong>. Dejará de entrar al próximo cálculo, pero conservará su rastro en la bitácora.
          </span>
        }
        confirmLabel="Dar de baja"
        tone="danger"
        loading={deleteWaste.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => !deleteWaste.isPending && setDeleteTarget(null)}
      />
    </section>
  );
}
