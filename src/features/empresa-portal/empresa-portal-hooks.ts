import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Operator {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface GeneratedAccess {
  email: string;
  tempPassword?: string;   // solo viene cuando isNewUser=true
  inviteCode?: string;
  isNewUser?: boolean;
}

export function useOperators(companyId: string) {
  return useQuery({
    queryKey: ['operators', companyId],
    queryFn: async () => {
      const res = await api.get<{ data: Operator[] }>(`/empresa-portal/${companyId}/operators`);
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useGenerateOperatorAccess(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operatorName,
      operatorEmail,
      /**
       * El PUESTO en la empresa ("Jefe de Depósito"), no el rol de login.
       * Opcional: si el costista no lo sabe, "no consta" es más honesto que un
       * puesto inventado. Se estampa en cada dato que cargue esta persona.
       */
      jobTitle,
    }: {
      operatorName: string;
      operatorEmail: string;
      jobTitle?: string;
    }) => {
      const res = await api.post<{ data: GeneratedAccess }>(
        `/empresa-portal/${companyId}/operators`,
        {
          operatorName,
          operatorEmail,
          // El servidor exige 2 caracteres como mínimo. Un puesto de una letra
          // no es un puesto, así que no se manda: mejor "no consta" que un 400.
          ...((jobTitle?.trim().length ?? 0) >= 2 ? { jobTitle: jobTitle!.trim() } : {}),
        },
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators', companyId] }),
  });
}

export function useRevokeOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (operatorId: string) => {
      await api.delete(`/empresa-portal/operators/${operatorId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
}

export function useResetOperatorPassword() {
  return useMutation({
    mutationFn: async (operatorId: string) => {
      const res = await api.post<{ data: { email: string; tempPassword: string } }>(
        `/empresa-portal/operators/${operatorId}/reset-password`,
        {},
      );
      return res.data.data;
    },
  });
}
