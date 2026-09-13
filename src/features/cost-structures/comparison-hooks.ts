import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CostPeriodStatus } from './period-hooks';
import type { UnidadGestion } from '@/lib/types';

/**
 * COMPARACIÓN ENTRE PERÍODOS (problema C — Fase 4).
 *
 * Los tipos espejan el DTO del backend (`period-comparison.ts`). La cuenta la hace
 * el motor, no la pantalla: acá no se calcula ni un porcentaje.
 *
 * Ojo con la ruta: cuelga de `/structures/...`, no de `/cost-structures/...`.
 */

/** De dónde salieron los números de un período. */
export type ResultSource = 'frozen' | 'recomputed';

export interface PeriodRef {
  code: string;
  label: string;
  status: CostPeriodStatus;
  /** `frozen`: se congelaron al cerrar el mes. `recomputed`: se recalcularon ahora. */
  source: ResultSource;
}

export interface Delta {
  a: number;
  b: number;
  delta: number;
  /** null cuando el mes base era cero: no existe "subió un %" desde la nada. */
  deltaPct: number | null;
}

export interface LineDelta extends Delta {
  key: string;
  label: string;
  /** Qué parte de la variación total explica esta línea. */
  contributionPct: number | null;
  presence?: 'new' | 'removed';
}

/** Una materia prima, con la suba abierta en precio y consumo. */
export interface MaterialDelta extends LineDelta {
  unit: string | null;
  qtyA: number;
  qtyB: number;
  priceA: number | null;
  priceB: number | null;
  /** Lo que subió porque el insumo está más caro. */
  priceEffect: number;
  /** Lo que subió porque se consumió más cantidad. */
  quantityEffect: number;
}

export interface Totals {
  rawMaterial: Delta;
  directLabor: Delta;
  indirectCosts: Delta;
  productionCost: Delta;
  costOfGoodsSold: Delta;
  grossMargin: Delta;
}

export interface MacroContrast {
  indicatorCode: string;
  indicatorLabel: string;
  deltaPct: number;
  monthsUsed: number;
  snapshots: { value: number; effectiveDate: string }[];
}

export interface PeriodComparison {
  from: PeriodRef;
  to: PeriodRef;
  units: { from: number | null; to: number | null; comparable: boolean };
  total: Totals;
  /** null si falta la cantidad producida en alguno de los dos meses. */
  unit: Totals | null;
  components: LineDelta[];
  componentsUnit: LineDelta[] | null;
  materials: MaterialDelta[];
  departments: LineDelta[];
  centers: LineDelta[];
  /** Las subas y las bajas se cancelaron: el total quedó igual, pero adentro se movió todo. */
  offsetting: boolean;
  warnings: string[];
  macroContrast: MacroContrast | null;
  unidadGestion: UnidadGestion | null;
}

/**
 * Compara dos períodos. Sin `from`/`to`, el backend compara los dos últimos
 * (el más nuevo contra el anterior).
 */
export function usePeriodComparison(structureId: string, from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: ['cost-structures', structureId, 'comparison', from ?? null, to ?? null],
    queryFn: async () => {
      const res = await api.get<{ data: PeriodComparison }>(
        `/structures/${structureId}/periods/compare`,
        { params: { from, to } },
      );
      return res.data.data;
    },
    enabled: !!structureId && enabled,
    retry: false, // "hacen falta dos períodos" es una respuesta, no un error de red
  });
}
