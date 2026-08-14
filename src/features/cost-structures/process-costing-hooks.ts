import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  EquivalentProductionResponse,
  JointCostInput,
  JointCostResponse,
  ProcessCalculationResult,
  ProcessDepartment,
  ProcessDepartmentList,
  ProcessProductionReport,
  UnitMovementInput,
  UnitMovementResponse,
  ProcessSetupState,
  ProcessSetupInput,
  ProcessSetupPreview,
} from './process-costing-types';

/**
 * COSTEO POR PROCESOS — DATOS (U03).
 *
 * La maquinaria vive en el backend (B14-B17); acá solo se consume. Mismo patrón
 * que `period-hooks.ts`.
 *
 * Ojo con las rutas: igual que los períodos, todo cuelga de `/structures/...`,
 * no de `/cost-structures/...` como el resto del módulo.
 *
 * INVALIDACIÓN: casi todo en Procesos depende en cascada. El cuadro de
 * movimiento alimenta la producción equivalente, que alimenta el informe de
 * costos; y la cadena de departamentos condiciona todo lo demás. Por eso cada
 * mutación invalida el subárbol `['cost-structures', id, 'process']` entero en
 * vez de una clave puntual: es barato y evita que una pantalla muestre un
 * número derivado de datos que ya cambiaron.
 */

/** Raíz de todas las claves de Procesos de una estructura. */
const processKey = (structureId: string) => ['cost-structures', structureId, 'process'] as const;

function invalidateProcess(qc: QueryClient, structureId: string) {
  return qc.invalidateQueries({ queryKey: processKey(structureId) });
}

/**
 * El área de origen que se registra en la trazabilidad de cada carga hecha desde
 * esta pantalla. El JWT no la lleva, así que viaja en el body.
 *
 * Tiene que ser uno de los valores del enum del backend (`sourceAreaSchema`):
 * deposito · contaduria · planta · comercial · costista · sistema. Acá es
 * siempre `costista`: quien arma la estructura de costos y carga estos datos es
 * el profesional, no un operario de planta ni el depósito. Es el mismo valor que
 * usan la imputación de período y el pedido de revisión.
 */
const SOURCE_AREA = 'costista';

// ── Departamentos (B14) ──────────────────────────────────────────────────────

export function useProcessDepartments(structureId: string, enabled = true) {
  return useQuery({
    queryKey: [...processKey(structureId), 'departments'],
    queryFn: async () => {
      const res = await api.get<{ data: ProcessDepartmentList }>(
        `/structures/${structureId}/process/departments`,
      );
      return res.data.data;
    },
    enabled: !!structureId && enabled,
  });
}

