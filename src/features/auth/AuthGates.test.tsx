// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

const navigate = vi.fn();
const setPasswordMutate = vi.fn();
const acceptTermsMutate = vi.fn();
const useCurrentTerms = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('./auth-hooks', () => ({
  useSetFirstPassword: () => ({ mutateAsync: setPasswordMutate, isPending: false }),
  useAcceptTerms: () => ({ mutateAsync: acceptTermsMutate, isPending: false }),
  useCurrentTerms: () => useCurrentTerms(),
}));

vi.mock('@/lib/api', () => ({
  apiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Ocurrió un error inesperado',
}));

const { ChangePasswordPage } = await import('./ChangePasswordPage');
const { AcceptTermsPage } = await import('./AcceptTermsPage');

const USER: AuthUser = {
  id: 'usuario-prueba',
  email: 'persona@ejemplo.com',
  name: 'Persona de Prueba',
  role: 'COST_PROFESSIONAL',
  mustChangePassword: true,
  needsTermsAcceptance: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'token-prueba', user: USER, initializing: false });
  setPasswordMutate.mockResolvedValue({});
  acceptTermsMutate.mockResolvedValue({});
  useCurrentTerms.mockReturnValue({
    data: { id: 'terms-2', version: 2, content: 'Condiciones de prueba' },
    isLoading: false,
    isError: false,
  });
});

afterEach(cleanup);

describe('cambio obligatorio de contraseña', () => {
  it('no envía una contraseña débil o que no coincide', () => {
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'debil' },
    });
    fireEvent.change(screen.getByLabelText('Confirmá la contraseña'), {
      target: { value: 'otra' },
    });

    const submit = screen.getByRole('button', { name: 'Guardar y continuar' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(submit.closest('form')!);
    expect(setPasswordMutate).not.toHaveBeenCalled();
  });

  it('guarda una contraseña válida y navega al destino del usuario', async () => {
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmá la contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

    await waitFor(() => expect(setPasswordMutate).toHaveBeenCalledWith('ClaveSegura1'));
    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('muestra el error y no navega cuando falla la petición', async () => {
    setPasswordMutate.mockRejectedValue(new Error('No se pudo cambiar la contraseña'));
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmá la contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

    expect(await screen.findByText('No se pudo cambiar la contraseña')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('aceptación obligatoria de términos', () => {
  it('no permite aceptar sin consentimiento explícito', () => {
    render(<AcceptTermsPage />);

    const submit = screen.getByRole('button', { name: 'Aceptar y continuar' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(acceptTermsMutate).not.toHaveBeenCalled();
  });

  it('acepta la versión mostrada y navega al destino del usuario', async () => {
    render(<AcceptTermsPage />);

    fireEvent.click(screen.getByLabelText(/Leí y acepto los Términos y Condiciones/i));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    await waitFor(() => expect(acceptTermsMutate).toHaveBeenCalledWith('terms-2'));
    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('muestra el error de aceptación y mantiene al usuario en la pantalla', async () => {
    acceptTermsMutate.mockRejectedValue(new Error('No se pudo registrar la aceptación'));
    render(<AcceptTermsPage />);

    fireEvent.click(screen.getByLabelText(/Leí y acepto los Términos y Condiciones/i));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    expect(await screen.findByText('No se pudo registrar la aceptación')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('declara el fallo cuando no se pueden cargar los términos', () => {
    useCurrentTerms.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<AcceptTermsPage />);

    expect(screen.getByText(/No pudimos cargar los Términos y Condiciones/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Aceptar y continuar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
