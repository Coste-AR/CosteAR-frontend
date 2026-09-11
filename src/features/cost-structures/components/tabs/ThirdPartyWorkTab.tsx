import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Calculator, Factory, Handshake, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { apiErrorMessage } from '@/lib/api';
import { useUpdateThirdPartyWork } from '../../cost-structure-hooks';

function parseAmount(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function ThirdPartyWorkTab({
  structureId,
  periodLabel,
  defaultValue,
  readOnly,
  onChanged,
  canCalculate,
  onCalculate,
  calculating,
}: {
  structureId: string;
  periodLabel?: string;
  defaultValue?: number;
  readOnly: boolean;
  onChanged: () => void;
  canCalculate: boolean;
  onCalculate: () => void;
  calculating: boolean;
}) {
  const update = useUpdateThirdPartyWork(structureId);
  const [amount, setAmount] = useState(defaultValue ? String(defaultValue) : '');
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(defaultValue ? String(defaultValue) : '');
  }, [defaultValue]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError('Ingresá un importe igual o mayor que cero.');
      return;
    }
    setError(null);
    setPending(parsed);
  };

  const save = async () => {
    if (pending === null) return;
    try {
      await update.mutateAsync(pending);
      setAmount(pending === 0 ? '' : String(pending));
      setPending(null);
      onChanged();
      toast.success('Trabajos de terceros guardados. Volvé a calcular para actualizar el resultado.');
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setPending(null);
    }
  };

  return (
    <section data-testid="third-party-work-period" className="space-y-4">
      {readOnly && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] text-ink">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
          <span>
            Este período está cerrado. Podés consultar el importe, pero para modificarlo primero
            tenés que reabrir el período.
          </span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Trabajos de terceros del período"
          description={`Procesos productivos realizados afuera durante ${periodLabel ?? 'el período seleccionado'}.`}
        />
        <CardBody className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="rounded-xl border border-line bg-surface-alt p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Costo normal</p>
              <p className="mt-1 text-[12px] text-ink">Materia prima + mano de obra + CIP aplicados</p>
            </div>
            <ArrowRight className="hidden size-4 text-ink-soft md:block" aria-hidden />
            <div className="rounded-xl border border-action/25 bg-action/5 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-action">
                <Handshake className="size-3.5" aria-hidden /> Trabajo de terceros
              </p>
              <p className="mt-1 text-[12px] text-ink">Se suma entero, sin repartirlo entre centros.</p>
            </div>
            <ArrowRight className="hidden size-4 text-ink-soft md:block" aria-hidden />
            <div className="rounded-xl border border-ok/25 bg-ok/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ok">Costo real</p>
              <p className="mt-1 text-[12px] text-ink">El costo del producto después de los ajustes del período.</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/5 px-4 py-3">
            <Factory className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <p className="text-[12px] leading-relaxed text-ink">
              <strong>No es un costo indirecto.</strong> No entra al prorrateo, no genera cuota y no
              cambia el costo de cada centro. Acá se carga por separado para que llegue directo al
              estado de costos.
            </p>
          </div>

          <form onSubmit={submit} className="max-w-sm space-y-4">
            <Input
              label="Importe total del período $"
              type="number"
              min="0"
              step="0.01"
              numeric
              value={amount}
              disabled={readOnly}
              placeholder="Ej: 25000"
              info="Sumá tratamiento térmico, bordado, flete de proceso u otros trabajos productivos hechos afuera. Si no hubo, dejalo en cero."
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
            />
            <p className="text-[12px] text-ink-soft">
              Registrado actualmente: <strong className="text-ink"><Money value={defaultValue ?? 0} /></strong>
            </p>
            {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
            {!readOnly && (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="secondary" loading={update.isPending}>
                  <Handshake className="size-4" aria-hidden /> Guardar importe
                </Button>
                {canCalculate && (
                  <Button type="button" onClick={onCalculate} loading={calculating}>
                    <Calculator className="size-4" aria-hidden /> Calcular ahora
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        title="Actualizar trabajos de terceros"
        message={pending === 0
          ? 'El período quedará sin trabajos de terceros. ¿Querés guardar el importe en cero?'
          : <>Se guardarán <Money value={pending ?? 0} /> como trabajos de terceros del período. ¿Es correcto?</>}
        confirmLabel="Guardar"
        loading={update.isPending}
        onConfirm={() => void save()}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
