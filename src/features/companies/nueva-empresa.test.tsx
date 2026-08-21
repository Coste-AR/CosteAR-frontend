// @vitest-environment jsdom
/**
 * F-01 — CREAR EMPRESA MUESTRA CONFIRMACIÓN ANTES DE NAVEGAR.
 *
 * Antes, el formulario navegaba en silencio tras el éxito. Con red mala el
 * usuario no sabía si la empresa quedó creada hasta ver los datos cargados,
 * y podía apretar "Crear" dos veces. Estos tests verifican:
 *
 *   1. Al crear con éxito, aparece un toast con el nombre de la empresa.
 *   2. Después del toast, se navega hacia el setup de la empresa.
 *   3. Si la creación falla, no navega y no muestra toast de éxito.
 *
 * El botón con loading=true queda disabled por el componente Button
 * (disabled={disabled || loading}) — invariante del componente, no del form.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigate = vi.fn();
const mutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('./company-hooks', () => ({
  useCreateCompany: () => ({ mutateAsync, isPending: false }),
  useCompanies: () => ({ data: [], isLoading: false }),
  useDeleteCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/use-dictation', () => ({
  useDictation: () => ({ toggle: vi.fn(), listening: false, error: null }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const { NewCompanyForm } = await import('./CompaniesPage');

/**
 * Abre el dropdown del Select (click en el botón trigger) y elige una opción
 * por su texto. El Select personalizado despacha el cambio hacia react-hook-form
 * cuando se hace click en el item del listbox.
 */
function elegirOpcion(labelTexto: RegExp | string, opcionTexto: RegExp | string) {
  fireEvent.click(screen.getByText(labelTexto));
  const allMatches = screen.getAllByText(opcionTexto);
  const visibleOption = allMatches.find(el => el.getAttribute('role') === 'option');
  fireEvent.click(visibleOption!);
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ id: 'empresa-123' });
});

afterEach(cleanup);

describe('NewCompanyForm — confirmación de alta', () => {
  it('al crear con éxito muestra toast con el nombre de la empresa y navega al setup', async () => {
    render(<NewCompanyForm onDone={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/ABC Metalúrgica/i), {
      target: { value: 'Piezas del Norte SA' },
    });

    elegirOpcion('Seleccioná un rubro', 'Gastronomía');
    elegirOpcion('Seleccioná un ritmo', /Mensual/);
    elegirOpcion('Seleccioná la condición', /Responsable Inscripto/);

    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Piezas del Norte SA'),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: '/companies/$id/setup',
      params: { id: 'empresa-123' },
    });
  });

  it('si la creación falla, no navega y no muestra toast de éxito', async () => {
    mutateAsync.mockRejectedValue(new Error('Network error'));

    render(<NewCompanyForm onDone={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/ABC Metalúrgica/i), {
      target: { value: 'Empresa Fallida SRL' },
    });

    elegirOpcion('Seleccioná un rubro', 'Gastronomía');
    elegirOpcion('Seleccioná un ritmo', /Mensual/);
    elegirOpcion('Seleccioná la condición', /Responsable Inscripto/);

    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
