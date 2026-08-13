/** Tipos de la API de Trazabilidad Total v1 (espejo de trazabilidad.routes.ts del backend). */

export type SourceArea = 'deposito' | 'contaduria' | 'planta' | 'comercial' | 'costista' | 'sistema';
export type CaptureMethod = 'manual' | 'portal_operador' | 'ia_sugerido' | 'excel_import' | 'calculado';
export type CostElement = 'MP' | 'MOD' | 'CIP' | 'VENTA';
export type DataStatus = 'borrador' | 'validado' | 'aplicado' | 'anulado';

export interface TreeNode {
  id: string;
  label: string;
  formula: string | null;
  value: number | null;
  unit: string | null;
  sourceDpVersionIds: string[];
  children: TreeNode[];
}

export interface CalculationTree {
  runId: string;
  runN: number;
  engineVersion: string;
  tree: TreeNode[];
}

/** Qué disparó una corrida. `AUTO_DAILY` es el recálculo diario del sistema. */
export type RunTrigger = 'MANUAL' | 'AUTO_DAILY' | 'CLOSE';

export interface RunSummary {
  id: string;
  runN: number;
  engineVersion: string;
  /**
   * En las automáticas el backend manda "Cálculo automático del sistema", no el
   * nombre del dueño de la estructura: no la apretó él.
   */
  executedBy: string;
  executedAt: string;
  trigger: RunTrigger;
  /** true = un humano la miró y la dio por buena. */
  validated: boolean;
  validatedAt: string | null;
  periodo: { code: string; label: string } | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
}

/**
 * El resultado que vale hoy. Si nadie validó todavía, `provisorio` viene en true
 * y `run` trae igual la última corrida automática: no es lo mismo "no hay datos"
 * que "hay datos que nadie miró".
 */
export interface ResultadoVigente {
  provisorio: boolean;
  motivo?: string;
  run: RunSummary | null;
}

export type LateDataChoice = 'CURRENT_PERIOD' | 'REOPEN' | 'DISCARD';

export interface LateDataOption {
  choice: LateDataChoice;
  etiqueta: string;
  /** Qué pasa si elijo esto. Se muestra ANTES de apretar, no después. */
  consecuencia: string;
  disponible: boolean;
}

/** Un dato que llegó para un período ya cerrado y espera decisión. */
export interface LateDataDecision {
  id: string;
  dato: { id: string; nombre: string; fecha: string | null };
  producto: string;
  periodoCerrado: string;
  periodoAbierto: string | null;
  detectadoEl: string;
  opciones: LateDataOption[];
}

export interface TraceField {
  key: string;
  value: number | null;
  unit: string | null;
  by: { name: string; role: string; area: string };
  at: string;
  method: CaptureMethod;
  device: string | null;
}

export interface TraceVersion {
  n: number;
  current: boolean;
  display: string;
  reason: string | null;
  by: string;
  at: string;
}

/**
 * Los seis tipos de comprobante del manual (espejo de `evidenceKindSchema` del
 * backend). Cerrado a propósito: el tipo es lo primero que mira quien audita.
 */
export type EvidenceKind = 'factura' | 'contrato' | 'remito' | 'acta' | 'lista_precios' | 'asiento';

/** Cómo se le nombra cada tipo al costista. Nunca se muestra la clave cruda. */
export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  factura: 'Factura',
  contrato: 'Contrato',
  remito: 'Remito',
  acta: 'Acta',
  lista_precios: 'Lista de precios',
  asiento: 'Asiento contable',
};

/**
 * Qué pasó con el archivo del comprobante.
 *
 * `sin-archivo` NO es un error: el manual admite el comprobante por referencia
 * ("NULL si es referencia sin archivo"). `no-se-pudo-guardar` sí es algo que
 * hay que contarle al costista — el comprobante quedó registrado, pero el
 * archivo no, y "Ver comprobante" no va a estar.
 */
export type EstadoArchivoComprobante = 'guardado' | 'sin-archivo' | 'no-se-pudo-guardar';

/** El comprobante tal como lo devuelve el alta (POST /evidence). */
export interface EvidenceCreated {
  id: string;
  kind: EvidenceKind;
  reference: string;
  counterparty: string | null;
  fileUrl: string | null;
  uploadedAt: string;
  archivo: EstadoArchivoComprobante;
  aviso: string | null;
}

/** El comprobante tal como lo muestra la ficha del dato. */
export interface TraceEvidence {
  kind: string;
  reference: string;
  counterparty: string | null;
  fileUrl: string | null;
}

export interface DataPointTrace {
  id: string;
  label: string;
  display: string;
  status: DataStatus;
  signedBy: { name: string; role: string; at: string } | null;
  fields: TraceField[];
  periods: { hecho: string | null; captacion: string; imputado: string | null };
  evidence: TraceEvidence | null;
  versions: TraceVersion[];
  impacts: string[];
}

export interface ImputacionOption {
  periodo: string;
  label: string;
  recommended?: boolean;
}

/**
 * Marca de incompletitud de una corrida (contrato F04, espejo de
 * `calculation-run-service.ts` del backend). Viaja tanto en
 * `results.incompletitud` como suelta en `data.incompleto`. Si `incompleto`
 * es true, el resultado corrió con datos sin decisión de imputación de período
 * y NO es confiable: el front pinta la advertencia en vez de un margen "sano".
 *
 * `datosPendientes[].id` es SOLO para abrir la ficha del dato; lo que se le
 * muestra al costista es siempre el `nombre` humano (regla #6/#7).
 */
export interface Incompletitud {
  incompleto: boolean;
  motivos: string[];
  datosPendientes: { id: string; nombre: string }[];
}

/**
 * Movimiento de MP visto desde el store de trazabilidad (F06). Agrupa los data
 * points hermanos de una compra (cantidad + precio) por `movementId` y expone
 * si el movimiento sigue `pending` (sin decisión de imputación de período).
 * `dataPointIds` son SOLO para imputar en bloque; nunca se le muestran al
 * usuario (regla #6/#7).
 */
export interface MpMovement {
  movementId: string;
  label: string;
  detail: string;
  type: 'purchase' | 'consumption';
  fechaHecho: string | null;
  /** fecha_captación: timestamp del servidor (§3). Read-only, nunca del cliente. */
  fechaCaptacion: string;
  periodoImputado: string | null;
  pending: boolean;
  dataPointIds: string[];
}
