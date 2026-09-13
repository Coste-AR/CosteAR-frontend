// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BusinessParameter } from '../cost-parameters-hooks';
import type { RubroModule } from '../rubro-configuration-hooks';

const setModule = vi.fn();
const saveOption = vi.fn();
const leavePending = vi.fn();
const useRubroModules = vi.fn();
const useCostParameters = vi.fn();

vi.mock('@/lib/api', () => ({
  apiErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Error inesperado',
}));

vi.mock('../rubro-configuration-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../rubro-configuration-hooks')>();
  return {
    ...original,
    useRubroModules: () => useRubroModules(),
    useSetRubroModule: () => ({ mutateAsync: setModule, isPending: false }),
  };
});

vi.mock('../cost-parameters-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cost-parameters-hooks')>();
  return {
    ...original,
    useCostParameters: () => useCostParameters(),
    useSaveOptionCostParameter: () => ({ mutateAsync: saveOption, isPending: false }),
    useLeaveOptionCostParameterPending: () => ({ mutateAsync: leavePending, isPending: false }),
  };
});

const { CompanyRubroConfiguration } = await import('./CompanyRubroConfiguration');

const MODULE: RubroModule = {
  clave: 'modulo-sintetico',
  nombre: 'Registro detallado',
  descripcion: 'Habilita el registro diario de la operación.',
  estado: 'prendido',
  porDefecto: true,
  dependeDe: [],
  parametros: ['pregunta-sintetica'],
  alertas: [],
};

const UNANSWERED_QUESTION: BusinessParameter = {
  clave: 'pregunta-sintetica',
  valor: null,
  descripcion: '¿Cómo registrás la operación?',
  opciones: [
    { valor: 'forma-a', etiqueta: 'De una forma' },
    { valor: 'forma-b', etiqueta: 'De otra forma' },
  ],
  origen: 'default',
  confirmado: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  setModule.mockResolvedValue({});
  saveOption.mockResolvedValue({});
  leavePending.mockResolvedValue({});
  useRubroModules.mockReturnValue({ data: [MODULE], isLoading: false, isError: false });
  useCostParameters.mockReturnValue({ data: [UNANSWERED_QUESTION], isLoading: false, isError: false });
});

afterEach(cleanup);

describe('configuración del rubro', () => {
  it('explica la consecuencia antes de apagar y que los datos no se borran', () => {
    render(<CompanyRubroConfiguration companyId="company-test" />);

    fireEvent.click(screen.getByRole('switch', { name: `Apagar ${MODULE.nombre}` }));

    expect(screen.getAllByText(MODULE.descripcion)).toHaveLength(2);
    expect(screen.getAllByText(/Los datos que ya cargaste no se borran/i)).toHaveLength(2);
    expect(setModule).not.toHaveBeenCalled();
  });

  it('deja una pregunta nueva sin responder sin disparar PUT ni DELETE', async () => {
    render(<CompanyRubroConfiguration companyId="company-test" />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }));

    await screen.findByText(/Respuestas guardadas/i);
    expect(saveOption).not.toHaveBeenCalled();
    expect(leavePending).not.toHaveBeenCalled();
  });

  it('usa DELETE y nunca PUT al cambiar una respuesta existente a no sé todavía', async () => {
    useCostParameters.mockReturnValue({
      data: [{ ...UNANSWERED_QUESTION, valor: 'forma-a', origen: 'empresa', confirmado: true }],
      isLoading: false,
      isError: false,
    });
    render(<CompanyRubroConfiguration companyId="company-test" />);

    fireEvent.click(screen.getByLabelText('No sé todavía'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }));

    await waitFor(() => expect(leavePending).toHaveBeenCalledWith('pregunta-sintetica'));
    expect(saveOption).not.toHaveBeenCalled();
  });

  it('muestra literalmente el motivo del backend y no apaga el módulo', async () => {
    const backendReason = 'No podés apagar este módulo porque Registro dependiente lo necesita.';
    setModule.mockRejectedValue(new Error(backendReason));
    render(<CompanyRubroConfiguration companyId="company-test" />);

    fireEvent.click(screen.getByRole('switch', { name: `Apagar ${MODULE.nombre}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, apagar' }));

    expect((await screen.findByRole('alert')).textContent).toContain(backendReason);
    expect(screen.getByRole('switch', { name: `Apagar ${MODULE.nombre}` }).getAttribute('aria-checked')).toBe('true');
  });
});
