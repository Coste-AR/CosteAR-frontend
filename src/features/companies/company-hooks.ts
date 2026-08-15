import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CondicionIva, Company, CostStructure, Periodicity } from '@/lib/types';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ data: Company[] }>('/companies');
      return res.data.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async () => {
      const res = await api.get<{ data: Company }>(`/companies/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      industry?: string;
      cuit?: string;
      description?: string;
      /** El ritmo de costeo. Solo al dar de alta: después queda fijo. */
      periodicity?: Periodicity;
      /** Condición frente al IVA: decide si el IVA entra o no al costo. */
      condicionIva?: CondicionIva;
    }) => {
      const res = await api.post<{ data: Company }>('/companies', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useCostStructures(companyId: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['companies', companyId, 'cost-structures', { includeDeleted }],
    queryFn: async () => {
      const res = await api.get<{ data: CostStructure[] }>(
        `/companies/${companyId}/cost-structures`,
        { params: includeDeleted ? { includeDeleted: true } : undefined },
      );
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useDeleteCostStructure(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cost-structures/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', companyId, 'cost-structures'] }),
  });
}

export function useRestoreCostStructure(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/cost-structures/${id}/restore`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', companyId, 'cost-structures'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    // Mandar `condicionIva` es además lo que CONFIRMA la condición: el backend
    // apaga la bandera `condicionIvaRevisar` cuando el costista la guarda.
    mutationFn: async ({ id, name, industry, cuit, description, periodicity, condicionIva }: { id: string; name: string; industry?: string; cuit?: string; description?: string; periodicity?: Periodicity; condicionIva?: CondicionIva }) => {
      const res = await api.put<{ data: Company }>(`/companies/${id}`, { name, industry, cuit, description, periodicity, condicionIva });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/companies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
