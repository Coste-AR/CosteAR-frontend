// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LaborDepartmentsView } from './LaborDepartmentsView';
import { DirectLaborForm } from './DirectLaborForm';
import type { DirectLaborConfig } from './cost-structure-types';
import type { CalculationResult } from '@/lib/types';

/**
 * LO QUE VE EL COSTISTA CUANDO HAY HORAS PAGADAS SIN TRABAJO ASIGNADO (C-04).
 *
 * Antes, la tarifa de MOD era "costo total ÷ horas cargadas" y no existía un
 * campo que separara las horas productivas de las ociosas: o el costo ocioso
 * desaparecía del sistema, o se diluía en la tarifa y lo terminaban absorbiendo
 * las órdenes. Estos tests montan la hoja y verifican que la ociosidad aparezca
 * como una línea propia —con sus horas y su costo— y que una estructura vieja,
 * cargada solo con horas pagadas, se siga viendo exactamente igual que siempre.
 */

const base = {
  workingDays: {
    totalDaysPerYear: 365,
    unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
    paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 },
  },
  itcs: { derivationBase: 0, fixedArt: 0, uncertainRemunerative: [], uncertainNonRemunerative: [] },
};

/** Estructura vieja: el único campo de horas que tenía era el de horas pagadas. */
const configLegado: DirectLaborConfig = {
  ...base,
  departments: [{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000 }],
};

/** La misma estructura, ahora con las horas netas productivas declaradas. */
const configConOciosidad: DirectLaborConfig = {
  ...base,
  departments: [{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 900 }],
};

/** Salida del motor: $870.000 + 8,3333 % de SAC = $942.500 de costo total. */
const calculo: CalculationResult['detail']['directLabor'] = {
  workingDays: 261,
  paidDays: 0,
  itcsPercent: 8.3333,
  iapPercent: 0,
  hourlyRates: { Armado: 942.5 },
  itcsBreakdown: { certain: 8.3333, uncertainRemunerative: 0, derived: 0, uncertainNonRemunerative: 0 },
  departments: [{
    name: 'Armado',
    basicRemuneration: 870_000,
    socialChargesCost: 72_500,
    totalMod: 942_500,
    hourlyRate: 942.5,
    budgetedHours: 1_000,
  }],
};

const montar = (config: DirectLaborConfig) =>
  render(<LaborDepartmentsView config={config} directLabor={calculo} onEdit={() => {}} />);

afterEach(cleanup);

