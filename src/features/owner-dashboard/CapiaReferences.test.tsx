// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { CapiaReferences, type CapiaIndicatorsData } from './CapiaReferences';

const DATA: CapiaIndicatorsData = {
  semana: {
    sourceLabel: 'ENCUESTA SEMANAL 36/2026',
    effectiveFrom: '2026-09-07T00:00:00.000Z',
    effectiveTo: '2026-09-13T00:00:00.000Z',
  },
  items: [
    {
      indicatorCode: 'CAPIA_HUEVO_BLANCO_CAJON',
      value: 45_461.54,
      unit: 'cajon',
      ivaPct: 21,
      priceIncludesIva: true,
      effectiveFrom: '2026-09-07T00:00:00.000Z',
      effectiveTo: '2026-09-13T00:00:00.000Z',
      source: 'CAPIA',
      sourceLabel: 'ENCUESTA SEMANAL 36/2026',
      productId: 251,
      product: 'Producto avícola sintético (x cajón)',
      category: 'PRODUCTOS AVÍCOLAS',
    },
    {
      indicatorCode: 'CAPIA_MAIZ_TON',
      value: 210_000,
      unit: 'ton',
      ivaPct: 10.5,
      priceIncludesIva: false,
      effectiveFrom: '2026-09-07T00:00:00.000Z',
      effectiveTo: '2026-09-13T00:00:00.000Z',
      source: 'CAPIA',
      sourceLabel: 'ENCUESTA SEMANAL 36/2026',
      productId: 272,
      product: 'Insumo sintético (ton)',
      category: 'INSUMOS',
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('referencias CAPIA', () => {
  it('muestra cada valor con la unidad e IVA declarados y la semana vigente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00-03:00'));

    render(<CapiaReferences rubroClave="AVICOLA_POSTURA" data={DATA} />);

    expect(screen.getByText('Semana 36 · 07–13/09')).toBeTruthy();
    const huevo = screen.getByTestId('capia-CAPIA_HUEVO_BLANCO_CAJON');
    expect(within(huevo).getByText('Huevo blanco')).toBeTruthy();
    expect(within(huevo).getByText(/45\.461,54/)).toBeTruthy();
    expect(within(huevo).getByText('por cajón')).toBeTruthy();
    expect(within(huevo).getByText('con IVA')).toBeTruthy();

    const maiz = screen.getByTestId('capia-CAPIA_MAIZ_TON');
    expect(within(maiz).getByText('Maíz')).toBeTruthy();
    expect(within(maiz).getByText('por tonelada')).toBeTruthy();
    expect(within(maiz).getByText('sin IVA')).toBeTruthy();
    expect(screen.queryByText(/último dato/i)).toBeNull();
  });

  it('declara la ausencia sin mostrar importes', () => {
    render(
      <CapiaReferences
        rubroClave="AVICOLA_POSTURA"
        data={{ semana: null, items: [] }}
      />,
    );

    const block = screen.getByTestId('capia-references');
    expect(within(block).getByText('CAPIA todavía no tiene datos en el sistema')).toBeTruthy();
    expect(within(block).queryByText(/\$|\d/)).toBeNull();
  });

  it('avisa cuando la semana guardada es anterior a la actual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T12:00:00-03:00'));

    render(<CapiaReferences rubroClave="AVICOLA_POSTURA" data={DATA} />);

    expect(screen.getByText('Último dato: semana 36')).toBeTruthy();
  });

  it('no se renderiza para un tenant sin paquete avícola', () => {
    const { container } = render(<CapiaReferences rubroClave="RUBRO_SINTETICO" data={DATA} />);

    expect(container.innerHTML).toBe('');
  });
});
