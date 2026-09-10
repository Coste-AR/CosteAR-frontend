import { describe, expect, it } from 'vitest';
import { validateDesperdicioDraft, type DesperdicioDraft } from './desperdicio-validation';

const base: DesperdicioDraft = {
  concepto: 'Recortes de material',
  valor: '1000',
  valorRecupero: '250',
  naturaleza: '',
  motivo: '',
};

describe('validación de desperdicios', () => {
  it('acepta guardar sin declarar la naturaleza', () => {
    expect(validateDesperdicioDraft(base)).toEqual({});
  });

  it('rechaza un recupero mayor que lo perdido', () => {
    expect(validateDesperdicioDraft({ ...base, valorRecupero: '1001' })).toMatchObject({
      valorRecupero: 'El recupero no puede ser mayor que el valor de lo perdido.',
    });
  });

  it('rechaza importes negativos y un concepto vacío', () => {
    expect(
      validateDesperdicioDraft({ ...base, concepto: ' ', valor: '-1', valorRecupero: '-2' }),
    ).toMatchObject({ concepto: expect.any(String), valor: expect.any(String), valorRecupero: expect.any(String) });
  });
});
