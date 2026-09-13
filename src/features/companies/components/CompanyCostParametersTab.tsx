import { useEffect, useState } from 'react';
import { CircleAlert, Clock3, RotateCcw, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  useCostParameters,
  useResetCostParameter,
  useSaveCostParameter,
  type CostParameter,
  isNumericCostParameter,
} from '../cost-parameters-hooks';

function formatValue(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 6 }).format(value);
}

function parseValue(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function originLabel(parameter: CostParameter) {
  if (parameter.origen === 'default') {
    return parameter.seguro ? 'Convención del sistema' : 'Estimación del sistema';
  }
  if (parameter.origen === 'empresa') {
    return parameter.confirmado ? 'Confirmado por la empresa' : 'Cargado para la empresa';
  }
  if (parameter.origen === 'estructura') return 'Definido para esta estructura';
  return 'Definido para este período';
}

function ParameterCard({
  parameter,
  onSave,
  onReset,
}: {
  parameter: CostParameter;
  onSave: (key: string, value: number) => Promise<unknown>;
  onReset: (key: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(String(parameter.valor));
  const [pendingAction, setPendingAction] = useState<'save' | 'reset' | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const inputId = `cost-parameter-${parameter.clave}`;
  const hintId = `${inputId}-hint`;

  useEffect(() => {
    setDraft(String(parameter.valor));
  }, [parameter.valor]);

  const save = async () => {
    const value = parseValue(draft);
    if (value === null) {
      setFeedback({ tone: 'error', text: 'Ingresá un número válido.' });
      return;
    }

    setPendingAction('save');
    setFeedback(null);
    try {
      await onSave(parameter.clave, value);
      setFeedback({ tone: 'ok', text: 'Valor confirmado.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: apiErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const reset = async () => {
    setPendingAction('reset');
    setFeedback(null);
    try {
      await onReset(parameter.clave);
      setFeedback({ tone: 'ok', text: 'Volviste al valor sugerido.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: apiErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  };

  const isSystemValue = parameter.origen === 'default';
  const showVerification = isSystemValue && !parameter.seguro && parameter.nota;

  return (
    <li>
      <Card className="h-full">
        <CardBody className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold leading-snug text-ink">
                {parameter.descripcion}
              </h3>
              <p className="mt-1 font-mono text-[10px] text-ink-soft/70">{parameter.clave}</p>
            </div>
            <span
              className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide',
                isSystemValue
                  ? 'border-warn/30 bg-warn/10 text-warn'
                  : 'border-ok/25 bg-ok/10 text-ok',
              )}
            >
              {isSystemValue ? <CircleAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
              {originLabel(parameter)}
            </span>
          </div>

          {showVerification && (
            <div className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-[12px] leading-relaxed text-ink">
              <strong>Falta verificar:</strong> {parameter.nota}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Valor del negocio
            </label>
            <div className="relative">
              <input
                id={inputId}
                inputMode="decimal"
                value={draft}
                aria-describedby={hintId}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setFeedback(null);
                }}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 pr-28 text-sm tabular-nums text-ink outline-none transition-colors focus:border-granate focus:ring-[3px] focus:ring-granate/15"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex max-w-24 items-center truncate text-[12px] font-medium text-ink-soft">
                {parameter.unidad ?? 'sin unidad'}
              </span>
            </div>
            <p id={hintId} className="text-[11.5px] text-ink-soft">
              Valor sugerido: <strong className="text-ink">{formatValue(parameter.valorDefault)}</strong>{' '}
              {parameter.unidad ?? 'sin unidad'}.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              loading={pendingAction === 'save'}
              disabled={pendingAction !== null}
              className="w-full sm:w-auto"
            >
              <Save className="size-3.5" /> Guardar y confirmar
            </Button>
            {!isSystemValue && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void reset()}
                loading={pendingAction === 'reset'}
                disabled={pendingAction !== null}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="size-3.5" /> Volver al sugerido
              </Button>
            )}
          </div>

          {feedback && (
            <p
              role={feedback.tone === 'error' ? 'alert' : 'status'}
              className={cn('text-[12px] font-medium', feedback.tone === 'error' ? 'text-danger' : 'text-ok')}
            >
              {feedback.text}
            </p>
          )}
        </CardBody>
      </Card>
    </li>
  );
}

export function CompanyCostParametersTab({ companyId }: { companyId: string }) {
  const parameters = useCostParameters(companyId);
  const save = useSaveCostParameter(companyId);
  const reset = useResetCostParameter(companyId);

  if (parameters.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-label="Cargando parametros del negocio">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  if (parameters.isError) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-danger" role="alert">
          {apiErrorMessage(parameters.error)}
        </CardBody>
      </Card>
    );
  }

  // El mismo endpoint ahora también devuelve preguntas de opción. Esta pestaña
  // conserva deliberadamente su comportamiento numérico; las opciones se
  // responden en Configuración, donde viven los módulos que las habilitan.
  const items = (parameters.data ?? []).filter(isNumericCostParameter);

  return (
    <section data-testid="company-cost-parameters" className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-granate">
          <SlidersHorizontal className="size-5" />
          <h2 className="text-lg font-bold text-granate-deep">Parámetros del negocio</h2>
        </div>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
          Confirmá las constantes que usa el cálculo. Las sugerencias del sistema están identificadas
          para que nunca parezcan datos declarados por la empresa.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-action/20 bg-action/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-action" />
        <p>
          Los cambios se aplican a cálculos nuevos. Los períodos cerrados conservan los valores con
          los que fueron cerrados y no se recalculan.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-ink-soft">
            No hay parámetros disponibles para el rubro de esta empresa.
          </CardBody>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((parameter) => (
            <ParameterCard
              key={parameter.clave}
              parameter={parameter}
              onSave={(key, value) => save.mutateAsync({ key, value })}
              onReset={(key) => reset.mutateAsync(key)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
