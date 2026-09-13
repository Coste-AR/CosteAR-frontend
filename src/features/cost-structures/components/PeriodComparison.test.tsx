// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PeriodComparison } from './PeriodComparison';

const { useComparison } = vi.hoisted(() => ({ useComparison: vi.fn() }));

vi.mock('../period-hooks', () => ({
  usePeriods: () => ({
    data: [
      { code: '2099-01', label: 'Enero 2099' },
      { code: '2099-02', label: 'Febrero 2099' },
    ],
  }),
}));

vi.mock('../comparison-hooks', () => ({
  usePeriodComparison: () => useComparison(),
}));

const cero = { a: 0, b: 0, delta: 0, deltaPct: 0 };
const total = {
  rawMaterial: cero,
  directLabor: cero,
  indirectCosts: cero,
  productionCost: { a: 10, b: 12, delta: 2, deltaPct: 20 },
  costOfGoodsSold: cero,
  grossMargin: cero,
};

function comparison(unidadGestion: { codigo: string; nombre: string; factor: number } | null) {
  return {
    from: { code: '2099-01', label: 'Enero 2099', status: 'CLOSED', source: 'frozen' },
    to: { code: '2099-02', label: 'Febrero 2099', status: 'CLOSED', source: 'frozen' },
    units: { from: 10, to: 10, comparable: true },
    total,
    unit: total,
    components: [],
    componentsUnit: [],
    materials: [],
    departments: [],
    centers: [],
    offsetting: false,
    warnings: [],
    macroContrast: null,
    unidadGestion,
  };
}

afterEach(cleanup);

describe('comparación entre períodos — unidad declarada', () => {
  it('rotula el costo con la unidad que entrega la API', () => {
    useComparison.mockReturnValue({
      data: comparison({ codigo: 'bulto', nombre: 'Bulto', factor: 12 }),
      isLoading: false,
      error: null,
    });

    render(<PeriodComparison structureId="estructura-prueba" />);

    expect(screen.getByText('Costo por bulto')).toBeTruthy();
    expect(screen.queryByText('Costo por unidad')).toBeNull();
  });

  it('declara la ausencia en vez de inventar una unidad genérica', () => {
    useComparison.mockReturnValue({ data: comparison(null), isLoading: false, error: null });

    render(<PeriodComparison structureId="estructura-prueba" />);

    expect(screen.getByText('Costo · sin unidad declarada')).toBeTruthy();
    expect(screen.queryByText('Costo por unidad')).toBeNull();
  });
});
