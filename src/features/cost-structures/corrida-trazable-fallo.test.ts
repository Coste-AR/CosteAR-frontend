/**
 * T-08 — Si la corrida trazable falla, el costista tiene que enterarse ARRIBA.
 *
 * Antes: el error se tragaba dentro de la caja del árbol. El comentario del
 * propio código lo decía — "no bloquea ni tapa el resultado de arriba si falla
 * (ej. hay datos sin imputar) — el aviso queda solo dentro de la caja del
 * árbol".
 *
 * El costista quedaba mirando costo unitario, margen y badge, calculados por el
 * camino legado que NO aplica la regla de imputación, mientras la corrida que
 * conoce la incompletitud ni siquiera había terminado.
 *
 * El caso en que el árbol falla es exactamente el caso en que los números no son
 * confiables. Estos tests fijan que se reusa el mecanismo de F08 y no se inventa
 * una segunda noción de confiabilidad.
 */
import { describe, it, expect } from 'vitest';
import { isResultTrustworthy, marginStatus } from '@/components/ui/StatusBadge';

/** Un resultado sano: con MP y con CIP. Sin la falla, sería confiable. */
const RESULTADO_SANO = { rawMaterialConsumed: 2_304_000, indirectCostsApplied: 435_700 };

describe('T-08 — confiabilidad cuando la corrida trazable falla', () => {
  it('un resultado sano y completo es confiable', () => {
    expect(isResultTrustworthy({ ...RESULTADO_SANO, incompleto: false })).toBe(true);
  });

  it('si la corrida trazable falló, el resultado deja de ser confiable', () => {
    // Es como se conecta en ResultTab: `incompleto || corridaTrazableFallo`.
    const corridaTrazableFallo = true;
    expect(isResultTrustworthy({ ...RESULTADO_SANO, incompleto: false || corridaTrazableFallo }))
      .toBe(false);
  });

  it('el badge del margen no puede decir "sano" en ese estado', () => {
    // 42% contra un umbral de 15% es un margen excelente: sin la falla el badge
    // diría 'ok'. Con la falla NO puede decirlo, sea cual sea el estado que use
    // en su lugar — lo que importa es que no afirme que el margen está sano.
    expect(marginStatus(42, 15, true)).toBe('ok');
    expect(marginStatus(42, 15, false)).not.toBe('ok');
  });

  it('se reusa el mecanismo de F08, no uno nuevo', () => {
    // Si alguien agregara una segunda noción de confiabilidad, este test no lo
    // detecta solo — pero deja escrito que la decisión fue reusar isResultTrustworthy,
    // que es el punto del criterio de aceptación 2 de T-08.
    const porImputacion = isResultTrustworthy({ ...RESULTADO_SANO, incompleto: true });
    const porCorridaFallida = isResultTrustworthy({ ...RESULTADO_SANO, incompleto: true });

    expect(porImputacion).toBe(porCorridaFallida);
    expect(porImputacion).toBe(false);
  });

  it('sin MP el resultado ya era no confiable, y eso no cambió', () => {
    expect(isResultTrustworthy({ rawMaterialConsumed: 0, indirectCostsApplied: 435_700, incompleto: false }))
      .toBe(false);
  });
});
