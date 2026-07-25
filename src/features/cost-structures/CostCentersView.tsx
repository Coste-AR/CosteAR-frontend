import { useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Factory, Wrench, Pencil, Info, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { cn, centerLabel, formatDate } from '@/lib/utils';
import type { IndirectCostConfig } from './cost-structure-types';
import type { CalculationResult } from '@/lib/types';
import { useAllocationValues, useAllocationBases } from './allocation-base-hooks';

type PerDept = CalculationResult['detail']['indirectCosts']['perDepartment'];

/** Fila de trazabilidad de una base para un centro (3b-3, registro auditable). */
interface TraceRow {
  baseName: string;
  unit: string;
  value: number;
  createdAt: string;
  note?: string | null;
  dataPointId?: string | null;
}

interface Props {
  config: IndirectCostConfig;
  perDepartment?: PerDept;
  onEdit: () => void;
  structureId?: string;
  companyId?: string;
}

const fmt = (n: number | undefined) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * F09-2 — ¿este centro de SERVICIO realmente repartió su costo?
 * "Cierra en 0" (verde) solo es válido cuando el servicio distribuyó a otros
 * centros. Un servicio sin fila de reparto, con la lista vacía, o con todos los
 * pesos en cero (reparto vacío o roto) NO cerró: distribuyó nada. Se mira la
 * config del prorrateo secundario (los pesos que cargó el costista), que es el
 * origen del "reparto empty or broken" del reporte.
 */
function serviceDistributes(config: IndirectCostConfig, centerId: string): boolean {
  const dist = (config.serviceDistributions ?? []).find((d) => d.serviceCenterId === centerId);
  if (!dist || !dist.distributions || dist.distributions.length === 0) return false;
  return dist.distributions.some(
    (p) => (Number(p.fijo) || 0) !== 0 || (Number(p.variable) || 0) !== 0,
  );
}

/**
 * Costos Indirectos — LISTA de centros de costo → FICHA por centro (Parte 3.3).
 * Vista de LECTURA: los números derivados salen del último cálculo persistido
 * (el front no recalcula); la estructura (conceptos, servicios, orden de cierre)
 * sale de la config. Para editar, se vuelve al formulario de configuración.
 */
export function CostCentersView({ config, perDepartment, onEdit, structureId, companyId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const centers = config.centers ?? [];
  const hasResult = !!perDepartment && Object.keys(perDepartment).length > 0;

  // Trazabilidad de bases (3b-3): valores vigentes del registro auditable,
  // agrupados por centro, con el nombre/unidad de cada base del catálogo.
  const { data: allocValues } = useAllocationValues(structureId);
  const { data: allocBases } = useAllocationBases(companyId);
  const baseById = new Map((allocBases ?? []).map((b) => [b.id, b]));
  const traceByCenter = new Map<string, TraceRow[]>();
  for (const v of allocValues ?? []) {
    const b = baseById.get(v.baseId);
    const rows = traceByCenter.get(v.centerId) ?? [];
    rows.push({
      baseName: b?.name?.trim() || 'Base sin nombre',
      unit: b?.unit ?? '',
      value: Number(v.value),
      createdAt: v.createdAt,
      note: v.note,
      dataPointId: v.dataPointId,
    });
    traceByCenter.set(v.centerId, rows);
  }

  // Sobreaplicación neta global = Σ (aplicado − real) de los centros productivos.
  const netOverApplied = hasResult
    ? Object.values(perDepartment!).reduce((a, d) => a + (d.overUnderApplied ?? 0), 0)
    : null;

  // E3 — centros sin cierre de mes: su CIF se aplicó a capacidad normal y NO
  // tienen variaciones. Hay que decirlo antes de mostrar cualquier total.
  const pendingCount = hasResult
    ? Object.values(perDepartment!).filter((d) => d.pendingClosing).length
    : 0;

  const center = selected ? centers.find((c) => c.id === selected) : null;
  if (center) {
    return (
      <CenterCard
        center={center}
        data={perDepartment?.[center.id]}
        config={config}
        trace={traceByCenter.get(center.id) ?? []}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Centros de costo</h4>
          <p className="text-[11px] text-ink-soft">Entrá a un centro para ver su presupuesto, cuota, aplicado y variaciones.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
          <Pencil className="size-3" /> Editar configuración
        </Button>
      </div>

      {!hasResult && (
        <div className="flex items-start gap-2 rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>Presioná <strong>Calcular</strong> para ver el presupuesto derivado, la cuota y las variaciones de cada centro.</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            <strong>{pendingCount === 1 ? 'Un centro no tiene' : `${pendingCount} centros no tienen`} el cierre del mes cargado</strong> (actividad real
            y/o CIP real). Su costo indirecto se aplicó con el <strong>presupuesto</strong>, a capacidad normal, y todavía
            no tienen variaciones. Cargá el cierre para ver el desvío contra lo real.
          </span>
        </div>
      )}

      {netOverApplied != null && pendingCount === 0 && (
        <div className="rounded-xl border border-line bg-surface-alt/50 px-4 py-2.5 text-[13px]">
          <span className="text-ink-soft">Sobreaplicación neta global (Σ aplicado − real): </span>
          <strong className={cn(netOverApplied >= 0 ? 'text-ok' : 'text-danger')}>
            {netOverApplied >= 0 ? 'sobreaplicado ' : 'subaplicado '}<Money value={Math.abs(netOverApplied)} />
          </strong>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Centro</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Presup. fijo</th>
              <th className="px-3 py-2 text-right font-medium">Presup. variable</th>
              <th className="px-3 py-2 text-right font-medium">Cuota total</th>
              <th className="px-3 py-2 text-center font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {centers.map((c) => {
              const d = perDepartment?.[c.id];
              const isProd = c.type === 'productive';
              // F09-2 — un servicio "cierra en 0" (verde) solo si repartió algo.
              const svcClosed = !isProd && serviceDistributes(config, c.id);
              return (
                <tr key={c.id} className="cursor-pointer hover:bg-surface-alt/40" onClick={() => setSelected(c.id)}>
                  <td className="px-3 py-2 font-medium text-ink">{centerLabel(c)}</td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                      isProd ? 'border-action/20 bg-action/10 text-action' : 'border-idle/20 bg-idle/10 text-idle')}>
                      {isProd ? <Factory className="size-3" /> : <Wrench className="size-3" />}
                      {isProd ? 'Productivo' : 'Servicio'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">
                    {isProd
                      ? fmt(d?.budgetFixed)
                      : svcClosed
                        ? <span className="text-ink-soft">cierra en 0</span>
                        : <span className="text-warn">sin reparto</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{isProd ? fmt(d?.budgetVariable) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{isProd ? fmt(d?.quota) : '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {isProd ? (
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                        d ? 'border-ok/20 bg-ok/10 text-ok' : 'border-idle/20 bg-idle/10 text-idle')}>
                        {d ? 'Calculado' : 'Pendiente'}
                      </span>
                    ) : svcClosed ? (
                      <span className="inline-flex rounded-full border border-ok/20 bg-ok/10 px-2 py-0.5 text-[10px] font-bold uppercase text-ok">
                        Cerrado
                      </span>
                    ) : (
                      <span title="Este servicio no repartió su costo a ningún centro (reparto vacío o en cero). Todavía no cerró."
                        className="inline-flex rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[10px] font-bold uppercase text-warn">
                        Sin reparto
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right"><ChevronRight className="ml-auto size-4 text-ink-soft" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ficha de un centro ───────────────────────────────────────────────────────

function CenterCard({
  center, data, config, trace, onBack,
}: {
  center: IndirectCostConfig['centers'][number];
  data?: PerDept[string];
  config: IndirectCostConfig;
  trace: TraceRow[];
  onBack: () => void;
}) {
  const isProd = center.type === 'productive';

  // Conceptos del primario que tocan este centro (inputs de la config).
  const conceptsHere = (config.concepts ?? []).filter((c) => (c.distribution?.[center.id] ?? 0) > 0);
  // Distribución del secundario de este servicio (si lo es).
  const myDist = (config.serviceDistributions ?? []).find((d) => d.serviceCenterId === center.id);
  const closureIdx = (config.closureOrder ?? []).indexOf(center.id);

  return (
    <div className="space-y-4 pt-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-3.5" /> Volver a la lista de centros
      </button>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-granate-deep">{centerLabel(center)}</h3>
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
          isProd ? 'border-action/20 bg-action/10 text-action' : 'border-idle/20 bg-idle/10 text-idle')}>
          {isProd ? <Factory className="size-3" /> : <Wrench className="size-3" />}{isProd ? 'Productivo' : 'Servicio'}
        </span>
      </div>

      {/* Conceptos recibidos del primario */}
      <Section title="Conceptos del prorrateo primario">
        {conceptsHere.length === 0 ? (
          <p className="text-[12.5px] text-ink-soft">Este centro no recibe conceptos del primario.</p>
        ) : (
          <ul className="space-y-1 text-[12.5px]">
            {conceptsHere.map((c) => (
              <li key={c.name} className="flex justify-between rounded border border-line bg-surface px-2.5 py-1.5">
                <span className="text-ink">{c.name}</span>
                <span className="text-ink-soft">peso/base en {centerLabel(center)}: <strong className="text-ink">{c.distribution[center.id]}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Trazabilidad de bases (3b-3): valores del registro auditable que
          alimentan el prorrateo de este centro. Solo si hay valores cargados. */}
      {trace.length > 0 && (
        <Section title="Trazabilidad de bases (registro auditable)">
          <ul className="space-y-1 text-[12.5px]">
            {trace.map((t, i) => (
              <li key={i} className="flex flex-col gap-0.5 rounded border border-line bg-surface px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-ink"><strong>{t.baseName}</strong>: {fmt(t.value)}{t.unit ? ` ${t.unit}` : ''}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
                  registrado {formatDate(t.createdAt)}
                  {t.note ? <span>· {t.note}</span> : null}
                  {t.dataPointId ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-action/20 bg-action/10 px-1.5 py-0.5 text-[10px] font-semibold text-action">
                      <FileText className="size-3" /> con ficha del dato
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10.5px] text-ink-soft">Cada valor queda versionado (append-only): si lo cambiás, se guarda una versión nueva sin pisar la anterior.</p>
        </Section>
      )}

      {isProd && data ? (
        <>
          {/* Presupuesto derivado */}
          <Section title="Presupuesto (derivado del prorrateo — no se tipea)">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Presup. fijo" value={<Money value={data.budgetFixed ?? 0} />} />
              <Stat label="Presup. variable" value={<Money value={data.budgetVariable ?? 0} />} />
              <Stat label="Presup. total" value={<Money value={(data.budgetFixed ?? 0) + (data.budgetVariable ?? 0)} />} />
            </div>
          </Section>

          {/* Cuota predeterminada con fórmula */}
          <Section title="Cuota predeterminada = presupuesto ÷ capacidad normal">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Cuota fija" value={fmt(data.quotaFixed)} hint={`${fmt(data.budgetFixed)} ÷ ${fmt(data.normalCapacity)}`} />
              <Stat label="Cuota variable" value={fmt(data.quotaVariable)} hint={`${fmt(data.budgetVariable)} ÷ ${fmt(data.normalCapacity)}`} />
              <Stat label="Cuota total" value={fmt(data.quota)} hint="fija + variable" />
            </div>
          </Section>

          {/* Datos reales de fin de mes */}
          <Section title="Datos reales (fin de mes)">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Capacidad normal" value={`${fmt(data.normalCapacity)} hs`} />
              <Stat label="Actividad real" value={data.actualActivity ? `${fmt(data.actualActivity)} hs` : '— pendiente'} />
              <Stat label="CIP real" value={data.actualCip ? <Money value={data.actualCip} /> : '— pendiente'} />
            </div>
          </Section>

          {/* CIP aplicado + variaciones con lectura contable.
              E3: sin los datos de cierre no hay variaciones posibles — se dice
              con todas las letras en vez de mostrar números contra cero. */}
          <Section title="Aplicación y variaciones">
            {data.pendingClosing ? (
              <>
                <p className="mb-2 flex items-start gap-2 rounded-xl bg-warn/10 px-3 py-2 text-[12.5px] text-ink">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>
                    <strong>Falta el cierre del mes</strong> en este centro
                    {!data.actualActivity && !data.actualCip
                      ? ' (actividad real y CIP real)'
                      : !data.actualActivity ? ' (actividad real)' : ' (CIP real)'}.
                    El costo se calcula igual, con el <strong>presupuesto</strong>, pero todavía no hay
                    variaciones: no hay contra qué comparar.
                  </span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Stat
                    label="CIP aplicado (predeterminado)"
                    value={<Money value={data.appliedCip} />}
                    hint={data.appliedOn === 'normalCapacity'
                      ? `cuota total × capacidad normal (${fmt(data.quota)} × ${fmt(data.normalCapacity)})`
                      : `cuota total × actividad real (${fmt(data.quota)} × ${fmt(data.actualActivity)})`}
                  />
                  <Stat label="Variaciones" value="Pendientes de cierre" hint="se calculan cuando cargues la actividad real y el CIP real" />
                </div>
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Stat label="CIP aplicado" value={<Money value={data.appliedCip} />} hint={`cuota total × actividad real (${fmt(data.quota)} × ${fmt(data.actualActivity)})`} />
                <VarianceStat label="Sobre / sub-aplicación" value={data.overUnderApplied ?? (data.appliedCip - (data.actualCip ?? 0))}
                  positive="sobreaplicado (el costeo cargó de más)" negative="subaplicado (el costeo cargó de menos)" />
                <VarianceStat label="Variación presupuesto" value={data.budgetVariance} invert
                  positive="desfavorable — exceso de gasto" negative="favorable — ahorro en el gasto"
                  hint="CIP real − presupuesto ajustado al nivel real" />
                <VarianceStat label="Variación volumen" value={data.volumeVariance} invert
                  positive="desfavorable — capacidad ociosa (sub-absorción de fijos)" negative="favorable — sobre-absorción de fijos"
                  hint="cuota fija × (capacidad normal − actividad real)" />
              </div>
            )}
          </Section>
        </>
      ) : isProd ? (
        <p className="rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">Calculá la estructura para ver el presupuesto, la cuota y las variaciones de este centro.</p>
      ) : (
        // Servicio: qué distribuye y en qué orden cierra
        <Section title="Prorrateo secundario (servicio)">
          <p className="mb-2 text-[12.5px] text-ink-soft">
            {closureIdx >= 0
              ? <>Orden de cierre: <strong className="text-ink">#{closureIdx + 1}</strong>. Un servicio reparte a productivos y a servicios que aún no cerraron; al final queda en <strong>0</strong>.</>
              : <>Este servicio reparte su costo a los centros productivos; al final queda en <strong>0</strong>.</>}
          </p>
          {serviceDistributes(config, center.id) ? (
            <ul className="space-y-1 text-[12.5px]">
              {myDist!.distributions.map((p) => (
                <li key={p.centroDestinoId} className="flex justify-between rounded border border-line bg-surface px-2.5 py-1.5">
                  <span className="text-ink">→ {centerLabel(config.centers.find((c) => c.id === p.centroDestinoId))}</span>
                  <span className="text-ink-soft">
                    fijo <strong className="text-ink">{fmt(p.fijo)}</strong> · var <strong className="text-ink">{fmt(p.variable)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            // F09-2 — reparto vacío o en cero: NO cerró. Se dice explícito en vez
            // de mostrar el mismo verde "cierra en 0" de un servicio real.
            <p className="flex items-start gap-2 rounded-xl bg-warn/10 px-3 py-2 text-[12.5px] text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <span>
                <strong>Este servicio todavía no repartió su costo</strong> (reparto vacío o en cero). Mientras no distribuya
                a ningún centro, no cierra: cargá a qué centros reparte en la configuración de Costos Indirectos.
              </span>
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">{title}</h4>
      {children}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-[15px] font-semibold text-ink">{value}</p>
      {hint && <p className="text-[10.5px] text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Muestra una variación con su lectura contable (favorable/desfavorable). */
function VarianceStat({
  label, value, positive, negative, invert, hint,
}: {
  label: string; value: number; positive: string; negative: string; invert?: boolean; hint?: string;
}) {
  const zero = Math.abs(value) < 0.005;
  // Por convención de la cátedra, en presupuesto/volumen (+) es desfavorable
  // (invert=true → verde cuando es negativo). En sobre/sub-aplicación (+) es bueno.
  const good = invert ? value < 0 : value > 0;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn('text-[15px] font-semibold', zero ? 'text-ink' : good ? 'text-ok' : 'text-danger')}>
        <Money value={Math.abs(value)} />
      </p>
      <p className={cn('text-[10.5px]', zero ? 'text-ink-soft' : good ? 'text-ok' : 'text-danger')}>
        {zero ? 'sin desvío' : good ? negative : positive}
      </p>
      {hint && <p className="text-[10.5px] text-ink-soft">{hint}</p>}
    </div>
  );
}