describe('hoja de MOD — la capacidad ociosa tiene su propia línea', () => {
  it('muestra las horas ociosas y su costo, identificados como tales', () => {
    montar(configConOciosidad);

    expect(screen.getAllByText(/capacidad ociosa/i).length).toBeGreaterThan(0);
    // Las horas: pagadas, netas productivas y ociosas, cada una con su rótulo.
    expect(screen.getAllByText(/horas pagadas — presencia en fábrica/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horas netas productivas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText((t) => t.includes('100 hs')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((t) => t.includes('900 hs')).length).toBeGreaterThan(0);
    // Y el costo de esas horas: $942.500 × 100 / 1.000 = $94.250.
    expect(screen.getAllByText((t) => t.includes('94.250')).length).toBeGreaterThan(0);
    // El costo imputable a las órdenes queda separado del total.
    expect(screen.getAllByText(/imputable a las órdenes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText((t) => t.includes('848.250')).length).toBeGreaterThan(0);
  });

  it('dice que ese costo NO es del producto: va al resultado del período', () => {
    // El tratamiento ya no está "en definición". Se decidió lo que manda la
    // cátedra (Clase 10): es una pérdida de la empresa, no un costo del
    // producto. La pantalla tiene que decirlo sin ambigüedad, porque el costo
    // de producción baja respecto de lo que el costista veía antes.
    montar(configConOciosidad);

    expect(screen.getAllByText(/estado de resultados/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cátedra, Clase 10/i).length).toBeGreaterThan(0);
  });

  it('no la confunde con el ausentismo pago: aclara que son cosas distintas', () => {
    montar(configConOciosidad);

    expect(screen.getAllByText(/ausentismo pago \(IAP\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/está presente/i).length).toBeGreaterThan(0);
  });

  it('en la ficha del departamento, la tarifa dice sobre qué horas se calculó', () => {
    montar(configConOciosidad);
    // "Armado" aparece en la lista y en el detalle de la ociosidad: se entra
    // por la fila de la lista, la que trae el estado del cálculo.
    const fila = screen
      .getAllByText('Armado')
      .map((el) => el.closest('tr'))
      .find((tr) => tr?.textContent?.includes('Calculado'))!;
    fireEvent.click(fila);

    expect(screen.getAllByText(/horas netas productivas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mano de obra imputable a las órdenes ÷ horas netas productivas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/capacidad ociosa del departamento/i).length).toBeGreaterThan(0);
  });
});

describe('hoja de MOD — una estructura vieja se ve exactamente como antes', () => {
  it('no muestra ninguna línea de capacidad ociosa', () => {
    montar(configLegado);

    expect(screen.queryByText(/capacidad ociosa/i)).toBeNull();
    expect(screen.queryByText(/horas ociosas/i)).toBeNull();
    expect(screen.queryByText(/destino contable/i)).toBeNull();
  });

  it('no inventa advertencias ni deja campos con pinta de faltantes', () => {
    montar(configLegado);

    expect(screen.queryByText(/no se puede producir más de lo que se paga/i)).toBeNull();
    expect(screen.queryByText(/sin cargar/i)).toBeNull();
    // La tarifa sigue explicándose con la fórmula de siempre.
    fireEvent.click(screen.getByText('Armado'));
    expect(screen.getAllByText(/remuneración × \(1 \+ ITCS\) ÷ horas pagadas/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/capacidad ociosa del departamento/i)).toBeNull();
  });
});

describe('formulario de MOD — dónde se cargan las horas', () => {
  it('ofrece horas pagadas y horas netas productivas por separado', () => {
    render(<DirectLaborForm defaultValues={configLegado} onSave={async () => {}} saving={false} />);

    expect(screen.getAllByText(/horas pagadas \(presencia en fábrica\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horas netas productivas/i).length).toBeGreaterThan(0);
    // El campo nuevo es opcional y lo dice en el propio campo.
    expect(screen.getAllByPlaceholderText(/opcional — sin ociosidad/i).length).toBe(1);
  });

  it('explica que dejarlas vacías significa que no hay capacidad ociosa', () => {
    render(<DirectLaborForm defaultValues={configLegado} onSave={async () => {}} saving={false} />);

    // El texto va partido en varios <strong>, así que se busca por nodo entero.
    expect(screen.getAllByText(/no hay capacidad\s*ociosa/i).length).toBeGreaterThan(0);
    // Y avisa la consecuencia de SÍ cargarlas, que es lo que más sorprende:
    // el costo de producción baja y aparece una pérdida donde antes no había.
    expect(screen.getAllByText(/pérdida del\s*período/i).length).toBeGreaterThan(0);
  });

  it('con las horas cargadas, avisa al toque cuántas quedan ociosas', () => {
    render(<DirectLaborForm defaultValues={configConOciosidad} onSave={async () => {}} saving={false} />);

    expect(screen.getAllByText((t) => t.includes('100 hs')).length).toBeGreaterThan(0);
    // El aviso nombra el tipo de improductividad (tiempos perdidos informados),
    // no un genérico "capacidad ociosa": el desglose por tipo es justamente lo
    // que pedía la decisión.
    expect(screen.getAllByText(/tiempos perdidos informados/i).length).toBeGreaterThan(0);
  });

  it('sin horas netas productivas no dice nada de ociosidad en la fila', () => {
    render(<DirectLaborForm defaultValues={configLegado} onSave={async () => {}} saving={false} />);

    expect(screen.queryByText(/de capacidad ociosa —/i)).toBeNull();
    expect(screen.queryByText(/^Sin capacidad ociosa\.$/i)).toBeNull();
  });
});
