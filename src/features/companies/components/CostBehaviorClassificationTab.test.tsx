// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CostBehaviorClassification } from '../cost-behavior-hooks';

const mutateAsync = vi.fn();
const useCostBehaviorClassifications = vi.fn();

vi.mock('../cost-behavior-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cost-behavior-hooks')>();
  return {
    ...original,
    useCostBehaviorClassifications: () => useCostBehaviorClassifications(),
    useConfirmCostBehavior: () => ({
      mutateAsync,
      isPending: false,
      isError: false,
    }),
  };
});

const classifications: CostBehaviorClassification[] = [
  {
    clave: 'comportamiento_materia_prima',
    comportamientoVolumen: 'VARIABLE',
    origen: 'default',
    confirmado: false,
    clasificadoPorUserId: null,
    clasificadoEn: null,
    fundamento: 'La propuesta fue calculada por el dominio.',
  },
  {
    clave: 'comportamiento_mano_obra_directa',
    comportamientoVolumen: null,
    origen: 'default',
    confirmado: false,
    clasificadoPorUserId: null,
    clasificadoEn: null,
  },
  {
    clave: 'comportamiento_costos_indirectos',
    comportamientoVolumen: null,
    origen: 'default',
    confirmado: false,
    clasificadoPorUserId: null,
    clasificadoEn: null,
  },
];

const { CostBehaviorClassificationTab } = await import('./CostBehaviorClassificationTab');

beforeEach(() => {
  vi.clearAllMocks();
  useCostBehaviorClassifications.mockReturnValue(
    classifications.map((data) => ({ data, isLoading: false, isError: false, error: null })),
  );
  mutateAsync.mockImplementation(async ({ key, behavior }) => ({
    ...classifications.find((item) => item.clave === key),
    comportamientoVolumen: behavior,
    confirmado: true,
  }));
});

afterEach(cleanup);

describe('clasificación guiada fijo / variable', () => {
  it('muestra las propuestas del backend y explica fijo sin jerga', () => {
    render(<CostBehaviorClassificationTab companyId="company-test" />);

    expect(screen.getByText('Materia prima')).toBeTruthy();
    expect(screen.getByText('Mano de obra directa')).toBeTruthy();
    expect(screen.getByText('Costos indirectos de producción')).toBeTruthy();
    expect(screen.getByText(/“Fijo” no significa que nunca cambie/i)).toBeTruthy();
    expect(screen.getByText(/Propuesta del sistema:/i).textContent).toContain('Variable');
  });

  it('elegir una opción y salir sin confirmar no guarda nada', () => {
    const view = render(<CostBehaviorClassificationTab companyId="company-test" />);

    fireEvent.change(screen.getByLabelText('Clasificación para Mano de obra directa'), {
      target: { value: 'FIJO' },
    });
    view.unmount();

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('confirma solamente al presionar el botón explícito del concepto', async () => {
    render(<CostBehaviorClassificationTab companyId="company-test" />);
    const row = screen.getByText('Mano de obra directa').closest('li');
    expect(row).not.toBeNull();

    fireEvent.change(within(row!).getByLabelText('Clasificación para Mano de obra directa'), {
      target: { value: 'FIJO' },
    });
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(within(row!).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        key: 'comportamiento_mano_obra_directa',
        behavior: 'FIJO',
      });
    });
    expect(await within(row!).findByText('Clasificación confirmada.')).toBeTruthy();
  });
});
