import type { Periodicity } from './types';

/**
 * CÓDIGOS DE PERÍODO — espejo del calendario del backend.
 *
 * El servidor valida el código con esta expresión
 * (`cost.schema.ts`): `^\d{4}-((0[1-9]|1[0-2])(-Q[12])?|T[1-4])$`. Son tres
 * formas distintas, una por ritmo, y NO son intercambiables: `2026-03` en una
 * empresa quincenal rebota.
 *
 * Por eso el período de arranque no puede ofrecerse como texto libre. Pedirle
 * al costista que invente un código es pedirle que adivine un formato que no
 * tiene por qué conocer — el mismo motivo por el que en su momento se sacó ese
 * campo del alta. Acá se le ofrecen los códigos que su empresa efectivamente
 * usa, ya armados.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface PeriodOption {
  /** El código tal cual lo espera la API. */
  code: string;
  /** Cómo se lee en pantalla. */
  label: string;
}

/**
 * El período que corre HOY según el ritmo de la empresa, y los anteriores.
 *
 * Se devuelven del más reciente al más viejo: lo más probable es que el
 * costista quiera el actual (que es lo que el servidor pondría solo) o uno
 * cercano hacia atrás, si está cargando historia previa.
 *
 * Solo hacia atrás a propósito: abrir una estructura en un período futuro no
 * tiene caso de uso y sí tiene forma de romper la cadena de arrastre.
 */
export function recentPeriodCodes(
  periodicity: Periodicity,
  count = 24,
  today: Date = new Date(),
): PeriodOption[] {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11
  const day = today.getDate();

  const actual =
    periodicity === 'MONTHLY'
      ? year * 12 + month
      : periodicity === 'BIWEEKLY'
        ? (year * 12 + month) * 2 + (day <= 15 ? 0 : 1)
        : year * 4 + Math.floor(month / 3);

  const opciones: PeriodOption[] = [];
  for (let i = 0; i < count; i++) {
    opciones.push(decode(periodicity, actual - i));
  }
  return opciones;
}

function decode(periodicity: Periodicity, index: number): PeriodOption {
  if (periodicity === 'QUARTERLY') {
    const y = Math.floor(index / 4);
    const t = (index % 4) + 1;
    return { code: `${y}-T${t}`, label: `${t}.º trimestre de ${y}` };
  }

  if (periodicity === 'BIWEEKLY') {
    const mesIndex = Math.floor(index / 2);
    const quincena = (index % 2) + 1;
    const y = Math.floor(mesIndex / 12);
    const m = mesIndex % 12;
    return {
      code: `${y}-${pad(m + 1)}-Q${quincena}`,
      label: `${quincena}.ª quincena de ${MESES[m]} de ${y}`,
    };
  }

  const y = Math.floor(index / 12);
  const m = index % 12;
  return { code: `${y}-${pad(m + 1)}`, label: `${capitalizar(MESES[m]!)} de ${y}` };
}
