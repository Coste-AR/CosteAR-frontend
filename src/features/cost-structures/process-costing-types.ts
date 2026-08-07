/**
 * CONTRATO DE DATOS DE COSTEO POR PROCESOS (U03).
 *
 * Espeja los DTOs del backend (B14-B17) tal como salen por la API, no como
 * están en la base: los importes ya vienen como `number`, y `null` significa
 * "no cargado" (distinto de 0, que es un valor cargado).
 *
 * Convenciones que vienen del dominio y conviene no olvidar en las pantallas:
 *   · los grados de avance y los porcentajes viajan como FRACCIÓN (0,80 = 80 %);
 *   · `sequence` es la cadena por la que viaja el costo, no un orden de lista;
 *   · todo lo que el usuario carga a mano tiene su `dataPointId` en `traces`,
 *     que es lo que permite abrir la ficha de trazabilidad de esa cifra.
 */

// ── Departamentos (B14) ──────────────────────────────────────────────────────

export interface ProcessDepartment {
  id: string;
  name: string;
  /** 1 = primera etapa. La cadena es siempre continua. */
  sequence: number;
  /** true = mano de obra y carga fabril comparten avance ⇒ una sola columna. */
  defaultConversionAvanceEqualsMO: boolean;
}

export interface ProcessDepartmentList {
  departments: ProcessDepartment[];
  /**
   * La estructura ya tiene cálculos: la cadena no se puede reordenar ni
   * recortar. Sí se puede agregar una etapa al final.
   */
  chainFrozen: boolean;
}

// ── Cuadro de movimiento de unidades (B15) ───────────────────────────────────

/** Los campos que el costista carga a mano. Todos opcionales: el cuadro admite UNA incógnita. */
export interface UnitMovementInput {
  // Entradas (unidades)
  initialWip?: number;
  startedInProduction?: number;
  receivedFromPrevious?: number;
  unitIncrease?: number;
  // Salidas (unidades)
  transferredOut?: number;
  finishedInStock?: number;
  /** % de pérdida normal admitido, como fracción. */
  normalLossPct?: number;
  /** Pérdida real total del período. La extraordinaria se deriva. */
  totalLossReported?: number;
  finalWip?: number;
  // Grados de avance (fracción)
  finalWipMpAvance?: number;
  finalWipConvAvance?: number;
  initialWipMpAvance?: number;
  initialWipConvAvance?: number;
  // Importes del período y de la existencia inicial, por elemento ($)
  periodCostMp?: number;
  periodCostMo?: number;
  periodCostCif?: number;
  initialWipCostMp?: number;
  initialWipCostMo?: number;
  initialWipCostCif?: number;
}

/**
 * De dónde salió el recuento de la existencia FINAL (D7). La cátedra distingue
 * lo que informa la oficina técnica de lo que estima el área de costos: los dos
 * se aceptan, pero no valen lo mismo y el informe tiene que poder decir cuál fue.
 */
export type CountSource = 'TECHNICAL_OFFICE' | 'COSTIST_ESTIMATE' | 'CARRIED_OVER' | 'NOT_COUNTED';

/** Lo persistido, tal cual: `null` = no cargado. */
export interface UnitMovementSaved {
  initialWip: number | null;
  startedInProduction: number | null;
  receivedFromPrevious: number | null;
  unitIncrease: number | null;
  transferredOut: number | null;
  finishedInStock: number | null;
  normalLossPct: number | null;
  normalLoss: number | null;
  totalLossReported: number | null;
  extraordinaryLoss: number | null;
  finalWip: number | null;
  finalWipMpAvance: number | null;
  finalWipConvAvance: number | null;
  initialWipMpAvance: number | null;
  initialWipConvAvance: number | null;
  periodCostMp: number | null;
  periodCostMo: number | null;
  periodCostCif: number | null;
  initialWipCostMp: number | null;
  initialWipCostMo: number | null;
  initialWipCostCif: number | null;
  /** Solo lectura: lo escribe la apertura del período (B18), no el costista. */
  initialWipCostPrevDept: number | null;

  /**
   * Procedencia del recuento, con su fecha y quién lo informó. Solo lectura: lo
   * decide el servidor según quién guardó los grados de avance de la existencia
   * final, no el formulario. `NOT_COUNTED` es el estado real de un mes que
   * abrió el arrastre y cuya existencia final todavía no contó nadie.
   */
  countSource: CountSource | null;
  countedAt: string | null;
  countedByName: string | null;
}

