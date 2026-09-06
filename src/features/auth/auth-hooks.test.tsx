// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: apiPost },
}));

const {
  useAcceptTerms,
  useForgotPassword,
  useLogin,
  useLogout,
  useRegister,
  useResetPassword,
  useSetFirstPassword,
} = await import('./auth-hooks');

const USER: AuthUser = {
  id: 'usuario-prueba',
  email: 'persona@ejemplo.com',
  name: 'Persona de Prueba',
  role: 'COST_PROFESSIONAL',
  mustChangePassword: true,
  needsTermsAcceptance: true,
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: null, user: null, initializing: false });
});

afterEach(cleanup);

describe('hooks de autenticación', () => {
  it('login envía las credenciales y guarda la sesión devuelta', async () => {
    apiPost.mockResolvedValue({ data: { data: { accessToken: 'token-prueba', user: USER } } });
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ identifier: 'persona@ejemplo.com', password: 'ClaveSegura1' }),
    );

    expect(apiPost).toHaveBeenCalledWith('/auth/login', {
      identifier: 'persona@ejemplo.com',
      password: 'ClaveSegura1',
    });
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'token-prueba',
      user: USER,
    });
  });

  it('registro guarda la sesión sólo después de una respuesta exitosa', async () => {
    apiPost.mockResolvedValue({ data: { data: { accessToken: 'token-registro', user: USER } } });
    const { result } = renderHook(() => useRegister(), { wrapper });
    const payload = {
      email: 'persona@ejemplo.com',
      password: 'ClaveSegura1',
      name: 'Persona de Prueba',
      cuit: '20-12345678-6',
      professionalType: 'CONTADOR_PUBLICO' as const,
      province: 'Tucumán',
      marginThresholdPct: 15,
      acceptedTerms: true as const,
      termsVersionId: 'terms-2',
    };

    await act(() => result.current.mutateAsync(payload));

    expect(apiPost).toHaveBeenCalledWith('/auth/register', payload);
    expect(useAuthStore.getState().accessToken).toBe('token-registro');
  });

  it('cambiar la primera contraseña limpia el bloqueo conservando la sesión', async () => {
    useAuthStore.setState({ accessToken: 'token-prueba', user: USER, initializing: false });
    apiPost.mockResolvedValue({});
    const { result } = renderHook(() => useSetFirstPassword(), { wrapper });

    await act(() => result.current.mutateAsync('ClaveNueva1'));

    expect(apiPost).toHaveBeenCalledWith('/auth/set-first-password', {
      newPassword: 'ClaveNueva1',
    });
    expect(useAuthStore.getState().user?.mustChangePassword).toBe(false);
    expect(useAuthStore.getState().accessToken).toBe('token-prueba');
  });

  it('aceptar términos limpia únicamente el bloqueo correspondiente', async () => {
    useAuthStore.setState({ accessToken: 'token-prueba', user: USER, initializing: false });
    apiPost.mockResolvedValue({});
    const { result } = renderHook(() => useAcceptTerms(), { wrapper });

    await act(() => result.current.mutateAsync('terms-2'));

    expect(apiPost).toHaveBeenCalledWith('/terms/accept', { termsVersionId: 'terms-2' });
    expect(useAuthStore.getState().user).toMatchObject({
      mustChangePassword: true,
      needsTermsAcceptance: false,
    });
  });

  it('logout limpia la sesión aunque falle la red', async () => {
    useAuthStore.setState({ accessToken: 'token-prueba', user: USER, initializing: false });
    apiPost.mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useLogout(), { wrapper });

    let logoutError: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch (error) {
        logoutError = error;
      }
    });

    expect(logoutError).toEqual(new Error('Sin conexión'));
    await waitFor(() => {
      expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null });
    });
  });

  it('recuperación y reseteo envían sólo los datos esperados', async () => {
    apiPost
      .mockResolvedValueOnce({ data: { data: { message: 'ok' } } })
      .mockResolvedValueOnce({ data: { data: {} } });
    const forgot = renderHook(() => useForgotPassword(), { wrapper });
    const reset = renderHook(() => useResetPassword(), { wrapper });

    await act(() => forgot.result.current.mutateAsync('persona@ejemplo.com'));
    await act(() =>
      reset.result.current.mutateAsync({ token: 'token-recuperacion', password: 'ClaveNueva1' }),
    );

    expect(apiPost).toHaveBeenNthCalledWith(1, '/auth/forgot-password', {
      email: 'persona@ejemplo.com',
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, '/auth/reset-password', {
      token: 'token-recuperacion',
      password: 'ClaveNueva1',
    });
  });
});
