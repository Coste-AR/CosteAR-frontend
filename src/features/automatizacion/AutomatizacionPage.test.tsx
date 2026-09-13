// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: apiGet } }));
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageHeader: ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
    <header><h1>{title}</h1><p>{description}</p>{action}</header>
  ),
}));
const { AutomatizacionPage } = await import('./AutomatizacionPage');

let queryClient: QueryClient;
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  apiGet.mockResolvedValue({ data: { data: [], total: 0 } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('centro de automatización', () => {
  it('consulta el feed y conserva visible el pipeline cuando todavía no hay actividad', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AutomatizacionPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Centro de Automatización' })).toBeTruthy();
    expect(screen.getByText('Clasificador')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Sin actividad todavía')).toBeTruthy());
    expect(apiGet).toHaveBeenCalledWith('/validaciones/feed');
  });
});
