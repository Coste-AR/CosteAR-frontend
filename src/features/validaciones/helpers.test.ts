import { describe, expect, it } from 'vitest';
import { DOC_TYPE_OPTIONS, SECTION_LABELS, fmt, parseAIAnalysis } from './components/helpers';

describe('presentación de validaciones', () => {
  it('acepta una nota de IA sólo cuando contiene información reconocible', () => {
    expect(parseAIAnalysis('{"documentType":"FACTURA_COMPRA","quality":"alta"}')).toEqual({
      documentType: 'FACTURA_COMPRA',
      quality: 'alta',
    });
    expect(parseAIAnalysis('{"irrelevante":true}')).toBeNull();
    expect(parseAIAnalysis('no es json')).toBeNull();
    expect(parseAIAnalysis(null)).toBeNull();
  });

  it('mantiene separados los gastos de las secciones de costo', () => {
    expect(SECTION_LABELS.COSTOS_INDIRECTOS).toBe('Costos Indirectos');
    expect(SECTION_LABELS.GASTO_ADMINISTRACION).toBe('Gasto de Administración');
    expect(DOC_TYPE_OPTIONS.NOTA_CREDITO).toBe('Nota de crédito');
  });

  it('formatea importes y conserva la ausencia de dato', () => {
    expect(fmt(null)).toBeNull();
    expect(fmt(1234.5)).toMatch(/1\.234,50/);
  });
});