export function useCreateProcessDepartment(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; conversionUnified?: boolean }) => {
      const res = await api.post<{ data: ProcessDepartment }>(
        `/structures/${structureId}/process/departments`,
        { ...input, sourceArea: SOURCE_AREA },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

export function useUpdateProcessDepartment(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deptId,
      ...input
    }: {
      deptId: string;
      name?: string;
      conversionUnified?: boolean;
    }) => {
      const res = await api.patch<{ data: ProcessDepartment }>(
        `/structures/${structureId}/process/departments/${deptId}`,
        { ...input, sourceArea: SOURCE_AREA },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

export function useDeleteProcessDepartment(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deptId: string) => {
      // El DELETE lleva body para registrar el área en la auditoría.
      const res = await api.delete<{ data: { removed: string; departments: string[] } }>(
        `/structures/${structureId}/process/departments/${deptId}`,
        { data: { sourceArea: SOURCE_AREA } },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

/** Reordena la cadena COMPLETA: un orden parcial la dejaría ambigua. */
export function useReorderProcessDepartments(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await api.put<{ data: { departments: ProcessDepartment[] } }>(
        `/structures/${structureId}/process/departments/order`,
        { orderedIds, sourceArea: SOURCE_AREA },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

// ── Cuadro de movimiento de unidades (B15) ───────────────────────────────────

export function useUnitMovement(structureId: string, deptId: string | null, periodId: string | null) {
  return useQuery({
    queryKey: [...processKey(structureId), 'movement', deptId, periodId],
    queryFn: async () => {
      const res = await api.get<{ data: UnitMovementResponse }>(
        `/structures/${structureId}/process/departments/${deptId}/periods/${periodId}/movement`,
      );
      return res.data.data;
    },
    enabled: !!structureId && !!deptId && !!periodId,
  });
}

export function useSaveUnitMovement(
  structureId: string,
  deptId: string | null,
  periodId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UnitMovementInput) => {
      const res = await api.put<{ data: UnitMovementResponse }>(
        `/structures/${structureId}/process/departments/${deptId}/periods/${periodId}/movement`,
        { ...input, sourceArea: SOURCE_AREA, method: 'manual' },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

/**
 * Derivada del cuadro guardado. Si todavía no hay cuadro, el backend responde
 * 422 con un mensaje accionable: la pantalla lo muestra tal cual, no reintenta.
 */
export function useEquivalentProduction(
  structureId: string,
  deptId: string | null,
  periodId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...processKey(structureId), 'equivalent-production', deptId, periodId],
    queryFn: async () => {
      const res = await api.get<{ data: EquivalentProductionResponse }>(
        `/structures/${structureId}/process/departments/${deptId}/periods/${periodId}/equivalent-production`,
      );
      return res.data.data;
    },
    enabled: !!structureId && !!deptId && !!periodId && enabled,
    retry: false,
  });
}

// ── Costos conjuntos (B16) ───────────────────────────────────────────────────

/** El departamento viaja como query param: el reparto es por período y etapa. */
export function useJointCosts(structureId: string, deptId: string | null, periodId: string | null) {
  return useQuery({
    queryKey: [...processKey(structureId), 'joint-costs', deptId, periodId],
    queryFn: async () => {
      const res = await api.get<{ data: JointCostResponse }>(
        `/structures/${structureId}/process/periods/${periodId}/joint-costs`,
        { params: { deptId } },
      );
      return res.data.data;
    },
    enabled: !!structureId && !!deptId && !!periodId,
  });
}

export function useSaveJointCosts(structureId: string, periodId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: JointCostInput) => {
      const res = await api.put<{ data: JointCostResponse }>(
        `/structures/${structureId}/process/periods/${periodId}/joint-costs`,
        { ...input, sourceArea: SOURCE_AREA, captureMethod: 'manual' },
      );
      return res.data.data;
    },
    onSuccess: () => invalidateProcess(qc, structureId),
  });
}

// ── Cálculo e informe (B17) ──────────────────────────────────────────────────

/** Corre el motor y PERSISTE la corrida con su árbol de derivación. */
export function useProcessCalculate(structureId: string, periodId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{
        // Contrato real de `POST .../calculate`. Estaba tipado como `run: { id }`
        // y el server nunca mandó eso: el tipo mentía y el front le creía.
        data: { runId: string; runN: number; period: string; results: ProcessCalculationResult };
      }>(`/structures/${structureId}/process/periods/${periodId}/calculate`, {});
      return res.data.data;
    },
    onSuccess: () => {
      void invalidateProcess(qc, structureId);
      // El árbol de derivación se ubica por la corrida que devuelve
      // `/structures/:id/runs` (ver `useRunForPeriod`), que vive fuera del
      // subárbol `process`. Sin esta invalidación el árbol seguiría mostrando la
      // corrida anterior —o el estado vacío— después de calcular bien.
      void qc.invalidateQueries({ queryKey: ['structures', structureId, 'runs'] });
    },
  });
}

/** Informe de costos para mostrar: recalcula con el motor puro, no persiste. */
export function useProcessProductionReport(
  structureId: string,
  periodId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...processKey(structureId), 'production-report', periodId],
    queryFn: async () => {
      const res = await api.get<{ data: ProcessProductionReport }>(
        `/structures/${structureId}/process/periods/${periodId}/production-report`,
      );
      return res.data.data;
    },
    enabled: !!structureId && !!periodId && enabled,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// SETUP PREVIO OBLIGATORIO
// ---------------------------------------------------------------------------

/** Estado del setup + departamentos ya cargados + operarios disponibles. */
export function useProcessSetup(structureId: string) {
  return useQuery({
    queryKey: ['structures', structureId, 'process-setup'],
    queryFn: async () => {
      const res = await api.get<{ data: ProcessSetupState }>(
        `/structures/${structureId}/process-setup`,
      );
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/**
 * Valida SIN guardar. El wizard lo llama mientras el costista escribe, para
 * mostrarle los problemas y los avisos antes de que apriete — no después.
 */
export function useProcessSetupPreview(structureId: string) {
  return useMutation({
    mutationFn: async (input: ProcessSetupInput) => {
      const res = await api.post<{ data: ProcessSetupPreview }>(
        `/structures/${structureId}/process-setup/preview`,
        input,
      );
      return res.data.data;
    },
  });
}

/** Sella el setup. A partir de acá la estructura puede calcular. */
export function useCompleteProcessSetup(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProcessSetupInput) => {
      const res = await api.post(`/structures/${structureId}/process-setup`, input);
      return res.data.data;
    },
    onSuccess: () => {
      // Sellar el setup crea departamentos y desbloquea el cálculo: se refresca
      // todo lo de la estructura en vez de adivinar qué quedó viejo.
      void qc.invalidateQueries({ queryKey: ['structures', structureId] });
    },
  });
}
