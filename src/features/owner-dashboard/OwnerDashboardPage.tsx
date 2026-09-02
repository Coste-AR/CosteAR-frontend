import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ClipboardList,
  PackageCheck,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

const SIN_DATOS = 'Sin datos';

function EmptyValue({ detail = 'Expresado en cajones' }: { detail?: string }) {
  return (
    <div>
      <p className="font-mono-jb text-xl font-bold text-ink-soft">{SIN_DATOS}</p>
      <p className="mt-1 text-[11px] font-semibold text-ink-soft/70">{detail}</p>
    </div>
  );
}

function MetricCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <Card data-testid="owner-metric" className="h-full">
      <CardBody className="flex h-full min-h-48 flex-col">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h3 className="max-w-xs text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">
            {title}
          </h3>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-auto">{children ?? <EmptyValue />}</div>
      </CardBody>
    </Card>
  );
}

function EmptyBlock({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <Card className="h-full">
      <CardHeader title={title} />
      <CardBody className="flex min-h-36 items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-alt text-ink-soft">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">{SIN_DATOS}</p>
          <p className="mt-1 text-[11px] text-ink-soft">
            Este bloque se completará cuando haya información disponible.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export function OwnerDashboardPage() {
  return (
    <AppShell>
      <div className="animate-rise space-y-8" data-testid="owner-dashboard">
        <PageHeader
          title="Tablero de la empresa"
          description="Una vista simple del período, expresada en cajones."
          action={(
            <span className="inline-flex items-center rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 text-[11px] font-bold text-granate">
              Unidad: cajones
            </span>
          )}
        />

        <section aria-labelledby="owner-summary-title">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="size-4 text-granate" aria-hidden="true" />
            <h2 id="owner-summary-title" className="text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">
              Resumen del período
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Costo por cajón" icon={WalletCards}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {['Variable', 'Fijo', 'Total'].map((label) => (
                  <div key={label} className="rounded-xl border border-line bg-surface-alt px-2 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt>
                    <dd className="mt-1 whitespace-nowrap font-mono-jb text-[12px] font-bold text-ink-soft">{SIN_DATOS}</dd>
                  </div>
                ))}
              </dl>
            </MetricCard>

            <MetricCard title="Precio promedio de venta del período" icon={PackageCheck}>
              <EmptyValue detail="Precio por cajón" />
            </MetricCard>

            <MetricCard title="Contribución marginal por cajón" icon={TrendingUp} />

            <MetricCard title="Punto de equilibrio en cajones" icon={Scale}>
              <EmptyValue />
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-ink-soft">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                <span>Último recálculo: <strong>{SIN_DATOS}</strong></span>
              </div>
            </MetricCard>

            <MetricCard title="Producido contra equilibrio" icon={BarChart3}>
              <p className="mb-3 font-mono-jb text-xl font-bold text-ink-soft">{SIN_DATOS}</p>
              <div
                role="progressbar"
                aria-label="Producido contra equilibrio"
                aria-valuetext={SIN_DATOS}
                className="h-3 w-full overflow-hidden rounded-full bg-line"
              />
              <p className="mt-2 text-[11px] font-semibold text-ink-soft/70">Cajones producidos sobre el equilibrio</p>
            </MetricCard>

            <MetricCard title="Resultado del período" icon={WalletCards} />
          </div>
        </section>

        <section aria-label="Estado del período" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EmptyBlock title="Alertas activas" icon={AlertTriangle} />
          <EmptyBlock title="Qué falta cargar para cerrar el período" icon={ClipboardList} />
        </section>
      </div>
    </AppShell>
  );
}
