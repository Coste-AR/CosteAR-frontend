import { useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bird,
  Building2,
  CalendarClock,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Container,
  Factory,
  FlaskConical,
  Info,
  PackageCheck,
  Scale,
  Settings2,
  ShoppingCart,
  TrendingUp,
  WalletCards,
  Warehouse,
} from 'lucide-react';
import { useSearch } from '@tanstack/react-router';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/utils';
import { nombreUnidad, nombreUnidadPlural, SIN_UNIDAD_DECLARADA } from '@/lib/unit-display';
import {
  useOwnerDashboard,
  type OwnerDashboardData,
  type OwnerDashboardNumber,
  type OwnerDashboardPending,
  type OwnerDashboardPendingArea,
} from './owner-dashboard-hooks';

const SIN_DATOS = 'Sin datos';
const INCOMPLETO = 'Incompleto';

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  bird: Bird,
  warehouse: Warehouse,
  container: Container,
  flask: FlaskConical,
};

const quantityFormatter = new Intl.NumberFormat('es-AR', {
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
  kind: 'money' | 'quantity';
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
          {kind === 'money' ? formatMoney(numero.valor) : quantityFormatter.format(numero.valor)}
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

const pendingAreaConfig: Record<
  OwnerDashboardPendingArea,
  { label: string; icon: LucideIcon }
> = {
  calculo: { label: 'Cálculo', icon: Calculator },
  imputacion: { label: 'Imputación', icon: ClipboardList },
  configuracion: { label: 'Configuración', icon: Settings2 },
  produccion: { label: 'Producción', icon: Factory },
  ventas: { label: 'Ventas', icon: ShoppingCart },
  costeo: { label: 'Costeo', icon: Scale },
};

// El backend decide a qué área pertenece cada dato. Acá sólo fijamos un orden
// visual estable para que la lista no cambie de lugar entre dos respuestas.
const pendingAreaOrder = Object.keys(pendingAreaConfig) as OwnerDashboardPendingArea[];

function ClosingPendingBlock({ pendientes }: { pendientes: OwnerDashboardPending[] | undefined }) {
  const grupos = pendingAreaOrder.flatMap((area) => {
    const items = pendientes?.filter((pendiente) => pendiente.area === area) ?? [];
    return items.length > 0 ? [{ area, items }] : [];
  });

  return (
    <Card data-testid="closing-pending">
      <CardHeader
        title="Qué falta cargar para cerrar el período"
        description="Datos pendientes informados por el cierre del período."
        action={(
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <ClipboardList className="size-4.5" aria-hidden="true" />
          </span>
        )}
      />
      <CardBody>
        {!pendientes ? (
          <div className="flex min-h-24 items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-alt text-ink-soft">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">{SIN_DATOS}</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                Los pendientes aparecerán cuando se cargue el tablero del período.
              </p>
            </div>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="flex min-h-24 items-start gap-4" role="status">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-ok/20 bg-ok/10 text-ok">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">
                No falta nada para cerrar este período
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                El backend no informó datos pendientes para el cierre.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map(({ area, items }) => {
              const { label, icon: Icon } = pendingAreaConfig[area];
              return (
                <section
                  key={area}
                  aria-labelledby={`closing-pending-${area}`}
                  data-testid={`closing-pending-group-${area}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="size-4 text-granate" aria-hidden="true" />
                    <h4
                      id={`closing-pending-${area}`}
                      className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep"
                    >
                      {label}
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {items.map((pendiente) => (
                      <li
                        key={`${pendiente.periodo.id}:${pendiente.area}:${pendiente.dato}`}
                        data-testid="closing-pending-item"
                        className="rounded-xl border border-line bg-surface-alt px-3 py-3"
                      >
                        <p className="text-[12px] font-semibold leading-relaxed text-ink">
                          {pendiente.dato}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                          Período {pendiente.periodo.codigo}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MoneyToUnitConverter({
  precio,
  periodo,
  unidad,
}: {
  precio: OwnerDashboardNumber | undefined;
  periodo: string | undefined;
  unidad: OwnerDashboardData['unidadGestion'] | undefined;
}) {
  const [importe, setImporte] = useState('');
  const importeNumero = importe === '' ? null : Number(importe);
  const importeValido = importeNumero !== null && Number.isFinite(importeNumero) && importeNumero >= 0;
  const unidadDisponible = Boolean(unidad);
  const precioDisponible = unidadDisponible && numeroSeguro(precio) && precio.valor > 0;
  const cantidad = precioDisponible && importeValido ? importeNumero / precio.valor : null;
  const unidadSingular = nombreUnidad(unidad);
  const unidadPlural = nombreUnidadPlural(unidad);

  return (
    <Card data-testid="money-to-crates-converter">
      <CardHeader
        title={unidadDisponible ? `Conversor de pesos a ${unidadPlural}` : 'Conversor de pesos no disponible'}
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
                {cantidad === null ? '—' : `${quantityFormatter.format(cantidad)} ${unidadPlural}`}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Precio usado: <strong>{formatMoney(precio.valor)} por {unidadSingular}</strong>
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
                {unidadDisponible ? 'Falta el precio promedio del período' : 'Sin unidad declarada'}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                {unidadDisponible
                  ? `No se puede convertir el importe a ${unidadPlural} hasta que haya ventas para calcularlo.`
                  : 'La empresa tiene que declarar su unidad de gestión antes de convertir importes.'}
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
  unidad,
}: {
  producido: OwnerDashboardNumber | undefined;
  equilibrio: OwnerDashboardNumber | undefined;
  unidad: OwnerDashboardData['unidadGestion'] | undefined;
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
  const unidadPlural = nombreUnidadPlural(unidad);
  const descripcion = `${quantityFormatter.format(producido.valor)} de ${quantityFormatter.format(equilibrio.valor)} ${unidadPlural}`;
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
        aria-valuetext={`${descripcion} (${quantityFormatter.format(porcentaje)} %)`}
        className="h-3 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-granate" style={{ width: `${ancho}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-ink-soft/70">{unidadPlural} producidos sobre el equilibrio</p>
    </div>
  );
}

export function OwnerDashboardPage() {
  const { periodId } = useSearch({ strict: false }) as { periodId?: string };
  const tablero = useOwnerDashboard(periodId);
  const data = tablero.data;
  const unidadSingular = nombreUnidad(data?.unidadGestion);
  const unidadPlural = nombreUnidadPlural(data?.unidadGestion);
  const porUnidad = data?.unidadGestion ? `por ${unidadSingular}` : SIN_UNIDAD_DECLARADA;
  const enUnidad = data?.unidadGestion ? `en ${unidadPlural}` : `· ${SIN_UNIDAD_DECLARADA}`;
  const iconName = data?.rubro?.icons.LoteProductivo
    ?? Object.values(data?.rubro?.icons ?? {})[0]
    ?? 'neutral';
  const IndustryIcon = INDUSTRY_ICONS[iconName] ?? Building2;

  return (
    <AppShell>
      <div className="animate-rise space-y-8" data-testid="owner-dashboard">
        <PageHeader
          title="Tablero de la empresa"
          description={data
            ? data.unidadGestion
              ? `Período ${data.periodo.codigo}, expresado en ${unidadPlural}.`
              : `Período ${data.periodo.codigo}. ${SIN_UNIDAD_DECLARADA}.`
            : 'Una vista simple del período.'}
          action={(
            <span className="inline-flex items-center gap-2 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 text-[11px] font-bold text-granate">
              <IndustryIcon
                data-testid="industry-icon"
                data-icon={iconName}
                className="size-4"
                aria-label={data?.rubro ? `Rubro ${data.rubro.clave}` : 'Rubro no declarado'}
              />
              {data?.unidadGestion ? `Unidad: ${unidadSingular}` : 'Sin unidad declarada'}
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
            <MetricCard title={`Costo ${porUnidad}`} icon={WalletCards}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([
                  ['Variable', data?.costoPorCajon.variable],
                  ['Fijo', data?.costoPorCajon.fijo],
                  ['Total', data?.costoPorCajon.total],
                ] as const).map(([label, numero]) => (
                  <div key={label} className="rounded-xl border border-line bg-surface-alt px-2 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt>
                    <dd className="mt-1">
                      <MetricValue numero={numero} kind="money" detail={porUnidad} />
                    </dd>
                  </div>
                ))}
              </dl>
            </MetricCard>

            <MetricCard title="Precio promedio de venta del período" icon={PackageCheck}>
              <MetricValue numero={data?.precioPromedioVenta} kind="money" detail={`Precio ${porUnidad}`} />
            </MetricCard>

            <MetricCard title={`Contribución marginal ${porUnidad}`} icon={TrendingUp}>
              <MetricValue numero={data?.contribucionMarginalPorCajon} kind="money" detail={porUnidad} />
            </MetricCard>

            <MetricCard title={`Punto de equilibrio ${enUnidad}`} icon={Scale}>
              <MetricValue numero={data?.puntoEquilibrioCajones} kind="quantity" detail={unidadPlural} />
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-ink-soft">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                <span>Último recálculo: <strong>{data?.puntoEquilibrioCajones.fechaUltimoRecalculo ? formatDate(data.puntoEquilibrioCajones.fechaUltimoRecalculo) : SIN_DATOS}</strong></span>
              </div>
            </MetricCard>

            <MetricCard title="Producido contra equilibrio" icon={BarChart3}>
              <ProducedProgress producido={data?.producidoCajones} equilibrio={data?.puntoEquilibrioCajones} unidad={data?.unidadGestion} />
            </MetricCard>

            <MetricCard title="Resultado del período" icon={WalletCards}>
              <MetricValue numero={data?.resultadoPeriodo} kind="money" detail="Resultado total" />
            </MetricCard>
          </div>
        </section>

        <section aria-label="Conversor del período">
          <MoneyToUnitConverter
            precio={data?.precioPromedioVenta}
            periodo={data?.periodo.codigo}
            unidad={data?.unidadGestion}
          />
        </section>

        <section aria-label="Estado del período" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EmptyBlock title="Alertas activas" icon={AlertTriangle} />
          <ClosingPendingBlock pendientes={data?.pendientes} />
        </section>
      </div>
    </AppShell>
  );
}
