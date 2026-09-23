// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PuntoCierrePanel } from './PuntoCierrePanel';
import type { PuntoCierreData } from './owner-dashboard-hooks';

afterEach(cleanup);

const respuesta: PuntoCierreData = {
  moneda: 'ARS',
  unidad: 'unidad',
  nominal: true as const,
  precioUnitario: 500,
  puntoEquilibrioEconomico: 750,
  actividad: 650,
  importeVersionIds: ['00000000-0000-4000-8000-000000000001'],
  horizontes: [
    {
      horizonteMeses: 1,
      valor: 375,
      costosFijosErogables: 96_000,
      costoVariableUnitarioErogable: 244,
      contribucionMarginalFinanciera: 256,
      situacion: null,
      advertencia: 'un resultado negativo no significa que haya que cerrar',
      basadoEn: [],
    },
    {
      horizonteMeses: 12,
      valor: 593.75,
      costosFijosErogables: 152_000,
      costoVariableUnitarioErogable: 244,
      contribucionMarginalFinanciera: 256,
      situacion: 'pierde económicamente y sostiene la caja',
      advertencia: 'un resultado negativo no significa que haya que cerrar',
      basadoEn: [],
    },
  ],
};

describe('punto de cierre por horizonte', () => {
  it('mantiene separados 1 y 12 meses y explica la zona entre cierre y equilibrio', () => {
    render(<PuntoCierrePanel data={respuesta} />);

    const unMes = screen.getByTestId('punto-cierre-1');
    const doceMeses = screen.getByTestId('punto-cierre-12');
    expect(within(unMes).getByText('375 unidades')).toBeTruthy();
    expect(within(doceMeses).getByText('593,75 unidades')).toBeTruthy();
    expect(screen.getByText('750 unidades').parentElement?.textContent).toBe('Equilibrio económico: 750 unidades');
    expect(screen.getByText('pierde económicamente y sostiene la caja')).toBeTruthy();
    expect(screen.getByText('un resultado negativo no significa que haya que cerrar')).toBeTruthy();
  });

  it('muestra el motivo del horizonte ausente sin reemplazarlo por cero', () => {
    const ausente: PuntoCierreData = {
      ...respuesta,
      horizontes: [
        respuesta.horizontes[0]!,
        {
          ...respuesta.horizontes[1]!,
          valor: null,
          motivoSinEquilibrio: 'Falta importe para el concepto "Alquiler".',
          costosFijosErogables: null,
          costoVariableUnitarioErogable: null,
          contribucionMarginalFinanciera: null,
          situacion: null,
        },
      ],
    };

    render(<PuntoCierrePanel data={ausente} />);

    const doceMeses = screen.getByTestId('punto-cierre-12');
    expect(within(doceMeses).getByText('Sin dato')).toBeTruthy();
    expect(within(doceMeses).getByText('Falta importe para el concepto "Alquiler".')).toBeTruthy();
    expect(within(doceMeses).queryByText(/^0(?:[,.]0+)? unidades$/)).toBeNull();
  });
});