/** El cuadro RESUELTO: con los derivados por diferencia ya calculados. */
export interface UnitMovementResolved {
  initialWip: number;
  startedInProduction: number;
  receivedFromPrevious: number;
  unitIncrease: number;
  /** Unidades que el período pone en juego (base de la pérdida normal). */
  periodUnits: number;
  transferredOut: number;
  finishedInStock: number;
  normalLoss: number;
  extraordinaryLoss: number;
  finalWip: number;
  totalToAccount: number;
  totalAccounted: number;
  /** Σ entran = Σ salen. Si es false, el guardado no debería habilitarse. */
  cuadra: boolean;
}

/** `dataPointId` por campo cargado a mano; `null` si es derivado o no se cargó. */
export type UnitMovementTraces = Record<string, string | null>;

export interface UnitMovementResponse {
  department: string;
  period: string;
  exists: boolean;
  saved: UnitMovementSaved | null;
  resolved: UnitMovementResolved | null;
  traces: UnitMovementTraces;
}

// ── Producción equivalente (B07/B15) ─────────────────────────────────────────

/** MP · MOD · CIP, o MP · CC cuando la conversión va unificada. */
export type ProcessElement = 'MP' | 'MOD' | 'CIP' | 'CC';

export interface EquivalentProductionColumn {
  element: ProcessElement;
  label: string;
  /** Grado de avance de la existencia final para este elemento (fracción). */
  finalWipAvance: number;
  equivalentUnits: number;
}

export interface EquivalentProductionResponse {
  department: string;
  period: string;
  unitsAtFullCompletion: number;
  columns: EquivalentProductionColumn[];
}

// ── Costos conjuntos (B11/B16) ───────────────────────────────────────────────

export type JointAllocationMethod =
  | 'PHYSICAL_UNITS'
  | 'TECHNICAL_YIELD'
  | 'MARKET_VALUE'
  | 'NET_REALIZABLE_VALUE';

export type ByProductKind = 'coproduct' | 'byproduct' | 'waste';

export interface JointProductInput {
  productName: string;
  kind: ByProductKind;
  /** Unidades buenas obtenidas: denominador del costo unitario, siempre > 0. */
  unitsObtained: number;
  /** Rendimiento técnico — método TECHNICAL_YIELD. */
  yieldPct?: number;
  /** Precio de mercado en el punto de separación — MARKET_VALUE y VNR. */
  marketPrice?: number;
  /** Gasto de comercialización variable, como fracción del precio — solo VNR. */
  sellingCostVarPct?: number;
  /** Gasto de comercialización fijo por unidad — solo VNR. */
  sellingCostFixedPerUnit?: number;
  byproductRecognition?: 'at_sale' | 'at_production';
}

export interface JointCostInput {
  deptId: string;
  method: JointAllocationMethod;
  jointCostTotal: number;
  products: JointProductInput[];
}

export interface JointCostLine {
  productName: string;
  unitsObtained: number;
  /** La magnitud con la que este método reparte (unidades, VNR, valor de mercado…). */
  allocationBase: number;
  participationPct: number;
  allocatedCost: number;
  unitCost: number;
}

export interface JointCostResult {
  method: JointAllocationMethod;
  jointCostTotal: number;
  totalAllocated: number;
  lines: JointCostLine[];
}

export interface JointCostResponse {
  department: string;
  period: string;
  exists: boolean;
  /**
   * Lo que quedó GUARDADO, tal cual se cargó. El tipo declaraba solo `method` y
   * `jointCostTotal`, y el servidor siempre mandó también las líneas con sus
   * precios: el tipo escondía datos que ya estaban ahí, y la pantalla —que le
   * creía— rehidrataba desde `result`, que solo tiene nombre y unidades.
   */
  saved: {
    method: JointAllocationMethod;
    jointCostTotal: number;
    products: Array<{
      productName: string;
      kind: ByProductKind;
      unitsObtained: number;
      yieldPct: number | null;
      marketPrice: number | null;
      sellingCostVarPct: number | null;
      sellingCostFixedPerUnit: number | null;
      byproductRecognition: string | null;
    }>;
  } | null;
  result: JointCostResult | null;
  traces: Record<string, string | null> | null;
}

// ── Resultado del cálculo (B17) ──────────────────────────────────────────────

export interface ProcessReportElement {
  element: ProcessElement;
  label: string;
  costoInventarioInicial: number;
  costoDelPeriodo: number;
  costoTotal: number;
  produccionProcesada: number;
  costoUnitario: number;
  unidadesEquivalentesEF: number;
  valuacionEF: number;
}

