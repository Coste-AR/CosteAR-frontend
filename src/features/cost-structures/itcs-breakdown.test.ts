import { describe, it, expect } from 'vitest';
import { buildItcsBreakdown, SAC_PERCENT } from './social-charges-catalog';
import { catedraExample } from './catedra-example';

/**
 * TRANSPARENCIA de la carga social en la hoja de MOD.
 *
 * El costista que calcula a mano aplica "un 45%" y espera ver ese número. El
 * motor usa el modelo de la cátedra (ciertas + inciertas + derivadas) y por eso
 * el resultado puede no coincidir con su cuenta. El desglose tiene que mostrar
 * de dónde sale cada punto — sin cambiar un solo cálculo.
 *
 * Los valores de `motor…` de estos tests NO son inventados: son la salida real
 * de `calcDirectLabor` (backend, src/domain/calculations/direct-labor.ts) para
 * cada configuración. Si el desglose dejara de coincidir con ellos, el costista
 * estaría leyendo un número distinto del que se le aplicó.
 */

/** Salida real del motor con TODO el ITCS configurable en cero. */
const motorEnCero = {
  itcsPercent: 8.3333,
  iapPercent: 0,
  itcsBreakdown: { certain: 8.3333, uncertainRemunerative: 0, derived: 0, uncertainNonRemunerative: 0 },
};

/** Salida real del motor con el ejemplo de la cátedra. */
const motorCatedra = {
  itcsPercent: 79.9903,
  iapPercent: 18.552,
  itcsBreakdown: {
    certain: 39.0833,
    uncertainRemunerative: 27.552,
    derived: 10.355,
    uncertainNonRemunerative: 3,
  },
};

const itcsEnCero = {
  derivationBase: 0,
  fixedArt: 0,
  uncertainRemunerative: [],
  uncertainNonRemunerative: [],
};

const lineasDe = (bd: ReturnType<typeof buildItcsBreakdown>, key: string) =>
  bd.blocks.find((b) => b.key === key)!.lines;

describe('desglose del ITCS — el SAC (aguinaldo) se aplica siempre', () => {
  it('con el ITCS configurado en cero, el SAC igual aparece y explica el 8,3333 %', () => {
    const bd = buildItcsBreakdown(itcsEnCero, motorEnCero);

    const sac = lineasDe(bd, 'certain').find((l) => l.label.includes('SAC'))!;
    expect(sac.alwaysApplies).toBe(true);
    expect(sac.percent).toBe(8.3333);
    expect(SAC_PERCENT).toBe(8.3333);

    // Es TODO el índice: no queda ningún otro punto sin explicar.
    expect(bd.totalPercent).toBe(8.3333);
    expect(bd.unavoidablePercent).toBe(8.3333);
    expect(bd.onlyUnavoidableApplies).toBe(true);
    expect(bd.unavoidableLabels).toEqual([sac.label]);
  });

  it('el SAC se muestra aunque su porcentaje sea el único distinto de cero del bloque', () => {
    const bd = buildItcsBreakdown(itcsEnCero, motorEnCero);
    const ciertas = lineasDe(bd, 'certain');

    // Los cuatro renglones de la cátedra están, con su etiqueta.
    expect(ciertas.map((l) => l.label)).toEqual([
      'Contribuciones patronales y ART variable (base a derivar)',
      'ART fija (según contrato con la aseguradora)',
      'SAC — sueldo anual complementario (aguinaldo)',
      'Cargas ciertas sobre el SAC',
    ]);
    // Solo el SAC queda marcado como inevitable.
    expect(ciertas.filter((l) => l.alwaysApplies).map((l) => l.percent)).toEqual([8.3333]);
  });

  it('el índice que se muestra es el que aplicó el motor: $870.000 → $942.500', () => {
    const bd = buildItcsBreakdown(itcsEnCero, motorEnCero);
    const basicRemuneration = 870_000;

    // El motor devolvió cargas por $72.500 y un total de $942.500 sobre esa básica.
    // El porcentaje mostrado tiene que dar cuenta de esos pesos.
    expect((basicRemuneration * bd.totalPercent) / 100).toBeCloseTo(72_500, 0);
    expect(basicRemuneration + (basicRemuneration * bd.totalPercent) / 100).toBeCloseTo(942_500, 0);
  });
});

