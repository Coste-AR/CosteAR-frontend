import { useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Calculator,
  ClipboardList,
  Info,
  PackageCheck,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useSearch } from '@tanstack/react-router';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/utils';
import {
  useOwnerDashboard,
  type OwnerDashboardNumber,
} from './owner-dashboard-hooks';

const SIN_DATOS = 'Sin datos';
const INCOMPLETO = 'Incompleto';

const cajonesFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function numeroSeguro(numero: OwnerDashboardNumber | undefined): numero is OwnerDashboardNumber & { valor: number } {
  return Boolean(numero?.completo && numero.valor !== null && Number.isFinite(numero.valor));
}

function motivosUnicos(...numeros: Array<OwnerDashboardNumber | undefined>): string[] {
  const motivos = numeros.flatMap((numero) => numero?.motivos ?? []).filter(Boolean);
  return [...new Set(motivos)];
}

function MissingReasons({ motivos }: { motivos: string[] }) {
  const items = motivos.length > 0 ? motivos : ['Faltan datos para calcular este valor.'];

  return (
    <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-ink-soft">
      {items.map((motivo) => (
        <li key={motivo} className="flex items-start gap-1.5">
          <AlertCircle className="mt-0.5 size-3 shrink-0 text-warning" aria-hidden="true" />
          <span>{motivo}</span>
        </li>
      ))}
    </ul>
  );
}

function parametrosUnicos(...numeros: Array<OwnerDashboardNumber | undefined>) {
  const parametros = numeros.flatMap((numero) => numero?.parametrosSinConfirmarDetalle ?? []);
  return [...new Map(parametros.map((parametro) => [parametro.id, parametro])).values()];
}

function AssumptionMark({ parametros }: { parametros: OwnerDashboardNumber['parametrosSinConfirmarDetalle'] }) {
  const [abierto, setAbierto] = useState(false);
  const tooltipId = useId();

  if (parametros.length === 0) return null;

  const cantidad = parametros.length;
  const resumen = `${cantidad} parámetro${cantidad === 1 ? '' : 's'} sin confirmar`;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={tooltipId}
        aria-label={`Supuesto: ${resumen}. Ver cuáles parámetros sostienen este número.`}
        className="inline-flex items-center gap-1 rounded-full border border-granate/20 bg-granate-tenue px-2 py-0.5 text-[10px] font-bold text-granate transition-colors hover:bg-granate/10"
        onClick={() => setAbierto(true)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
      >
        <Info className="size-3" aria-hidden="true" />
        Supuesto
      </button>

      {abierto && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-line-strong bg-surface p-3 text-left shadow-lg"
        >
          <span className="block text-[11px] font-bold text-ink">
            Este número se apoya en {resumen}.
          </span>
          <span className="mt-2 block text-[11px] leading-relaxed text-ink-soft">
            {parametros.map((parametro) => parametro.nombre).join(', ')}
          </span>
        </span>
      )}
    </span>
  );
}

