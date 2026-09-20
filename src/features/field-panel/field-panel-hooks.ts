import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ProductiveLot {
  id: string;
  companyId: string;
  unidadProductivaId: string | null;
  referencia: string;
  activo: boolean;
  unidadProductiva: {
    id: string;
    referencia: string;
    activa: boolean;
  } | null;
}

export interface DailyProductionInput {
  fecha: string;
  variante: string;
  unidadesProducidas: number;
  roturas: number;
  descartes: number;
}

export type LotLossInput = {
  tipo: 'baja';
  cantidad: number;
  fecha: string;
  motivo: 'mortalidad' | 'descarte' | 'canibalismo' | 'faena';
};

export type PanelActionKey = 'produccion' | 'plantel' | 'alimento' | 'peso';

export type PanelTelemetryInput =
  | { tipo: 'ACCION_TOCADA' | 'CARGA_INICIADA'; accion: PanelActionKey }
  | {
      tipo: 'CARGA_ABANDONADA' | 'CARGA_COMPLETADA';
      accion: PanelActionKey;
      duracionMs: number;
    };

export function useProductiveLots(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'productive-lots'],
    queryFn: async () => {
      const response = await api.get<{ data: ProductiveLot[] }>(
        `/companies/${companyId}/lotes-productivos`,
      );
      return response.data.data;
    },
    enabled: !!companyId,
  });
}

export function useCreateDailyProduction(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DailyProductionInput) => {
      const response = await api.post<{ data: { id: string } }>(
        `/lotes/${lotId}/producciones`,
        input,
      );
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lots', lotId, 'productions'] }),
  });
}

export function useCreateLotLoss(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LotLossInput) => {
      const response = await api.post<{ data: { id: string } }>(
        `/lotes/${lotId}/eventos`,
        input,
      );
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lots', lotId, 'events'] }),
  });
}

export function useRecordPanelTelemetry(companyId: string) {
  const { mutate } = useMutation({
    mutationFn: async (input: PanelTelemetryInput) => {
      await api.post(`/companies/${companyId}/telemetria-panel`, input);
    },
    onError: () => {
      // La telemetría es secundaria: su falla nunca bloquea la carga operativa.
    },
  });

  return useCallback((input: PanelTelemetryInput) => {
    if (companyId) mutate(input);
  }, [companyId, mutate]);
}
