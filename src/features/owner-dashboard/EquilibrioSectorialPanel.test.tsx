// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EquilibrioSectorialPanel } from './EquilibrioSectorialPanel';
import type { EquilibrioSectorialData } from './owner-dashboard-hooks';

afterEach(cleanup);

const AM_02: EquilibrioSectorialData = {
  equilibrioGeneral: 120,
  segmentos: [
    {
      id: 'segmento-1',
      nombre: 'Línea sintética',
      contribucionMarginalUnitaria: 100,
      contribucionNeta: 12_000,
      equilibrioEspecifico: 40,
      equilibrioSectorial: 120,
      excedente: 0,
      vistaSinProrrateo: { resultado: 12_000 },
      vistaConProrrateo: {
        resultado: 0,
        doctrinaria: false,
        motivo: 'El prorrateo se muestra sólo como lectura de gestión.',
      },
      basadoEn: {
        participacion: 1,
        costoFijoDirecto: 4_000,
        prorrateoIndirectos: 12_000,
        produccionConjunta: false,
      },
    },
  ],
  controlIndirectos: { indirectos: 12_000, contribucionesNetas: 12_000, diferencia: 0 },
};

describe('equilibrio sectorial y específico', () => {
  it('muestra las dos vistas lado a lado y declara que la prorrateada no es doctrinaria', () => {
    render(
      <EquilibrioSectorialPanel
        data={AM_02}
        segmentos={[]}
        unidadPlural="cajones"
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const segmento = screen.getByTestId('equilibrio-sectorial-segmento');
    expect(within(segmento).getByText('Sin prorrateo')).toBeTruthy();
    expect(within(segmento).getByText('Con prorrateo')).toBeTruthy();
    expect(within(segmento).getByText('No doctrinaria')).toBeTruthy();
    expect(within(segmento).getByText(AM_02.segmentos[0]!.vistaConProrrateo.motivo)).toBeTruthy();
    expect(within(segmento).getByText('Equilibrio específico')).toBeTruthy();
    expect(within(segmento).getByText('40 cajones')).toBeTruthy();
    expect(screen.getByTestId('control-indirectos').textContent).toContain('$\u00a012.000,00');
    expect(screen.getByTestId('control-indirectos').textContent).toContain('$\u00a00,00');
  });

  it('explica qué cargar cuando todavía no hay segmentos y nunca presenta ceros', () => {
    render(
      <EquilibrioSectorialPanel
        data={{ equilibrioGeneral: null, segmentos: [], controlIndirectos: { indirectos: 0, contribucionesNetas: 0, diferencia: 0 } }}
        segmentos={[]}
        unidadPlural="cajones"
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Todavía no hay segmentos de análisis')).toBeTruthy();
    expect(screen.getByText(/Cargá el primer segmento con su participación/)).toBeTruthy();
    expect(screen.queryByText('$\u00a00,00')).toBeNull();
  });

  it('muestra tal cual el 422 de R15 al intentar costo variable propio en producción conjunta', async () => {
    const error = Object.assign(new AxiosError('unprocessable'), {
      response: { data: { error: { message: 'R15: una producción conjunta no acepta costo variable propio.' } } },
    });
    const onCreate = vi.fn().mockRejectedValue(error);
    render(
      <EquilibrioSectorialPanel
        data={{ equilibrioGeneral: null, segmentos: [], controlIndirectos: { indirectos: 0, contribucionesNetas: 0, diferencia: 0 } }}
        segmentos={[]}
        unidadPlural="cajones"
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cargar primer segmento' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Producción conjunta sintética' } });
    fireEvent.change(screen.getByLabelText('Participación'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Costo variable por unidad (opcional)'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('Costo fijo directo'), { target: { value: '4000' } });
    fireEvent.change(screen.getByLabelText('Indirectos asignados'), { target: { value: '12000' } });
    fireEvent.click(screen.getByLabelText(/Producción conjunta/));
    fireEvent.click(screen.getByRole('button', { name: 'Crear segmento' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect((await screen.findByRole('alert')).textContent).toContain('R15: una producción conjunta no acepta costo variable propio.');
  });
});
