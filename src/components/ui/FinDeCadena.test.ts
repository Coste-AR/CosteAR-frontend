/**
 * T-03 — la cadena tiene que declarar dónde termina.
 *
 * La auditoría del 06/08/2026 midió que en el árbol de Órdenes 20 de 21 filas
 * visibles no ofrecían nada y no explicaban nada. Cuatro situaciones muy
 * distintas se veían idénticas, y la peor consecuencia no es la confusión: es
 * que un costista que abre tres números y encuentra tres callejones sin salida
 * concluye "esta función no anda" y deja de usarla.
 *
 * Lo que más importa acá es que un DERIVADO no se reporte como defecto: es un
 * número calculado, correctamente sin ficha.
 */
import { describe, it, expect } from 'vitest';
import { clasificarFinDeCadena } from './FinDeCadena';

describe('clasificarFinDeCadena', () => {
  it('un dato cargado con comprobante → con-comprobante', () => {
    expect(clasificarFinDeCadena({ dataPointId: 'dp-1', tieneComprobante: true }))
      .toBe('con-comprobante');
  });

  it('un dato cargado sin comprobante → dato-cargado, que es fin de cadena legítimo', () => {
    expect(clasificarFinDeCadena({ dataPointId: 'dp-1' })).toBe('dato-cargado');
    expect(clasificarFinDeCadena({ dataPointId: 'dp-1', tieneComprobante: false }))
      .toBe('dato-cargado');
  });

  it('un número calculado NO es un defecto: es derivado', () => {
    // Es el caso de "Terminadas y transferidas" en Procesos o "Margen %" en
    // Órdenes: se deducen por diferencia, nadie los cargó, y está bien.
    expect(clasificarFinDeCadena({ formula: 'a − b' })).toBe('derivado');
  });

  it('sin dato y sin fórmula → sin-origen, que SÍ es un defecto', () => {
    expect(clasificarFinDeCadena({})).toBe('sin-origen');
    expect(clasificarFinDeCadena({ dataPointId: null, formula: null })).toBe('sin-origen');
  });

  it('la fórmula gana sobre la ausencia de dato — el orden importa', () => {
    // Si se invirtiera el orden, todo nodo calculado se reportaría como defecto
    // de datos. Serían la mayoría del árbol y el aviso perdería todo sentido.
    expect(clasificarFinDeCadena({ dataPointId: null, formula: 'x × y' })).toBe('derivado');
  });

  it('el dato gana sobre la fórmula: si alguien lo cargó, tiene ficha', () => {
    expect(clasificarFinDeCadena({ dataPointId: 'dp-9', formula: 'x × y' }))
      .toBe('dato-cargado');
  });

  it('los cuatro estados son distinguibles entre sí', () => {
    const estados = new Set([
      clasificarFinDeCadena({ dataPointId: 'd', tieneComprobante: true }),
      clasificarFinDeCadena({ dataPointId: 'd' }),
      clasificarFinDeCadena({ formula: 'a+b' }),
      clasificarFinDeCadena({}),
    ]);

    expect(estados.size).toBe(4);
  });
});
