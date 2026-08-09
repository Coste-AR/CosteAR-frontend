import { describe, it, expect } from 'vitest';
import { recentPeriodCodes } from './period-codes';

/**
 * Los códigos que ofrece el alta de estructura tienen que pasar la validación
 * del servidor, que es distinta por ritmo. Si esto se desincroniza del regex de
 * `cost.schema.ts`, el costista elige una opción del desplegable y el alta
 * rebota — o sea, el peor error posible: uno que el producto se causa solo.
 */
const REGEX_DEL_BACKEND = /^\d{4}-((0[1-9]|1[0-2])(-Q[12])?|T[1-4])$/;

const EL_6_DE_AGOSTO = new Date(2026, 7, 6); // día 6 ⇒ 1.ª quincena
const EL_20_DE_AGOSTO = new Date(2026, 7, 20); // día 20 ⇒ 2.ª quincena

describe('recentPeriodCodes', () => {
  it('todos los códigos, en los tres ritmos, pasan la validación del backend', () => {
    for (const ritmo of ['MONTHLY', 'BIWEEKLY', 'QUARTERLY'] as const) {
      for (const { code } of recentPeriodCodes(ritmo, 40, EL_6_DE_AGOSTO)) {
        expect(code, `${ritmo} → ${code}`).toMatch(REGEX_DEL_BACKEND);
      }
    }
  });

  it('mensual arranca en el mes que corre y va hacia atrás', () => {
    const [primero, segundo] = recentPeriodCodes('MONTHLY', 3, EL_6_DE_AGOSTO);
    expect(primero).toEqual({ code: '2026-08', label: 'Agosto de 2026' });
    expect(segundo!.code).toBe('2026-07');
  });

  it('quincenal distingue las dos mitades del mes por el día de hoy', () => {
    expect(recentPeriodCodes('BIWEEKLY', 1, EL_6_DE_AGOSTO)[0]!.code).toBe('2026-08-Q1');
    expect(recentPeriodCodes('BIWEEKLY', 1, EL_20_DE_AGOSTO)[0]!.code).toBe('2026-08-Q2');
  });

  it('quincenal cruza bien el borde de mes hacia atrás', () => {
    const codes = recentPeriodCodes('BIWEEKLY', 3, EL_6_DE_AGOSTO).map((o) => o.code);
    expect(codes).toEqual(['2026-08-Q1', '2026-07-Q2', '2026-07-Q1']);
  });

  it('trimestral ubica agosto en el 3.º trimestre y cruza el año hacia atrás', () => {
    const codes = recentPeriodCodes('QUARTERLY', 4, EL_6_DE_AGOSTO).map((o) => o.code);
    expect(codes).toEqual(['2026-T3', '2026-T2', '2026-T1', '2025-T4']);
  });

  it('mensual cruza el año hacia atrás sin inventar un mes 0', () => {
    const codes = recentPeriodCodes('MONTHLY', 3, new Date(2026, 0, 10)).map((o) => o.code);
    expect(codes).toEqual(['2026-01', '2025-12', '2025-11']);
  });
});
