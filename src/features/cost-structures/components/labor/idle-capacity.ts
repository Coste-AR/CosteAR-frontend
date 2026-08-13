/**
 * CAPACIDAD OCIOSA de la hoja de Mano de Obra (Clase 10 de la cátedra).
 *
 * El costista carga hasta tres horas por departamento:
 *   · HORAS PAGADAS — «presencia en fábrica»: las horas por las que la empresa
 *     paga, trabaje o no el operario.
 *   · HORAS NETAS PRODUCTIVAS = presencia en fábrica − tiempos perdidos
 *     informados.
 *   · TIEMPO ESTÁNDAR DE PRODUCCIÓN: las horas que, según la oficina técnica,
 *     debería haber llevado producir lo que se produjo.
 *
 * De ahí salen los DOS TIPOS DE IMPRODUCTIVIDAD de la cátedra, y solo esos dos:
 *
 *     Presencia en fábrica
 *   − Tiempos perdidos informados   ← tipo 1 (corte de luz, rotura de máquina,
 *   = Horas netas productivas          falta de material, descanso…)
 *   − Tiempo estándar de producción
 *   = Improductividad oculta        ← tipo 2 (surge del análisis del contador)
 *
 * Las horas ociosas son la suma de los dos. NO es el ausentismo pago del
 * IAP/ITCS —ese cubre las AUSENCIAS PAGAS (vacaciones, enfermedad, feriados),
 * donde el operario no está en planta—. Los dos conviven.
 *
 * Este módulo NO decide nada ni recalcula la tarifa. Cuando hay cálculo
 * persistido, la fuente de verdad es el motor: se lee `detail.directLabor.
 * idleCapacity` tal cual viene, con su desglose y su cartel ya armados. Sin
 * cálculo todavía, se arma la parte de HORAS con lo que el costista tipeó, para
 * que la hoja muestre algo mientras carga.
 *
 * RETROCOMPATIBILIDAD: una estructura que solo tiene horas pagadas no declara
 * ociosidad. `anyDeclared` y `hasIdleCapacity` quedan en `false`, las horas
 * productivas son las pagadas y el costo ocioso es cero exacto — igual que
 * antes de que existiera este cálculo. La pantalla no muestra nada nuevo.
 */

import type { DirectLaborConfig } from '../../cost-structure-types';
import type { CalculationResult } from '@/lib/types';

type DetailMOD = CalculationResult['detail']['directLabor'];
type IdleFromEngine = NonNullable<DetailMOD['idleCapacity']>;

/**
 * DESTINO CONTABLE VIGENTE del costo de la capacidad ociosa.
 *
 * Espeja `DESTINO_COSTO_CAPACIDAD_OCIOSA` del backend, hoy
 * `'perdida-del-periodo'`: el costo ocioso NO integra el costo del producto; va
 * al estado de resultados como otro egreso. Es lo que manda la cátedra (Clase
 * 10: «es una pérdida de la empresa, no un costo del producto»).
 *
 * Un cálculo guardado ANTES de esa decisión trae su propio `destination`: se usa
 * el de él, no este, para no contarle al costista una historia distinta de la
 * que produjo los números que está mirando.
 */
export type DestinoCostoOcioso = 'absorbido-en-el-producto' | 'perdida-del-periodo';
export const DESTINO_COSTO_OCIOSO_VIGENTE: DestinoCostoOcioso = 'perdida-del-periodo';

export type TipoImproductividad = 'tiempos-perdidos-informados' | 'improductividad-oculta';

/** Un tipo de improductividad, valorizado. Espeja `IdleCapacityBucket`. */
export interface IdleCapacityBucket {
  tipo: TipoImproductividad;
  label: string;
  hours: number;
  cost: number;
  reasons: Array<{ reason: string; hours: number; cost: number }>;
}

export interface IdleCapacityAlert {
  level: 'advertencia' | 'critico';
  title: string;
  message: string;
  cost: number;
  sharePercent: number;
}

