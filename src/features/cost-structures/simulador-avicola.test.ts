import { describe, it, expect } from 'vitest';
import { calcularProyeccionAvicola } from './components/ScenarioSimulator';
import type { CalculationResult } from '@/lib/types';

/**
 * Fixture aproximado del cliente avícola (Augusto Sáenz).
 *
 * Las proporciones internas son coherentes (revenue > costo variable por cajón)
 * para que el PE sea finito y testeable. Los valores exactos vendrán del fixture
 * de Santi (S-01); estos son suficientes para validar la LÓGICA del simulador.
 *
 * S-01 ya está mergeado (tests/domain/avicola-fixture.test.ts en el backend).
 * El fixture real del cliente vive en el repo privado CosteAR-admin (docs/verticales/).
 * Este test usa números ficticios coherentes para validar la lógica del simulador.
 *
 * Economía del fixture de prueba:
 *   - 472 cajones producidos con 6.300 aves
 *   - Costo variable (MP): $2.500.000 → $5.297/cajón
 *   - Costos fijos (MOD + CIP): $2.200.000
 *   - Precio de venta implícito: $9.000/cajón → PE ≈ 7.930 aves
 */
const BASE_RESULT: CalculationResult = {
  rawMaterialConsumed: 2_500_000,
  directLaborTotal: 800_000,
  indirectCostsApplied: 1_400_000,
  productionCost: 4_700_000,
  costOfGoodsSold: 4_700_000,
  grossMargin: -452_000,   // 472 cajones × $9.000/cajón = $4.248.000 − $4.700.000
  grossMarginPct: -10.64,
  detail: {
    rawMaterial: { optimalLot: 0, finalStockQty: 0, finalStockValue: 0 },
    directLabor: { workingDays: 30, itcsPercent: 0, iapPercent: 0, hourlyRates: {} },
    indirectCosts: { perDepartment: {} },
    unitCost: {
      unitsProduced: 472,
      unitProductionCost: 9_958,
      unitCostOfGoodsSold: 9_958,
    },
  },
};

describe('calcularProyeccionAvicola', () => {
  it('devuelve null si no hay unitsProduced en el resultado base', () => {
    const sinUnidades: CalculationResult = {
      ...BASE_RESULT,
      detail: { ...BASE_RESULT.detail, unitCost: undefined },
    };
    const resultado = calcularProyeccionAvicola(sinUnidades, 6300, 10000, 0.94, 0.94, []);
    expect(resultado).toBeNull();
  });

  it('devuelve null si avesBase es 0', () => {
    expect(calcularProyeccionAvicola(BASE_RESULT, 0, 10000, 0.94, 0.94, [])).toBeNull();
  });

  it('devuelve null si avesObjetivo es 0', () => {
    expect(calcularProyeccionAvicola(BASE_RESULT, 6300, 0, 0.94, 0.94, [])).toBeNull();
  });

  it('con las mismas aves y misma postura, reproduce el resultado base', () => {
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 6300, 0.94, 0.94, []);
    expect(proy).not.toBeNull();
    expect(proy!.cajones).toBeCloseTo(472, 0);
    expect(proy!.rawMaterial).toBeCloseTo(2_500_000, 0);
    expect(proy!.directLabor).toBeCloseTo(800_000, 0);
    expect(proy!.indirectCosts).toBeCloseTo(1_400_000, 0);
  });

  it('escalar a más aves sube la MP y los cajones proporcionalmente', () => {
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 12600, 0.94, 0.94, []);
    expect(proy).not.toBeNull();
    expect(proy!.cajones).toBeCloseTo(944, 0);      // duplica cajones
    expect(proy!.rawMaterial).toBeCloseTo(5_000_000, 0);  // duplica MP (2.5M → 5M)
    expect(proy!.directLabor).toBeCloseTo(800_000, 0);    // MOD no cambia
  });

  it('la postura de plantel produce menos cajones que la de lote', () => {
    const posturaBase = 0.94;
    const proyLote = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, posturaBase, []);
    const proyPlanteil = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.885, posturaBase, []);
    expect(proyLote).not.toBeNull();
    expect(proyPlanteil).not.toBeNull();
    expect(proyPlanteil!.cajones).toBeLessThan(proyLote!.cajones);
  });

  it('un escalón cuyo umbral supera avesObjetivo no se activa', () => {
    const escalonInactivo = [
      { id: 1, aves_desde: 15000, aves_hasta: 20000, costo_fijo: 500_000, inversion_requerida: 0, descripcion: 'nuevo galpón' },
    ];
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, 0.94, escalonInactivo);
    expect(proy).not.toBeNull();
    expect(proy!.indirectCosts).toBeCloseTo(1_400_000, 0); // sin el escalón
  });

  it('un escalón cuyo umbral NO supera avesObjetivo SÍ se activa', () => {
    const escalonActivo = [
      { id: 1, aves_desde: 7000, aves_hasta: 15000, costo_fijo: 500_000, inversion_requerida: 0, descripcion: 'nuevo galpón' },
    ];
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, 0.94, escalonActivo);
    expect(proy).not.toBeNull();
    expect(proy!.indirectCosts).toBeCloseTo(1_900_000, 0); // 1.4M + 500K
  });

  it('el PE se recalcula en cada escenario y nunca queda en cero artificialmente', () => {
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, 0.94, []);
    expect(proy).not.toBeNull();
    expect(proy!.peEnCajones).toBeGreaterThan(0);
    expect(proy!.peEnAves).toBeGreaterThan(0);
    expect(isFinite(proy!.peEnCajones)).toBe(true);
  });

  it('dos escalones activos se suman al CIP', () => {
    const escalones = [
      { id: 1, aves_desde: 5000, aves_hasta: 8000, costo_fijo: 300_000, inversion_requerida: 0, descripcion: 'personal extra' },
      { id: 2, aves_desde: 8000, aves_hasta: 12000, costo_fijo: 700_000, inversion_requerida: 0, descripcion: 'segundo galpón' },
    ];
    const proy = calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, 0.94, escalones);
    expect(proy).not.toBeNull();
    // avesObjetivo 10.000 >= 5.000 y >= 8.000 → ambos escalones activos
    expect(proy!.indirectCosts).toBeCloseTo(1_400_000 + 300_000 + 700_000, 0);
  });
});
