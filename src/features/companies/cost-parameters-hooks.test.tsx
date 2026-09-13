// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, put: apiPut, delete: apiDelete },
}));

const {
  useCostParameters,
  useLeaveOptionCostParameterPending,
  useResetCostParameter,
  useSaveCostParameter,
  useSaveOptionCostParameter,
  isCompanyConfigurationComplete,
} = await import('./cost-parameters-hooks');

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('contrato HTTP de parámetros del negocio', () => {
  it('lee el catálogo resuelto de la empresa', async () => {
    const parameters = [{ clave: 'parametro', valor: 12 }];
    apiGet.mockResolvedValue({ data: { data: parameters } });
    const { result } = renderHook(() => useCostParameters('company-test'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledWith('/companies/company-test/parametros-costeo');
    expect(result.current.data).toEqual(parameters);
  });

  it('confirma explícitamente el valor que guarda la empresa', async () => {
    apiPut.mockResolvedValue({ data: { data: {} } });
    const { result } = renderHook(() => useSaveCostParameter('company-test'), { wrapper });

    await act(() => result.current.mutateAsync({ key: 'parametro', value: 18.5 }));

    expect(apiPut).toHaveBeenCalledWith('/companies/company-test/parametros-costeo/parametro', {
      valor: 18.5,
      confirmado: true,
    });
  });

  it('usa DELETE para volver a resolver la cascada sin fingir origen empresa', async () => {
    apiDelete.mockResolvedValue({ data: { data: { clave: 'parametro', origen: 'default' } } });
    const { result } = renderHook(() => useResetCostParameter('company-test'), { wrapper });

    await act(() => result.current.mutateAsync('parametro'));

    expect(apiDelete).toHaveBeenCalledWith('/companies/company-test/parametros-costeo/parametro');
  });

  it('guarda una opción como texto confirmado', async () => {
    apiPut.mockResolvedValue({ data: { data: {} } });
    const { result } = renderHook(() => useSaveOptionCostParameter('company-test'), { wrapper });

    await act(() => result.current.mutateAsync({ key: 'pregunta', value: 'opcion-b' }));

    expect(apiPut).toHaveBeenCalledWith('/companies/company-test/parametros-costeo/pregunta', {
      valorTexto: 'opcion-b',
      confirmado: true,
    });
  });

  it('usa DELETE para dejar pendiente una opción respondida', async () => {
    apiDelete.mockResolvedValue({ data: { data: {} } });
    const { result } = renderHook(() => useLeaveOptionCostParameterPending('company-test'), { wrapper });

    await act(() => result.current.mutateAsync('pregunta'));

    expect(apiDelete).toHaveBeenCalledWith('/companies/company-test/parametros-costeo/pregunta');
    expect(apiPut).not.toHaveBeenCalled();
  });
});

describe('configuración completa de una empresa', () => {
  const modules = [{
    clave: 'principal',
    nombre: 'Principal',
    descripcion: '',
    estado: 'prendido' as const,
    porDefecto: true,
    dependeDe: [],
    parametros: ['opcion'],
    alertas: [],
  }];

  it('queda incompleta con una opción activa pendiente o un número no confirmado', () => {
    const option = { clave: 'opcion', valor: null, descripcion: 'Opción', opciones: [], origen: 'default' as const, confirmado: false };
    const numeric = { clave: 'numero', valor: 12, valorDefault: 12, descripcion: 'Número', unidad: null, seguro: false, origen: 'default' as const, confirmado: false };

    expect(isCompanyConfigurationComplete(modules, [option, numeric])).toBe(false);
    expect(isCompanyConfigurationComplete(modules, [{ ...option, valor: 'a', confirmado: true }, numeric])).toBe(false);
    expect(isCompanyConfigurationComplete(modules, [{ ...option, valor: 'a', confirmado: true }, { ...numeric, confirmado: true }])).toBe(true);
  });
});
