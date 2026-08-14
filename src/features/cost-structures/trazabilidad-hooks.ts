import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePeriods } from './period-hooks';
import type { CalculationResult } from '@/lib/types';
import type {
  CalculationTree,
  RunSummary,
  DataPointTrace,
  SourceArea,
  CaptureMethod,
  CostElement,
  Incompletitud,
  MpMovement,
  ResultadoVigente,
  LateDataDecision,
  LateDataChoice,
  EvidenceKind,
  EvidenceCreated,
} from './trazabilidad-types';

/** Corre el motor con árbol persistido (Trazabilidad Total v1, D.1). Endpoint
 * nuevo y separado del /cost-structures/:id/calculate legado — no lo reemplaza. */
export function useCalculateTraced(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{
        // `incompleto` (F04): marca de datos sin imputar para pintar la
        // advertencia en la pestaña Resultado en vez de un margen "sano".
        // T-07 — `results` es el MISMO objeto que alimentó el árbol y que se
        // persistió en la fila legada: una sola ejecución del motor. Antes esta
        // llamada solo servía para el árbol y los números venían de otra corrida.
        data: {
          runId: string;
          runN: number;
          calculationId: string;
          results: CalculationResult;
          tree: unknown;
          incompleto: Incompletitud;
        };
      }>(`/structures/${structureId}/calculate`, {});
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['structures', structureId, 'runs'] });
      // La fila legada la escribe ahora esta misma corrida, así que el Historial
      // y la Comparación de períodos —que la leen— quedan desactualizados si no
      // se invalidan acá.
      void qc.invalidateQueries({ queryKey: ['cost-structures', structureId, 'calculations'] });
    },
  });
}

export function useCalculationTree(runId: string | null | undefined) {
  return useQuery({
    queryKey: ['calculation-runs', runId, 'tree'],
    queryFn: async () => {
      const res = await api.get<{ data: CalculationTree }>(`/calculation-runs/${runId}/tree`);
      return res.data.data;
    },
    enabled: !!runId,
  });
}

/**
 * Historial de corridas. Trae TODAS por defecto, incluidas las automáticas sin
 * validar: es la vista de trazabilidad y su razón de ser es no esconder nada.
 */
export function useStructureRuns(structureId: string) {
  return useQuery({
    queryKey: ['structures', structureId, 'runs'],
    queryFn: async () => {
      const res = await api.get<{ data: RunSummary[] }>(`/structures/${structureId}/runs`);
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/**
 * La corrida vigente de un (estructura, PERÍODO).
 *
 * Costeo por Procesos calcula siempre contra un período concreto, así que el
 * árbol de derivación no puede salir de un `useState` que se llena cuando
 * alguien aprieta un botón en esta sesión: se pierde al recargar y no aparece
 * nunca si el cálculo se disparó desde otra pantalla. Sale del server, igual
 * que en Órdenes.
 *
 * No agrega endpoint ni cache nueva: compone `useStructureRuns` (que ya trae
 * las corridas con su período) con la lista de períodos, que es lo único que
 * traduce el `periodId` que maneja la pantalla al `code` que trae cada corrida.
 */
export function useRunForPeriod(structureId: string, periodId: string | null) {
  const runs = useStructureRuns(structureId);
  const periods = usePeriods(structureId);

  const code = periods.data?.find((p) => p.id === periodId)?.code ?? null;
  // `listRuns` devuelve del más nuevo al más viejo: la primera del período es la
  // vigente. Si no hay ninguna de ESTE período no se cae a la de otro: sería
  // pintar un árbol con los números de otro mes.
  const run = code ? (runs.data?.find((r) => r.periodo?.code === code) ?? null) : null;

  return {
    runId: run?.id ?? null,
    run,
    isLoading: runs.isLoading || periods.isLoading,
  };
}

/** El resultado que vale hoy: la última validada, o la última automática marcada. */
export function useResultadoVigente(structureId: string) {
  return useQuery({
    queryKey: ['structures', structureId, 'resultado-vigente'],
    queryFn: async () => {
      const res = await api.get<{ data: ResultadoVigente }>(
        `/structures/${structureId}/resultado-vigente`,
      );
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/** Un humano da por buena una corrida automática. No existe el inverso. */
export function useValidateRun(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await api.post<{ data: { id: string; validated: boolean } }>(
        `/calculation-runs/${runId}/validate`,
        {},
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['structures', structureId, 'runs'] });
      void qc.invalidateQueries({ queryKey: ['structures', structureId, 'resultado-vigente'] });
    },
  });
}

/** Datos que llegaron para un período ya cerrado y esperan decisión. */
export function useLateDataDecisions() {
  return useQuery({
    queryKey: ['late-data-decisions'],
    queryFn: async () => {
      const res = await api.get<{ data: LateDataDecision[] }>('/late-data-decisions');
      return res.data.data;
    },
  });
}

export function useResolveLateData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; choice: LateDataChoice; reason: string }) => {
      const res = await api.post(`/late-data-decisions/${v.id}/resolve`, {
        choice: v.choice,
        reason: v.reason,
      });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['late-data-decisions'] });
      // La decisión puede haber reabierto un mes y movido los siguientes: se
      // invalida todo lo de estructuras en vez de adivinar qué quedó viejo.
      void qc.invalidateQueries({ queryKey: ['structures'] });
    },
  });
}