export interface IdleCapacityDepartmentLine {
  name: string;
  /** Horas pagadas — presencia en fábrica. */
  paidHours: number;
  /** Horas netas productivas = presencia − tiempos perdidos informados. */
  productiveHours: number;
  /** Tiempo estándar declarado, o `undefined` si no se cargó. */
  standardHours?: number;
  /** Horas imputables a las órdenes = netas productivas − improductividad oculta. */
  chargeableHours: number;
  /** Horas perdidas informadas = presencia − netas productivas. */
  informedLostHours: number;
  /** Improductividad oculta = netas productivas − tiempo estándar. */
  hiddenIdleHours: number;
  /** Horas ociosas totales (informadas + ocultas). Nunca negativa. */
  idleHours: number;
  /** `true` si el departamento declaró horas netas productivas. */
  declared: boolean;
  /** `true` si además tiene horas ociosas de algún tipo. */
  hasIdleCapacity: boolean;
  /**
   * Se declararon MÁS horas productivas que pagadas: no se puede producir más
   * de lo que se paga. El motor recorta al valor de las pagadas.
   */
  exceedsPaidHours: boolean;
  /** Costo total de MOD del departamento. `undefined` sin cálculo persistido. */
  totalMod?: number;
  /** Costo de la capacidad ociosa = costo total × horas ociosas ÷ horas pagadas. */
  idleCost?: number;
  /** Costo de MOD imputable a las órdenes = costo total − costo ocioso. */
  applicableMod?: number;
}

