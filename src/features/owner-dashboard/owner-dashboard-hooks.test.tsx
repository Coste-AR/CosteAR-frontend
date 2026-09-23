// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: apiGet } }));
const { useCapiaIndicators, useEquilibrioTramos, useOwnerDashboard, usePuntoCierre } = await import('./owner-dashboard-hooks');

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
});
