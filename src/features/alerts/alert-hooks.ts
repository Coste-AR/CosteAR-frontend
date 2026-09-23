import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert, AlertRule, AlertRuleIndicator, AlertRuleInput, AlertSetting, MacroSnapshot } from '@/lib/types';

/** Últimos valores macro (dólar, IPC, etc.) para el semáforo de riesgo. */
export function useMacroLatest() {
  return useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
  });
}

/** Historial de un indicador (para calcular la variación). */
export function useMacroHistory(indicatorCode: string) {
  return useQuery({
    queryKey: ['macro', 'history', indicatorCode],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/history', {
        params: { indicator: indicatorCode },
      });
      return res.data.data;
    },
    enabled: !!indicatorCode,
  });
}

export function useAlerts(unread = false) {
  return useQuery({
    queryKey: ['alerts', { unread }],
    queryFn: async () => {
      const res = await api.get<{ data: Alert[] }>('/alerts', { params: { unread } });
      return res.data.data;
    },
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/alerts/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useAlertRuleCatalog(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'alert-rules', 'catalog'],
    queryFn: async () => {
      const res = await api.get<{ data: AlertRuleIndicator[] }>(
        `/companies/${companyId}/alert-rules/catalog`,
      );
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useAlertRules(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'alert-rules'],
    queryFn: async () => {
      const res = await api.get<{ data: AlertRule[] }>(`/companies/${companyId}/alert-rules`);
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useSaveAlertRule(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AlertRuleInput }) => {
      const path = `/companies/${companyId}/alert-rules`;
      const res = id
        ? await api.patch<{ data: AlertRule }>(`${path}/${id}`, input)
        : await api.post<{ data: AlertRule }>(path, input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', companyId, 'alert-rules'] }),
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ['alerts', 'settings'],
    queryFn: async () => {
      const res = await api.get<{ data: AlertSetting }>('/alerts/settings');
      return res.data.data;
    },
  });
}

export function useUpdateAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { marginThresholdPct?: number; emailNotifications?: boolean }) => {
      const res = await api.put<{ data: AlertSetting }>('/alerts/settings', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', 'settings'] }),
  });
}
