import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MacroIndicator {
  clave: string;
  etiqueta: string;
  valor: number | null;
  unidad: string | null;
  fecha: string | null;
  fuenteNombre: string;
  fuenteUrl: string;
  error?: string;
}

export interface UserPreferences {
  home: { accesosRapidos: string[] };
}

export interface QuickAccessCatalogItem {
  clave: string;
  etiqueta: string;
  modulo: string;
  porDefecto: boolean;
  destino?: string | null;
}

export function useHomeMacroIndicators(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companies', companyId, 'home-macro-indicators'],
    queryFn: async () => {
      const response = await api.get<{ data: MacroIndicator[] }>(
        `/companies/${companyId}/indicadores-macro`,
      );
      return response.data.data;
    },
    enabled: Boolean(companyId),
  });
}

export function useUserPreferences(enabled: boolean) {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const response = await api.get<{ data: UserPreferences }>('/me/preferencias');
      return response.data.data;
    },
    enabled,
  });
}

export function useQuickAccessCatalog(enabled: boolean) {
  return useQuery({
    queryKey: ['user-preferences', 'catalog'],
    queryFn: async () => {
      const response = await api.get<{ data: QuickAccessCatalogItem[] }>(
        '/me/preferencias/catalogo',
      );
      return response.data.data;
    },
    enabled,
  });
}
