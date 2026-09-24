import { AlertCircle, AlertTriangle, ArrowRight, Scale } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import type {
  EquilibrioTramosData,
  TramoCostoData,
  TransicionTramoEquilibrio,
} from './owner-dashboard-hooks';

const quantityFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function cantidad(valor: number, unidadPlural: string) {
  return `${quantityFormatter.format(valor)} ${unidadPlural}`;
}

function TransitionDetail({
  transicion,
  unidadPlural,
}: {
  transicion: TransicionTramoEquilibrio;
  unidadPlural: string;
}) {
  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-soft">
      <div className="flex items-center gap-2 font-bold text-granate-deep">
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        Transición al tramo siguiente
      </div>
      {transicion.qIndiferencia === null ? (
        <p>Punto de resultado indiferente: no disponible.</p>
      ) : (
        <p className="font-semibold text-ink">
          {`Punto de resultado indiferente: ${cantidad(transicion.qIndiferencia, unidadPlural)}`}
        </p>
      )}
      {transicion.binding !== null && (
        <p>Volumen mínimo que manda: <strong>{cantidad(transicion.binding, unidadPlural)}</strong></p>
      )}
      {transicion.alertaPegadoAlTecho && transicion.porcentajeMargen !== null && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 font-semibold text-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            Queda sólo {quantityFormatter.format(transicion.porcentajeMargen)}% hasta el techo
            {transicion.margenHastaTecho !== null
              ? ` (${cantidad(transicion.margenHastaTecho, unidadPlural)})`
              : ''}. El margen es menor al 15%.
          </p>
        </div>
      )}
    </div>
  );
}

export function EquilibrioTramosPanel({
  equilibrio,
  tramos,
  unidad,
  unidadPlural,
  isLoading = false,
  error,
}: {
  equilibrio?: EquilibrioTramosData;
  tramos?: TramoCostoData[];
  unidad: string;
  unidadPlural: string;
  isLoading?: boolean;
  error?: string;
}) {
  if (isLoading) {
    return (
      <Card role="status" data-testid="equilibrio-tramos-panel">
        <CardBody className="text-sm text-ink-soft">Comprobando los rangos físicos del equilibrio…</CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card role="alert" data-testid="equilibrio-tramos-panel">
        <CardBody className="flex items-start gap-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!equilibrio || equilibrio.tramos.length === 0) return null;

  const fuentes = new Map((tramos ?? []).map((tramo) => [tramo.id, tramo.techoFuente]));

  return (
    <Card data-testid="equilibrio-tramos-panel">
      <CardHeader
        title="Equilibrio por tramos"
        description={`Cada rango muestra si el equilibrio es alcanzable en ${unidadPlural}.`}
        action={(
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <Scale className="size-4.5" aria-hidden="true" />
          </span>
        )}
      />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        {equilibrio.tramos.map((tramo, index) => {
          const etiqueta = index === 0 ? 'Tramo actual' : index === 1 ? 'Tramo siguiente' : `Tramo ${index + 1}`;
          const testId = index === 0
            ? 'equilibrio-tramo-actual'
            : index === 1 ? 'equilibrio-tramo-siguiente' : `equilibrio-tramo-${index + 1}`;
          const fuente = fuentes.get(tramo.tramoId);
          const transicion = equilibrio.transiciones.find((item) => item.desdeTramoId === tramo.tramoId);
          const siguienteOperativo = tramo.q === null
            ? equilibrio.tramos.slice(index + 1).find((item) => item.q !== null)?.q ?? undefined
            : undefined;

          return (
            <section
              key={tramo.tramoId}
              data-testid={testId}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-granate">{etiqueta}</p>
                  <h4 className="mt-1 text-sm font-bold text-ink">
                    {quantityFormatter.format(tramo.desde)}–{tramo.hasta === null ? 'sin límite' : quantityFormatter.format(tramo.hasta)} {unidadPlural}
                  </h4>
                </div>
                <span className="rounded-full border border-line-strong bg-surface px-2 py-1 text-[10px] font-bold text-ink-soft">
                  {tramo.tipo === 'REEMPLAZA' ? 'Reemplaza la estructura' : 'Se acumula por escalones'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-ink-soft">
                <p>
                  {tramo.techo === null
                    ? 'Techo: sin techo declarado'
                    : `Techo: ${cantidad(tramo.techo, unidadPlural)}`}
                </p>
                {fuente && <p>Fuente: {fuente}</p>}
              </div>

              {tramo.q === null ? (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3">
                  <p className="text-sm font-bold text-ink">No existe un equilibrio operativo en este tramo</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    {tramo.motivoFueraDeTramo ?? 'La API no informó un equilibrio válido para este rango.'}
                  </p>
                  {siguienteOperativo !== undefined && (
                    <p className="mt-2 text-[11px] font-bold text-granate-deep">
                      Siguiente equilibrio operativo: {cantidad(siguienteOperativo, unidadPlural)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Equilibrio operativo</p>
                  <p className="mt-1 font-mono-jb text-xl font-bold text-granate-deep">
                    {cantidad(tramo.q, unidadPlural)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">Dentro del rango declarado por unidad de {unidad}.</p>
                </div>
              )}

              {transicion && <TransitionDetail transicion={transicion} unidadPlural={unidadPlural} />}
            </section>
          );
        })}
      </CardBody>
    </Card>
  );
}
