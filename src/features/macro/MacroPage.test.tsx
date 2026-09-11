// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: vi.fn() },
  apiErrorMessage: (error: Error) => error.message,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageHeader: ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
    <header><h1>{title}</h1><p>{description}</p>{action}</header>
  ),
}));
vi.mock('@/features/advisor/AdvisorPanel', () => ({ AdvisorPanel: () => null }));
const { MacroPage } = await import('./MacroPage');

let queryClient: QueryClient;
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  apiGet.mockResolvedValue({ data: { data: [] } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('variables macro', () => {
  it('explica el estado vacío y enlaza a la revisión de propagación', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MacroPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Todavía no hay datos macro/)).toBeTruthy());
    expect(apiGet).toHaveBeenCalledWith('/macro/latest');
    expect(screen.getByRole('link', { name: 'Ver impacto en cartera' }).getAttribute('href')).toBe('/propagacion');
  });
});
