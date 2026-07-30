import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ClassificationAudit {
  documentType: string | null;
  costSection: string | null;
  confidence: number | null;
  requiresReview: boolean;
  definitiveSignal: string | null;
  aiUsed: boolean;
  explanation: string | null;
}

export interface DataEntry {
  id: string;
  rawContent: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  correctedContent: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileData: string | null;
  fileUrl: string | null;
  costStructureId?: string | null;
  /**
   * A qué CostStructure apuntaría esta entrada si se aprobara ahora (mismo
   * criterio que el populador del backend). Si `costingSystem` es
   * `'PROCESSES'`, Validaciones ofrece el selector de departamento antes de
   * aprobar — sin esto el monto queda "pendiente" hasta asignarlo a mano.
   */
  targetCostStructure?: { id: string; productName: string; costingSystem: string } | null;
  classificationAudits?: ClassificationAudit[];
  connection: {
    company: { id: string; name: string; industry: string | null };
  };
}

interface PaginatedResult {
  items: DataEntry[];
  total: number;
  page: number;
  limit: number;
}

export function usePendingEntries(page = 1) {
  return useQuery({
    queryKey: ['validaciones', 'pending', page],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResult }>(`/validaciones/pending?page=${page}&limit=20`);
      return res.data.data;
    },
  });
}

export interface AccuracyStats {
  total: number;
  correct: number;
  corrected: number;
  accuracy: number | null;
  confidentAccuracy: number | null;
  rules: { total: number; accuracy: number | null };
  ai: { total: number; accuracy: number | null };
}

export function useAccuracyStats() {
  return useQuery({
    queryKey: ['validaciones', 'accuracy'],
    queryFn: async () => {
      const res = await api.get<{ data: AccuracyStats }>('/validaciones/accuracy');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['validaciones', 'pending', 'count'],
    queryFn: async () => {
      const res = await api.get<{ data: { count: number } }>('/validaciones/pending/count');
      return res.data.data.count;
    },
    refetchInterval: 60_000, // refresca cada minuto
  });
}

export function useHistorial(page = 1, companyId?: string) {
  return useQuery({
    queryKey: ['validaciones', 'historial', page, companyId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (companyId) {
        params.append('companyId', companyId);
      }
      const res = await api.get<{ data: PaginatedResult }>(`/validaciones/historial?${params.toString()}`);
      return res.data.data;
    },
  });
}

export interface AttentionItem {
  companyId: string;
  companyName: string;
  industry: string | null;
  pending: number;
  conflicts: number;
  lastActivity: string | null;
  daysSinceActivity: number | null;
  needsAttention: boolean;
}

export function useAttention() {
  return useQuery({
    queryKey: ['validaciones', 'attention'],
    queryFn: async () => {
      const res = await api.get<{ data: AttentionItem[] }>('/validaciones/attention');
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId?: string) => {
      const res = await api.post<{ data: { approved: number; skipped: number; populationWarnings: number } }>(
        '/validaciones/bulk-approve',
        companyId ? { companyId } : {},
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validaciones'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
}

/**
 * Si el documento se aprobó/corrigió pero el dato NO se pudo aplicar
 * automáticamente a la estructura (ej. es de Costeo por Procesos, o el
 * período está cerrado), el backend manda el motivo acá — antes esto solo
 * se sabía revisando /admin/system-alerts, y quien aprobaba no se enteraba.
 */
export interface ReviewResult extends DataEntry {
  populationWarning?: string;
}

export function useReviewEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      status,
      note,
      correctedContent,
      correctedDocumentType,
      correctedCostSection,
      processDepartmentId,
    }: {
      entryId: string;
      status: 'APPROVED' | 'REJECTED' | 'CORRECTED';
      note?: string;
      correctedContent?: string;
      correctedDocumentType?: string;
      correctedCostSection?: string;
      /** Costeo por Procesos: departamento elegido a mano al aprobar/corregir. */
      processDepartmentId?: string;
    }) => {
      const res = await api.post<{ data: ReviewResult }>(`/validaciones/${entryId}/review`, {
        status,
        note,
        correctedContent,
        correctedDocumentType,
        correctedCostSection,
        processDepartmentId,
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validaciones'] });
    },
  });
}

// ── Costeo por Procesos: documentos aprobados sin departamento asignado ─────

export interface UnassignedDataEntry {
  id: string;
  rawContent: string;
  fileName: string | null;
  fileUrl: string | null;
  reviewedAt: string | null;
  classificationAudits: { costSection: string | null; documentType: string | null }[];
}

/** La cola: documentos que ya pasaron validación pero cuyo monto todavía no
 *  llegó a ningún departamento — nada se pierde, queda visible acá hasta
 *  que alguien lo asigne. */
export function useUnassignedDataEntries(costStructureId: string, enabled = true) {
  return useQuery({
    queryKey: ['validaciones', 'pending-departments', costStructureId],
    queryFn: async () => {
      const res = await api.get<{ data: UnassignedDataEntry[] }>(
        `/validaciones/pending-departments/${costStructureId}`,
      );
      return res.data.data;
    },
    enabled: !!costStructureId && enabled,
  });
}

export function useAssignDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, processDepartmentId }: { entryId: string; processDepartmentId: string }) => {
      const res = await api.post<{ data: { populationWarning?: string } }>(
        `/validaciones/${entryId}/assign-department`,
        { processDepartmentId },
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validaciones'] });
      qc.invalidateQueries({ queryKey: ['cost-structures'] });
    },
  });
}
