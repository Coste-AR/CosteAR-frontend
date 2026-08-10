/**
 * CAPACIDAD OCIOSA de la hoja de Mano de Obra (Clase 10 de la cátedra).
 *
 * El costista carga dos horas por departamento:
 *   · HORAS PAGADAS — «presencia en fábrica»: las horas por las que la empresa
 *     paga, trabaje o no el operario.
 *   · HORAS NETAS PRODUCTIVAS = presencia en fábrica − tiempos perdidos
 *     informados. Son las únicas horas imputables a las órdenes.
 *
 * La diferencia son las HORAS OCIOSAS: el operario está en planta y cobra, pero
 * no hay trabajo que asignarle. NO es el ausentismo pago del IAP/ITCS —ese cubre
 * las AUSENCIAS PAGAS (vacaciones, enfermedad, feriados), donde el operario no
 * está en planta—. Los dos conviven.
 *
 * Este módulo NO decide nada ni recalcula la tarifa: lee lo que ya cargó el
 * costista y lo que ya devolvió el motor, y arma la línea de ociosidad para
 * poder mostrarla aparte, nunca disuelta en las órdenes. Espeja
 * `DepartmentIdleCapacityResult` y `DirectLaborIdleCapacityResult` del backend
 * (`domain/calculations/direct-labor.ts`).
 *
 * RETROCOMPATIBILIDAD: una estructura que solo tiene horas pagadas no declara
 * ociosidad. `anyDeclared` y `hasIdleCapacity` quedan en `false`, las horas
 * productivas son las pagadas y el costo ocioso es cero exacto — igual que
 * antes de que existiera este cálculo. La pantalla no muestra nada nuevo.
 */

import type { DirectLaborConfig } from '../../cost-structure-types';
import type { CalculationResult } from '@/lib/types';

type DetailMOD = CalculationResult['detail']['directLabor'];

/**
 * DESTINO CONTABLE VIGENTE del costo de la capacidad ociosa.
 *
 * Espeja `DESTINO_COSTO_CAPACIDAD_OCIOSA` del backend, que hoy vale
 * `'absorbido-en-el-producto'`: el costo total de mano de obra que entra al
 * estado de costos sigue siendo el completo, con la ociosidad adentro. La
 * cátedra (Clase 10) la trata como una pérdida de la empresa y no como un costo
 * del producto; cuál de los dos tratamientos queda es una decisión de producto
 * todavía abierta. Acá solo se informa cuál rige hoy.
 */
export type DestinoCostoOcioso = 'absorbido-en-el-producto' | 'perdida-del-periodo';
export const DESTINO_COSTO_OCIOSO_VIGENTE: DestinoCostoOcioso = 'absorbido-en-el-producto';

export interface IdleCapacityDepartmentLine {
  name: string;
  /** Horas pagadas — presencia en fábrica. */
  paidHours: number;
  /** Horas netas productivas — las únicas imputables a las órdenes. */
  productiveHours: number;
  /** Horas ociosas = presencia − netas productivas. Nunca negativa. */
  idleHours: number;
  /** `true` si el departamento declaró horas netas productivas. */
  declared: boolean;
  /** `true` si además esas horas productivas son menores que las pagadas. */
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
  /** Al menos un departamento cargó horas netas productivas. */
  anyDeclared: boolean;
  /** Al menos un departamento tiene horas ociosas. */
  hasIdleCapacity: boolean;
  /** Algún departamento declaró más horas productivas que pagadas. */
  hasExceeded: boolean;
  /** Destino contable vigente del costo ocioso. */
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
 * si existe, del cálculo persistido (de ahí salen los pesos). El front no
 * recalcula la tarifa: reparte el costo total del departamento entre horas
 * ociosas y horas imputables con la misma proporción que usa el motor.
 */
export function buildIdleCapacity(
  config: Pick<DirectLaborConfig, 'departments'> | undefined,
  directLabor?: DetailMOD,
): IdleCapacitySummary {
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
    const idleHours = Math.max(paidHours - productiveHours, 0);

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

  return {
    departments,
    paidHours,
    productiveHours: sum((l) => l.productiveHours),
    idleHours,
    idleSharePercent: paidHours > 0 ? (idleHours / paidHours) * 100 : 0,
    fullMod: anyMoney ? withMoney.reduce((a, l) => a + (l.totalMod ?? 0), 0) : undefined,
    idleCost: anyMoney ? withMoney.reduce((a, l) => a + (l.idleCost ?? 0), 0) : undefined,
    applicableMod: anyMoney ? withMoney.reduce((a, l) => a + (l.applicableMod ?? 0), 0) : undefined,
    anyDeclared: departments.some((l) => l.declared),
    hasIdleCapacity: departments.some((l) => l.hasIdleCapacity),
    hasExceeded: departments.some((l) => l.exceedsPaidHours),
    destination: DESTINO_COSTO_OCIOSO_VIGENTE,
  };
}

/** Horas en formato argentino, sin decimales inútiles. */
export const formatHours = (n: number | undefined) =>
  n == null
    ? '—'
    : `${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} hs`;
