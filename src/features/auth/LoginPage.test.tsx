// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigate = vi.fn();
const mutateAsync = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => navigate,
}));

vi.mock('./auth-hooks', () => ({
  useLogin: () => ({ mutateAsync }),
}));

vi.mock('@/lib/api', () => ({
  apiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Ocurrió un error inesperado',
}));

// El canvas animado no pertenece al comportamiento de autenticación y jsdom
// no implementa su contexto 2D. Se reemplaza para que un error de la decoración
// no pueda esconder una regresión del formulario.
vi.mock('@/components/layout/InteractiveDotGrid', () => ({
  InteractiveDotGrid: () => null,
}));

const { LoginPage } = await import('./LoginPage');

const USER = {
  id: 'usuario-prueba',
  email: 'persona@ejemplo.com',
  name: 'Persona de Prueba',
  role: 'COST_PROFESSIONAL',
  mustChangePassword: false,
  needsTermsAcceptance: false,
};

function completarLogin() {
  fireEvent.change(screen.getByLabelText('CUIT/CUIL o email'), {
    target: { value: 'persona@ejemplo.com' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'ClaveSegura1' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ user: USER, accessToken: 'token-prueba' });
});

afterEach(cleanup);

describe('login', () => {
  it('no dispara la petición con el formulario incompleto', () => {
    render(<LoginPage />);

    const submit = screen.getByRole('button', { name: 'Ingresar al Panel' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(submit.closest('form')!);

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('con credenciales válidas guarda la sesión y navega al dashboard', async () => {
    render(<LoginPage />);
    completarLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al Panel' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        identifier: 'persona@ejemplo.com',
        password: 'ClaveSegura1',
      });
    });
    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('con credenciales inválidas muestra el error y no navega', async () => {
    mutateAsync.mockRejectedValue(new Error('Credenciales inválidas'));
    render(<LoginPage />);
    completarLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al Panel' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un error de red libera el botón y no deja la pantalla cargando', async () => {
    let rejectRequest: ((reason?: unknown) => void) | undefined;
    mutateAsync.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    render(<LoginPage />);
    completarLogin();

    const submit = screen.getByRole('button', { name: 'Ingresar al Panel' });
    fireEvent.click(submit);
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(true));

    rejectRequest?.(new Error('No se pudo conectar'));

    expect(await screen.findByText('No se pudo conectar')).toBeTruthy();
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...USER, mustChangePassword: true }, '/change-password'],
    [{ ...USER, needsTermsAcceptance: true }, '/accept-terms'],
    [{ ...USER, role: 'EMPRESA_OPERATOR' }, '/portal'],
  ])('respeta el próximo paso obligatorio de la sesión', async (user, destination) => {
    mutateAsync.mockResolvedValue({ user, accessToken: 'token-prueba' });
    render(<LoginPage />);
    completarLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al Panel' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: destination }));
  });
});