/** Costo transferido de la etapa previa: costo modificado + CAUP (B09). */
export interface ProcessTransferredCost {
  costoModificado: number;
  caup: number;
  costoTransferido: number;
  unidadesAJustificar: number;
  unidadesBuenas: number;
  costoDeLaPerdida: number;
}

export interface ProcessReport {
  sequence: number;
  /** Sección A del informe — solo en departamentos posteriores al primero. */
  previousDepartment?: {
    costoUnitarioTransferido: number;
    costoTotal: number;
    unidadesEF: number;
    valuacionEF: number;
  };
  elements: ProcessReportElement[];
  costoUnitarioTotalAcumulado: number;
  costoAcumuladoAJustificar: number;
  costoTerminadasYTransferidas: number;
  costoTerminadasEnStock: number;
  costoPerdidasExtraordinarias: number;
  /** La existencia final por diferencia… */
  costoExistenciaFinalPorDiferencia: number;
  totalJustificado: number;
  /** …y por elemento. Los dos caminos tienen que dar lo mismo. */
  valuacionExistenciaFinalPorElemento: number;
  ajustePorRedondeo: number;
}

export interface ProcessDepartmentResult {
  id: string;
  name: string;
  sequence: number;
  conversionUnified: boolean;
  schedule: UnitMovementResolved;
  equivalentProduction: {
    unitsAtFullCompletion: number;
    columns: EquivalentProductionColumn[];
  };
  transferredCost?: ProcessTransferredCost;
  report: ProcessReport;
  jointCost?: JointCostResult;
}

/** Datos sin decisión de imputación (F04): el resultado no es confiable. */
export interface Incompletitud {
  incompleto: boolean;
  motivos: string[];
  datosPendientes: { id: string; nombre: string }[];
}

export interface ProcessCalculationResult {
  departments: ProcessDepartmentResult[];
  /** Costo unitario del ÚLTIMO departamento = costo del producto terminado. */
  finalUnitCost: number;
  finalDepartmentName: string;
  incompletitud?: Incompletitud;
}

export interface ProcessProductionReport {
  product: string;
  period: string;
  finalUnitCost: number;
  finalDepartmentName: string;
  departments: ProcessDepartmentResult[];
}

// ---------------------------------------------------------------------------
// SETUP PREVIO OBLIGATORIO (el "CTO inicial")
//
// Antes de costear por procesos, el cliente declara su mapa productivo. Con eso
// la IA deja de adivinar a qué departamento va cada documento que entra por
// ingesta y solo tiene que adjudicarlo.
// ---------------------------------------------------------------------------

export interface SetupDepartment {
  name: string;
  /** 1 = primer departamento de la cadena. Define quién recibe de quién. */
  sequence: number;
  /** Unidad física de este departamento (H12): "toneladas", "litros", "kg". */
  unit?: string | null;
  /**
   * Cuántas unidades de ESTE departamento produce cada unidad recibida del
   * anterior (ej. 1 tonelada de fruta → 550 litros de jugo ⇒ 550). Solo
   * aplica desde el segundo departamento; el primero no recibe de nadie.
   */
  conversionFromPrevious?: number | null;
}

/** Un operario de la empresa cliente y si puede informar el grado de avance. */
export interface SetupOperario {
  membershipId: string;
  nombre: string;
  email: string;
  informaRecuento: boolean;
}

export interface ProcessSetupState {
  completado: boolean;
  completadoEl: string | null;
  hasJointProducts: boolean;
  /** Cada cuántos días puede la PLANTA contar la producción en proceso. */
  wipCountFrequencyDays: number | null;
  /** Cada cuántos días QUIERE costear el costista (si eligió ciclos fijos). */
  periodLengthDays: number | null;
  departments: (SetupDepartment & { id: string })[];
  operarios: SetupOperario[];
}

/** Lo que se manda a validar o a sellar. */
export interface ProcessSetupInput {
  departments: SetupDepartment[];
  hasJointProducts: boolean;
  wipCountFrequencyDays?: number | null;
  periodLengthDays?: number | null;
  wipReporterMembershipIds?: string[];
}

/** `field` ubica el paso del wizard donde está el problema. */
export interface SetupIssue {
  field: string;
  message: string;
}

/**
 * Los problemas bloquean; los avisos no. La diferencia es deliberada: bloquear
 * lo que es una mala idea pero no un error deja al costista sin salida cuando su
 * caso es legítimo.
 */
export interface ProcessSetupPreview {
  problemas: SetupIssue[];
  avisos: SetupIssue[];
}