/**
 * F06 — movimientos de MP con su estado de imputación (incluye los pendientes).
 * La ficha PPP lo usa para marcar cada movimiento sin imputar y hacerlo
 * accionable. Se cachea bajo `['structures', id, ...]` a propósito: `useImputar`
 * invalida `['structures', id]` y así esta lista se refresca sola al imputar.
 */
export function useMpMovements(structureId: string) {
  return useQuery({
    queryKey: ['structures', structureId, 'mp-movements'],
    queryFn: async () => {
      const res = await api.get<{ data: MpMovement[] }>(`/structures/${structureId}/mp-movements`);
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/**
 * Un insumo trazable de la estructura, visto desde la pantalla que lo cargó
 * (T-05). No trae el valor: el número que se muestra sale siempre de la config
 * guardada; acá viaja únicamente el vínculo entre un CAMPO y su ficha.
 */
export interface StructureDataPoint {
  id: string;
  element: CostElement;
  /** Clave del campo, con la convención de `orders-input-points.ts`. */
  fieldKey: string;
  label: string;
  unit: string | null;
  periodoImputado: string | null;
  pending: boolean;
}

/** Índice de insumos trazables de una estructura (T-05). */
export function useStructureDataPoints(structureId: string | null | undefined) {
  return useQuery({
    queryKey: ['structures', structureId, 'data-points'],
    queryFn: async () => {
      const res = await api.get<{ data: StructureDataPoint[] }>(
        `/structures/${structureId}/data-points`,
      );
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/**
 * DE QUÉ CAMPO SALE CADA FICHA (T-05).
 *
 * Devuelve `fieldKey → dataPointId` para que una pantalla de carga marque el
 * número que muestra con la ficha del dato que lo respalda. La clave la arma la
 * pantalla con la MISMA convención que el lado de escritura
 * (`orders-input-points.ts`), que es la única del sistema.
 *
 * Una clave REPETIDA no entra al índice. Las `fieldKey` de los movimientos de MP
 * son legadas y compartidas por todos los movimientos de la estructura
 * ('mp.compra.cantidad' y compañía): resolverlas por clave elegiría un dato al
 * azar y abriría la ficha de otra compra. Esos valores se marcan por otro lado
 * —`useMpMovements`, que sí los distingue— y acá quedan deliberadamente fuera:
 * antes que marcar mal, no marcar.
 */
export function useDataPointIdByFieldKey(structureId: string | null | undefined) {
  const { data } = useStructureDataPoints(structureId);
  return useMemo(() => {
    const unico = new Map<string, string>();
    const repetida = new Set<string>();
    for (const dp of data ?? []) {
      if (unico.has(dp.fieldKey)) repetida.add(dp.fieldKey);
      else unico.set(dp.fieldKey, dp.id);
    }
    for (const k of repetida) unico.delete(k);
    return unico;
  }, [data]);
}

export function useDataPointTrace(dataPointId: string | null | undefined) {
  return useQuery({
    queryKey: ['data-points', dataPointId, 'trace'],
    queryFn: async () => {
      const res = await api.get<{ data: DataPointTrace }>(`/data-points/${dataPointId}/trace`);
      return res.data.data;
    },
    enabled: !!dataPointId,
    staleTime: 10_000,
  });
}

export function useImputar(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dataPointId: string; periodo: string; sourceArea: SourceArea }) => {
      const res = await api.post(`/data-points/${input.dataPointId}/imputacion`, {
        periodo: input.periodo,
        sourceArea: input.sourceArea,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['structures', structureId] }),
  });
}

export function useValidateDataPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dataPointId: string; sourceArea: SourceArea }) => {
      const res = await api.post(`/data-points/${input.dataPointId}/validate`, {
        sourceArea: input.sourceArea,
      });
      return res.data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['data-points', vars.dataPointId, 'trace'] }),
  });
}

