// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DataPointTrace, AiProvenance } from './trazabilidad-types';

/**
 * T-06 — EL SELLO DE PROCEDENCIA IA EN LA FICHA DEL DATO.
 *
 * Un costista firma números que en parte no tipeó: la ingesta de comprobantes
 * los leyó de una factura con un clasificador. La ficha tiene que contestar, sin
 * que haya que abrir nada, "¿esto lo puso alguien o lo sugirió la máquina, y
 * quién se hace cargo?".
 *
 * Los tres estados que se prueban acá son los tres que existen:
 *
 *   1. sugerido por IA y CONFIRMADO   → con nombre y fecha de quien confirmó;
 *   2. sugerido por IA SIN confirmar  → dicho como tal, no escondido;
 *   3. cargado A MANO                 → NINGÚN sello. Ni "no fue IA", ni un
 *                                       badge gris: nada. El backend no manda
 *                                       `aiProvenance` y la ficha no lo dibuja.
 *
 * El 3 es el que importa proteger: si el sello apareciera en negativo sobre los
 * cientos de datos que carga una persona, dejaría de significar algo.
 */

const useDataPointTrace = vi.fn();

vi.mock('./trazabilidad-hooks', () => ({
  useCalculationTree: () => ({ data: undefined, isLoading: false }),
  useDataPointTrace: (id: string) => useDataPointTrace(id),
  usePedirRevision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdjuntarComprobante: () => ({ mutateAsync: vi.fn(), isPending: false }),
  MAX_ARCHIVO_BYTES: 500 * 1024,
  MSG_ARCHIVO_GRANDE: 'El archivo es muy grande (máximo 500 KB). Subí una versión más liviana.',
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

const { TraceCard } = await import('./DerivationTree');

/** Un dato cargado a mano: sin `aiProvenance`, que es como llega del backend. */
const TRACE_MANUAL: DataPointTrace = {
  id: 'dp-1',
  label: 'Remuneración básica · Corte',
  display: '$ 480.000,00',
  status: 'validado',
  signedBy: null,
  fields: [],
  periods: { hecho: null, captacion: '2026-08-02T10:00:00Z', imputado: '2026-08' },
  evidence: null,
  versions: [{ n: 1, current: true, display: '480000', reason: null, by: 'Ana', at: '2026-08-02T10:00:00Z' }],
  impacts: ['Costo de producción'],
};

const PROV_BASE: AiProvenance = {
  confirmado: true,
  confirmadoPor: 'Ana Costista',
  confirmadoEl: '2026-08-02T10:00:00Z',
  corregidoPorPersona: false,
  confianza: 'alta',
  requiereRevision: false,
  documento: {
    tipo: 'Liquidación de sueldos',
    seccion: 'Mano de Obra Directa',
    archivo: 'liquidacion-agosto.pdf',
  },
  detalleTecnico: {
    capa: 'Señal definitiva del comprobante',
    senalDeterminante: 'CUIT de AFIP en el encabezado',
    senalesCorroborantes: ['menciona sueldos brutos'],
    calidadDeLectura: 'El documento se leyó completo',
    usoModeloDeLenguaje: false,
    explicacion: 'Señal definitiva: CUIT de AFIP. Confianza: 91%.',
  },
};

function montar(trace: DataPointTrace) {
  useDataPointTrace.mockReturnValue({ data: trace, isLoading: false, error: null });
  return render(<TraceCard dataPointId="dp-1" onClose={() => {}} />);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ficha del dato — procedencia IA (T-06)', () => {
  it('dato cargado A MANO: no se dibuja ningún sello de IA', () => {
    montar(TRACE_MANUAL);

    // Ni el sello, ni una versión en negativo, ni el detalle técnico.
    expect(screen.queryByText(/sugerido por ia/i)).toBeNull();
    expect(screen.queryByText(/sin confirmar/i)).toBeNull();
    expect(screen.queryByText(/confianza/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /ver detalle técnico/i })).toBeNull();

    // Y la ficha sigue mostrando lo de siempre.
    expect(screen.getByText('Remuneración básica · Corte')).toBeTruthy();
  });

  it('sugerido por IA y confirmado: dice quién se hizo cargo y con qué confianza', () => {
    montar({ ...TRACE_MANUAL, aiProvenance: PROV_BASE });

    expect(screen.getByText(/sugerido por ia/i)).toBeTruthy();
    expect(screen.getByText(/confirmado por/i)).toBeTruthy();
    expect(screen.getByText('Ana Costista')).toBeTruthy();

    // Confianza CUALITATIVA: la palabra, nunca el porcentaje.
    expect(screen.getByText(/confianza alta/i)).toBeTruthy();
    expect(screen.queryByText(/91\s*%/)).toBeNull();

    // De qué documento salió, sin un solo id interno en pantalla.
    expect(screen.getByText(/liquidación de sueldos/i)).toBeTruthy();
  });

  it('sugerido por IA SIN confirmar: lo dice en vez de esconderlo', () => {
    montar({
      ...TRACE_MANUAL,
      aiProvenance: { ...PROV_BASE, confirmado: false, confirmadoPor: null, confirmadoEl: null },
    });

    expect(screen.getByText(/sugerido por ia/i)).toBeTruthy();
    expect(screen.getByText(/sin confirmar/i)).toBeTruthy();
    expect(screen.queryByText(/confirmado por/i)).toBeNull();
  });

  it('el detalle técnico viene PLEGADO y nunca dice "Layer N"', () => {
    montar({ ...TRACE_MANUAL, aiProvenance: PROV_BASE });

    // Plegado por defecto: es material de auditoría del clasificador, y arriba
    // convertiría la ficha en un log.
    expect(screen.queryByText(/CUIT de AFIP en el encabezado/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /ver detalle técnico/i }));

    expect(screen.getByText(/CUIT de AFIP en el encabezado/i)).toBeTruthy();
    // La capa se nombra en castellano: "Layer 1" no le dice nada a un costista
    // y suena a que algo se rompió.
    expect(screen.getByText('Señal definitiva del comprobante')).toBeTruthy();
    expect(document.body.textContent ?? '').not.toMatch(/layer\s*\d/i);
  });

  it('cuando el clasificador pidió revisión, la ficha lo muestra', () => {
    montar({
      ...TRACE_MANUAL,
      aiProvenance: { ...PROV_BASE, confianza: 'baja', requiereRevision: true },
    });

    expect(screen.getByText(/confianza baja/i)).toBeTruthy();
    expect(screen.getByText(/pidió que alguien lo revise/i)).toBeTruthy();
  });
});