export interface IdleCapacitySummary {
  departments: IdleCapacityDepartmentLine[];
  /** Σ horas pagadas. */
  paidHours: number;
  /** Σ horas netas productivas. */
  productiveHours: number;
  /** Σ horas imputables a las órdenes. */
  chargeableHours: number;
  /** Σ horas ociosas. */
  idleHours: number;
  /** Peso de las horas ociosas sobre la presencia pagada, en porcentaje. */
  idleSharePercent: number;
  /** Costo COMPLETO de mano de obra. `undefined` sin cálculo persistido. */
  fullMod?: number;
  /** Costo de la capacidad ociosa, aislado. */
  idleCost?: number;
  /** Costo de MOD imputable a las órdenes. */
  applicableMod?: number;
  /** La pérdida abierta por TIPO DE IMPRODUCTIVIDAD. Vacío si no hay ociosidad. */
  breakdown: IdleCapacityBucket[];
  /** Cartel del motor. `null` sin ociosidad o sin cálculo todavía. */
  alert: IdleCapacityAlert | null;
  /** Al menos un departamento cargó horas netas productivas. */
  anyDeclared: boolean;
  /** Al menos un departamento tiene horas ociosas. */
  hasIdleCapacity: boolean;
  /** Algún departamento declaró más horas productivas que pagadas. */
  hasExceeded: boolean;
  /** Destino contable con el que se produjo ESTE resultado. */
  destination: DestinoCostoOcioso;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

const isDeclared = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

/**
 * Arma la capacidad ociosa de la hoja a partir de la configuración cargada y,
 * si existe, del cálculo persistido.
 *
 * Los IMPORTES y el DESGLOSE POR TIPO salen del motor cuando están: el front no
 * reparte pesos por su cuenta. Si el cálculo es viejo y no los trae, se cae al
 * reparto proporcional —el mismo que hace el motor— para no dejar la línea en
 * blanco.
 */
export function buildIdleCapacity(
  config: Pick<DirectLaborConfig, 'departments'> | undefined,
  directLabor?: DetailMOD,
): IdleCapacitySummary {
  const desdeElMotor: IdleFromEngine | undefined = directLabor?.idleCapacity;

  const departments: IdleCapacityDepartmentLine[] = (config?.departments ?? []).map((d, i) => {
    // Los importes se emparejan por posición, como en el resto de la hoja, pero
    // si el nombre no coincide (la config se editó después de calcular) se busca
    // por nombre antes de atribuirle a un departamento el costo de otro.
    const atIndex = directLabor?.departments?.[i];
    const data =
      atIndex && (!d.name || atIndex.name === d.name)
        ? atIndex
        : (directLabor?.departments?.find((x) => x.name === d.name) ?? atIndex);
    const paidHours = num(d.hoursWorked);
    const declared = isDeclared(d.productiveHours);
    // Nunca más productivas que pagadas: el motor recorta el exceso en vez de
    // generar horas ociosas negativas.
    const raw = declared ? num(d.productiveHours) : paidHours;
    const exceedsPaidHours = declared && raw > paidHours;
    const productiveHours = Math.min(raw, paidHours);
    const informedLostHours = Math.max(paidHours - productiveHours, 0);

    // Tiempo estándar: sin dato no hay improductividad oculta. Por encima de las
    // netas productivas tampoco (se trabajó mejor que el estándar).
    const standardDeclared = isDeclared(d.standardHours);
    const standardHours = standardDeclared
      ? Math.min(Math.max(num(d.standardHours), 0), productiveHours)
      : undefined;
    const hiddenIdleHours = standardHours === undefined ? 0 : productiveHours - standardHours;

    const idleHours = informedLostHours + hiddenIdleHours;
    const chargeableHours = Math.max(paidHours - idleHours, 0);

    const totalMod = data?.totalMod;
    // Con horas ociosas en cero el factor es cero exacto: el costo ocioso es
    // cero y el imputable queda idéntico al total. De ahí la retrocompat.
    const idleCost =
      totalMod == null ? undefined : paidHours > 0 ? (totalMod * idleHours) / paidHours : 0;
    const applicableMod =
      totalMod == null || idleCost == null ? undefined : totalMod - idleCost;

    return {
      name: d.name || `Departamento ${i + 1}`,
      paidHours,
      productiveHours,
      standardHours,
      chargeableHours,
      informedLostHours,
      hiddenIdleHours,
      idleHours,
      declared,
      hasIdleCapacity: idleHours > 0,
      exceedsPaidHours,
      totalMod,
      idleCost,
      applicableMod,
    };
  });

  const sum = (pick: (l: IdleCapacityDepartmentLine) => number) =>
    departments.reduce((acc, l) => acc + pick(l), 0);

  const paidHours = sum((l) => l.paidHours);
  const idleHours = sum((l) => l.idleHours);
  const withMoney = departments.filter((l) => l.totalMod != null);
  const anyMoney = withMoney.length > 0;

  // El motor manda cuando habló: sus importes son los que produjeron el estado
  // de costos que el costista está mirando.
  const fullMod = desdeElMotor?.fullMod
    ?? (anyMoney ? withMoney.reduce((a, l) => a + (l.totalMod ?? 0), 0) : undefined);
  const idleCost = desdeElMotor?.idleCost
    ?? (anyMoney ? withMoney.reduce((a, l) => a + (l.idleCost ?? 0), 0) : undefined);
  const applicableMod = desdeElMotor?.applicableMod
    ?? (anyMoney ? withMoney.reduce((a, l) => a + (l.applicableMod ?? 0), 0) : undefined);

  return {
    departments,
    paidHours,
    productiveHours: sum((l) => l.productiveHours),
    chargeableHours: sum((l) => l.chargeableHours),
    idleHours,
    idleSharePercent: paidHours > 0 ? (idleHours / paidHours) * 100 : 0,
    fullMod,
    idleCost,
    applicableMod,
    breakdown: desdeElMotor?.breakdown ?? breakdownDesdeLasHoras(departments),
    alert: desdeElMotor?.alert ?? null,
    anyDeclared: departments.some((l) => l.declared),
    hasIdleCapacity: departments.some((l) => l.hasIdleCapacity),
    hasExceeded: departments.some((l) => l.exceedsPaidHours),
    destination: desdeElMotor?.destination ?? DESTINO_COSTO_OCIOSO_VIGENTE,
  };
}

/**
 * Desglose de respaldo: mismas dos categorías de la cátedra, armadas solo con
 * las horas cargadas, para que la hoja muestre el detalle mientras el costista
 * todavía no calculó. Los pesos quedan en cero hasta que el motor los diga.
 */
function breakdownDesdeLasHoras(departments: IdleCapacityDepartmentLine[]): IdleCapacityBucket[] {
  const totales: Array<{ tipo: TipoImproductividad; label: string; hours: number; cost: number }> = [
    {
      tipo: 'tiempos-perdidos-informados',
      label: 'Tiempos perdidos informados',
      hours: departments.reduce((a, d) => a + d.informedLostHours, 0),
      cost: departments.reduce(
        (a, d) => a + (d.totalMod != null && d.paidHours > 0
          ? (d.totalMod * d.informedLostHours) / d.paidHours
          : 0),
        0,
      ),
    },
    {
      tipo: 'improductividad-oculta',
      label: 'Improductividad oculta',
      hours: departments.reduce((a, d) => a + d.hiddenIdleHours, 0),
      cost: departments.reduce(
        (a, d) => a + (d.totalMod != null && d.paidHours > 0
          ? (d.totalMod * d.hiddenIdleHours) / d.paidHours
          : 0),
        0,
      ),
    },
  ];
  return totales.filter((t) => t.hours > 0).map((t) => ({ ...t, reasons: [] }));
}

/** Horas en formato argentino, sin decimales inútiles. */
export const formatHours = (n: number | undefined) =>
  n == null
    ? '—'
    : `${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} hs`;
