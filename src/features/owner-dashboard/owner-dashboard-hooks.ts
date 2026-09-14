import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UnidadGestion } from '@/lib/types';

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
  unidadGestion: UnidadGestion | null;
  rubro: {
    clave: string;
    icons: Record<string, string>;
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

export interface CapiaWeek {
  sourceLabel: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CapiaIndicator {
  indicatorCode: string;
  value: number;
  unit: 'cajon' | 'kg' | 'ton' | 'unidad' | 'ave' | null;
  ivaPct: number | null;
  priceIncludesIva: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: 'CAPIA';
  sourceLabel: string | null;
  productId: number | null;
  product: string | null;
  category: string | null;
}

export interface CapiaIndicatorsData {
  semana: CapiaWeek | null;
  items: CapiaIndicator[];
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

export function useCapiaIndicators(enabled: boolean) {
  return useQuery({
    queryKey: ['capia-indicators', 'vigentes'],
    queryFn: async () => {
      const res = await api.get<{ data: CapiaIndicatorsData }>(
        '/indicadores/capia/vigentes',
      );
      return res.data.data;
    },
    enabled,
  });
}
