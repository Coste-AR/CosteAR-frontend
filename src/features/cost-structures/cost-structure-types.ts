/**
 * Tipos de configuración de estructura de costos.
 * Espejo del schema de Zod del backend (cost.schema.ts).
 */

export interface WilsonConfig {
  annualDemand: number;
  orderCost: number;
  holdingRate: number;
  unitCost: number;
}

export interface StockMovement {
  date: string;
  type: 'purchase' | 'consumption';
  detail: string;
  quantity: number;
  unitCost?: number;
}

export interface RawMaterialConfig {
  // Identidad de mercado (criterio C). Opcionales por retrocompat con la MP única.
  id?: string;
  code?: string;
  name?: string;
  unit?: string;
  supplier?: string;
  wilson: WilsonConfig;
  stockPolicy: {
    minConsumption: number;
    maxConsumption: number;
    minLeadTime: number;
    maxLeadTime: number;
    safetyStock: number;
  };
  initialStock: { quantity: number; unitCost: number };
  movements: StockMovement[];
}

/** Sección de Materia Prima: N materias primas por estructura (Parte 3.1). */
export interface RawMaterialSection {
  materials: RawMaterialConfig[];
}

/** Normaliza la forma legada (MP única plana) o la nueva ({materials}) a lista. */
export function toMaterialsList(cfg: unknown): RawMaterialConfig[] {
  if (cfg && typeof cfg === 'object') {
    const o = cfg as Record<string, unknown>;
    if (Array.isArray(o.materials)) return o.materials as RawMaterialConfig[];
    if ('wilson' in o) return [o as unknown as RawMaterialConfig];
  }
  return [];
}

export interface DirectLaborConfig {
  workingDays: {
    totalDaysPerYear: number;
    unpaidAbsence: {
      sundays: number;
      saturdays: number;
      unjustifiedAbsences: number;
      holidaysOnWeekend: number;
    };
    paidAbsence: {
      holidays: number;
      vacations: number;
      sickness: number;
      specialLeaves: number;
      workAccidents: number;
    };
  };
  itcs: {
    derivationBase: number;
    fixedArt: number;
    sacFraction?: number;
    uncertainRemunerative: Array<{ name: string; coefficient: number }>;
    uncertainNonRemunerative: Array<{ name: string; coefficient: number }>;
  };
  departments: Array<{
    name: string;
    basicRemuneration: number;
    hoursWorked: number; // HORAS PAGADAS — presencia en fábrica (cátedra, Clase 10)
    productiveHours?: number; // HORAS NETAS PRODUCTIVAS = presencia − tiempos perdidos informados
    realHours?: number; // dato real de fin de mes (no afecta el cálculo)
    operators?: Array<{ name: string; category?: string; bankedHours?: number; individualAbsenceDays?: number }>;
  }>;
}

/**
 * Un PAR EXPLÍCITO del reparto secundario (F01-B): a qué centro DESTINO va y
 * cuánto (base fija y variable). Espeja `SecondaryDistributionPair` del backend
 * (`cost.schema.ts`). El id del destino viaja SIEMPRE con el valor.
 */
export interface SecondaryDistributionPair {
  centroDestinoId: string;
  fijo: number;
  variable: number;
}

export interface IndirectCostConfig {
  centers: Array<{ id: string; name: string; type: 'productive' | 'service' }>;
  concepts: Array<{
    name: string;
    amount: { fixed: number; variable: number };
    distribution: Record<string, number>;
    // Cómo se arma el prorrateo primario: 'percent' (% tipeados, default) o
    // 'base' (el motor deriva los % desde las unidades de una base física).
    allocationMode?: 'direct' | 'percent' | 'base';
    baseCode?: string;
  }>;
  serviceDistributions: Array<{
    serviceCenterId: string;
    // Cómo se arma el reparto: 'manual' (% tipeados) o 'base' (el motor deriva
    // los % desde las unidades de una base física, ej. horas-máquina).
    distributionMode?: 'manual' | 'base';
    baseCode?: string;
    // CONTRATO F01-B — PARES EXPLÍCITOS: cada valor viaja con el id del centro
    // DESTINO. Reemplaza a los Records posicionales `toProductive*`: así la
    // posición de la columna ya no decide a qué centro va el valor (era el bug
    // del prorrateo secundario). El backend (F01-A) espera y devuelve esta forma.
    distributions: SecondaryDistributionPair[];
  }>;
  productiveSettings: Array<{
    centerId: string;
    budget: { fixed: number; variable: number };
    normalCapacity: number;
    actualActivity: number;
    actualCip: number;
  }>;
  // Orden de cierre del prorrateo secundario escalonado (Parte 4.4). Se deriva
  // del orden de las filas de "distribución de servicios": el primero cierra
  // primero y un servicio puede repartir a otro que aún no cerró.
  closureOrder?: string[];
}
