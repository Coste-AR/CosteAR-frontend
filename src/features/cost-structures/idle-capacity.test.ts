import { describe, expect, it } from 'vitest';
import { buildIdleCapacity, formatHours } from './components/labor/idle-capacity';
import type { DirectLaborConfig } from './cost-structure-types';
import type { CalculationResult } from '@/lib/types';

/**
 * CAPACIDAD OCIOSA — la línea que antes no existía (C-04).
 *
 * El problema medido: la tarifa de MOD era "costo total ÷ horas cargadas" y no
 * había ningún campo que separara las horas productivas de las ociosas. El
 * costista tenía dos opciones y las dos estaban mal: cargar solo las horas
 * productivas hacía desaparecer el costo ocioso del sistema, y cargar las horas
 * realmente pagadas lo diluía en la tarifa, con lo cual las órdenes absorbían un
 * costo que no es suyo. Acá se verifica que ese costo quede identificado.
 *
 * Los importes salen del cálculo persistido; el front solo reparte el costo del
 * departamento entre horas ociosas e imputables con la misma proporción que usa
 * el motor (`domain/calculations/direct-labor.ts`).
 */

type DetailMOD = CalculationResult['detail']['directLabor'];

const config = (departments: DirectLaborConfig['departments']): DirectLaborConfig => ({
  workingDays: {
    totalDaysPerYear: 365,
    unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
    paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 },
  },
  itcs: { derivationBase: 0, fixedArt: 0, uncertainRemunerative: [], uncertainNonRemunerative: [] },
  departments,
});

/** Salida del motor: $870.000 de básica + 8,3333 % de SAC = $942.500. */
const calculo = (overrides: Partial<NonNullable<DetailMOD['departments']>[number]> = {}): DetailMOD => ({
  workingDays: 261,
  paidDays: 0,
  itcsPercent: 8.3333,
  iapPercent: 0,
  hourlyRates: { Armado: 942.5 },
  departments: [{
    name: 'Armado',
    basicRemuneration: 870_000,
    socialChargesCost: 72_500,
    totalMod: 942_500,
    hourlyRate: 942.5,
    budgetedHours: 1_000,
    ...overrides,
  }],
});

describe('capacidad ociosa — estructuras que solo tienen horas pagadas', () => {
  it('no declara ociosidad: el resultado queda idéntico al histórico', () => {
    const idle = buildIdleCapacity(
      config([{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000 }]),
      calculo(),
    );

    expect(idle.anyDeclared).toBe(false);
    expect(idle.hasIdleCapacity).toBe(false);
    expect(idle.hasExceeded).toBe(false);
    // Toda la presencia se considera productiva y el costo ocioso es cero exacto.
    expect(idle.productiveHours).toBe(1_000);
    expect(idle.idleHours).toBe(0);
    expect(idle.idleCost).toBe(0);
    // Al centavo: lo imputable a las órdenes es el costo completo de siempre.
    expect(idle.applicableMod).toBe(942_500);
    expect(idle.fullMod).toBe(942_500);
  });

  it('sin cálculo persistido informa las horas y no inventa pesos', () => {
    const idle = buildIdleCapacity(
      config([{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 900 }]),
    );

    expect(idle.idleHours).toBe(100);
    expect(idle.idleCost).toBeUndefined();
    expect(idle.applicableMod).toBeUndefined();
  });
});

