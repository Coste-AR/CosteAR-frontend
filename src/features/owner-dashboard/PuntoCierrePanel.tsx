import { AlertCircle, CalendarRange, Scale } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import type { PuntoCierreData, PuntoCierreHorizonte } from './owner-dashboard-hooks';

const quantityFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function nombreUnidad(unidad: string | null, valor: number): string {
  if (!unidad) return 'sin unidad declarada';
  if (Math.abs(valor) === 1) return unidad;
  if (unidad === 'unidad') return 'unidades';
  if (unidad === 'cajon') return 'cajones';
  return unidad.endsWith('s') ? unidad : `${unidad}s`;
}

function valorConUnidad(valor: number, unidad: string | null): string {
  return `${quantityFormatter.format(valor)} ${nombreUnidad(unidad, valor)}`;
}

function HorizonCard({ horizonte, unidad }: { horizonte: PuntoCierreHorizonte; unidad: string | null }) {
  return (
    <article
      data-testid={`punto-cierre-${horizonte.horizonteMeses}`}
      className="rounded-2xl border border-line bg-surface-alt p-5"
    >
      <div className="flex items-center gap-2 text-granate">
        <CalendarRange className="size-4" aria-hidden="true" />
        <h4 className="text-[12px] font-extrabold uppercase tracking-wider">
          Horizonte: {horizonte.horizonteMeses} {horizonte.horizonteMeses === 1 ? 'mes' : 'meses'}
        </h4>
      </div>

      {horizonte.valor === null ? (
        <div className="mt-4">
          <p className="font-mono-jb text-lg font-bold text-warning">Sin dato</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            {horizonte.motivoSinEquilibrio ?? 'El backend no pudo calcular este horizonte.'}
          </p>
        </div>
      ) : (
        <p className="mt-4 font-mono-jb text-2xl font-bold text-ink">
          {valorConUnidad(horizonte.valor, unidad)}
        </p>
      )}
    </article>
  );
}

export function PuntoCierrePanel({
  data,
  isLoading = false,
  error,
  unavailableReason,
}: {
  data?: PuntoCierreData;
  isLoading?: boolean;
  error?: string;
  unavailableReason?: string;
}) {
  const advertencia = data?.horizontes.map((item) => item.advertencia).find(Boolean);
  const situacion = data?.horizontes.map((item) => item.situacion).find(Boolean);

  return (
    <Card data-testid="punto-cierre-panel">
      <CardHeader
        title="Punto de cierre"
        description="Cuánta actividad sostiene la caja según el horizonte analizado."
        action={<Scale className="size-5 text-granate" aria-hidden="true" />}
      />
      <CardBody>
        {isLoading && <p role="status" className="text-sm text-ink-soft">Calculando los horizontes…</p>}

        {(error || unavailableReason) && !isLoading && (
          <div role={error ? 'alert' : 'status'} className="flex items-start gap-3 text-sm text-ink-soft">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <p>{error ?? unavailableReason}</p>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.horizontes.map((horizonte) => (
                <HorizonCard key={horizonte.horizonteMeses} horizonte={horizonte} unidad={data.unidad} />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-ink-soft">
              <span>
                Equilibrio económico: <strong className="text-ink">{valorConUnidad(data.puntoEquilibrioEconomico, data.unidad)}</strong>
              </span>
              {data.nominal && <span className="font-semibold">Valores nominales</span>}
            </div>

            {situacion && (
              <p className="mt-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-[12px] font-bold text-ink">
                {situacion}
              </p>
            )}

            {advertencia && (
              <p className="mt-4 text-[12px] font-semibold leading-relaxed text-granate-deep">
                {advertencia}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
