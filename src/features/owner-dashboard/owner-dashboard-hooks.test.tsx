// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete } }));
const {
  useCapiaIndicators,
  useCreateSegmentoAnalisis,
  useDeleteSegmentoAnalisis,
  useEquilibrioSectorial,
  useEquilibrioTramos,
  useOwnerDashboard,
  usePuntoCierre,
  useSegmentosAnalisis,
  useUpdateSegmentoAnalisis,
} = await import('./owner-dashboard-hooks');

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('tablero del dueño', () => {
  it('no consulta sin período y usa el endpoint del período al seleccionarlo', async () => {
    const { rerender } = renderHook(({ periodId }) => useOwnerDashboard(periodId), {
      wrapper,
      initialProps: { periodId: undefined as string | undefined },
    });
    expect(apiGet).not.toHaveBeenCalled();

    apiGet.mockResolvedValue({ data: { data: { periodo: { id: 'periodo-1' } } } });
    rerender({ periodId: 'periodo-1' });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());

    expect(apiGet).toHaveBeenCalledWith('/periods/periodo-1/tablero-dueno');
  });

  it('consulta CAPIA sólo cuando el paquete del tenant lo declara', async () => {
    const { rerender } = renderHook(({ enabled }) => useCapiaIndicators(enabled), {
      wrapper,
      initialProps: { enabled: false },
    });
    expect(apiGet).not.toHaveBeenCalled();

    apiGet.mockResolvedValue({ data: { data: { semana: null, items: [] } } });
    rerender({ enabled: true });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());

    expect(apiGet).toHaveBeenCalledWith('/indicadores/capia/vigentes');
  });

  it('pide los horizontes 1 y 12 con los valores del tablero sin recalcularlos', async () => {
    apiGet.mockResolvedValue({ data: { data: { horizontes: [] } } });
    renderHook(() => usePuntoCierre({
      companyId: 'company-1',
      periodId: 'period-1',
      precioUnitario: 500,
      puntoEquilibrioEconomico: 750,
      actividad: 650,
    }, true), { wrapper });

    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith(
      '/companies/company-1/analisis/punto-cierre',
      {
        params: {
          horizontes: '1,12',
          precioUnitario: 500,
          puntoEquilibrioEconomico: 750,
          actividad: 650,
          periodId: 'period-1',
        },
      },
    );
  });

  it('consulta juntos la función de equilibrio y la fuente de cada techo', async () => {
    apiGet
      .mockResolvedValueOnce({ data: { data: { tramos: [], transiciones: [] } } })
      .mockResolvedValueOnce({ data: { data: [] } });

    renderHook(() => useEquilibrioTramos('company-1', true), { wrapper });

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    expect(apiGet).toHaveBeenNthCalledWith(1, '/companies/company-1/tramos-costo/equilibrio');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/companies/company-1/tramos-costo');
  });

  it('consulta juntos el resultado sectorial y la configuración editable', async () => {
    apiGet.mockResolvedValue({ data: { data: [] } });

    renderHook(() => useEquilibrioSectorial('company-1'), { wrapper });
    renderHook(() => useSegmentosAnalisis('company-1'), { wrapper });

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    expect(apiGet).toHaveBeenCalledWith('/companies/company-1/analisis/equilibrio-sectorial');
    expect(apiGet).toHaveBeenCalledWith('/companies/company-1/segmentos-analisis');
  });

  it('crea, edita y da de baja segmentos con el contrato publicado', async () => {
    const input = {
      nombre: 'Línea sintética',
      nivel: 'linea' as const,
      parentId: null,
      produccionConjunta: false,
      precioUnitario: 100,
      costoVariableUnitario: 40,
      participacion: 1,
      costoFijoDirecto: 4_000,
      prorrateoIndirectos: 12_000,
      coproductos: [],
    };
    apiPost.mockResolvedValue({ data: { data: { id: 'segmento-1', ...input } } });
    apiPatch.mockResolvedValue({ data: { data: { id: 'segmento-1', ...input } } });
    apiDelete.mockResolvedValue({ data: { data: { eliminado: true } } });

    const create = renderHook(() => useCreateSegmentoAnalisis('company-1'), { wrapper });
    const update = renderHook(() => useUpdateSegmentoAnalisis('company-1'), { wrapper });
    const remove = renderHook(() => useDeleteSegmentoAnalisis('company-1'), { wrapper });

    await create.result.current.mutateAsync(input);
    await update.result.current.mutateAsync({ id: 'segmento-1', input });
    await remove.result.current.mutateAsync('segmento-1');

    expect(apiPost).toHaveBeenCalledWith('/companies/company-1/segmentos-analisis', input);
    expect(apiPatch).toHaveBeenCalledWith('/companies/company-1/segmentos-analisis/segmento-1', input);
    expect(apiDelete).toHaveBeenCalledWith('/companies/company-1/segmentos-analisis/segmento-1');
  });
});