describe('capacidad ociosa — con horas netas productivas cargadas', () => {
  const idle = buildIdleCapacity(
    config([{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 900 }]),
    calculo(),
  );

  it('separa presencia en fábrica, horas netas productivas y horas ociosas', () => {
    expect(idle.anyDeclared).toBe(true);
    expect(idle.hasIdleCapacity).toBe(true);
    expect(idle.paidHours).toBe(1_000);
    expect(idle.productiveHours).toBe(900);
    expect(idle.idleHours).toBe(100);
    expect(idle.idleSharePercent).toBeCloseTo(10, 6);
  });

  it('aísla el costo de las horas ociosas y lo saca de lo imputable a las órdenes', () => {
    expect(idle.idleCost).toBeCloseTo(94_250, 6);
    expect(idle.applicableMod).toBeCloseTo(848_250, 6);
    // El costo completo no se pierde: imputable + ocioso cierra contra el total.
    expect(idle.applicableMod! + idle.idleCost!).toBeCloseTo(idle.fullMod!, 6);
  });

  it('el costo ocioso sale del costo del producto y va al resultado del período', () => {
    // Espeja `DESTINO_COSTO_CAPACIDAD_OCIOSA` del motor. Fue
    // 'absorbido-en-el-producto' mientras la decisión estaba abierta — un
    // placeholder elegido sólo para no mover resultados. Ya se decidió: la
    // cátedra (Clase 10) lo trata como "una pérdida de la empresa, no un costo
    // del producto", y así quedó cableado.
    expect(idle.destination).toBe('perdida-del-periodo');
  });
});

describe('capacidad ociosa — casos de borde', () => {
  it('horas productivas en cero es un dato válido: todo el departamento está ocioso', () => {
    const idle = buildIdleCapacity(
      config([{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 0 }]),
      calculo(),
    );

    expect(idle.anyDeclared).toBe(true);
    expect(idle.idleHours).toBe(1_000);
    expect(idle.idleCost).toBeCloseTo(942_500, 6);
    expect(idle.applicableMod).toBeCloseTo(0, 6);
  });

  it('no se puede producir más de lo que se paga: recorta el exceso y avisa', () => {
    const idle = buildIdleCapacity(
      config([{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 1_200 }]),
      calculo(),
    );

    expect(idle.hasExceeded).toBe(true);
    expect(idle.productiveHours).toBe(1_000);
    expect(idle.idleHours).toBe(0);
    expect(idle.idleCost).toBe(0);
  });

  it('con varios departamentos consolida horas y pesos, y solo suma los que la declaran', () => {
    const idle = buildIdleCapacity(
      config([
        { name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000, productiveHours: 900 },
        { name: 'Pintura', basicRemuneration: 435_000, hoursWorked: 500 },
      ]),
      {
        ...calculo(),
        departments: [
          { name: 'Armado', basicRemuneration: 870_000, socialChargesCost: 72_500, totalMod: 942_500, hourlyRate: 942.5, budgetedHours: 1_000 },
          { name: 'Pintura', basicRemuneration: 435_000, socialChargesCost: 36_250, totalMod: 471_250, hourlyRate: 942.5, budgetedHours: 500 },
        ],
      },
    );

    expect(idle.paidHours).toBe(1_500);
    expect(idle.productiveHours).toBe(1_400);
    expect(idle.idleHours).toBe(100);
    expect(idle.idleCost).toBeCloseTo(94_250, 6);
    expect(idle.fullMod).toBeCloseTo(1_413_750, 6);
    // Pintura no declaró horas productivas: no aporta ni una hora ociosa.
    expect(idle.departments[1]!.hasIdleCapacity).toBe(false);
    expect(idle.departments[1]!.idleCost).toBe(0);
  });

  it('sin horas pagadas no divide por cero', () => {
    const idle = buildIdleCapacity(
      config([{ name: 'Armado', basicRemuneration: 0, hoursWorked: 0, productiveHours: 0 }]),
      { ...calculo(), departments: [{ name: 'Armado', basicRemuneration: 0, socialChargesCost: 0, totalMod: 0, hourlyRate: 0, budgetedHours: 0 }] },
    );

    expect(idle.idleSharePercent).toBe(0);
    expect(idle.idleCost).toBe(0);
  });
});

describe('formato de horas', () => {
  it('usa formato argentino y la unidad, nunca un número suelto', () => {
    expect(formatHours(1_250.5)).toBe('1.250,5 hs');
    expect(formatHours(undefined)).toBe('—');
  });
});
