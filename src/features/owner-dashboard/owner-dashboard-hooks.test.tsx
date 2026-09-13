// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: apiGet } }));
const { useOwnerDashboard } = await import('./owner-dashboard-hooks');

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
});
