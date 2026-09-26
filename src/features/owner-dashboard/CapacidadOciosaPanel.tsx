import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Factory,
  LockKeyhole,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatMoney } from '@/lib/utils';
import type { CapacidadOciosaData } from './owner-dashboard-hooks';

const numberFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function horas(value: number) {
  return `${numberFormatter.format(value)} ${Math.abs(value) === 1 ? 'hora' : 'horas'}`;
}

function unidadR22(unidad: string | null | undefined) {
  if (!unidad) return 'Sin unidad declarada';
  if (unidad === 'unidades_por_periodo') return 'unidades por período';
  return unidad.replaceAll('_', ' ');
}

function EstadoConsulta({
  isLoading,
  error,
  unavailableReason,
}: {
  isLoading: boolean;
  error?: string;
  unavailableReason?: string;
}) {
  if (isLoading) {
    return <p role="status" className="text-sm text-ink-soft">Buscando la última corrida disponible…</p>;
  }

  if (error || unavailableReason) {
    return (
      <div role={error ? 'alert' : 'status'} className="flex items-start gap-3 text-sm text-ink-soft">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <p>{error ?? unavailableReason}</p>
      </div>
    );
  }

  return null;
}

export function CapacidadOciosaPanel({
  data,
  isLoading = false,
  error,
  unavailableReason,
}: {
  data?: CapacidadOciosaData;
  isLoading?: boolean;
  error?: string;
  unavailableReason?: string;
}) {
  const mod = data?.manoDeObra;

  return (
    <Card data-testid="capacidad-ociosa-panel">
      <CardHeader
        title="Capacidad ociosa"
        description="Qué dejó de ganar el negocio y qué capacidad pagó sin usar. MOD y CIP se muestran por separado."
        action={(
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <Factory className="size-4.5" aria-hidden="true" />
          </span>
        )}
      />
      <CardBody>
        <EstadoConsulta isLoading={isLoading} error={error} unavailableReason={unavailableReason} />

        {data && !isLoading && (
          <div className="space-y-5">
            <section
              data-testid="ociosidad-r22"
              aria-labelledby="ociosidad-r22-title"
              className="rounded-2xl border border-granate/20 bg-granate-tenue p-5"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-granate">
                Indicador principal
              </p>
              <h4 id="ociosidad-r22-title" className="mt-1 text-sm font-bold text-ink">
                Lo que se dejó de ganar
              </h4>
              {data.ociosidadR22.valor === null ? (
                <div className="mt-3">
                  <p className="font-mono-jb text-xl font-bold text-warning">Sin dato</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    {data.ociosidadR22.motivo ?? 'El backend no informó el motivo.'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-3 font-mono-jb text-3xl font-bold text-granate-deep">
                    {formatMoney(data.ociosidadR22.valor)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">Contribución marginal no obtenida (R22).</p>
                </>
              )}
              {(data.ociosidadR22.capacidadNormal !== null
                && data.ociosidadR22.capacidadNormal !== undefined
                && data.ociosidadR22.actividadReal !== null
                && data.ociosidadR22.actividadReal !== undefined) && (
                <p className="mt-3 text-[11px] text-ink-soft">
                  Capacidad normal <strong className="text-ink">{numberFormatter.format(data.ociosidadR22.capacidadNormal)}</strong>
                  {' · '}actividad real <strong className="text-ink">{numberFormatter.format(data.ociosidadR22.actividadReal)}</strong>
                  {' · '}{unidadR22(data.ociosidadR22.unidad)}
                </p>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section
                data-testid="ociosidad-mod"
                aria-labelledby="ociosidad-mod-title"
                className="rounded-2xl border border-line bg-surface-alt p-5"
              >
                <div className="flex items-center gap-2 text-granate-deep">
                  <Clock3 className="size-4" aria-hidden="true" />
                  <h4 id="ociosidad-mod-title" className="text-[12px] font-extrabold uppercase tracking-wider">
                    Mano de obra (MOD)
                  </h4>
                </div>

                {!mod ? (
                  <p className="mt-4 text-sm font-semibold text-ink-soft">Sin datos de capacidad de mano de obra.</p>
                ) : (
                  <>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-line bg-surface p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Horas ociosas</dt>
                        <dd className="mt-1 font-mono-jb text-lg font-bold text-ink">{horas(mod.idleHours)}</dd>
                      </div>
                      <div className="rounded-xl border border-line bg-surface p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Costo ocioso</dt>
                        <dd className="mt-1 font-mono-jb text-lg font-bold text-ink">{formatMoney(mod.idleCost)}</dd>
                      </div>
                    </dl>

                    {mod.breakdown.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {mod.breakdown.map((item) => (
                          <div key={item.tipo} className="rounded-xl border border-line bg-surface px-3 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-[11px] font-bold text-ink">{item.label}</p>
                              <p className="text-[11px] font-semibold text-ink-soft">
                                {horas(item.hours)} · {formatMoney(item.cost)}
                              </p>
                            </div>
                            {item.reasons.length > 0 && (
                              <ul className="mt-2 space-y-1 text-[11px] text-ink-soft">
                                {item.reasons.map((reason) => (
                                  <li key={`${reason.reason}-${reason.hours}`}>
                                    {reason.reason}: {horas(reason.hours)} · {formatMoney(reason.cost)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {mod.alert && (
                      <div role="alert" className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                          <div>
                            <p className="text-[11px] font-bold text-ink">{mod.alert.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{mod.alert.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section
                data-testid="ociosidad-cip"
                aria-labelledby="ociosidad-cip-title"
                className="rounded-2xl border border-line bg-surface-alt p-5"
              >
                <div className="flex items-center gap-2 text-granate-deep">
                  <Factory className="size-4" aria-hidden="true" />
                  <h4 id="ociosidad-cip-title" className="text-[12px] font-extrabold uppercase tracking-wider">
                    Costos indirectos (CIP) · dos vías
                  </h4>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-surface p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Variación de presupuesto</dt>
                    <dd className="mt-1 font-mono-jb text-lg font-bold text-ink">{formatMoney(data.cip.variacionPresupuesto)}</dd>
                  </div>
                  <div className="rounded-xl border border-line bg-surface p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Variación de volumen</dt>
                    <dd className="mt-1 font-mono-jb text-lg font-bold text-ink">{formatMoney(data.cip.variacionVolumen)}</dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl border border-line bg-surface px-3 py-3">
                  <div className="flex items-start gap-2">
                    {data.cip.controlDosVias.cierra ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-[11px] font-bold text-ink">
                        {data.cip.controlDosVias.cierra
                          ? 'El control de dos vías cierra'
                          : 'El control de dos vías no cierra'}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                        Diferencia: {formatMoney(data.cip.controlDosVias.diferencia)} · {data.cip.controlDosVias.formula}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-line bg-surface-alt px-4 py-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <div>
                  <h4 className="text-[11px] font-bold text-ink">Tres vías no disponibles</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{data.tresVias.motivo}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
