import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    nombreProducto: string | null;
    icons: Record<string, string>;
    kpisHome: Array<{
      clave: string;
      etiqueta: string;
      unidad: string;
      valor: number | null;
      completo: boolean;
    }>;
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

export interface PuntoCierreHorizonte {
  horizonteMeses: number;
  valor: number | null;
  motivoSinEquilibrio?: string;
  costosFijosErogables: number | null;
  costoVariableUnitarioErogable: number | null;
  contribucionMarginalFinanciera: number | null;
  situacion: string | null;
  advertencia: string;
  basadoEn: Array<{ clave: string; etiqueta: string }>;
  conceptosIncluidos?: Array<{ clave: string; etiqueta: string }>;
  conceptosExcluidos?: Array<{ clave: string; etiqueta: string }>;
}

export interface PuntoCierreData {
  moneda: string | null;
  unidad: string | null;
  nominal: true;
  precioUnitario: number;
  puntoEquilibrioEconomico: number;
  actividad: number | null;
  importeVersionIds: string[];
  horizontes: PuntoCierreHorizonte[];
}

export interface ResultadoTramoEquilibrio {
  tramoId: string;
  tipo: 'REEMPLAZA' | 'ACUMULA';
  desde: number;
  hasta: number | null;
  techo: number | null;
  qAritmetico: number | null;
  q: number | null;
  resultadoMaximo: number | null;
  motivoFueraDeTramo?: string;
}

export interface TransicionTramoEquilibrio {
  desdeTramoId: string;
  haciaTramoId: string;
  qIndiferencia: number | null;
  binding: number | null;
  margenHastaTecho: number | null;
  porcentajeMargen: number | null;
  alertaPegadoAlTecho: boolean;
}

export interface EquilibrioTramosData {
  calculoId?: string;
  tramos: ResultadoTramoEquilibrio[];
  transiciones: TransicionTramoEquilibrio[];
}

export interface TramoCostoData {
  id: string;
  conceptoId: string | null;
  segmentoId: string | null;
  desde: number;
  hasta: number | null;
  tipo: 'REEMPLAZA' | 'ACUMULA';
  importeFijo: number;
  cmUnitaria: number;
  techoFisico: number | null;
  techoFuente: string | null;
  techoDeclaradoEn: string | null;
  techoDeclaradoPorId: string | null;
  createdAt: string;
}

export interface EquilibrioSectorialSegmento {
  id: string;
  nombre: string;
  contribucionMarginalUnitaria: number;
  contribucionNeta: number | null;
  equilibrioEspecifico: number | null;
  equilibrioSectorial: number | null;
  excedente: number | null;
  vistaSinProrrateo: { resultado: number | null };
  vistaConProrrateo: {
    resultado: number | null;
    doctrinaria: false;
    motivo: string;
  };
  basadoEn: {
    participacion: number;
    costoFijoDirecto: number;
    prorrateoIndirectos: number;
    produccionConjunta: boolean;
  };
}

export interface EquilibrioSectorialData {
  equilibrioGeneral: number | null;
  segmentos: EquilibrioSectorialSegmento[];
  controlIndirectos: {
    indirectos: number;
    contribucionesNetas: number;
    diferencia: number;
  };
}

export type SegmentoNivel = 'empresa' | 'division' | 'canal' | 'linea';

export interface SegmentoCoproducto {
  nombre: string;
  precio: number;
  rendimiento: number;
}

export interface SegmentoAnalisisInput {
  nombre: string;
  nivel: SegmentoNivel;
  parentId: string | null;
  produccionConjunta: boolean;
  precioUnitario: number | null;
  costoVariableUnitario: number | null;
  participacion: number;
  costoFijoDirecto: number;
  prorrateoIndirectos: number;
  coproductos: SegmentoCoproducto[];
}

export interface SegmentoAnalisis extends SegmentoAnalisisInput {
  id: string;
}

interface PuntoCierreParams {
  companyId?: string;
  periodId?: string;
  precioUnitario?: number;
  puntoEquilibrioEconomico?: number;
  actividad?: number;
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

export function usePuntoCierre(params: PuntoCierreParams, enabled: boolean) {
  return useQuery({
    queryKey: ['punto-cierre', params],
    queryFn: async () => {
      const res = await api.get<{ data: PuntoCierreData }>(
        `/companies/${params.companyId}/analisis/punto-cierre`,
        {
          params: {
            horizontes: '1,12',
            precioUnitario: params.precioUnitario,
            puntoEquilibrioEconomico: params.puntoEquilibrioEconomico,
            actividad: params.actividad,
            periodId: params.periodId,
          },
        },
      );
      return res.data.data;
    },
    enabled,
  });
}

export function useEquilibrioTramos(companyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['equilibrio-tramos', companyId],
    queryFn: async () => {
      const [equilibrio, tramos] = await Promise.all([
        api.get<{ data: EquilibrioTramosData }>(
          `/companies/${companyId}/tramos-costo/equilibrio`,
        ),
        api.get<{ data: TramoCostoData[] }>(
          `/companies/${companyId}/tramos-costo`,
        ),
      ]);
      return { equilibrio: equilibrio.data.data, tramos: tramos.data.data };
    },
    enabled: Boolean(companyId && enabled),
  });
}

export function useEquilibrioSectorial(companyId: string | undefined) {
  return useQuery({
    queryKey: ['equilibrio-sectorial', companyId],
    queryFn: async () => {
      const response = await api.get<{ data: EquilibrioSectorialData }>(
        `/companies/${companyId}/analisis/equilibrio-sectorial`,
      );
      return response.data.data;
    },
    enabled: Boolean(companyId),
  });
}

export function useSegmentosAnalisis(companyId: string | undefined) {
  return useQuery({
    queryKey: ['segmentos-analisis', companyId],
    queryFn: async () => {
      const response = await api.get<{ data: SegmentoAnalisis[] }>(
        `/companies/${companyId}/segmentos-analisis`,
      );
      return response.data.data;
    },
    enabled: Boolean(companyId),
  });
}

function useInvalidateSegmentos(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['segmentos-analisis', companyId] }),
    queryClient.invalidateQueries({ queryKey: ['equilibrio-sectorial', companyId] }),
  ]);
}

export function useCreateSegmentoAnalisis(companyId: string | undefined) {
  const invalidate = useInvalidateSegmentos(companyId);
  return useMutation({
    mutationFn: async (input: SegmentoAnalisisInput) => {
      const response = await api.post<{ data: SegmentoAnalisis }>(
        `/companies/${companyId}/segmentos-analisis`,
        input,
      );
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSegmentoAnalisis(companyId: string | undefined) {
  const invalidate = useInvalidateSegmentos(companyId);
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SegmentoAnalisisInput }) => {
      const response = await api.patch<{ data: SegmentoAnalisis }>(
        `/companies/${companyId}/segmentos-analisis/${id}`,
        input,
      );
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSegmentoAnalisis(companyId: string | undefined) {
  const invalidate = useInvalidateSegmentos(companyId);
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/companies/${companyId}/segmentos-analisis/${id}`);
    },
    onSuccess: invalidate,
  });
}
