// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EquilibrioTramosPanel } from './EquilibrioTramosPanel';
import type { EquilibrioTramosData, TramoCostoData } from './owner-dashboard-hooks';

afterEach(cleanup);

const tramos: TramoCostoData[] = [
  {
    id: 'actual',
    conceptoId: 'concepto-1',
    segmentoId: null,
    desde: 0,
    hasta: 475.7,
    tipo: 'REEMPLAZA',
    importeFijo: 1_780_000,
    cmUnitaria: 2_974,
    techoFisico: 475.7,
    techoFuente: 'Informe técnico sintético',
    techoDeclaradoEn: '2099-01-15T12:00:00.000Z',
    techoDeclaradoPorId: 'actor-1',
    createdAt: '2099-01-15T12:00:00.000Z',
  },
  {
    id: 'nuevo',
    conceptoId: 'concepto-1',
    segmentoId: null,
    desde: 475.7,
    hasta: 950.9,
    tipo: 'REEMPLAZA',
    importeFijo: 2_600_000,
    cmUnitaria: 2_974,
    techoFisico: 950.9,
    techoFuente: 'Proyecto de ampliación sintético',
    techoDeclaradoEn: '2099-01-15T12:00:00.000Z',
    techoDeclaradoPorId: 'actor-1',
    createdAt: '2099-01-15T12:00:00.000Z',
  },
];

const equilibrio: EquilibrioTramosData = {
  tramos: [
    {
      tramoId: 'actual',
      tipo: 'REEMPLAZA',
      desde: 0,
      hasta: 475.7,
      techo: 475.7,
      qAritmetico: 598.52,
      q: null,
      resultadoMaximo: -365_268.2,
      motivoFueraDeTramo: 'El equilibrio aritmético supera el techo físico del tramo (475.7).',
    },
    {
      tramoId: 'nuevo',
      tipo: 'REEMPLAZA',
      desde: 475.7,
      hasta: 950.9,
      techo: 950.9,
      qAritmetico: 874.24,
      q: 874.24,
      resultadoMaximo: 227_976.6,
    },
  ],
  transiciones: [
    {
      desdeTramoId: 'actual',
      haciaTramoId: 'nuevo',
      qIndiferencia: 751.42,
      binding: 874.24,
      margenHastaTecho: 76.66,
      porcentajeMargen: 8.1,
      alertaPegadoAlTecho: true,
    },
  ],
};

describe('equilibrio como función por tramos', () => {
  it('declara la ausencia actual y muestra el siguiente equilibrio operativo sin filtrar qAritmetico', () => {
    render(
      <EquilibrioTramosPanel
        equilibrio={equilibrio}
        tramos={tramos}
        unidad="cajón"
        unidadPlural="cajones"
      />,
    );

    const actual = screen.getByTestId('equilibrio-tramo-actual');
    const siguiente = screen.getByTestId('equilibrio-tramo-siguiente');
    expect(within(actual).getByText('No existe un equilibrio operativo en este tramo')).toBeTruthy();
    expect(within(actual).getByText(/supera el techo físico/)).toBeTruthy();
    expect(within(actual).getByText('Siguiente equilibrio operativo: 874,24 cajones')).toBeTruthy();
    expect(within(siguiente).getByText('Equilibrio operativo')).toBeTruthy();
    expect(within(siguiente).getByText('874,24 cajones')).toBeTruthy();
    expect(screen.queryByText(/598,52/)).toBeNull();
  });

  it('muestra rango, fuente, punto indiferente y alerta por el margen de 8,1%', () => {
    render(
      <EquilibrioTramosPanel
        equilibrio={equilibrio}
        tramos={tramos}
        unidad="cajón"
        unidadPlural="cajones"
      />,
    );

    expect(screen.getByText('0–475,7 cajones')).toBeTruthy();
    expect(screen.getByText('Techo: 475,7 cajones')).toBeTruthy();
    expect(screen.getByText('Fuente: Informe técnico sintético')).toBeTruthy();
    expect(screen.getByText('Punto de resultado indiferente: 751,42 cajones')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('8,1%');
    expect(screen.getByRole('alert').textContent).toContain('76,66 cajones');
  });
});
