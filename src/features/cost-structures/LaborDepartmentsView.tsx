import { useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, Users, Pencil, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { TraceableValue } from '@/components/ui/TraceableValue';
import type { DerivationDetail } from '@/stores/trace-mode-store';
import { cn } from '@/lib/utils';
import { buildItcsBreakdown } from './social-charges-catalog';
import { ItcsBreakdownPanel, formatItcsPercent } from './components/labor/ItcsBreakdownPanel';
import { IdleCapacityPanel } from './components/labor/IdleCapacityPanel';
import {
  buildIdleCapacity,
  formatHours,
  DESTINO_COSTO_OCIOSO_VIGENTE,
  type IdleCapacityBucket,
  type IdleCapacityDepartmentLine,
} from './components/labor/idle-capacity';
import type { DirectLaborConfig } from './cost-structure-types';
import type { CalculationResult } from '@/lib/types';

type DetailMOD = CalculationResult['detail']['directLabor'];

interface Props {
  config: DirectLaborConfig;
  directLabor?: DetailMOD;
  onEdit: () => void;
  onLoadExample?: () => void;
}

const fmt = (n: number | undefined) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// Mismo formato de porcentaje que el desglose: en la misma pantalla no pueden
// convivir "8.33%" y "8,3333 %" para el mismo índice.
const pct = formatItcsPercent;

/**
 * DE DÓNDE SALE CADA NÚMERO DE ESTA HOJA (T-05).
 *
 * Ninguno de los números que se muestran acá es un dato cargado: son todos
 * CUENTAS que ya hizo el motor y que la pantalla solo imprime. Por eso se marcan
 * con `derivation` y no con `dataPointId` — un derivado no tiene ficha porque no
 * lo cargó nadie; lo que hay para mostrar es la fórmula y los números que
 * entraron, que es exactamente lo que arma `nodo()`.
 *
 * Los insumos que SÍ se cargan a mano (remuneración básica, horas pagadas, los
 * días del año) viajan dentro de la FÓRMULA, no como hijos sueltos: un hijo sin
 * `dataPointId` y sin fórmula se declara «sin origen registrado», que sería
 * mentir sobre un dato que la persona cargó y que el sistema sí registró — solo
 * que su ficha no es alcanzable desde esta pantalla (ver el informe de T-05).
 */
const nodo = (
  label: string,
  formula: string | null,
  value: number | null,
  unit: string | null,
  children: DerivationDetail[] = [],
): DerivationDetail => ({ label, formula, value, unit, children });

const $ = (n: number | undefined) => `$ ${fmt(n)}`;

/** Suma del ausentismo NO pago declarado en la configuración. */
function ausentismoNoPago(config: DirectLaborConfig): number {
  const a = config.workingDays?.unpaidAbsence;
  return (a?.sundays ?? 0) + (a?.saturdays ?? 0) + (a?.unjustifiedAbsences ?? 0) + (a?.holidaysOnWeekend ?? 0);
}

/** Suma del ausentismo PAGO declarado en la configuración. */
function ausentismoPago(config: DirectLaborConfig): number {
  const a = config.workingDays?.paidAbsence;
  return (a?.holidays ?? 0) + (a?.vacations ?? 0) + (a?.sickness ?? 0) + (a?.specialLeaves ?? 0) + (a?.workAccidents ?? 0);
}

function derivacionDiasEfectivos(config: DirectLaborConfig, directLabor: DetailMOD): DerivationDetail {
  const noPago = ausentismoNoPago(config);
  const pago = ausentismoPago(config);
  return nodo(
    'Días hábiles efectivos',
    `${fmt(config.workingDays?.totalDaysPerYear)} días del año − ${fmt(noPago)} de ausentismo no pago − ${fmt(pago)} de ausentismo pago`,
    directLabor.workingDays,
    'días',
    [
      nodo('Ausentismo no pago', 'domingos + sábados + inasistencias injustificadas + feriados en fin de semana', noPago, 'días'),
      nodo('Ausentismo pago', 'feriados + vacaciones + enfermedad + licencias especiales + accidentes de trabajo', pago, 'días'),
    ],
  );
}

function derivacionIap(config: DirectLaborConfig, directLabor: DetailMOD): DerivationDetail {
  const pago = directLabor.paidDays ?? ausentismoPago(config);
  return nodo(
    'IAP — Inasistencias pagas',
    `${fmt(pago)} días pagos ÷ ${fmt(directLabor.workingDays)} días efectivos`,
    directLabor.iapPercent,
    '%',
    [derivacionDiasEfectivos(config, directLabor)],
  );
}

function derivacionItcs(directLabor: DetailMOD): DerivationDetail {
  const b = directLabor.itcsBreakdown;
  return nodo(
    'Índice total de cargas sociales',
    'cargas ciertas + inciertas remunerativas + derivadas + inciertas no remunerativas',
    directLabor.itcsPercent,
    '%',
    b
      ? [
          nodo('Cargas sociales ciertas', 'las que fija la ley y se devengan siempre (incluye el SAC)', b.certain, '%'),
          nodo('Inciertas remunerativas', 'suma de los coeficientes remunerativos estimados', b.uncertainRemunerative, '%'),
          nodo('Cargas derivadas', 'las que se calculan sobre el ausentismo pago', b.derived, '%'),
          nodo('Inciertas no remunerativas', 'suma de los coeficientes no remunerativos estimados', b.uncertainNonRemunerative, '%'),
        ]
      : [],
  );
}

type DeptData = NonNullable<DetailMOD['departments']>[number];

function derivacionCargasSociales(d: DeptData, itcsPercent: number): DerivationDetail {
  return nodo(
    `Costo de cargas sociales · ${d.name}`,
    `${$(d.basicRemuneration)} de remuneración básica × ${pct(itcsPercent)}`,
    d.socialChargesCost,
    '$',
  );
}

function derivacionTotalMod(d: DeptData, itcsPercent: number): DerivationDetail {
  return nodo(
    `Costo total de mano de obra · ${d.name}`,
    `${$(d.basicRemuneration)} de remuneración básica + ${$(d.socialChargesCost)} de cargas sociales`,
    d.totalMod,
    '$',
    [derivacionCargasSociales(d, itcsPercent)],
  );
}

function derivacionTarifaHoraria(
  d: DeptData,
  itcsPercent: number,
  horasDivisor: number | undefined,
  leyendaDivisor: string,
): DerivationDetail {
  return nodo(
    `Tarifa horaria integral · ${d.name}`,
    `${$(d.totalMod)} ÷ ${fmt(horasDivisor)} ${leyendaDivisor}`,
    d.hourlyRate,
    '$/hs',
    [derivacionTotalMod(d, itcsPercent)],
  );
}

/**
 * Los DOS TIPOS DE IMPRODUCTIVIDAD de la cátedra (Clase 10) para un solo
 * departamento: tiempos perdidos informados e improductividad oculta. Los pesos
 * se reparten en proporción a las horas, igual que en el motor.
 */
function breakdownDelDepartamento(d: IdleCapacityDepartmentLine): IdleCapacityBucket[] {
  const costoDe = (horas: number) =>
    d.totalMod != null && d.paidHours > 0 ? (d.totalMod * horas) / d.paidHours : 0;
  return [
    {
      tipo: 'tiempos-perdidos-informados' as const,
      label: 'Tiempos perdidos informados',
      hours: d.informedLostHours,
      cost: costoDe(d.informedLostHours),
      reasons: [],
    },
    {
      tipo: 'improductividad-oculta' as const,
      label: 'Improductividad oculta',
      hours: d.hiddenIdleHours,
      cost: costoDe(d.hiddenIdleHours),
      reasons: [],
    },
  ].filter((b) => b.hours > 0);
}

/**
 * Mano de Obra — LISTA de departamentos → FICHA por departamento (Parte 3.2).
 * Los días efectivos y el ITCS son de la estructura (compartidos, alimentan la
 * tarifa de cada depto). La tarifa y el desglose salen del cálculo persistido
 * (el front no recalcula). Horas presupuestadas vs reales, separadas.
 */
export function LaborDepartmentsView({ config, directLabor, onEdit, onLoadExample }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const departments = config.departments ?? [];
  const hasResult = !!directLabor;
  // C-04 — capacidad ociosa. Una estructura que solo tiene horas pagadas no
  // declara ninguna: `anyDeclared` queda en false y no se muestra nada nuevo.
  const idle = buildIdleCapacity(config, directLabor);

  if (selected !== null && departments[selected]) {
    return (
      <DepartmentCard
        dept={departments[selected]}
        data={directLabor?.departments?.[selected]}
        directLabor={directLabor}
        config={config}
        idle={idle.departments[selected]}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Departamentos productivos</h4>
          <p className="text-[11px] text-ink-soft">Entrá a un departamento para ver su ITCS, tarifa y horas pagadas vs reales.</p>
        </div>
        <div className="flex items-center gap-2">
          {onLoadExample && (
            <Button type="button" size="sm" variant="ghost" onClick={onLoadExample}>
              <Sparkles className="size-3.5" /> Cargar ejemplo de la cátedra
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="size-3" /> Editar configuración
          </Button>
        </div>
      </div>

      {/* Datos compartidos de la estructura (alimentan todas las tarifas) */}
      {hasResult && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniStat
              label="Días hábiles efectivos"
              value={
                <TraceableValue title="Días hábiles efectivos" derivation={derivacionDiasEfectivos(config, directLabor!)}>
                  {fmt(directLabor!.workingDays)} días
                </TraceableValue>
              }
            />
            <MiniStat
              label="IAP — Inasistencias pagas"
              value={
                <TraceableValue title="IAP — Inasistencias pagas" derivation={derivacionIap(config, directLabor!)}>
                  {pct(directLabor!.iapPercent)}
                </TraceableValue>
              }
              hint={directLabor!.paidDays != null ? `${directLabor!.paidDays} pagos / ${fmt(directLabor!.workingDays)} efectivos` : undefined}
            />
            <MiniStat
              label="Índice total de cargas sociales aplicado"
              value={
                <TraceableValue title="Índice total de cargas sociales" derivation={derivacionItcs(directLabor!)}>
                  {pct(directLabor!.itcsPercent)}
                </TraceableValue>
              }
              hint="cargas ciertas + inciertas + derivadas"
            />
          </div>
          <ItcsBreakdownDisclosure config={config} directLabor={directLabor!} />
        </>
      )}

      {/* La capacidad ociosa, en su propia línea: nunca disuelta en las órdenes. */}
      {idle.anyDeclared && <IdleCapacityPanel summary={idle} />}

      {!hasResult && (
        <div className="flex items-start gap-2 rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>Presioná <strong>Calcular</strong> para ver la tarifa horaria integral y el desglose de cada departamento.</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Departamento</th>
              <th className="px-3 py-2 text-right font-medium">Remuneración básica</th>
              <th className="px-3 py-2 text-right font-medium">Horas pagadas</th>
              <th className="px-3 py-2 text-right font-medium">Tarifa horaria</th>
              <th className="px-3 py-2 text-center font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {departments.map((d, i) => {
              const data = directLabor?.departments?.[i];
              const idleLine = idle.departments[i];
              return (
                <tr key={i} className="cursor-pointer hover:bg-surface-alt/40" onClick={() => setSelected(i)}>
                  <td className="px-3 py-2 font-medium text-ink">{d.name || `Departamento ${i + 1}`}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink"><Money value={d.basicRemuneration} /></td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">
                    {fmt(d.hoursWorked)} hs
                    {idleLine?.hasIdleCapacity && (
                      <span className="block text-[10.5px] font-normal text-ink-soft">
                        {formatHours(idleLine.productiveHours)} productivas · {formatHours(idleLine.idleHours)} ociosas
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">
                    {data ? (
                      // La fila entera navega a la ficha del departamento: el click
                      // sobre el valor abre SU cuenta y no arrastra la navegación.
                      <span onClick={(e) => e.stopPropagation()}>
                        <TraceableValue
                          title={`Tarifa horaria integral · ${data.name}`}
                          derivation={derivacionTarifaHoraria(
                            data,
                            directLabor!.itcsPercent,
                            idleLine?.hasIdleCapacity ? idleLine.productiveHours : data.budgetedHours,
                            idleLine?.hasIdleCapacity ? 'hs netas productivas' : 'hs pagadas',
                          )}
                        >
                          <Money value={data.hourlyRate} />
                        </TraceableValue>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                      data ? 'border-ok/20 bg-ok/10 text-ok' : 'border-idle/20 bg-idle/10 text-idle')}>
                      {data ? 'Calculado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right"><ChevronRight className="ml-auto size-4 text-ink-soft" /></td>
                </tr>
              );
            })}
            {departments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-[13px] text-ink-soft">Sin departamentos cargados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ficha de un departamento ─────────────────────────────────────────────────

function DepartmentCard({
  dept, data, directLabor, config, idle, onBack,
}: {
  dept: DirectLaborConfig['departments'][number];
  data?: NonNullable<DetailMOD['departments']>[number];
  directLabor?: DetailMOD;
  config: DirectLaborConfig;
  idle?: IdleCapacityDepartmentLine;
  onBack: () => void;
}) {
  const realHours = dept.realHours ?? data?.realHours;
  // Lectura del índice que ya calculó el motor: concepto por concepto.
  const breakdown = directLabor ? buildItcsBreakdown(config.itcs, directLabor) : null;
  // Sin horas netas productivas cargadas no hay ociosidad: la ficha se ve igual
  // que siempre y ni el título de la tarifa ni las horas cambian.
  const conOciosidad = !!idle?.hasIdleCapacity;

  return (
    <div className="space-y-4 pt-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-3.5" /> Volver a la lista de departamentos
      </button>
      <h3 className="text-lg font-bold text-granate-deep">{dept.name || 'Departamento'}</h3>

      {/* Días efectivos (compartido) */}
      {directLabor && (
        <Section title="Días hábiles efectivos (estructura)">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat
              label="Días efectivos"
              value={
                <TraceableValue title="Días hábiles efectivos" derivation={derivacionDiasEfectivos(config, directLabor)}>
                  {fmt(directLabor.workingDays)} días
                </TraceableValue>
              }
            />
            <Stat
              label="IAP — Inasistencias pagas"
              value={
                <TraceableValue title="IAP — Inasistencias pagas" derivation={derivacionIap(config, directLabor)}>
                  {pct(directLabor.iapPercent)}
                </TraceableValue>
              }
              hint={directLabor.paidDays != null ? `${directLabor.paidDays} días pagos / ${fmt(directLabor.workingDays)} efectivos · derivado` : undefined}
            />
            <Stat
              label="Índice total de cargas sociales"
              value={
                <TraceableValue title="Índice total de cargas sociales" derivation={derivacionItcs(directLabor)}>
                  {pct(directLabor.itcsPercent)}
                </TraceableValue>
              }
              hint="cargas ciertas + inciertas + derivadas"
            />
          </div>
        </Section>
      )}

      {/* De dónde sale el índice: cada concepto con su porcentaje */}
      {breakdown && (
        <Section title="Composición de la carga social — de dónde sale el índice">
          <ItcsBreakdownPanel
            breakdown={breakdown}
            money={data ? {
              basicRemuneration: data.basicRemuneration,
              socialChargesCost: data.socialChargesCost,
              totalMod: data.totalMod,
            } : undefined}
          />
        </Section>
      )}

      {/* Tarifa horaria integral */}
      {data ? (
        <Section
          title={
            conOciosidad
              ? 'Tarifa horaria integral = mano de obra imputable a las órdenes ÷ horas netas productivas'
              : 'Tarifa horaria integral = remuneración × (1 + ITCS) ÷ horas pagadas'
          }
        >
          <div className="grid gap-2 sm:grid-cols-4">
            {/* La remuneración básica es un DATO CARGADO, no una cuenta: no se
                marca porque desde esta pantalla no hay forma de llegar a su
                ficha (ver el informe de T-05). El resto de la fila sí es
                derivado y se abre con su fórmula. */}
            <Stat label="Remuneración básica" value={<Money value={data.basicRemuneration} />} />
            <Stat
              label="Costo cargas sociales"
              value={
                <TraceableValue title="Costo de cargas sociales" derivation={derivacionCargasSociales(data, directLabor!.itcsPercent)}>
                  <Money value={data.socialChargesCost} />
                </TraceableValue>
              }
              hint="básica × ITCS"
            />
            <Stat
              label="Costo total MOD"
              value={
                <TraceableValue title="Costo total de mano de obra" derivation={derivacionTotalMod(data, directLabor!.itcsPercent)}>
                  <Money value={data.totalMod} />
                </TraceableValue>
              }
              hint={conOciosidad ? 'básica + cargas · incluye la capacidad ociosa' : 'básica + cargas'}
            />
            <Stat
              label="Tarifa horaria"
              value={
                <TraceableValue
                  title="Tarifa horaria integral"
                  derivation={derivacionTarifaHoraria(
                    data,
                    directLabor!.itcsPercent,
                    conOciosidad ? idle!.productiveHours : data.budgetedHours,
                    conOciosidad ? 'hs netas productivas' : 'hs pagadas',
                  )}
                >
                  <Money value={data.hourlyRate} />
                </TraceableValue>
              }
              hint={
                conOciosidad
                  ? `imputable ÷ ${formatHours(idle!.productiveHours)} productivas`
                  : `total ÷ ${fmt(data.budgetedHours)} hs`
              }
            />
          </div>
          {conOciosidad && (
            <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
              La tarifa sale de la mano de obra imputable a las órdenes sobre las horas netas productivas:
              las <strong className="font-medium text-ink">{formatHours(idle!.idleHours)}</strong> de capacidad
              ociosa no entran en el divisor ni en el importe que reparte. Su costo queda identificado abajo,
              en su propia línea.
            </p>
          )}
        </Section>
      ) : (
        <p className="rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">Calculá la estructura para ver la tarifa horaria integral de este departamento.</p>
      )}

      {/* Capacidad ociosa del departamento — línea propia, con horas y pesos. */}
      {conOciosidad && (
        <Section title="Capacidad ociosa del departamento">
          <IdleCapacityPanel
            summary={{
              departments: [idle!],
              paidHours: idle!.paidHours,
              productiveHours: idle!.productiveHours,
              chargeableHours: idle!.chargeableHours,
              idleHours: idle!.idleHours,
              idleSharePercent: idle!.paidHours > 0 ? (idle!.idleHours / idle!.paidHours) * 100 : 0,
              fullMod: idle!.totalMod,
              idleCost: idle!.idleCost,
              applicableMod: idle!.applicableMod,
              // El desglose por tipo del departamento se arma con SUS horas; el
              // cartel se muestra una sola vez, arriba, para toda la hoja.
              breakdown: breakdownDelDepartamento(idle!),
              alert: null,
              anyDeclared: idle!.declared,
              hasIdleCapacity: idle!.hasIdleCapacity,
              hasExceeded: idle!.exceedsPaidHours,
              destination: DESTINO_COSTO_OCIOSO_VIGENTE,
            }}
            showDepartments={false}
          />
        </Section>
      )}

      {/* Horas pagadas, productivas y reales — separadas y etiquetadas (criterio C) */}
      <Section title={conOciosidad ? 'Horas: pagadas, netas productivas y reales' : 'Horas: pagadas vs reales'}>
        <div className={cn('grid gap-2', conOciosidad ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          <div className="rounded-lg border border-action/20 bg-action/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-action">Pagadas (presencia en fábrica)</p>
            <p className="text-[15px] font-semibold text-ink">{fmt(dept.hoursWorked)} hs</p>
            <p className="text-[10.5px] text-ink-soft">capacidad normal presupuestada</p>
          </div>
          {conOciosidad && (
            <div className="rounded-lg border border-action/20 bg-action/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-action">Netas productivas</p>
              <p className="text-[15px] font-semibold text-ink">{fmt(idle!.productiveHours)} hs</p>
              <p className="text-[10.5px] text-ink-soft">imputables a las órdenes · {formatHours(idle!.idleHours)} ociosas</p>
            </div>
          )}
          <div className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Reales (fin de mes)</p>
            <p className="text-[15px] font-semibold text-ink">{realHours != null ? `${fmt(realHours)} hs` : <span className="text-ink-soft">sin cargar</span>}</p>
            {realHours != null && dept.hoursWorked > 0 && (
              <p className={cn('text-[10.5px]', realHours >= dept.hoursWorked ? 'text-ok' : 'text-danger')}>
                {realHours >= dept.hoursWorked ? 'sobre' : 'bajo'} la capacidad normal · {(((realHours - dept.hoursWorked) / dept.hoursWorked) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Operarios individuales — solo si el modelo los tiene (extensión) */}
      {dept.operators && dept.operators.length > 0 && (
        <Section title="Detalle por operario">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[10px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-1.5 text-left"><Users className="mr-1 inline size-3" />Operario</th>
                  <th className="px-3 py-1.5 text-left">Categoría</th>
                  <th className="px-3 py-1.5 text-right">Banco de horas</th>
                  <th className="px-3 py-1.5 text-right">Ausentismo (días)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dept.operators.map((o, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-ink">{o.name}</td>
                    <td className="px-3 py-1.5 text-ink-soft">{o.category ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right text-ink">{fmt(o.bankedHours)}</td>
                    <td className="px-3 py-1.5 text-right text-ink">{fmt(o.individualAbsenceDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

/**
 * "¿De dónde salió este porcentaje?" — el desglose del índice, plegado por
 * defecto para no tapar la lista, disponible de un click. El índice es de la
 * estructura (uno solo para todos los departamentos), por eso va acá arriba.
 */
function ItcsBreakdownDisclosure({ config, directLabor }: { config: DirectLaborConfig; directLabor: DetailMOD }) {
  const [open, setOpen] = useState(false);
  const breakdown = buildItcsBreakdown(config.itcs, directLabor);

  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="text-[12.5px] font-medium text-ink">
          Ver de dónde sale el {formatItcsPercent(directLabor.itcsPercent)} de cargas sociales
          {breakdown.onlyUnavoidableApplies && (
            <span className="ml-2 rounded-full border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-warn">
              Configuraste todo en cero
            </span>
          )}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <ItcsBreakdownPanel breakdown={breakdown} />
        </div>
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
function MiniStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-alt/40 px-3 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-[14px] font-semibold text-ink">{value}</p>
      {hint && <p className="text-[10px] text-ink-soft">{hint}</p>}
    </div>
  );
}
