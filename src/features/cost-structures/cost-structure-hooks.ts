import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CostStructure, CalculationResult, CostCalculation } from '@/lib/types';
import type { RawMaterialConfig, DirectLaborConfig, IndirectCostConfig } from './cost-structure-types';

/**
 * Resultado del parseo del Excel importado: cada sección es PARCIAL porque el
 * backend solo completa lo que efectivamente encontró en el archivo. No se
 * persiste nada — es solo para pre-llenar los formularios existentes, que ya
 * saben tolerar `defaultValues` incompletos (ver `cleanXForForm` en cada uno).
 */
export interface ImportedExcelData {
  rawMaterialConfig?: Partial<RawMaterialConfig>;
  directLaborConfig?: Partial<DirectLaborConfig>;
  indirectCostConfig?: Partial<IndirectCostConfig>;
  sales?: { salesUnitPrice?: number; salesQuantity?: number };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Sacar el prefijo "data:<mime>;base64," antes de mandarlo.
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useCostStructure(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id],
    queryFn: async () => {
      const res = await api.get<{ data: CostStructure }>(`/cost-structures/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export interface ConfigVersion {
  id: string;
  section: string;
  versionN: number;
  value: unknown;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Historial append-only de la config del motor (R1). Más nueva primero. */
export function useConfigHistory(structureId: string, section: string) {
  return useQuery({
    queryKey: ['cost-structures', structureId, 'config-history', section],
    queryFn: async () => {
      const res = await api.get<{ data: ConfigVersion[] }>(
        `/cost-structures/${structureId}/config-history?section=${section}`,
      );
      return res.data.data;
    },
    enabled: !!structureId && !!section,
  });
}

export function useCreateCostStructure(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      productName: string;
      /**
       * OPCIONAL: si no se manda, el backend lo deriva de la fecha de hoy y del ritmo
       * de costeo de la empresa. Ya no se tipea a mano.
       */
      period?: string;
      costingSystem?: string;
    }) => {
      const res = await api.post<{ data: CostStructure }>(
        `/companies/${companyId}/cost-structures`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['companies', companyId, 'cost-structures'] }),
  });
}

export function useUpdateCostSection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      section: 'raw-material' | 'direct-labor' | 'indirect-costs';
      config: unknown;
    }) => {
      const res = await api.put<{ data: CostStructure }>(
        `/cost-structures/${id}/${input.section}`,
        input.config,
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id] }),
  });
}

export function useUpdateSales(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      salesUnitPrice: number;
      /** Unidades VENDIDAS: facturación y margen. */
      salesQuantity: number;
      /** Unidades PRODUCIDAS: costo unitario. null = usar las vendidas (como antes). */
      productionQuantity?: number | null;
    }) => {
      const res = await api.put(`/cost-structures/${id}/sales`, input);
      return res.data;
    },
    // Refrescar la estructura para que la sección Venta quede marcada como
    // completa y se habilite "Calcular" sin necesidad de recargar la página.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id] }),
  });
}

/**
 * Cambia el sistema de costeo de una estructura ya creada (U01).
 *
 * El backend solo lo permite mientras la estructura NO tenga cálculos: si ya los
 * tiene, devuelve un 422 accionable que la pantalla muestra tal cual. Cambiar el
 * sistema cambia qué se carga y cómo se acumula el costo, así que al volver hay
 * que refrescar la estructura entera.
 */
export function useUpdateCostingSystem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (costingSystem: 'ORDERS' | 'PROCESSES') => {
      const res = await api.patch(`/cost-structures/${id}/costing-system`, { costingSystem });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id] }),
  });
}

export function useCalculate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: { result: CalculationResult; calculationId: string } }>(
        `/cost-structures/${id}/calculate`,
        {},
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id, 'calculations'] }),
  });
}

export function useExportExcel(id: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/cost-structures/${id}/export`, { responseType: 'blob' });
      // Disparar la descarga en el navegador.
      const disposition = res.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `CosteAR-estructura-${id}.xlsx`;
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportExcel(id: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileBase64 = await fileToBase64(file);
      const res = await api.post<{ data: ImportedExcelData }>(
        `/cost-structures/${id}/import-excel`,
        { fileBase64 },
      );
      return res.data.data;
    },
  });
}

export function useSimulate(id: string) {
  return useMutation({
    mutationFn: async (shocks: { rawMaterial?: number; directLabor?: number; indirectCosts?: number; sales?: number }) => {
      const res = await api.post<{ data: { result: CalculationResult; simulated: boolean } }>(
        `/cost-structures/${id}/simulate`,
        shocks,
      );
      return res.data.data.result;
    },
  });
}

export function useCalculationHistory(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id, 'calculations'],
    queryFn: async () => {
      const res = await api.get<{ data: CostCalculation[] }>(`/cost-structures/${id}/calculations`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useLatestCalculation(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id, 'calculations', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: CostCalculation | null }>(
        `/cost-structures/${id}/calculations/latest`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

