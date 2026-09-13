// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: apiGet } }));
const { useEmpresaConnections } = await import('./empresa-hooks');

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('conexiones de empresa', () => {
  it('devuelve la lista del endpoint de conexiones sin alterar sus permisos', async () => {
    const connection = {
      id: 'conexion-1',
      companyId: 'empresa-1',
      costistId: 'costista-1',
      apiKey: 'oculta',
      whatsappPhoneNumber: null,
      isActive: true,
      createdAt: '2099-01-01',
      updatedAt: '2099-01-01',
      company: { id: 'empresa-1', name: 'Textil Norte', industry: 'Textil', cuit: null },
      _count: { dataEntries: 4 },
    };
    apiGet.mockResolvedValue({ data: { data: [connection] } });

    const { result } = renderHook(() => useEmpresaConnections(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith('/conexiones');
    expect(result.current.data).toEqual([connection]);
  });
});