function MetricValue({
  numero,
  kind,
  detail,
}: {
  numero: OwnerDashboardNumber | undefined;
  kind: 'money' | 'cajones';
  detail: string;
}) {
  if (!numero) {
    return (
      <div>
        <p className="font-mono-jb text-xl font-bold text-ink-soft">{SIN_DATOS}</p>
        <p className="mt-1 text-[11px] font-semibold text-ink-soft/70">{detail}</p>
      </div>
    );
  }

  if (!numeroSeguro(numero)) {
    return (
      <div data-testid="incomplete-metric">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono-jb text-base font-bold text-warning">{INCOMPLETO}</p>
          {numero && <AssumptionMark parametros={numero.parametrosSinConfirmarDetalle} />}
        </div>
        <p className="mt-1 text-[11px] font-semibold text-ink-soft/70">{detail}</p>
        <MissingReasons motivos={numero.motivos} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono-jb text-xl font-bold text-ink">
          {kind === 'money' ? formatMoney(numero.valor) : cajonesFormatter.format(numero.valor)}
        </p>
        <AssumptionMark parametros={numero.parametrosSinConfirmarDetalle} />
      </div>
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
  children: React.ReactNode;
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
        <div className="mt-auto">{children}</div>
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

function MoneyToCratesConverter({
  precio,
  periodo,
}: {
  precio: OwnerDashboardNumber | undefined;
  periodo: string | undefined;
}) {
  const [importe, setImporte] = useState('');
  const importeNumero = importe === '' ? null : Number(importe);
  const importeValido = importeNumero !== null && Number.isFinite(importeNumero) && importeNumero >= 0;
  const precioDisponible = numeroSeguro(precio) && precio.valor > 0;
  const cajones = precioDisponible && importeValido ? importeNumero / precio.valor : null;

  return (
    <Card data-testid="money-to-crates-converter">
      <CardHeader
        title="Conversor de pesos a cajones"
        description="Traducí un importe al equivalente de venta del período. No se guarda ningún dato."
        action={(
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <Calculator className="size-4.5" aria-hidden="true" />
          </span>
        )}
      />
      <CardBody className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
        <Input
          label="Importe en pesos"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          numeric
          suffix="$"
          placeholder="0,00"
          value={importe}
          onChange={(event) => setImporte(event.target.value)}
          disabled={!precioDisponible}
          hint={precioDisponible ? 'Escribí el gasto o importe que querés comparar.' : undefined}
        />

        <div className="rounded-xl border border-line bg-surface-alt px-4 py-4" aria-live="polite">
          {precioDisponible ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Equivale a
              </p>
              <p className="mt-1 font-mono-jb text-2xl font-bold text-granate-deep">
                {cajones === null ? '—' : `${cajonesFormatter.format(cajones)} cajones`}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Precio usado: <strong>{formatMoney(precio.valor)} por cajón</strong>
                {periodo ? <> · Período <strong>{periodo}</strong></> : null}
              </p>
              <div className="mt-2">
                <AssumptionMark parametros={precio.parametrosSinConfirmarDetalle} />
              </div>
            </>
          ) : (
            <div data-testid="converter-missing-price">
              <p className="flex items-center gap-2 text-sm font-bold text-warning">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                Falta el precio promedio del período
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                No se puede convertir el importe a cajones hasta que haya ventas para calcularlo.
              </p>
              <MissingReasons motivos={precio?.motivos ?? []} />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function ProducedProgress({
  producido,
  equilibrio,
}: {
  producido: OwnerDashboardNumber | undefined;
  equilibrio: OwnerDashboardNumber | undefined;
}) {
  const completo = numeroSeguro(producido) && numeroSeguro(equilibrio) && equilibrio.valor > 0;

  if (!completo) {
    return (
      <div data-testid="incomplete-metric">
        <p className="font-mono-jb text-base font-bold text-warning">{producido || equilibrio ? INCOMPLETO : SIN_DATOS}</p>
        <MissingReasons motivos={motivosUnicos(producido, equilibrio)} />
        <div
          role="progressbar"
          aria-label="Producido contra equilibrio"
          aria-valuetext={producido || equilibrio ? INCOMPLETO : SIN_DATOS}
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-line"
        />
      </div>
    );
  }

  const porcentaje = Math.max(0, producido.valor / equilibrio.valor * 100);
  const ancho = Math.min(porcentaje, 100);
  const descripcion = `${cajonesFormatter.format(producido.valor)} de ${cajonesFormatter.format(equilibrio.valor)} cajones`;
  const parametros = parametrosUnicos(producido, equilibrio);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-mono-jb text-xl font-bold text-ink">{descripcion}</p>
        <AssumptionMark parametros={parametros} />
      </div>
      <div
        role="progressbar"
        aria-label="Producido contra equilibrio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ancho)}
        aria-valuetext={`${descripcion} (${cajonesFormatter.format(porcentaje)} %)`}
        className="h-3 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-granate" style={{ width: `${ancho}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-ink-soft/70">Cajones producidos sobre el equilibrio</p>
    </div>
  );
}

export function OwnerDashboardPage() {
  const { periodId } = useSearch({ strict: false }) as { periodId?: string };
  const tablero = useOwnerDashboard(periodId);
  const data = tablero.data;

  return (
    <AppShell>
      <div className="animate-rise space-y-8" data-testid="owner-dashboard">
        <PageHeader
          title="Tablero de la empresa"
          description={data ? `Período ${data.periodo.codigo}, expresado en cajones.` : 'Una vista simple del período, expresada en cajones.'}
          action={(
            <span className="inline-flex items-center rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 text-[11px] font-bold text-granate">
              Unidad: cajones
            </span>
          )}
        />

        {!periodId && (
          <Card role="status">
            <CardBody className="flex items-start gap-3 text-sm text-ink-soft">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <p>Falta indicar el período que querés consultar.</p>
            </CardBody>
          </Card>
        )}

        {tablero.isLoading && (
          <Card role="status" aria-live="polite">
            <CardBody className="text-sm text-ink-soft">Cargando los números del período…</CardBody>
          </Card>
        )}

        {tablero.isError && (
          <Card role="alert">
            <CardBody className="text-sm text-danger">
              No se pudo cargar el tablero: {apiErrorMessage(tablero.error)}
            </CardBody>
          </Card>
        )}

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
                {([
                  ['Variable', data?.costoPorCajon.variable],
                  ['Fijo', data?.costoPorCajon.fijo],
                  ['Total', data?.costoPorCajon.total],
                ] as const).map(([label, numero]) => (
                  <div key={label} className="rounded-xl border border-line bg-surface-alt px-2 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt>
                    <dd className="mt-1">
                      <MetricValue numero={numero} kind="money" detail="Por cajón" />
                    </dd>
                  </div>
                ))}
              </dl>
            </MetricCard>

            <MetricCard title="Precio promedio de venta del período" icon={PackageCheck}>
              <MetricValue numero={data?.precioPromedioVenta} kind="money" detail="Precio por cajón" />
            </MetricCard>

            <MetricCard title="Contribución marginal por cajón" icon={TrendingUp}>
              <MetricValue numero={data?.contribucionMarginalPorCajon} kind="money" detail="Por cajón" />
            </MetricCard>

            <MetricCard title="Punto de equilibrio en cajones" icon={Scale}>
              <MetricValue numero={data?.puntoEquilibrioCajones} kind="cajones" detail="Cajones" />
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-ink-soft">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                <span>Último recálculo: <strong>{data?.puntoEquilibrioCajones.fechaUltimoRecalculo ? formatDate(data.puntoEquilibrioCajones.fechaUltimoRecalculo) : SIN_DATOS}</strong></span>
              </div>
            </MetricCard>

            <MetricCard title="Producido contra equilibrio" icon={BarChart3}>
              <ProducedProgress producido={data?.producidoCajones} equilibrio={data?.puntoEquilibrioCajones} />
            </MetricCard>

            <MetricCard title="Resultado del período" icon={WalletCards}>
              <MetricValue numero={data?.resultadoPeriodo} kind="money" detail="Resultado total" />
            </MetricCard>
          </div>
        </section>

        <section aria-label="Conversor del período">
          <MoneyToCratesConverter
            precio={data?.precioPromedioVenta}
            periodo={data?.periodo.codigo}
          />
        </section>

        <section aria-label="Estado del período" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EmptyBlock title="Alertas activas" icon={AlertTriangle} />
          <EmptyBlock title="Qué falta cargar para cerrar el período" icon={ClipboardList} />
        </section>
      </div>
    </AppShell>
  );
}
