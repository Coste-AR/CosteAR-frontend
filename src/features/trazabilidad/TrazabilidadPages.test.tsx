// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'dato-1', runId: 'run-1' }),
  useSearch: () => ({ period: '2099-04', structureId: 'estructura-1' }),
  Link: ({ children }: { children: ReactNode }) => <a href="/dashboard">{children}</a>,
}));
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/features/cost-structures/trazabilidad-hooks', () => ({
  useDataPointTrace: () => ({
    data: {
      id: 'dato-1',
      label: 'Precio de tela',
      display: '$ 2.500',
      status: 'validado',
      signedBy: null,
      fields: [],
      periods: { hecho: '2099-04-03', captacion: '2099-04-04T12:00:00.000Z', imputado: '2099-04' },
      evidence: null,
      versions: [],
      impacts: ['Materia Prima', 'Costo de producción'],
    },
    isLoading: false,
    error: null,
  }),
  useCalculationTree: () => ({
    data: { runId: 'run-1', runN: 3, engineVersion: 'e2e', tree: [] },
    isLoading: false,
    error: null,
  }),
  useStructureRuns: () => ({ data: [] }),
}));
const { TrazabilidadCalculoPage, TrazabilidadDatoPage } = await import('./TrazabilidadPages');

afterEach(cleanup);

describe('comprobantes de trazabilidad', () => {
  it('la ficha muestra estado, período e impactos del dato', () => {
    render(<TrazabilidadDatoPage />);

    expect(screen.getByRole('heading', { name: 'Precio de tela' })).toBeTruthy();
    expect(screen.getByText('Validado')).toBeTruthy();
    expect(screen.getByText('Período: 2099-04')).toBeTruthy();
    expect(screen.getByText(/Materia Prima/)).toBeTruthy();
  });

  it('el cálculo identifica la corrida y la versión del motor', () => {
    render(<TrazabilidadCalculoPage />);

    expect(screen.getByRole('heading', { name: 'Corrida #3' })).toBeTruthy();
    expect(screen.getByText(/Motor e2e/)).toBeTruthy();
  });
});