export function usePedirRevision() {
  return useMutation({
    mutationFn: async (input: { dataPointId: string; sourceArea: SourceArea; comment: string }) => {
      const res = await api.post(`/data-points/${input.dataPointId}/pedir-revision`, {
        sourceArea: input.sourceArea,
        comment: input.comment,
      });
      return res.data;
    },
  });
}

// ── Comprobantes (T-04) ──────────────────────────────────────────────────────

/** Tope del archivo: el backend corta en 700.000 caracteres de base64. */
export const MAX_ARCHIVO_BYTES = 500 * 1024;
export const MSG_ARCHIVO_GRANDE =
  'El archivo es muy grande (máximo 500 KB). Subí una versión más liviana.';

export interface AdjuntarComprobanteInput {
  dataPointId: string;
  kind: EvidenceKind;
  reference: string;
  counterparty?: string;
  /** Opcional de verdad: un comprobante por referencia ya es auditable. */
  file?: File | null;
  /** Por qué se adjunta. Queda en la versión nueva del dato. */
  reason?: string;
}

/** Lee un archivo como base64 pelado (sin el prefijo `data:...;base64,`). */
async function leerBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binario = '';
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // de a pedazos: String.fromCharCode(...) revienta con arrays grandes
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binario += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binario);
}

/**
 * Adjunta un comprobante a un dato ya cargado.
 *
 * Son DOS llamadas al backend —dar de alta el comprobante y vincularlo— porque
 * son dos hechos distintos: un comprobante existe por sí mismo (y mañana la
 * ingesta de documentos va a crearlo sin que nadie apriete nada) y recién
 * después se ata a un dato. Para el costista es UNA acción, así que la costura
 * queda acá adentro y no en la pantalla.
 *
 * El vínculo NO pisa el dato: el backend crea una VERSIÓN NUEVA que lleva el
 * comprobante, y la anterior queda intacta en el historial.
 */
export function useAdjuntarComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjuntarComprobanteInput) => {
      // Red de seguridad; la pantalla ya lo chequea antes de llegar acá para
      // poder mostrar el motivo (apiErrorMessage sólo entiende errores del
      // backend, un Error de acá se leería como "error inesperado").
      if (input.file && input.file.size > MAX_ARCHIVO_BYTES) throw new Error(MSG_ARCHIVO_GRANDE);

      const evidencia = await api.post<{ data: EvidenceCreated }>('/evidence', {
        kind: input.kind,
        reference: input.reference,
        counterparty: input.counterparty || undefined,
        file: input.file
          ? {
              data: await leerBase64(input.file),
              mimeType: input.file.type || 'application/octet-stream',
              fileName: input.file.name,
            }
          : undefined,
      });
      const comprobante = evidencia.data.data;

      await api.post(`/data-points/${input.dataPointId}/evidence`, {
        evidenceId: comprobante.id,
        reason: input.reason?.trim() || 'Se adjuntó el comprobante que respalda este dato.',
        sourceArea: 'costista',
      });

      return comprobante;
    },
    onSuccess: (_d, vars) => {
      // La ficha se rehace sola: pasa a mostrar el comprobante y el historial
      // con la versión nueva.
      void qc.invalidateQueries({ queryKey: ['data-points', vars.dataPointId, 'trace'] });
    },
  });
}

export interface CreateDataPointInput {
  element: CostElement;
  fieldKey: string;
  label: string;
  unit?: string;
  sourceArea: SourceArea;
  method?: CaptureMethod;
  valueNum?: number;
  valueJson?: unknown;
  fechaHecho?: string;
}

/** Crea un DataPoint (+ versión 1). Único punto de entrada de un dato trazable nuevo. */
export function useCreateDataPoint(structureId: string) {
  return useMutation({
    mutationFn: async (input: CreateDataPointInput) => {
      const res = await api.post<{ data: { id: string } }>(`/structures/${structureId}/data-points`, input);
      return res.data.data;
    },
  });
}
