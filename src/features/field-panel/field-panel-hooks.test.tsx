// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/lib/api', () => ({ api: { get: apiGet, post: apiPost } }));

const { useCreateDailyProduction, useCreateLotLoss, useProductiveLots } = await import('./field-panel-hooks');

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('contrato HTTP del panel de campo', () => {
  it('descubre los lotes de la empresa dueña', async () => {
    const lots = [{ id: 'lote-1', referencia: 'Lote 1', activo: true }];
    apiGet.mockResolvedValue({ data: { data: lots } });
    const { result } = renderHook(() => useProductiveLots('empresa-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith('/companies/empresa-1/lotes-productivos');
    expect(result.current.data).toEqual(lots);
  });

  it('envía la producción diaria al lote elegido', async () => {
    apiPost.mockResolvedValue({ data: { data: { id: 'produccion-1' } } });
    const input = {
      fecha: '2099-01-15',
      variante: 'total_diario',
      unidadesProducidas: 840,
      roturas: 0,
      descartes: 0,
    };
    const { result } = renderHook(() => useCreateDailyProduction('lote-1'), { wrapper });

    await act(() => result.current.mutateAsync(input));

    expect(apiPost).toHaveBeenCalledWith('/lotes/lote-1/producciones', input);
  });

  it('envía la baja con su motivo obligatorio', async () => {
    apiPost.mockResolvedValue({ data: { data: { id: 'evento-1' } } });
    const input = {
      tipo: 'baja' as const,
      cantidad: 3,
      fecha: '2099-01-15',
      motivo: 'mortalidad' as const,
    };
    const { result } = renderHook(() => useCreateLotLoss('lote-1'), { wrapper });

    await act(() => result.current.mutateAsync(input));

    expect(apiPost).toHaveBeenCalledWith('/lotes/lote-1/eventos', input);
  });
});
