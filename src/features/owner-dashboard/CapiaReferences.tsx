import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Bird,
  Container,
  PackageCheck,
  Scale,
  Warehouse,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatMoney } from '@/lib/utils';
import type { CapiaIndicatorsData } from './owner-dashboard-hooks';

export type { CapiaIndicatorsData } from './owner-dashboard-hooks';

const AVICULTURE_PACKAGE = 'AVICOLA_POSTURA';

const PACKAGE_ITEMS: ReadonlyArray<{
  code: string;
  label: string;
  icon: LucideIcon;
}> = [
  { code: 'CAPIA_HUEVO_BLANCO_CAJON', label: 'Huevo blanco', icon: Bird },
  { code: 'CAPIA_HUEVO_COLOR_CAJON', label: 'Huevo color', icon: Bird },
  { code: 'CAPIA_ALIMENTO_PONEDORA_KG', label: 'Alimento ponedora', icon: PackageCheck },
  { code: 'CAPIA_MAIZ_TON', label: 'Maíz', icon: Warehouse },
  { code: 'CAPIA_SOJA_TON', label: 'Soja', icon: Warehouse },
  { code: 'CAPIA_MAPLE_UNIDAD', label: 'Maple', icon: Container },
];

const UNIT_LABELS: Record<string, string> = {
  cajon: 'cajón',
  kg: 'kg',
  ton: 'tonelada',
  unidad: 'unidad',
  ave: 'ave',
};

function weekNumber(sourceLabel: string | null): string | null {
  return sourceLabel?.match(/SEMANAL\s+(\d+)/i)?.[1] ?? null;
}

function weekRange(from: string, to: string | null): string {
  const fromDate = new Date(from);
  const fromDay = String(fromDate.getUTCDate()).padStart(2, '0');
  const fromMonth = String(fromDate.getUTCMonth() + 1).padStart(2, '0');
  if (!to) return `${fromDay}/${fromMonth}`;

  const toDate = new Date(to);
  const toDay = String(toDate.getUTCDate()).padStart(2, '0');
  const toMonth = String(toDate.getUTCMonth() + 1).padStart(2, '0');
  return fromMonth === toMonth
    ? `${fromDay}–${toDay}/${toMonth}`
    : `${fromDay}/${fromMonth}–${toDay}/${toMonth}`;
}

function startOfCurrentWeek(now: Date): Date {
  // CAPIA expone fechas de calendario a medianoche UTC. Armamos la fecha
  // comparable desde el calendario local para no declarar semana nueva tres
  // horas antes, el domingo a la noche en Argentina.
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const daysSinceMonday = (now.getDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function isPreviousWeek(effectiveTo: string | null): boolean {
  return effectiveTo !== null && new Date(effectiveTo) < startOfCurrentWeek(new Date());
}

export function CapiaReferences({
  rubroClave,
  data,
  isLoading = false,
  isError = false,
}: {
  rubroClave: string | null | undefined;
  data?: CapiaIndicatorsData;
  isLoading?: boolean;
  isError?: boolean;
}) {
  if (rubroClave !== AVICULTURE_PACKAGE) return null;

  const selected = PACKAGE_ITEMS.flatMap((definition) => {
    const item = data?.items.find((candidate) => candidate.indicatorCode === definition.code);
    return item ? [{ ...definition, item }] : [];
  });
  const number = weekNumber(data?.semana?.sourceLabel ?? null);
  const stale = data?.semana ? isPreviousWeek(data.semana.effectiveTo) : false;
  const weekTitle = data?.semana
    ? `${number ? `Semana ${number} · ` : ''}${weekRange(data.semana.effectiveFrom, data.semana.effectiveTo)}`
    : undefined;

  return (
    <Card data-testid="capia-references">
      <CardHeader
        title="Referencias del sector"
        description={weekTitle ?? 'Precios semanales publicados por CAPIA.'}
        action={(
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate">
            <Scale className="size-4.5" aria-hidden="true" />
          </span>
        )}
      />
      <CardBody>
        {isLoading ? (
          <p className="text-sm text-ink-soft" role="status">Cargando referencias del sector…</p>
        ) : isError ? (
          <div className="flex items-start gap-3" role="alert">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <p className="text-sm text-ink-soft">No se pudieron cargar las referencias de CAPIA.</p>
          </div>
        ) : !data?.semana || selected.length === 0 ? (
          <div className="flex items-start gap-3" role="status">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-ink-soft" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">CAPIA todavía no tiene datos en el sistema</p>
          </div>
        ) : (
          <>
            {stale && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-warning" role="status">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="text-[12px] font-bold">
                  Último dato{number ? `: semana ${number}` : ' disponible'}
                </p>
              </div>
            )}

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selected.map(({ code, label, icon: Icon, item }) => (
                <li
                  key={code}
                  data-testid={`capia-${code}`}
                  className="rounded-xl border border-line bg-surface-alt px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-extrabold text-granate-deep">{label}</p>
                      <p className="mt-2 font-mono-jb text-lg font-bold text-ink">
                        {formatMoney(item.value)}
                      </p>
                    </div>
                    <Icon className="size-4 shrink-0 text-granate" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    <span>por {item.unit ? (UNIT_LABELS[item.unit] ?? item.unit) : 'unidad no informada'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.priceIncludesIva ? 'con IVA' : 'sin IVA'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
