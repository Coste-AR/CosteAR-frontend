// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: apiPost, delete: vi.fn() },
}));
const { useGenerateOperatorAccess } = await import('./empresa-portal-hooks');

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  vi.clearAllMocks();
  apiPost.mockResolvedValue({ data: { data: { email: 'operador@empresa.test' } } });
});
afterEach(cleanup);

describe('alta de operadores', () => {
  it('recorta un puesto válido antes de enviarlo', async () => {
    const { result } = renderHook(() => useGenerateOperatorAccess('empresa-1'), { wrapper });

    await act(() => result.current.mutateAsync({
      operatorName: 'Ana Operadora',
      operatorEmail: 'operador@empresa.test',
      jobTitle: '  Jefa de depósito  ',
    }));

    expect(apiPost).toHaveBeenCalledWith('/empresa-portal/empresa-1/operators', {
      operatorName: 'Ana Operadora',
      operatorEmail: 'operador@empresa.test',
      jobTitle: 'Jefa de depósito',
    });
  });

  it('omite un puesto de una letra en vez de mandar un dato inválido', async () => {
    const { result } = renderHook(() => useGenerateOperatorAccess('empresa-1'), { wrapper });

    await act(() => result.current.mutateAsync({
      operatorName: 'Ana Operadora',
      operatorEmail: 'operador@empresa.test',
      jobTitle: 'X',
    }));

    expect(apiPost).toHaveBeenCalledWith('/empresa-portal/empresa-1/operators', {
      operatorName: 'Ana Operadora',
      operatorEmail: 'operador@empresa.test',
    });
  });
});
