import { useState } from 'react';
import { CheckCircle2, CircleHelp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apiErrorMessage } from '@/lib/api';
import {
  type CostBehavior,
  type CostBehaviorClassification,
  type CostBehaviorKey,
  useConfirmCostBehavior,
  useCostBehaviorClassifications,
} from '../cost-behavior-hooks';

const CONCEPTS: Record<CostBehaviorKey, { label: string; description: string }> = {
  comportamiento_materia_prima: {
    label: 'Materia prima',
    description: 'Insumos que se consumen para producir.',
  },
  comportamiento_mano_obra_directa: {
    label: 'Mano de obra directa',
    description: 'Trabajo dedicado directamente a la producción.',
  },
  comportamiento_costos_indirectos: {
    label: 'Costos indirectos de producción',
    description: 'Costos de producción que no se asignan de forma directa a una unidad.',
  },
};

const BEHAVIOR_LABEL: Record<CostBehavior, string> = {
  VARIABLE: 'Variable',
  FIJO: 'Fijo',
  SEMIFIJO: 'Semifijo',
};

function ClassificationRow({
  companyId,
  classification,
}: {
  companyId: string;
  classification: CostBehaviorClassification;
}) {
  const concept = CONCEPTS[classification.clave];
  const [draft, setDraft] = useState<CostBehavior | ''>(
    classification.comportamientoVolumen ?? '',
  );
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirmCostBehavior(companyId);
  const unchangedConfirmed =
    classification.confirmado && draft === classification.comportamientoVolumen;

  const save = async () => {
    if (!draft) return;
    setMessage(null);
    try {
      await confirm.mutateAsync({ key: classification.clave, behavior: draft });
      setMessage('Clasificación confirmada.');
    } catch (error) {
      setMessage(apiErrorMessage(error));
    }
  };

  return (
    <li className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.75fr)_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">{concept.label}</h3>
          {classification.confirmado ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              <CheckCircle2 className="size-3" aria-hidden /> Confirmado
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Falta confirmar
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{concept.description}</p>
        {!classification.confirmado && classification.comportamientoVolumen && (
          <p className="mt-2 text-xs text-zinc-600">
            Propuesta del sistema: <strong>{BEHAVIOR_LABEL[classification.comportamientoVolumen]}</strong>
            {classification.fundamento ? ` — ${classification.fundamento}` : ''}
          </p>
        )}
        {!classification.confirmado && !classification.comportamientoVolumen && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            El sistema no propone una opción: esta decisión necesita tu criterio.
          </p>
        )}
        {message && (
          <p className={`mt-2 text-xs ${confirm.isError ? 'text-red-600' : 'text-green-700'}`} role="status">
            {message}
          </p>
        )}
      </div>

      <label className="block text-xs font-medium text-zinc-700">
        Clasificación para {concept.label}
        <select
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value as CostBehavior | '');
            setMessage(null);
          }}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
        >
          <option value="">Elegí una opción</option>
          <option value="VARIABLE">Variable</option>
          <option value="FIJO">Fijo</option>
          <option value="SEMIFIJO">Semifijo</option>
        </select>
      </label>

      <Button
        type="button"
        size="sm"
        onClick={() => void save()}
        loading={confirm.isPending}
        disabled={!draft || unchangedConfirmed}
      >
        {unchangedConfirmed ? 'Confirmado' : 'Confirmar'}
      </Button>
    </li>
  );
}

export function CostBehaviorClassificationTab({ companyId }: { companyId: string }) {
  const queries = useCostBehaviorClassifications(companyId);
  const isLoading = queries.some((query) => query.isLoading);
  const failed = queries.find((query) => query.isError);
  const classifications = queries.flatMap((query) => (query.data ? [query.data] : []));

  return (
    <div className="space-y-5" data-testid="cost-behavior-classification">
      <Card>
        <CardHeader
          title="Clasificación de costos"
          description="Revisá la propuesta del sistema y confirmá cada decisión de forma explícita."
        />
        <CardBody className="space-y-3 pt-0">
          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <CircleHelp className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
            <div>
              <p className="font-semibold">“Fijo” no significa que nunca cambie.</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-900">
                Significa que no varía cuando producís o vendés más o menos. Un alquiler puede
                aumentar y seguir siendo fijo porque el aumento no depende del volumen.
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Elegir una opción no la guarda. La decisión queda registrada recién cuando presionás
            <strong> Confirmar</strong> en ese concepto. Si salís antes, no se confirma nada.
          </p>
        </CardBody>
      </Card>

      <Card>
        {isLoading && (
          <CardBody className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando propuestas…
          </CardBody>
        )}
        {!isLoading && failed && (
          <CardBody className="py-10 text-center text-sm text-red-600" role="alert">
            No pudimos cargar las propuestas. {apiErrorMessage(failed.error)}
          </CardBody>
        )}
        {!isLoading && !failed && (
          <ul className="divide-y divide-zinc-100">
            {classifications.map((classification) => (
              <ClassificationRow
                key={classification.clave}
                companyId={companyId}
                classification={classification}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
