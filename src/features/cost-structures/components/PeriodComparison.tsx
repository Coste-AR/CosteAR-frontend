import { useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { formatMoney, formatPercent, cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import { usePeriods } from '../period-hooks';
import {
  usePeriodComparison,
  type Delta,
  type LineDelta,
  type MaterialDelta,
  type PeriodComparison as Comparison,
} from '../comparison-hooks';

/**
 * COMPARACIÓN ENTRE PERÍODOS (problema C — Fase 4).
 *
 * Responde "¿por qué el costo subió?" en tres niveles: de qué elemento vino
 * (MP / MOD / CIF), de qué materia prima o centro, y —lo que importa de verdad
 * en Argentina— si subió porque el insumo está más CARO o porque se consumió MÁS.
 *
 * Toda la cuenta la hace el backend. Acá no se calcula ni un porcentaje: si la
 * pantalla calculara, tendríamos dos motores y algún día darían distinto.
 *
 * OJO con el color: acá un número que SUBE es MALO (es un costo, no un margen).
 * Por eso no se reusa `<Percent colorize>`, que pinta al revés.
 */

/** Sube el costo → rojo. Baja → verde. Igual → gris. */
function toneOf(delta: number): 'up' | 'down' | 'flat' {
  if (Math.abs(delta) < 0.005) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

const TONE_CLASS = {
  up: 'text-danger',
  down: 'text-ok',
  flat: 'text-ink-soft',
} as const;

function DeltaValue({ delta, pct }: { delta: number; pct: number | null }) {
  const tone = toneOf(delta);
  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : Minus;

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold tabular', TONE_CLASS[tone])}>
      <Icon className="size-3.5 shrink-0" />
      {delta > 0 ? '+' : ''}
      {formatMoney(delta)}
      {pct !== null && (
        <span className="text-[11px] font-bold">
          ({pct > 0 ? '+' : ''}
          {formatPercent(pct)})
        </span>
      )}
    </span>
  );
}

/** El número grande: cómo quedó el costo, y cuánto se movió. */
function HeadlineCard({
  title,
  hint,
  value,
  unavailable,
}: {
  title: string;
  hint: string;
  value: Delta | null;
  unavailable?: string;
}) {
  if (!value) {
    return (
      <div className="rounded-[28px] border border-line bg-surface-alt/60 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{title}</p>
        <p className="mt-3 text-sm text-ink-soft">{unavailable}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-line bg-white/90 p-5 shadow-[0_8px_24px_rgba(74,21,27,0.01)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular text-granate-deep">{formatMoney(value.b)}</p>
      <p className="mt-1 text-xs text-ink-soft tabular">
        antes: <span className="font-semibold">{formatMoney(value.a)}</span>
      </p>
      <div className="mt-3 border-t border-line pt-3">
        <DeltaValue delta={value.delta} pct={value.deltaPct} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-soft">{hint}</p>
    </div>
  );
}

/** Barra proporcional: cuánto de la variación explica esta línea. */
function ContributionBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-ink-soft">—</span>;

  const width = Math.min(Math.abs(pct), 100);
  const negative = pct < 0;

  return (
    <span className="flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-alt sm:block">
        <span
          className={cn('block h-full rounded-full', negative ? 'bg-ok' : 'bg-granate')}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className={cn('tabular font-semibold', negative ? 'text-ok' : 'text-granate')}>
        {formatPercent(pct)}
      </span>
    </span>
  );
}

const TH = 'px-5 py-3 text-left font-semibold';
const THR = 'px-5 py-3 text-right font-semibold';
const HEAD =
  'border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft';

/** Tabla base: A vs B, variación y contribución. */
function LinesTable({
  lines,
  labelHeader,
  aLabel,
  bLabel,
  empty,
}: {
  lines: LineDelta[];
  labelHeader: string;
  aLabel: string;
  bLabel: string;
  empty: string;
}) {
  if (lines.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-soft">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={HEAD}>
            <th className={TH}>{labelHeader}</th>
            <th className={THR}>{aLabel}</th>
            <th className={THR}>{bLabel}</th>
            <th className={THR}>Variación</th>
            <th className={THR}>Explica</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lines.map((l) => (
            <tr key={l.key} className="hover:bg-surface-alt/40">
              <td className="px-5 py-3">
                <span className="font-medium text-ink">{l.label}</span>
                {l.presence === 'new' && (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                    nueva
                  </span>
                )}
                {l.presence === 'removed' && (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                    ya no se usa
                  </span>
                )}
              </td>
              <td className="px-5 py-3 text-right tabular text-ink-soft">{formatMoney(l.a)}</td>
              <td className="px-5 py-3 text-right tabular">{formatMoney(l.b)}</td>
              <td className="px-5 py-3 text-right">
                <DeltaValue delta={l.delta} pct={l.deltaPct} />
              </td>
              <td className="px-5 py-3 text-right">
                <ContributionBar pct={l.contributionPct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * La tabla que justifica toda la Fase 4: por cada materia prima, cuánto de la suba
 * fue PRECIO (el insumo está más caro) y cuánto CONSUMO (usamos más cantidad).
 * Las dos columnas suman, exactas, la variación.
 */
function MaterialsTable({ materials, aLabel, bLabel }: { materials: MaterialDelta[]; aLabel: string; bLabel: string }) {
  if (materials.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-soft">No hay materias primas para comparar.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={HEAD}>
            <th className={TH}>Materia prima</th>
            <th className={THR}>Consumo {aLabel}</th>
            <th className={THR}>Consumo {bLabel}</th>
            <th className={THR}>Variación</th>
            <th className={THR}>Por precio</th>
            <th className={THR}>Por consumo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {materials.map((m) => (
            <tr key={m.key} className="hover:bg-surface-alt/40">
              <td className="px-5 py-3">
                <span className="font-medium text-ink">{m.label}</span>
                <span className="mt-0.5 block text-[11px] tabular text-ink-soft">
                  {m.qtyA} → {m.qtyB} {m.unit ?? ''}
                  {m.priceA !== null && m.priceB !== null && (
                    <>
                      {' · '}
                      {formatMoney(m.priceA)} → {formatMoney(m.priceB)} por {m.unit ?? 'unidad'}
                    </>
                  )}
                </span>
              </td>
              <td className="px-5 py-3 text-right tabular text-ink-soft">{formatMoney(m.a)}</td>
              <td className="px-5 py-3 text-right tabular">{formatMoney(m.b)}</td>
              <td className="px-5 py-3 text-right">
                <DeltaValue delta={m.delta} pct={m.deltaPct} />
              </td>
              <td className={cn('px-5 py-3 text-right tabular font-semibold', TONE_CLASS[toneOf(m.priceEffect)])}>
                {m.priceEffect > 0 ? '+' : ''}
                {formatMoney(m.priceEffect)}
              </td>
              <td className={cn('px-5 py-3 text-right tabular font-semibold', TONE_CLASS[toneOf(m.quantityEffect)])}>
                {m.quantityEffect > 0 ? '+' : ''}
                {formatMoney(m.quantityEffect)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-surface-alt/40 px-5 py-3 text-[11px] leading-relaxed text-ink-soft">
        <strong className="text-ink">Por precio</strong> es lo que subió porque el insumo está más caro
        (el país). <strong className="text-ink">Por consumo</strong> es lo que subió porque se usó más
        cantidad (la planta). Las dos columnas suman, exactas, la variación.
      </p>
    </div>
  );
}

function SourcePill({ source, status }: { source: string; status: string }) {
  const label =
    status === 'OPEN' ? 'abierto — todavía se mueve' : source === 'frozen' ? 'cerrado' : 'recalculado';
  const tone =
    status === 'OPEN'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : source === 'frozen'
        ? 'border-line bg-surface-alt text-ink-soft'
        : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function PeriodComparison({ structureId }: { structureId: string }) {
  const { data: periods = [] } = usePeriods(structureId);
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const { data, isLoading, error } = usePeriodComparison(structureId, from, to);

  if (periods.length < 2) {
    return (
      <Card>
        <CardBody className="py-10 text-center">
          <p className="text-sm text-ink-soft">
            Para comparar hacen falta <strong className="text-ink">al menos dos períodos</strong>. Cerrá
            el mes actual y abrí el siguiente: a partir de ahí el sistema te muestra qué cambió y por qué.
          </p>
        </CardBody>
      </Card>
    );
  }

  const c: Comparison | undefined = data;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Comparar períodos"
          description="Qué cambió de un mes al otro, y de dónde vino el cambio."
        />
        <CardBody className="flex flex-wrap items-end gap-4">
          <Select
            label="Desde"
            className="w-auto"
            value={from ?? c?.from.code ?? ''}
            onChange={(e) => setFrom(e.target.value || undefined)}
            options={periods.map((p) => ({ value: p.code, label: p.label }))}
          />

          <span className="pb-2.5 text-ink-soft">→</span>

          <Select
            label="Hasta"
            className="w-auto"
            value={to ?? c?.to.code ?? ''}
            onChange={(e) => setTo(e.target.value || undefined)}
            options={periods.map((p) => ({ value: p.code, label: p.label }))}
          />

          {c && (
            <div className="flex items-center gap-2 pb-1">
              <SourcePill source={c.from.source} status={c.from.status} />
              <span className="text-ink-soft">→</span>
              <SourcePill source={c.to.source} status={c.to.status} />
            </div>
          )}
        </CardBody>
      </Card>

      {isLoading && <p className="px-1 text-sm text-ink-soft">Comparando…</p>}

      {error && (
        <Card>
          <CardBody className="text-sm text-danger">{apiErrorMessage(error)}</CardBody>
        </Card>
      )}

      {c && (
        <>
          {c.warnings.length > 0 && (
            <div className="space-y-2">
              {c.warnings.map((w) => (
                <div
                  key={w}
                  className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <HeadlineCard
              title="Costo por unidad"
              hint="La comparación honesta: no cambia por producir más o menos."
              value={c.unit?.productionCost ?? null}
              unavailable="Cargá la cantidad producida en los dos meses (sección Ventas) y el costo por unidad aparece solo."
            />
            <HeadlineCard
              title="Costo total del mes"
              hint="Sube también por producir más, aunque nada se haya encarecido."
              value={c.total.productionCost}
            />
          </div>

          <Card>
            <CardHeader
              title="De dónde vino el cambio"
              description={`Los tres elementos del costo, de ${c.from.label} a ${c.to.label}. La columna "Explica" dice qué parte de la variación total puso cada uno.`}
            />
            <CardBody className="p-0">
              <LinesTable
                lines={c.components}
                labelHeader="Elemento del costo"
                aLabel={c.from.label}
                bLabel={c.to.label}
                empty="Sin datos."
              />
            </CardBody>
          </Card>

          {c.macroContrast ? (
            <Card className="border border-line">
              <CardHeader
                title="¿Mis costos subieron más que el país?"
              />
              <CardBody className="space-y-2">
                <p className="text-sm text-ink-soft">
                  {c.macroContrast.indicatorLabel} en el mismo período (
                  {c.macroContrast.monthsUsed} {c.macroContrast.monthsUsed === 1 ? 'mes' : 'meses'}):{' '}
                  <span className="font-semibold tabular">
                    {c.macroContrast.deltaPct > 0 ? '+' : ''}
                    {formatPercent(c.macroContrast.deltaPct)}
                  </span>
                </p>
                <p className="text-xs text-ink-soft">
                  Tu costo de materia prima (efecto precio) en el mismo período:{' '}
                  <span className="font-semibold tabular">
                    {c.materials.reduce((acc, m) => acc + m.priceEffect, 0) > 0 ? '+' : ''}
                    {formatMoney(c.materials.reduce((acc, m) => acc + m.priceEffect, 0))}
                  </span>
                </p>
              </CardBody>
            </Card>
          ) : (
            <p className="text-xs text-ink-soft italic">
              No hay contraste con inflación nacional disponible: hace falta que los dos períodos comparados estén
              cerrados y que haya datos de IPC cargados para ese rango.
            </p>
          )}

          <Card>
            <CardHeader
              title="Materia prima: ¿precio o consumo?"
              description="Si subió por precio, es el país. Si subió por consumo, es la planta."
            />
            <CardBody className="p-0">
              <MaterialsTable materials={c.materials} aLabel={c.from.label} bLabel={c.to.label} />
            </CardBody>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Mano de obra por departamento" />
              <CardBody className="p-0">
                <LinesTable
                  lines={c.departments}
                  labelHeader="Departamento"
                  aLabel={c.from.label}
                  bLabel={c.to.label}
                  empty="No hay departamentos cargados."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="CIF aplicado por centro" />
              <CardBody className="p-0">
                <LinesTable
                  lines={c.centers}
                  labelHeader="Centro de costo"
                  aLabel={c.from.label}
                  bLabel={c.to.label}
                  empty="No hay centros de costo cargados."
                />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
