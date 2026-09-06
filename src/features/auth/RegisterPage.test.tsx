// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigate = vi.fn();
const registerMutate = vi.fn();
const apiGet = vi.fn();
const toastError = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => navigate,
}));

vi.mock('./auth-hooks', () => ({
  useRegister: () => ({ mutateAsync: registerMutate, isPending: false }),
  useCurrentTerms: () => ({
    data: { id: 'terms-2', version: 2, content: 'Condiciones de prueba' },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet },
  apiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Ocurrió un error inesperado',
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastError },
}));

vi.mock('@/components/layout/InteractiveDotGrid', () => ({
  InteractiveDotGrid: () => null,
}));

const { RegisterPage } = await import('./RegisterPage');

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockResolvedValue({ data: { data: { available: true } } });
  registerMutate.mockResolvedValue({});
});

afterEach(cleanup);

describe('registro', () => {
  it('no permite avanzar ni registrarse con la cuenta incompleta', () => {
    render(<RegisterPage />);

    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(continueButton);

    expect(screen.getByText('Cuenta')).toBeTruthy();
    expect(registerMutate).not.toHaveBeenCalled();
  });

  it('un fallo al verificar el email se muestra y bloquea el avance', async () => {
    apiGet.mockRejectedValue(new Error('Sin conexión'));
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'persona@ejemplo.com' },
    });

    await waitFor(
      () => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('verificar el email')),
      { timeout: 1500 },
    );
    expect(screen.getByText(/No pudimos verificar el email/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Continuar/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(registerMutate).not.toHaveBeenCalled();
  });

  it('completa el recorrido y envía la versión de términos aceptada', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Nombre y apellido'), {
      target: { value: 'Persona de Prueba' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'persona@ejemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('CUIT/CUIL'), {
      target: { value: '20123456786' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'ClaveSegura1' },
    });

    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    await waitFor(() => expect((continueButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(continueButton);

    expect(await screen.findByRole('heading', { name: 'Datos profesionales' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Contador Público' }));
    const professionalContinue = screen.getByRole('button', { name: /Continuar/i });
    await waitFor(() => expect((professionalContinue as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(professionalContinue);

    expect(await screen.findByRole('heading', { name: 'Tu cartera' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Más tarde' }));
    const clientsContinue = screen.getByRole('button', { name: /Continuar/i });
    await waitFor(() => expect((clientsContinue as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(clientsContinue);

    expect(await screen.findByRole('heading', { name: 'Preferencias' })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(registerMutate).toHaveBeenCalledTimes(1));
    expect(registerMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Persona de Prueba',
        email: 'persona@ejemplo.com',
        cuit: '20-12345678-6',
        professionalType: 'CONTADOR_PUBLICO',
        acceptedTerms: true,
        termsVersionId: 'terms-2',
      }),
    );
    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });
});
