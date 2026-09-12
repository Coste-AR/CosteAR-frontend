// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
const apiPut = vi.fn();

vi.mock('@/lib/api', () => ({ api: { get: apiGet, put: apiPut } }));

const { useRubroModules, useSetRubroModule } = await import('./rubro-configuration-hooks');

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

describe('contrato HTTP de módulos del rubro', () => {
  it('lee todos los módulos de la empresa', async () => {
    const modules = [{ clave: 'modulo-a', estado: 'prendido' }];
    apiGet.mockResolvedValue({ data: { data: modules } });
    const { result } = renderHook(() => useRubroModules('company-test'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith('/companies/company-test/modulos-rubro');
    expect(result.current.data).toEqual(modules);
  });

  it('manda el estado explícito al prender o apagar', async () => {
    apiPut.mockResolvedValue({
      data: { data: { clave: 'modulo-a', estado: 'apagado' } },
    });
    const { result } = renderHook(() => useSetRubroModule('company-test'), { wrapper });

    await act(() => result.current.mutateAsync({ key: 'modulo-a', active: false }));

    expect(apiPut).toHaveBeenCalledWith('/companies/company-test/modulos-rubro/modulo-a', {
      activo: false,
    });
  });
});