describe('desglose del ITCS — coincide con lo que calculó el motor', () => {
  const bd = buildItcsBreakdown(catedraExample.directLabor.itcs, motorCatedra);

  it('el total mostrado es exactamente el ITCS que devolvió el cálculo', () => {
    expect(bd.totalPercent).toBe(motorCatedra.itcsPercent);
    expect(bd.onlyUnavoidableApplies).toBe(false);
  });

  it('los subtotales de los cuatro bloques son los del cálculo y suman el total', () => {
    expect(bd.blocks.map((b) => b.percent)).toEqual([
      motorCatedra.itcsBreakdown.certain,
      motorCatedra.itcsBreakdown.uncertainRemunerative,
      motorCatedra.itcsBreakdown.derived,
      motorCatedra.itcsBreakdown.uncertainNonRemunerative,
    ]);
    const suma = bd.blocks.reduce((acc, b) => acc + b.percent, 0);
    expect(suma).toBeCloseTo(bd.totalPercent, 3);
  });

  it('los conceptos de cada bloque reconstruyen el subtotal del bloque', () => {
    for (const block of bd.blocks) {
      const suma = block.lines.reduce((acc, l) => acc + l.percent, 0);
      expect(suma, `el bloque "${block.title}" no cuadra con sus conceptos`).toBeCloseTo(block.percent, 2);
    }
  });

  it('el IAP se muestra como carga incierta remunerativa calculada por el sistema', () => {
    const iap = lineasDe(bd, 'uncertainRemunerative')[0]!;
    expect(iap.label).toContain('IAP');
    expect(iap.percent).toBe(motorCatedra.iapPercent);
    // Y arrastra sus propias derivadas, como manda la cátedra.
    expect(lineasDe(bd, 'derived')[0]!.label).toContain('IAP');
  });

  it('cada concepto cargado por el costista aparece con su nombre, no con un código', () => {
    const remunerativas = lineasDe(bd, 'uncertainRemunerative').map((l) => l.label);
    expect(remunerativas).toContain('Antigüedad');
    expect(remunerativas).toContain('Premio por Asistencia Perfecta');

    const noRemunerativas = lineasDe(bd, 'uncertainNonRemunerative').map((l) => l.label);
    expect(noRemunerativas).toContain('Viandas / comedor');

    // Ningún renglón se muestra sin etiqueta ni con nombres internos del motor.
    for (const block of bd.blocks) {
      for (const line of block.lines) {
        expect(line.label.trim().length).toBeGreaterThan(0);
        expect(line.label).not.toMatch(/derivationBase|fixedArt|coefficient|B40|F40|B47|CSC/);
      }
    }
  });
});

describe('desglose del ITCS — casos de borde de lectura', () => {
  it('sin resultado del cálculo, arma la lectura de lo configurado sin romperse', () => {
    const bd = buildItcsBreakdown(catedraExample.directLabor.itcs);
    // Sin IAP (todavía no se calculó), pero las ciertas ya se leen completas.
    expect(bd.blocks[0]!.percent).toBe(39.0833);
    expect(bd.unavoidablePercent).toBe(8.3333);
  });

  it('ignora un IAP cargado a mano, igual que el motor, para no contarlo dos veces', () => {
    const bd = buildItcsBreakdown(
      { ...itcsEnCero, uncertainRemunerative: [{ name: 'IAP', coefficient: 0.2 }] },
      { ...motorEnCero, iapPercent: 20 },
    );
    const remunerativas = lineasDe(bd, 'uncertainRemunerative');
    expect(remunerativas).toHaveLength(1);
    expect(remunerativas[0]!.percent).toBe(20);
  });

  it('sin configuración ni cálculo devuelve el piso del índice, no un error', () => {
    const bd = buildItcsBreakdown(undefined);
    expect(bd.totalPercent).toBe(8.3333);
    expect(bd.onlyUnavoidableApplies).toBe(true);
  });
});
