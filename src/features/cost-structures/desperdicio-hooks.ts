import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NaturalezaDesperdicio = 'NORMAL' | 'EXTRAORDINARIA' | null;
export type NaturalezaDesperdicioInput = 'normal' | 'extraordinaria' | null;

export interface Desperdicio {
  id: string;
  periodId: string;
  concepto: string;
  valor: string | number;
  cantidad: string | number | null;
  unidadId: string | null;
  naturaleza: NaturalezaDesperdicio;
  valorRecupero: string | number;
  motivo: string | null;
  createdAt: string;
}

export interface DesperdicioInput {
  concepto: string;
  valor: number;
  naturaleza: NaturalezaDesperdicioInput;
  valorRecupero: number;
  motivo: string | null;
}

const queryKey = (periodId: string | null) => ['periods', periodId, 'desperdicios'] as const;

export function useDesperdicios(periodId: string | null) {
  return useQuery({
    queryKey: queryKey(periodId),
    queryFn: async () => {
      const response = await api.get<{ data: Desperdicio[] }>(
        `/periods/${periodId}/desperdicios`,
      );
      return response.data.data;
    },
    enabled: !!periodId,
  });
}

function useInvalidateDesperdicios(periodId: string | null) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKey(periodId) });
}

export function useCreateDesperdicio(periodId: string | null) {
  const invalidate = useInvalidateDesperdicios(periodId);
  return useMutation({
    mutationFn: async (input: DesperdicioInput) => {
      const response = await api.post<{ data: Desperdicio }>(
        `/periods/${periodId}/desperdicios`,
        input,
      );
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateDesperdicio(periodId: string | null) {
  const invalidate = useInvalidateDesperdicios(periodId);
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DesperdicioInput }) => {
      const response = await api.patch<{ data: Desperdicio }>(`/desperdicios/${id}`, input);
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteDesperdicio(periodId: string | null) {
  const invalidate = useInvalidateDesperdicios(periodId);
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: Desperdicio }>(`/desperdicios/${id}`);
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}
