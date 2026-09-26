// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CapacidadOciosaPanel } from './CapacidadOciosaPanel';

afterEach(cleanup);

const AM_05 = {
  corrida: {
    id: '00000000-0000-4000-8000-000000000206',
    validada: true,
    ejecutadaEn: '2099-01-15T12:00:00.000Z',
  },
  ociosidadR22: {
    valor: 25_600,
    motivo: null,
    capacidadNormal: 1_000,
    actividadReal: 900,
    unidad: 'unidades_por_periodo',
  },
  manoDeObra: {
    paidHours: 100,
    productiveHours: 88,
    chargeableHours: 90,
    idleHours: 10,
    fullMod: 50_000,
    idleCost: 5_000,
    applicableMod: 45_000,
    hasIdleCapacity: true,
    destination: 'perdida-del-periodo' as const,
    breakdown: [{
      tipo: 'tiempos-perdidos-informados' as const,
      label: 'Tiempos perdidos informados',
      hours: 10,
      cost: 5_000,
      reasons: [{ reason: 'Preparación de línea', hours: 10, cost: 5_000 }],
    }],
    alert: {
      level: 'advertencia' as const,
      title: 'Capacidad ociosa relevante',
      message: 'Las horas pagadas sin trabajo asignado requieren revisión.',
      cost: 5_000,
      sharePercent: 10,
    },
  },
  cip: {
    variacionPresupuesto: 1_200,
    variacionVolumen: 4_800,
    controlDosVias: {
      sobreSubaplicacion: -6_000,
      diferencia: 0,
      cierra: true,
      formula: 'presupuesto + volumen = -(aplicado - real)',
    },
  },
  tresVias: {
    bloqueada: true as const,
    motivo: 'Falta una base estándar de producción real (O1-02).',
  },
};

describe('capacidad ociosa — AM-05', () => {
  it('prioriza R22 y mantiene MOD y CIP separadas sin publicar un total combinado', () => {
    render(<CapacidadOciosaPanel data={AM_05} />);

    const panel = screen.getByTestId('capacidad-ociosa-panel');
    expect(within(panel).getByRole('heading', { name: 'Capacidad ociosa' })).toBeTruthy();

    const r22 = within(panel).getByTestId('ociosidad-r22');
    expect(within(r22).getByText(/\$\s*25\.600,00/)).toBeTruthy();
    expect(within(r22).getByText(/lo que se dejó de ganar/i)).toBeTruthy();

    const mod = within(panel).getByTestId('ociosidad-mod');
    expect(within(mod).getByText('10 horas')).toBeTruthy();
    expect(within(mod).getAllByText(/\$\s*5\.000,00/).length).toBeGreaterThan(0);
    expect(within(mod).getByText('Tiempos perdidos informados')).toBeTruthy();
    expect(within(mod).getByText(/Preparación de línea:/)).toBeTruthy();
    expect(within(mod).getByText('Capacidad ociosa relevante')).toBeTruthy();

    const cip = within(panel).getByTestId('ociosidad-cip');
    expect(within(cip).getByText(/\$\s*1\.200,00/)).toBeTruthy();
    expect(within(cip).getByText(/\$\s*4\.800,00/)).toBeTruthy();
    expect(within(cip).getByText('El control de dos vías cierra')).toBeTruthy();

    expect(within(panel).getByText('Tres vías no disponibles')).toBeTruthy();
    expect(within(panel).getByText(/base estándar.*O1-02/i)).toBeTruthy();
    expect(within(panel).queryByText(/\$\s*9\.800/)).toBeNull();
    expect(within(panel).queryByText(/ociosidad total/i)).toBeNull();
  });

  it('declara el motivo del backend cuando R22 y la capacidad de MOD no están disponibles', () => {
    render(
      <CapacidadOciosaPanel
        data={{
          ...AM_05,
          ociosidadR22: {
            valor: null,
            motivo: 'Falta declarar la capacidad normal del período.',
            capacidadNormal: null,
            actividadReal: 900,
            unidad: null,
          },
          manoDeObra: null,
        }}
      />,
    );

    const r22 = screen.getByTestId('ociosidad-r22');
    expect(within(r22).getByText('Sin dato')).toBeTruthy();
    expect(within(r22).getByText('Falta declarar la capacidad normal del período.')).toBeTruthy();
    expect(within(r22).queryByText(/\$\s*0/)).toBeNull();

    const mod = screen.getByTestId('ociosidad-mod');
    expect(within(mod).getByText('Sin datos de capacidad de mano de obra.')).toBeTruthy();
    expect(within(mod).queryByText(/0 horas/i)).toBeNull();
  });
});
