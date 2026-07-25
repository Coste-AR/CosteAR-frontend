import { describe, it, expect } from 'vitest';
import { marginStatus, isResultTrustworthy } from './StatusBadge';

/**
 * F08 — el badge de margen nunca debe decir "sano" sobre un resultado que no es
 * confiable (sin Materia Prima, sin CIP, o marcado incompleto por F04).
 */
describe('isResultTrustworthy', () => {
  it('un resultado con MP > 0 y CIP > 0 y no incompleto es confiable', () => {
    expect(isResultTrustworthy({ rawMaterialConsumed: 100, indirectCostsApplied: 50 })).toBe(true);
  });

  it('el escenario del reporte (MP 0, CIP 0, solo MOD) NO es confiable', () => {
    expect(
      isResultTrustworthy({ rawMaterialConsumed: 0, indirectCostsApplied: 0 }),
    ).toBe(false);
  });

  it('sin Materia Prima consumida no es confiable', () => {
    expect(isResultTrustworthy({ rawMaterialConsumed: 0, indirectCostsApplied: 50 })).toBe(false);
  });

  it('sin CIP aplicados no es confiable', () => {
    expect(isResultTrustworthy({ rawMaterialConsumed: 100, indirectCostsApplied: 0 })).toBe(false);
  });

  it('un resultado marcado incompleto (F04) no es confiable aunque MP y CIP sean > 0', () => {
    expect(
      isResultTrustworthy({ rawMaterialConsumed: 100, indirectCostsApplied: 50, incompleto: true }),
    ).toBe(false);
  });
});

describe('marginStatus', () => {
  it('un margen sano y confiable pinta "ok"', () => {
    expect(marginStatus(53, 15, true)).toBe('ok');
  });

  it('un margen no confiable NUNCA pinta "ok", aunque el porcentaje sea alto', () => {
    // Escenario del reporte: 53% que mostraba "MARGEN SANO".
    expect(marginStatus(53, 15, false)).toBe('warn');
  });

  it('margen ajustado (bajo el umbral) pinta "warn"', () => {
    expect(marginStatus(10, 15, true)).toBe('warn');
  });

  it('venta a pérdida pinta "danger"', () => {
    expect(marginStatus(-5, 15, true)).toBe('danger');
  });

  it('mantiene el comportamiento previo cuando no se pasa el flag (confiable por defecto)', () => {
    expect(marginStatus(53, 15)).toBe('ok');
  });
});
