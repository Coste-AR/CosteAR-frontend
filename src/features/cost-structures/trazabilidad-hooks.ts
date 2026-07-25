import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CalculationTree,
  RunSummary,
  DataPointTrace,
  SourceArea,
  CaptureMethod,
  CostElement,
  Incompletitud,
  MpMovement,
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
        data: { runId: string; runN: number; results: unknown; tree: unknown; incompleto: Incompletitud };
      }>(`/structures/${structureId}/calculate`, {});
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['structures', structureId, 'runs'] }),
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
