// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CalculationResult } from '@/lib/types';
import { ResultTab } from './ResultTab';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/advisor/AdvisorPanel', () => ({ AdvisorPanel: () => null }));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
  },
}));

const baseResult = {
  rawMaterialConsumed: 24_000,
  directLaborTotal: 18_000,
  indirectCostsApplied: 8_000,
  productionCost: 50_000,
  costOfGoodsSold: 48_000,
  grossMargin: 22_000,
  grossMarginPct: 31.43,
  detail: {
    rawMaterial: { optimalLot: 20, finalStockQty: 5, finalStockValue: 2_500 },
    directLabor: { workingDays: 240, itcsPercent: 30, iapPercent: 10, hourlyRates: {} },
    indirectCosts: { perDepartment: {} },
    unitCost: {
      unitsProduced: 40,
      unitProductionCost: 1_250,
      unitFinishedGoodsCost: 1_375,
      unitCostOfGoodsSold: 1_200,
      basadoEn: 'producidas',
    },
  },
  unidadGestion: { codigo: 'caja-prueba', nombre: 'Caja de prueba', factor: 10 },
} as unknown as CalculationResult;

function renderResult(result: CalculationResult) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResultTab result={result} />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('Resultado — los dos costos unitarios y su unidad', () => {
  it('muestra por separado el costo del período y el de lo efectivamente terminado', () => {
    renderResult(baseResult);

    const resumen = within(screen.getByTestId('unit-cost-summary'));
    expect(resumen.getByText('Costo unitario de producción')).toBeTruthy();
    expect(resumen.getByText('Costo unitario de productos terminados')).toBeTruthy();
    expect(resumen.getByText((text) => text.includes('1.250,00'))).toBeTruthy();
    expect(resumen.getByText((text) => text.includes('1.375,00'))).toBeTruthy();
    expect(resumen.getAllByText('por Caja de prueba')).toHaveLength(2);
    expect(resumen.getByText(/trabajo que quedó sin terminar/i)).toBeTruthy();
  });

  it('cuando ambos costos coinciden explica que no es un error', () => {
    const result = structuredClone(baseResult);
    result.detail.unitCost!.unitFinishedGoodsCost = 1_250;

    renderResult(result);

    expect(screen.getByText(/coinciden.*no es un error/i)).toBeTruthy();
  });

  it('si la API devuelve unidad nula declara la ausencia y no inventa una', () => {
    renderResult({ ...baseResult, unidadGestion: null } as unknown as CalculationResult);

    const resumen = within(screen.getByTestId('unit-cost-summary'));
    expect(resumen.getAllByText('Sin unidad declarada')).toHaveLength(2);
    expect(resumen.queryByText(/por unidad/i)).toBeNull();
    expect(resumen.queryByText(/por Caja de prueba/i)).toBeNull();
  });
});
