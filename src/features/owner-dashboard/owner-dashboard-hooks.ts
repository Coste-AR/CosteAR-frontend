import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface OwnerDashboardNumber {
  valor: number | null;
  completo: boolean;
  parametrosSinConfirmar: boolean;
  parametrosSinConfirmarDetalle: Array<{
    id: string;
    nombre: string;
  }>;
  motivos: string[];
}

export type OwnerDashboardPendingArea =
  | 'calculo'
  | 'imputacion'
  | 'configuracion'
  | 'produccion'
  | 'ventas'
  | 'costeo';

export interface OwnerDashboardPending {
  area: OwnerDashboardPendingArea;
  dato: string;
  periodo: {
    id: string;
    codigo: string;
  };
}

export interface OwnerDashboardData {
  periodo: {
    id: string;
    codigo: string;
  };
  corrida: {
    id: string;
    validada: boolean;
    ejecutadaEn: string;
  } | null;
  pendientes: OwnerDashboardPending[];
  costoPorCajon: {
    variable: OwnerDashboardNumber;
    fijo: OwnerDashboardNumber;
    total: OwnerDashboardNumber;
  };
  precioPromedioVenta: OwnerDashboardNumber;
  contribucionMarginalPorCajon: OwnerDashboardNumber;
  puntoEquilibrioCajones: OwnerDashboardNumber & {
    fechaUltimoRecalculo: string | null;
  };
  producidoCajones: OwnerDashboardNumber;
  resultadoPeriodo: OwnerDashboardNumber;
}

export function useOwnerDashboard(periodId: string | undefined) {
  return useQuery({
    queryKey: ['owner-dashboard', periodId],
    queryFn: async () => {
      const res = await api.get<{ data: OwnerDashboardData }>(
        `/periods/${periodId}/tablero-dueno`,
      );
      return res.data.data;
    },
    enabled: Boolean(periodId),
  });
}
