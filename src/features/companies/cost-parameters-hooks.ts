import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type CostParameterOrigin = 'periodo' | 'estructura' | 'empresa' | 'default';

export interface CostParameter {
  clave: string;
  valor: number;
  descripcion: string;
  unidad: string | null;
  valorDefault: number;
  seguro: boolean;
  origen: CostParameterOrigin;
  confirmado: boolean;
  nota?: string;
}

const parametersQueryKey = (companyId: string) => [
  'companies',
  companyId,
  'cost-parameters',
] as const;

export function useCostParameters(companyId: string) {
  return useQuery({
    queryKey: parametersQueryKey(companyId),
    queryFn: async () => {
      const response = await api.get<{ data: CostParameter[] }>(
        `/companies/${companyId}/parametros-costeo`,
      );
      return response.data.data;
    },
    enabled: !!companyId,
  });
}

export function useSaveCostParameter(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const response = await api.put<{ data: unknown }>(
        `/companies/${companyId}/parametros-costeo/${key}`,
        { valor: value, confirmado: true },
      );
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parametersQueryKey(companyId) }),
  });
}

export function useResetCostParameter(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const response = await api.delete<{ data: CostParameter }>(
        `/companies/${companyId}/parametros-costeo/${key}`,
      );
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parametersQueryKey(companyId) }),
  });
}
