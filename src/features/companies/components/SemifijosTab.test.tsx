// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { SeparacionSemifija } from '../tramo-semifijo-hooks';

const previsualizar = vi.fn();
const guardar = vi.fn();
const refetchGuardada = vi.fn();
const useConceptosSemifijos = vi.fn();
const useSeparacionGuardada = vi.fn();

vi.mock('../tramo-semifijo-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../tramo-semifijo-hooks')>();
  return {
    ...original,
    useConceptosSemifijos: () => useConceptosSemifijos(),
    useSeparacionGuardada: () => useSeparacionGuardada(),
    usePrevisualizarSeparacion: () => ({ mutateAsync: previsualizar, isPending: false }),
    useGuardarSeparacion: () => ({ mutateAsync: guardar, isPending: false }),
  };
});

const { SemifijosTab } = await import('./SemifijosTab');

const CONCEPTO = {
  id: '33333333-3333-4333-8333-333333333333',
  clave: 'energia_planta',
  descripcion: 'Luz de la planta',
  confirmado: true,
};

/** El 422 del backend llega como AxiosError; `apiErrorMessage` lee `error.message`. */
function error422(mensaje: string) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 422,
    statusText: 'Unprocessable Entity',
    headers: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: {} as any,
    data: { error: { code: 'UNPROCESSABLE_ENTITY', message: mensaje } },
  });
}

function elegirConcepto() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Concepto semifijo' }), {
    target: { value: CONCEPTO.id },
  });
}

function completar({ importe, metodo }: { importe: string; metodo: string }) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Cómo separarlo' }), {
    target: { value: metodo },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Importe a separar' }), {
    target: { value: importe },
  });
}

function declarar(fija: string, variable: string) {
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Parte fija declarada' }), {
    target: { value: fija },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Parte variable declarada' }), {
    target: { value: variable },
  });
}

const botonGuardar = () => screen.getByRole('button', { name: 'Guardar la separación' });
const botonVer = () => screen.getByRole('button', { name: 'Ver la separación' });

beforeEach(() => {
  vi.clearAllMocks();
  useConceptosSemifijos.mockReturnValue({
    data: [CONCEPTO],
    isLoading: false,
    isError: false,
    error: null,
  });
  useSeparacionGuardada.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchGuardada,
  });
});

afterEach(cleanup);

