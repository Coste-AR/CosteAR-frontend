// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { post: apiPost },
  apiErrorMessage: (error: Error) => error.message,
}));
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <header><h1>{title}</h1><p>{description}</p></header>
  ),
}));
const { PropagacionPage } = await import('./PropagacionPage');

let queryClient: QueryClient;
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  apiPost.mockResolvedValue({
    data: { data: { preview: [], affectedCount: 0, indicator: 'USD +5%' } },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('revisión de propagación', () => {
  it('un preset completa el cambio y previsualiza su factor antes de aplicar', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PropagacionPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'USD +5%' }));
    expect(screen.getByLabelText('Descripción')).toHaveProperty('value', 'USD +5%');
    expect(screen.getByLabelText('Variación (%)')).toHaveProperty('value', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Ver impacto' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/macro/propagation-preview', {
      changeFactor: 1.05,
      indicatorLabel: 'USD +5%',
    }));
    expect(screen.getByText('Detalle de propagación — USD +5%')).toBeTruthy();
  });
});
