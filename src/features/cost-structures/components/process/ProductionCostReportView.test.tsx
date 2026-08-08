// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductionCostReportView } from './ProductionCostReportView';
import type { CostPeriod } from '../../period-hooks';
import type { CalculationTree, RunSummary } from '../../trazabilidad-types';
import type { ProcessDepartment, ProcessProductionReport } from '../../process-costing-types';

/**
 * EL ÁRBOL DE DERIVACIÓN NO PUEDE DEPENDER DE UN BOTÓN.
 *
 * El bug que cubren estos tests: el id de la corrida vivía en un `useState` que
 * solo llenaba un botón escondido dentro de esta pestaña. Quien apretaba el
 * "Calcular" de la cabecera calculaba bien, la corrida quedaba guardada con sus
 * nodos… y el árbol no aparecía nunca; al recargar tampoco. La promesa central
 * del producto —de dónde sale cada número— quedaba apagada por defecto.
 *
 * Por eso el test central NO aprieta nada: monta la pantalla con la corrida ya
 * en el server (sesión nueva, como después de un F5) y exige ver el árbol.
 */

// El árbol enlaza a la vista de trazabilidad; acá no hay router montado.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// Nada de red: todo lo que la pantalla necesita se siembra en la cache. Si
// alguna consulta se escapara, esto la hace fallar en vez de salir a internet.
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    post: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    put: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    patch: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    delete: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
  },
  apiErrorMessage: () => 'error',
}));

const STRUCTURE_ID = 'est-1';
const PERIOD_ID = 'per-1';
const RUN_ID = 'run-1';

const periodoJulio = {
  id: PERIOD_ID,
  code: '2026-07',
  label: 'Julio 2026',
  status: 'OPEN',
} as CostPeriod;

const departamentos = [{ id: 'dep-1', name: 'Molienda', sequence: 1 }] as ProcessDepartment[];

const informe = {
  product: 'Harina 000',
  period: 'Julio 2026',
  finalUnitCost: 123.456,
  finalDepartmentName: 'Molienda',
  departments: [],
} as unknown as ProcessProductionReport;

const corridaDeJulio = {
  id: RUN_ID,
  runN: 3,
  engineVersion: 'processes-v1',
  executedBy: 'Giuliana',
  executedAt: '2026-07-31T12:00:00.000Z',
  trigger: 'MANUAL',
  validated: false,
  validatedAt: null,
  periodo: { code: '2026-07', label: 'Julio 2026' },
  grossMargin: null,
  grossMarginPct: null,
} as RunSummary;

const arbol: CalculationTree = {
  runId: RUN_ID,
  runN: 3,
  engineVersion: 'processes-v1',
  tree: [
    {
      id: 'nodo-1',
      label: 'Costo unitario acumulado de Molienda',
      formula: 'costo propio + costo del anterior',
      value: 123.456,
      unit: '$',
      sourceDpVersionIds: [],
      children: [],
    },
  ],
};

/** Monta la pantalla con la cache ya sembrada: ninguna consulta sale a la red. */
function montar({ runs }: { runs: RunSummary[] }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });

  qc.setQueryData(['cost-structures', STRUCTURE_ID, 'periods'], [periodoJulio]);
  qc.setQueryData(['structures', STRUCTURE_ID, 'runs'], runs);
  qc.setQueryData(
    ['cost-structures', STRUCTURE_ID, 'process', 'production-report', PERIOD_ID],
    informe,
  );
  qc.setQueryData(['calculation-runs', RUN_ID, 'tree'], arbol);

  return render(
    <QueryClientProvider client={qc}>
      <ProductionCostReportView
        structureId={STRUCTURE_ID}
        periodId={PERIOD_ID}
        departments={departamentos}
        deptId="dep-1"
        onDeptChange={() => {}}
      />
    </QueryClientProvider>,
  );
}

const textoDe = (c: HTMLElement) => c.textContent ?? '';

afterEach(() => cleanup());

describe('ProductionCostReportView — árbol de derivación', () => {
  it('muestra el árbol de la corrida que ya está en el server, sin apretar ningún botón', () => {
    const { container } = montar({ runs: [corridaDeJulio] });

    // Nadie calculó en esta sesión: la corrida venía del server.
    expect(screen.getByText('Costo unitario acumulado de Molienda')).toBeTruthy();
    expect(textoDe(container)).toContain('Corrida #3');
    expect(textoDe(container)).not.toContain('Presioná');
  });

  it('muestra el estado vacío —no una tarjeta en blanco— cuando todavía no hay corrida', () => {
    const { container } = montar({ runs: [] });

    expect(screen.getByText('Árbol de derivación')).toBeTruthy();
    expect(textoDe(container)).toContain('para generar el árbol de derivación');
    expect(screen.queryByText('Costo unitario acumulado de Molienda')).toBeNull();
  });

  it('no toma la corrida de OTRO período: sería pintar los números de otro mes', () => {
    const corridaDeJunio: RunSummary = {
      ...corridaDeJulio,
      id: 'run-0',
      runN: 2,
      periodo: { code: '2026-06', label: 'Junio 2026' },
    };

    const { container } = montar({ runs: [corridaDeJunio] });

    expect(textoDe(container)).toContain('para generar el árbol de derivación');
  });

  it('no ofrece un segundo botón de Calcular dentro de la pestaña', () => {
    const { container } = montar({ runs: [corridaDeJulio] });

    expect(textoDe(container)).not.toContain('Calcular y guardar');
  });
});
