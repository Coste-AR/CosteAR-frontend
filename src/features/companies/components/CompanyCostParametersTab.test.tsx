// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CostParameter } from '../cost-parameters-hooks';

const saveParameter = vi.fn();
const resetParameter = vi.fn();
const useCostParameters = vi.fn();

vi.mock('../cost-parameters-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cost-parameters-hooks')>();
  return {
    ...original,
    useCostParameters: () => useCostParameters(),
    useSaveCostParameter: () => ({ mutateAsync: saveParameter }),
    useResetCostParameter: () => ({ mutateAsync: resetParameter }),
  };
});

const PARAMETERS: CostParameter[] = [
  {
    clave: 'unidades_por_envase',
    valor: 360,
    descripcion: 'Unidades que entran en el envase de gestión.',
    unidad: 'unidad',
    valorDefault: 360,
    seguro: false,
    origen: 'default',
    confirmado: false,
    nota: 'Confirmar el formato que usa la empresa.',
  },
  {
    clave: 'vida_util_activo_meses',
    valor: 30,
    descripcion: 'Meses de vida útil del activo.',
    unidad: 'mes',
    valorDefault: 24,
    seguro: false,
    origen: 'empresa',
    confirmado: true,
    nota: 'Confirmar la vida útil estimada.',
  },
];
const SYSTEM_PARAMETER = PARAMETERS[0]!;
const COMPANY_PARAMETER = PARAMETERS[1]!;

const { CompanyCostParametersTab } = await import('./CompanyCostParametersTab');

beforeEach(() => {
  vi.clearAllMocks();
  saveParameter.mockResolvedValue({});
  resetParameter.mockResolvedValue({});
  useCostParameters.mockReturnValue({
    data: PARAMETERS,
    isLoading: false,
    isError: false,
    error: null,
  });
});

afterEach(cleanup);

describe('parámetros del negocio', () => {
  it('distingue una estimación del sistema de un valor confirmado y explica qué falta verificar', () => {
    render(<CompanyCostParametersTab companyId="company-test" />);

    expect(screen.getByText(SYSTEM_PARAMETER.descripcion)).toBeTruthy();
    expect(screen.getByText(COMPANY_PARAMETER.descripcion)).toBeTruthy();
    expect(screen.getByText('Estimación del sistema')).toBeTruthy();
    expect(screen.getByText('Confirmado por la empresa')).toBeTruthy();
    expect(screen.getByText(/Confirmar el formato que usa la empresa/i)).toBeTruthy();
    expect(screen.getByText(/Los períodos cerrados conservan los valores/i)).toBeTruthy();
  });

  it('guarda el número elegido solamente al presionar Guardar y confirmar', async () => {
    render(<CompanyCostParametersTab companyId="company-test" />);
    const row = screen.getByText(SYSTEM_PARAMETER.descripcion).closest('li');
    expect(row).not.toBeNull();

    const input = within(row!).getByLabelText('Valor del negocio');
    fireEvent.change(input, { target: { value: '375,5' } });
    expect(saveParameter).not.toHaveBeenCalled();
    fireEvent.click(within(row!).getByRole('button', { name: 'Guardar y confirmar' }));

    await waitFor(() => {
      expect(saveParameter).toHaveBeenCalledWith({ key: 'unidades_por_envase', value: 375.5 });
    });
    expect(await within(row!).findByText('Valor confirmado.')).toBeTruthy();
  });

  it('ofrece borrar el override sólo para volver al valor sugerido', async () => {
    render(<CompanyCostParametersTab companyId="company-test" />);
    const systemRow = screen.getByText(SYSTEM_PARAMETER.descripcion).closest('li');
    const companyRow = screen.getByText(COMPANY_PARAMETER.descripcion).closest('li');

    expect(within(systemRow!).queryByRole('button', { name: 'Volver al sugerido' })).toBeNull();
    fireEvent.click(within(companyRow!).getByRole('button', { name: 'Volver al sugerido' }));

    await waitFor(() => expect(resetParameter).toHaveBeenCalledWith('vida_util_activo_meses'));
    expect(await within(companyRow!).findByText('Volviste al valor sugerido.')).toBeTruthy();
  });
});