describe('desagregación de costos semifijos', () => {
  // EL CASO NEGATIVO VA PRIMERO (Constitución §5). Es el que importa: si las
  // partes no suman el importe, el backend lo rechaza y la pantalla tiene que
  // mostrar ESE mensaje, no ajustar nada por su cuenta ni dejar guardar.
  it('muestra el mensaje del backend cuando las partes no suman, y no guarda', async () => {
    const mensaje =
      'La porción fija (54000.00) más la variable (35000.00) tiene que ser igual al importe (90000.00); no se ajusta en silencio.';
    previsualizar.mockRejectedValue(error422(mensaje));

    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();
    completar({ importe: '90000', metodo: 'DECLARADO' });
    declarar('54000', '35000');
    fireEvent.click(botonVer());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(mensaje));
    expect(botonGuardar()).toHaveProperty('disabled', true);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('con 54.000 / 36.000 sobre 90.000 muestra las dos partes y deja guardarlas', async () => {
    const separacion: SeparacionSemifija = {
      importe: 90000,
      porcionFija: 54000,
      porcionVariable: 36000,
      metodo: 'DECLARADO',
      observacionesBase: [],
      costoVariableUnitario: null,
      coeficienteCorrelacion: null,
    };
    previsualizar.mockResolvedValue(separacion);
    guardar.mockResolvedValue(separacion);

    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();
    completar({ importe: '90000', metodo: 'DECLARADO' });
    declarar('54000', '36000');

    // Antes de mirar la separación no se puede guardar: el issue pide que la
    // persona vea la cuenta antes de persistirla.
    expect(botonGuardar()).toHaveProperty('disabled', true);

    fireEvent.click(botonVer());
    await waitFor(() => expect(screen.getByText(/54\.000,00/)).toBeTruthy());
    expect(screen.getByText(/36\.000,00/)).toBeTruthy();
    expect(botonGuardar()).toHaveProperty('disabled', false);

    fireEvent.click(botonGuardar());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Separación guardada.'));
    expect(guardar).toHaveBeenCalledWith({
      importe: 90000,
      metodo: 'DECLARADO',
      porcionFija: 54000,
      porcionVariable: 36000,
    });
  });

  it('con puntos extremos muestra 30.000 fijo, 60.000 variable y 300 por unidad antes de guardar', async () => {
    previsualizar.mockResolvedValue({
      importe: 90000,
      porcionFija: 30000,
      porcionVariable: 60000,
      metodo: 'PUNTOS_EXTREMOS',
      observacionesBase: [
        { volumen: 100, importe: 60000 },
        { volumen: 200, importe: 90000 },
      ],
      costoVariableUnitario: 300,
      coeficienteCorrelacion: null,
    } satisfies SeparacionSemifija);

    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();
    completar({ importe: '90000', metodo: 'PUNTOS_EXTREMOS' });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Volumen 1' }), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Importe 1' }), {
      target: { value: '60000' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Volumen 2' }), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Importe 2' }), {
      target: { value: '90000' },
    });
    fireEvent.click(botonVer());

    await waitFor(() => expect(screen.getByText(/30\.000,00/)).toBeTruthy());
    expect(screen.getByText(/60\.000,00/)).toBeTruthy();
    expect(screen.getByText(/\b300,00/)).toBeTruthy();
    expect(previsualizar).toHaveBeenCalledWith({
      importe: 90000,
      metodo: 'PUNTOS_EXTREMOS',
      observacionesBase: [
        { volumen: 100, importe: 60000 },
        { volumen: 200, importe: 90000 },
      ],
    });
    // Ver no guarda.
    expect(guardar).not.toHaveBeenCalled();
  });

  // Constitución §2: lo que el método no produce se dice; no se muestra cero
  // ni un guión, que se leen como "es cero".
  it('declara que el método no calcula el coeficiente en vez de mostrar cero', async () => {
    previsualizar.mockResolvedValue({
      importe: 90000,
      porcionFija: 30000,
      porcionVariable: 60000,
      metodo: 'PUNTOS_EXTREMOS',
      observacionesBase: [],
      costoVariableUnitario: 300,
      coeficienteCorrelacion: null,
    } satisfies SeparacionSemifija);

    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();
    completar({ importe: '90000', metodo: 'PUNTOS_EXTREMOS' });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Volumen 1' }), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Importe 1' }), {
      target: { value: '60000' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Volumen 2' }), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Importe 2' }), {
      target: { value: '90000' },
    });
    fireEvent.click(botonVer());

    await waitFor(() => expect(screen.getAllByText('Este método no lo calcula.').length).toBe(1));
  });

  it('apaga el guardado si se cambia un dato después de ver la separación', async () => {
    previsualizar.mockResolvedValue({
      importe: 90000,
      porcionFija: 54000,
      porcionVariable: 36000,
      metodo: 'DECLARADO',
      observacionesBase: [],
      costoVariableUnitario: null,
      coeficienteCorrelacion: null,
    } satisfies SeparacionSemifija);

    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();
    completar({ importe: '90000', metodo: 'DECLARADO' });
    declarar('54000', '36000');
    fireEvent.click(botonVer());
    await waitFor(() => expect(botonGuardar()).toHaveProperty('disabled', false));

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Parte fija declarada' }), {
      target: { value: '50000' },
    });

    expect(botonGuardar()).toHaveProperty('disabled', true);
    expect(screen.getByText(/Volvé a tocar/)).toBeTruthy();
  });

  it('dice que el concepto no tiene separación guardada en vez de mostrar ceros', () => {
    render(<SemifijosTab companyId="company-test" />);
    elegirConcepto();

    expect(
      screen.getByText('Este concepto todavía no tiene una separación guardada.'),
    ).toBeTruthy();
  });
});
