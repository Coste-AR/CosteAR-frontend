import { describe, expect, it } from 'vitest';
import { nombreUnidad, nombreUnidadPlural } from './unit-display';

describe('etiquetas de unidad de gestión', () => {
  it('usa el nombre recibido y forma el plural para cantidades', () => {
    const unidad = { codigo: 'cajon', nombre: 'Cajón', factor: 360 };

    expect(nombreUnidad(unidad)).toBe('cajón');
    expect(nombreUnidadPlural(unidad)).toBe('cajones');
  });

  it('declara la ausencia sin inventar una unidad genérica', () => {
    expect(nombreUnidad(null)).toBe('sin unidad declarada');
    expect(nombreUnidadPlural(null)).toBe('sin unidad declarada');
  });
});
