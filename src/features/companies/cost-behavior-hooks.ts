import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const COST_BEHAVIOR_KEYS = [
  'comportamiento_materia_prima',
  'comportamiento_mano_obra_directa',
  'comportamiento_costos_indirectos',
] as const;

export type CostBehaviorKey = (typeof COST_BEHAVIOR_KEYS)[number];
export type CostBehavior = 'VARIABLE' | 'FIJO' | 'SEMIFIJO';

export interface CostBehaviorClassification {
  clave: CostBehaviorKey;
  comportamientoVolumen: CostBehavior | null;
  origen: 'periodo' | 'estructura' | 'empresa' | 'default';
  confirmado: boolean;
  clasificadoPorUserId: string | null;
  clasificadoEn: string | null;
  fundamento?: string;
}

type SavedCostBehaviorClassification = Pick<
  CostBehaviorClassification,
  | 'clave'
  | 'comportamientoVolumen'
  | 'confirmado'
  | 'clasificadoPorUserId'
  | 'clasificadoEn'
>;

/**
 * El endpoint de listado contiene el catálogo numérico. Las tres clasificaciones
 * se resuelven por su clave estable para conservar la cascada y la propuesta que
 * decide el backend.
 */
export function useCostBehaviorClassifications(companyId: string) {
  return useQueries({
    queries: COST_BEHAVIOR_KEYS.map((key) => ({
      queryKey: ['companies', companyId, 'cost-behavior', key],
      queryFn: async () => {
        const res = await api.get<{ data: CostBehaviorClassification }>(
          `/companies/${companyId}/parametros-costeo/${key}`,
        );
        return res.data.data;
      },
      enabled: !!companyId,
    })),
  });
}

export function useConfirmCostBehavior(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, behavior }: { key: CostBehaviorKey; behavior: CostBehavior }) => {
      const res = await api.put<{ data: SavedCostBehaviorClassification }>(
        `/companies/${companyId}/parametros-costeo/${key}`,
        { comportamientoVolumen: behavior, confirmado: true },
      );
      return res.data.data;
    },
    // El PUT devuelve la fila persistida; el GET resuelto agrega `origen` y
    // aplica la cascada. Se vuelve a consultar en vez de fingir esa resolución
    // en el frontend.
    onSuccess: (saved) =>
      queryClient.invalidateQueries({
        queryKey: ['companies', companyId, 'cost-behavior', saved.clave],
      }),
  });
}
