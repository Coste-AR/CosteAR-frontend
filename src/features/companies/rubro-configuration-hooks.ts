import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { parametersQueryKey } from './cost-parameters-hooks';

export interface RubroModule {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: 'prendido' | 'apagado';
  porDefecto: boolean;
  dependeDe: string[];
  parametros: string[];
  alertas: string[];
}

export const rubroModulesQueryKey = (companyId: string) => [
  'companies',
  companyId,
  'rubro-modules',
] as const;

export function useRubroModules(companyId: string) {
  return useQuery({
    queryKey: rubroModulesQueryKey(companyId),
    queryFn: async () => {
      const response = await api.get<{ data: RubroModule[] }>(
        `/companies/${companyId}/modulos-rubro`,
      );
      return response.data.data;
    },
    enabled: !!companyId,
  });
}

export function useSetRubroModule(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, active }: { key: string; active: boolean }) => {
      const response = await api.put<{ data: RubroModule }>(
        `/companies/${companyId}/modulos-rubro/${key}`,
        { activo: active },
      );
      return response.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<RubroModule[]>(rubroModulesQueryKey(companyId), (current) =>
        current?.map((module) => module.clave === updated.clave ? updated : module),
      );
      return queryClient.invalidateQueries({ queryKey: parametersQueryKey(companyId) });
    },
  });
}
