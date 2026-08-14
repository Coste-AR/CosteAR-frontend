/**
 * C-02 (lado frontend) — la capacidad normal en cero se avisa antes de guardar.
 *
 * El backend ahora rechaza `normalCapacity: 0` con un 422 que nombra el centro,
 * porque en cero la cuota de costos indirectos da cero: el producto sale
 * costeado sin carga fabril y con un margen que parece sano.
 *
 * El problema de UX que eso crea: el formulario agrega cada centro productivo
 * nuevo con `normalCapacity: 0` (ProductiveSettingsSection e IndirectCostsForm),
 * y `fallbackNum('')` convierte un campo vacío en 0 al enviar. O sea que agregar
 * un centro y guardar chocaba contra un 422. Esto lo detecta en pantalla.
 */
import { describe, it, expect } from 'vitest';
import { centrosSinCapacidadNormal } from './components/indirect-costs/helpers';

const CENTROS = [
  { id: 'prod1', name: 'Mecanizado' },
  { id: 'prod2', name: 'Terminado' },
];

describe('centrosSinCapacidadNormal', () => {
  it('no reporta nada cuando todos los centros tienen capacidad', () => {
    const r = centrosSinCapacidadNormal(
      [{ centerId: 'prod1', normalCapacity: 9200 }, { centerId: 'prod2', normalCapacity: 5520 }],
      CENTROS,
    );
    expect(r).toEqual([]);
  });

  it('detecta el cero — el caso exacto que produce el 422', () => {
    const r = centrosSinCapacidadNormal(
      [{ centerId: 'prod1', normalCapacity: 0 }, { centerId: 'prod2', normalCapacity: 5520 }],
      CENTROS,
    );
    expect(r).toEqual(['Mecanizado']);
  });

  it('detecta el campo vacío, que fallbackNum convierte en 0 al enviar', () => {
    const r = centrosSinCapacidadNormal(
      [{ centerId: 'prod1', normalCapacity: undefined }],
      CENTROS,
    );
    expect(r).toEqual(['Mecanizado']);
  });

  it('detecta un negativo', () => {
    const r = centrosSinCapacidadNormal([{ centerId: 'prod2', normalCapacity: -10 }], CENTROS);
    expect(r).toEqual(['Terminado']);
  });

  it('reporta todos los centros que faltan, no solo el primero', () => {
    const r = centrosSinCapacidadNormal(
      [{ centerId: 'prod1', normalCapacity: 0 }, { centerId: 'prod2', normalCapacity: 0 }],
      CENTROS,
    );
    expect(r).toEqual(['Mecanizado', 'Terminado']);
  });

  it('devuelve el NOMBRE del centro, nunca su id interno', () => {
    const r = centrosSinCapacidadNormal([{ centerId: 'prod1', normalCapacity: 0 }], CENTROS);

    expect(r[0]).toBe('Mecanizado');
    expect(r[0]).not.toContain('prod1');
  });

  it('un centro recién agregado, todavía sin nombre, no filtra el id', () => {
    // ProductiveSettingsSection agrega filas con centerId: '' — el mensaje no
    // puede quedar en «» ni mostrar un identificador.
    const r = centrosSinCapacidadNormal([{ centerId: '', normalCapacity: 0 }], CENTROS);

    expect(r).toEqual(['sin nombre']);
  });

  it('tolera configuraciones vacías sin romperse', () => {
    expect(centrosSinCapacidadNormal(undefined, CENTROS)).toEqual([]);
    expect(centrosSinCapacidadNormal([], undefined)).toEqual([]);
  });
});
