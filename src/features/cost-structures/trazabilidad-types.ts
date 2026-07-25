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

export interface RunSummary {
  id: string;
  runN: number;
  engineVersion: string;
  executedBy: string;
  executedAt: string;
  grossMargin: number | null;
  grossMarginPct: number | null;
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

export interface DataPointTrace {
  id: string;
  label: string;
  display: string;
  status: DataStatus;
  signedBy: { name: string; role: string; at: string } | null;
  fields: TraceField[];
  periods: { hecho: string | null; captacion: string; imputado: string | null };
  evidence: { kind: string; reference: string; fileUrl: string | null } | null;
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
