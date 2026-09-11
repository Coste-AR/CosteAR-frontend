// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();

vi.mock('@/lib/api', () => ({ api: { get: apiGet, put: vi.fn() } }));

const { useAlerts, useMacroHistory } = await import('./alert-hooks');

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('consultas de alertas', () => {
  it('pide sólo alertas no leídas cuando el filtro está activo', async () => {
    apiGet.mockResolvedValue({ data: { data: [{ id: 'alerta-1' }] } });
    const { result } = renderHook(() => useAlerts(true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith('/alerts', { params: { unread: true } });
    expect(result.current.data).toEqual([{ id: 'alerta-1' }]);
  });

  it('no consulta historial hasta recibir un código de indicador', async () => {
    const { rerender } = renderHook(({ code }) => useMacroHistory(code), {
      wrapper,
      initialProps: { code: '' },
    });
    expect(apiGet).not.toHaveBeenCalled();

    apiGet.mockResolvedValue({ data: { data: [] } });
    rerender({ code: 'IPC_NACIONAL' });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith('/macro/history', {
      params: { indicator: 'IPC_NACIONAL' },
    });
  });
});
