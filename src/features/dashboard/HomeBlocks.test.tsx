// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  HomeKpis,
  MacroIndicators,
  QuickAccesses,
  type HomeKpi,
  type MacroIndicator,
  type QuickAccess,
} from './HomeBlocks';

afterEach(cleanup);

const macros: MacroIndicator[] = [
  {
    clave: 'USD_OFICIAL',
    etiqueta: 'Dólar oficial',
    valor: 1_250,
    unidad: 'ARS/USD',
    fecha: '2099-09-24T00:00:00.000Z',
    fuenteNombre: 'Banco Central',
    fuenteUrl: 'https://fuente.example/dolar',
  },
  {
    clave: 'PRECIO_REFERENCIA',
    etiqueta: 'Precio de referencia',
    valor: null,
    unidad: 'ARS/cajón',
    fecha: null,
    fuenteNombre: 'Fuente sectorial',
    fuenteUrl: 'https://fuente.example/sector',
    error: 'fuente no disponible',
  },
];

describe('bloques del home', () => {
  it('cada indicador macro enlaza su fuente y declara el dato ausente', () => {
    render(<MacroIndicators indicators={macros} loading={false} />);

    const dolar = screen.getByTestId('macro-USD_OFICIAL');
    expect(dolar.getAttribute('href')).toBe('https://fuente.example/dolar');
    expect(within(dolar).getByText(/1\.250/)).toBeTruthy();

    const referencia = screen.getByTestId('macro-PRECIO_REFERENCIA');
    expect(within(referencia).getByText('Sin dato')).toBeTruthy();
    expect(within(referencia).queryByText(/^0(?:[,.]0+)?$/)).toBeNull();
    expect(referencia.getAttribute('href')).toBe('https://fuente.example/sector');
  });

  it('muestra exactamente la terna de KPI declarada por el rubro', () => {
    const kpis: HomeKpi[] = [
      { clave: 'costo', etiqueta: 'Costo por cajón', unidad: 'ARS/cajón', valor: 840, completo: true },
      { clave: 'contribucion', etiqueta: 'Contribución', unidad: 'ARS/cajón', valor: 260, completo: true },
      { clave: 'equilibrio', etiqueta: 'Punto de equilibrio', unidad: 'cajones', valor: null, completo: false },
    ];

    render(<HomeKpis kpis={kpis} periodState="ready" loading={false} />);

    expect(screen.getAllByTestId(/^home-kpi-/)).toHaveLength(3);
    expect(screen.getByText('Costo por cajón')).toBeTruthy();
    expect(screen.getByText('Contribución')).toBeTruthy();
    expect(screen.getByText('Punto de equilibrio')).toBeTruthy();
    expect(screen.getByText('Sin dato')).toBeTruthy();
  });

  it('declara la falta de período en los tres lugares sin inventar KPI', () => {
    render(<HomeKpis kpis={[]} periodState="no-period" loading={false} />);

    expect(screen.getAllByText('Sin período abierto')).toHaveLength(3);
    expect(screen.getAllByTestId(/^home-kpi-pending-/)).toHaveLength(3);
  });

  it('declara cuando el paquete no configuró ningún KPI', () => {
    render(<HomeKpis kpis={[]} periodState="ready" loading={false} />);

    expect(screen.getByText('Sin KPI configurados.')).toBeTruthy();
  });

  it('omite accesos sin destino y conserva los navegables', () => {
    const accesses: QuickAccess[] = [
      { clave: 'carga.produccion', etiqueta: 'Producción', destino: '/panel-campo' },
      { clave: 'sin-destino', etiqueta: 'No navegable', destino: null },
    ];

    render(<QuickAccesses accesses={accesses} loading={false} />);

    expect(screen.getByRole('link', { name: 'Producción' }).getAttribute('href')).toBe('/panel-campo');
    expect(screen.queryByText('No navegable')).toBeNull();
  });
});
