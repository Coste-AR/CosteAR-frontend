/** Tipos de la API de CosteAR (espejo del backend). */

/**
 * El RITMO de costeo de la empresa: cada cuánto cierra un período.
 * No toda empresa costea por mes; hay quienes cierran por quincena o por trimestre.
 */
export type Periodicity = 'MONTHLY' | 'BIWEEKLY' | 'QUARTERLY';

export const PERIODICITY_OPTIONS: { value: Periodicity; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual — cierra todos los meses' },
  { value: 'BIWEEKLY', label: 'Quincenal — cierra cada 15 días' },
  { value: 'QUARTERLY', label: 'Trimestral — cierra cada 3 meses' },
];

export const PERIODICITY_LABEL: Record<Periodicity, string> = {
  MONTHLY: 'Mensual',
  BIWEEKLY: 'Quincenal',
  QUARTERLY: 'Trimestral',
};

/**
 * La CONDICIÓN DE LA EMPRESA FRENTE AL IVA. No es un dato administrativo: es lo
 * que decide qué importe de cada comprobante entra al costo.
 *
 * Cátedra, Clase 4 ("Materia prima — costo de adquisición, desperdicio y lote
 * económico"), línea 27: "IVA: solo aplica si la empresa es responsable no
 * inscripta o monotributista; si es responsable inscripta, el IVA no forma
 * parte del costo de adquisición".
 */
export type CondicionIva = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO';

export const CONDICION_IVA_OPTIONS: { value: CondicionIva; label: string }[] = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto — el IVA no es costo, se costea sobre el neto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo — el IVA sí es costo, se costea sobre el total' },
  { value: 'EXENTO', label: 'Exento / No inscripto — el IVA sí es costo, se costea sobre el total' },
];

export const CONDICION_IVA_LABEL: Record<CondicionIva, string> = {
  RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
  MONOTRIBUTO: 'Monotributo',
  EXENTO: 'Exento / No inscripto',
};

/** La explicación contable, con la cita de la cátedra, para mostrar bajo el campo. */
export const CONDICION_IVA_AYUDA =
  'Define si el IVA de cada comprobante entra al costo. Según la cátedra: ' +
  '"el IVA solo aplica si la empresa es responsable no inscripta o monotributista; ' +
  'si es responsable inscripta, el IVA no forma parte del costo de adquisición". ' +
  'Un Responsable Inscripto recupera el IVA como crédito fiscal, así que se costea ' +
  'sobre el NETO; un monotributista o un exento no lo recupera, así que se costea ' +
  'sobre el TOTAL. Elegir mal cambia cada línea de costo entre un 10,5 % y un 21 %.';

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  cuit: string | null;
  isActive: boolean;
  createdAt: string;
  periodicity: Periodicity;
  condicionIva: CondicionIva;
  /** La IA vio indicios de que la condición declarada no es la real. */
  condicionIvaRevisar?: boolean;
  condicionIvaRevisarNota?: string | null;
  condicionIvaRevisarAt?: string | null;
  _count?: { costStructures: number };
}

export interface CostStructure {
  id: string;
  companyId: string;
  productName: string;
  period: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  costingSystem?: 'ORDERS' | 'PROCESSES';
  rawMaterialConfig: unknown | null;
  directLaborConfig: unknown | null;
  indirectCostConfig: unknown | null;
  salesUnitPrice: string | null;
  /** Unidades VENDIDAS (facturación y margen). */
  salesQuantity: string | null;
  /** Unidades PRODUCIDAS (costo unitario). Si es null, se usan las vendidas. */
  productionQuantity: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface CalculationResult {
  rawMaterialConsumed: number;
  directLaborTotal: number;
  indirectCostsApplied: number;
  productionCost: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPct: number;
  detail: {
    rawMaterial: { optimalLot: number; finalStockQty: number; finalStockValue: number };
    directLabor: {
      workingDays: number;
      paidDays?: number;
      itcsPercent: number;
      iapPercent: number;
      hourlyRates: Record<string, number>;
      itcsBreakdown?: { certain: number; uncertainRemunerative: number; derived: number; uncertainNonRemunerative: number };
      departments?: Array<{
        name: string;
        basicRemuneration: number;
        socialChargesCost: number;
        totalMod: number;
        hourlyRate: number;
        budgetedHours: number;
        realHours?: number;
      }>;
    };
    indirectCosts: {
      perDepartment: Record<
        string,
        {
          cipTotal: number;
          appliedCip: number;
          budgetVariance: number;
          volumeVariance: number;
          normalCapacity?: number;
          actualActivity?: number;
          quota?: number;
          actualCip?: number;
          budgetFixed?: number;
          budgetVariable?: number;
          quotaFixed?: number;
          quotaVariable?: number;
          overUnderApplied?: number;
          /** E3 — faltan datos de cierre (actividad real y/o CIP real): las
           *  variaciones no se calculan y el CIF se aplica a capacidad normal. */
          pendingClosing?: boolean;
          appliedOn?: 'actualActivity' | 'normalCapacity';
        }
      >;
    };
    // Costo unitario de producción — el número final del sistema de costos.
    // Opcional: los cálculos guardados antes de esta versión no lo tienen.
    unitCost?: {
      unitsProduced: number;
      unitProductionCost: number;
      unitCostOfGoodsSold: number;
    };
  };
}

/**
 * El resultado de un cálculo, sea cual sea el sistema de costeo (U03).
 *
 * `CalculationResult` (arriba) es y sigue siendo el de ÓRDENES: no se tocó, así
 * que todo el código que ya lo consume compila igual. Costeo por Procesos tiene
 * otra forma —costo por departamento, no por elemento del producto— y no se
 * puede meter a la fuerza en la misma interfaz sin llenarla de campos opcionales
 * que no aplican nunca.
 *
 * `costingSystem` es el discriminante. Es OPCIONAL en la rama de Órdenes porque
 * los cálculos guardados antes de que existiera Procesos no lo traen: sin eso,
 * un resultado viejo dejaría de tipar.
 */
export type AnyCalculationResult =
  | (CalculationResult & { costingSystem?: 'ORDERS' })
  | (import('@/features/cost-structures/process-costing-types').ProcessCalculationResult & {
      costingSystem: 'PROCESSES';
    });

/** Estrecha el resultado a Procesos sin castear a mano en cada pantalla. */
export function isProcessResult(
  result: AnyCalculationResult,
): result is import('@/features/cost-structures/process-costing-types').ProcessCalculationResult & {
  costingSystem: 'PROCESSES';
} {
  return result.costingSystem === 'PROCESSES';
}

export interface CostCalculation {
  id: string;
  costStructureId: string;
  rawMaterialConsumed: string;
  directLaborTotal: string;
  indirectCostsApplied: string;
  productionCost: string;
  costOfGoodsSold: string;
  grossMargin: string;
  grossMarginPct: string;
  detail: CalculationResult['detail'];
  calculatedAt: string;
}

export interface Alert {
  id: string;
  type: 'MARGIN_BELOW_THRESHOLD' | 'MACRO_CHANGE' | 'COST_SPIKE';
  message: string;
  threshold: string | null;
  actualValue: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AlertSetting {
  marginThresholdPct: string;
  emailNotifications: boolean;
}

export interface MacroSnapshot {
  id: string;
  source: 'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA';
  indicatorCode: string;
  value: string;
  effectiveDate: string;
}
