// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DataPointTrace } from './trazabilidad-types';

/**
 * T-04 — "DE DÓNDE SALIÓ ESTE NÚMERO" TIENE DOS RESPUESTAS POSIBLES.
 *
 * "Lo cargó Fulano" siempre funcionó. "Está en esta factura" no existía: la
 * tabla de comprobantes no tenía un solo productor en todo el backend, el botón
 * "Ver comprobante" era código muerto y el estado `con-comprobante` del
 * componente compartido de fin de cadena era INALCANZABLE.
 *
 * Frente a un tercero —una inspección, un juicio, una due diligence— la segunda
 * respuesta es la única que cuenta. Estos tests miran la ficha del dato, que es
 * donde el costista la ve, y verifican los tres estados:
 *
 *   1. sin comprobante  → se dice que es un fin de cadena legítimo Y se ofrece
 *                         adjuntar uno;
 *   2. con comprobante y archivo → "Ver comprobante" lleva a algún lado;
 *   3. con comprobante sin archivo → se dice que es por referencia, en vez de
 *                         un botón que no abre nada (el manual admite el
 *                         comprobante sin archivo).
 */

const mutateAsync = vi.fn();
const useDataPointTrace = vi.fn();

vi.mock('./trazabilidad-hooks', () => ({
  useCalculationTree: () => ({ data: undefined, isLoading: false }),
  useDataPointTrace: (id: string) => useDataPointTrace(id),
  usePedirRevision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdjuntarComprobante: () => ({ mutateAsync, isPending: false }),
  MAX_ARCHIVO_BYTES: 500 * 1024,
  MSG_ARCHIVO_GRANDE: 'El archivo es muy grande (máximo 500 KB). Subí una versión más liviana.',
}));

// La ficha linkea a su pantalla propia; acá no hay router montado y ese link no
// es lo que se está probando.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

const { TraceCard } = await import('./DerivationTree');

const TRACE_BASE: DataPointTrace = {
  id: 'dp-1',
  label: 'Energía eléctrica — planta',
  display: '$ 184.500,50',
  status: 'validado',
  signedBy: null,
  fields: [],
  periods: { hecho: '2026-08-01', captacion: '2026-08-02T10:00:00Z', imputado: '2026-08' },
  evidence: null,
  versions: [{ n: 1, current: true, display: '184500.5', reason: null, by: 'Ana', at: '2026-08-02T10:00:00Z' }],
  impacts: ['Costo de producción'],
};

function montar(trace: DataPointTrace) {
  useDataPointTrace.mockReturnValue({ data: trace, isLoading: false, error: null });
  return render(<TraceCard dataPointId="dp-1" onClose={() => {}} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ id: 'ev-1', aviso: null });
});
afterEach(cleanup);

describe('ficha del dato — el comprobante', () => {
  it('sin comprobante: lo dice como fin de cadena legítimo y ofrece adjuntar uno', () => {
    const { container } = montar(TRACE_BASE);

    // El texto sale del componente compartido, no de una copia local: es lo que
    // impide que el árbol y la ficha digan cosas distintas del mismo dato.
    expect(container.querySelector('[data-estado="dato-cargado"]')).not.toBeNull();
    expect(screen.getByText(/no hay comprobante asociado/i)).toBeTruthy();

    // Lo que faltaba: la salida. Antes la ficha te decía que no había
    // comprobante y ahí terminaba todo.
    expect(screen.getByRole('button', { name: /adjuntar comprobante/i })).toBeTruthy();
  });

  it('con comprobante y archivo: "Ver comprobante" lleva de verdad al archivo', () => {
    const { container } = montar({
      ...TRACE_BASE,
      evidence: {
        kind: 'factura',
        reference: 'A 0001-00012345',
        counterparty: 'Energía del Norte SA',
        fileUrl: 'https://archivos.test/factura.pdf',
      },
    });

    // El estado que hasta hoy no se podía alcanzar desde ninguna pantalla.
    expect(container.querySelector('[data-estado="con-comprobante"]')).not.toBeNull();

    // Tipo en castellano ('factura' nunca se muestra crudo), referencia y de
    // quién es: los tres datos que necesita quien audita.
    expect(screen.getByText(/Factura A 0001-00012345/)).toBeTruthy();
    expect(screen.getByText(/Energía del Norte SA/)).toBeTruthy();

    const link = container.querySelector('a[href="https://archivos.test/factura.pdf"]');
    expect(link).not.toBeNull();

    // Ya tiene comprobante: no se vuelve a ofrecer adjuntar.
    expect(screen.queryByRole('button', { name: /adjuntar comprobante/i })).toBeNull();
  });

  it('con comprobante sin archivo: se dice que es por referencia, sin botón que no abra nada', () => {
    const { container } = montar({
      ...TRACE_BASE,
      evidence: { kind: 'acta', reference: 'Acta 12/2026', counterparty: null, fileUrl: null },
    });

    expect(container.querySelector('[data-estado="con-comprobante"]')).not.toBeNull();
    expect(screen.getByText(/Acta Acta 12\/2026/)).toBeTruthy();
    expect(screen.getByText(/sin archivo adjunto/i)).toBeTruthy();
    expect(screen.queryByText(/ver comprobante/i)).toBeNull();
  });
});

describe('ficha del dato — el formulario para adjuntar', () => {
  it('no deja adjuntar sin referencia: sin número, el comprobante no identifica nada', async () => {
    montar(TRACE_BASE);
    fireEvent.click(screen.getByRole('button', { name: /adjuntar comprobante/i }));
    fireEvent.click(screen.getByRole('button', { name: /^adjuntar$/i }));

    await waitFor(() => expect(screen.getByText(/poné la referencia/i)).toBeTruthy());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('adjunta con tipo, referencia y contraparte — el archivo queda opcional', async () => {
    montar(TRACE_BASE);
    fireEvent.click(screen.getByRole('button', { name: /adjuntar comprobante/i }));

    fireEvent.change(screen.getByLabelText(/referencia/i), { target: { value: 'A 0001-00012345' } });
    fireEvent.change(screen.getByLabelText(/contraparte/i), { target: { value: 'Energía del Norte SA' } });
    fireEvent.click(screen.getByRole('button', { name: /^adjuntar$/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      dataPointId: 'dp-1',
      kind: 'factura',
      reference: 'A 0001-00012345',
      counterparty: 'Energía del Norte SA',
      file: null,
    });
  });

  it('si el archivo no se pudo guardar, se avisa en vez de fingir que quedó todo bien', async () => {
    mutateAsync.mockResolvedValue({
      id: 'ev-1',
      aviso: 'El comprobante quedó registrado por su referencia, pero el archivo no se pudo guardar.',
    });
    montar(TRACE_BASE);

    fireEvent.click(screen.getByRole('button', { name: /adjuntar comprobante/i }));
    fireEvent.change(screen.getByLabelText(/referencia/i), { target: { value: 'A 0001-00012345' } });
    fireEvent.click(screen.getByRole('button', { name: /^adjuntar$/i }));

    await waitFor(() => expect(screen.getByText(/el archivo no se pudo guardar/i)).toBeTruthy());
  });
});
