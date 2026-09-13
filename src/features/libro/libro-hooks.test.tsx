// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const { useLedger } = await import('./libro-hooks');

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
  apiGet.mockResolvedValue({
    data: { data: { entries: [], totalsBySection: {}, periods: ['2099-03'] } },
  });
});
afterEach(cleanup);

describe('libro de costos', () => {
  it('arma los filtros de empresa y período sin perder ninguno', async () => {
    const { result } = renderHook(() => useLedger('empresa 1', '2099-03'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith(
      '/validaciones/ledger?companyId=empresa+1&period=2099-03',
    );
    expect(result.current.data?.periods).toEqual(['2099-03']);
  });
});
