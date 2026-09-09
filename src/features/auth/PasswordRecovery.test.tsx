// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigate = vi.fn();
const forgotMutate = vi.fn();
const resetMutate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => navigate,
}));

vi.mock('./auth-hooks', () => ({
  useForgotPassword: () => ({ mutateAsync: forgotMutate, isPending: false }),
  useResetPassword: () => ({ mutateAsync: resetMutate, isPending: false }),
}));

vi.mock('@/lib/api', () => ({
  apiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Ocurrió un error inesperado',
}));

const { ForgotPasswordPage } = await import('./ForgotPasswordPage');
const { ResetPasswordPage } = await import('./ResetPasswordPage');

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
  forgotMutate.mockResolvedValue({ message: 'ok' });
  resetMutate.mockResolvedValue({});
});

afterEach(cleanup);

describe('recuperación de contraseña', () => {
  it('no envía una recuperación sin email', () => {
    render(<ForgotPasswordPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(forgotMutate).not.toHaveBeenCalled();
  });

  it.each([
    ['cuando el backend responde', false],
    ['cuando la petición falla', true],
  ])('mantiene una respuesta neutra %s', async (_case, fails) => {
    if (fails) forgotMutate.mockRejectedValue(new Error('Sin conexión'));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'persona@ejemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByText(/Si el email existe/i)).toBeTruthy();
    expect(forgotMutate).toHaveBeenCalledWith('persona@ejemplo.com');
    expect(screen.queryByText('Sin conexión')).toBeNull();
  });

  it('un enlace sin token se declara inválido y no muestra el formulario', () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText(/El enlace no es válido o está incompleto/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar contraseña' })).toBeNull();
    expect(resetMutate).not.toHaveBeenCalled();
  });

  it('un token vencido muestra el error y no navega', async () => {
    window.history.replaceState({}, '', '/reset-password?token=token-vencido');
    resetMutate.mockRejectedValue(new Error('El enlace venció o no es válido'));
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.change(screen.getByLabelText('Repetir contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('El enlace venció o no es válido')).toBeTruthy();
    expect(resetMutate).toHaveBeenCalledWith({
      token: 'token-vencido',
      password: 'ClaveSegura1',
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('una contraseña nueva válida completa el reseteo', async () => {
    window.history.replaceState({}, '', '/reset-password?token=token-valido');
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.change(screen.getByLabelText('Repetir contraseña'), {
      target: { value: 'ClaveSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() => expect(resetMutate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('¡Contraseña actualizada!')).toBeTruthy();
  });
});
