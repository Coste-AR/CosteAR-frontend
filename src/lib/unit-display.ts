import type { UnidadGestion } from './types';

export const SIN_UNIDAD_DECLARADA = 'sin unidad declarada';

/**
 * La API entrega el nombre singular de la unidad. La pantalla lo usa tal cual
 * para importes (`por cajón`) y pluraliza sólo el primer sustantivo cuando
 * presenta cantidades (`40 cajones`). No hay fallback a "unidad".
 */
export function nombreUnidad(unidad: UnidadGestion | null | undefined): string {
  const nombre = unidad?.nombre.trim();
  return nombre ? nombre.toLocaleLowerCase('es-AR') : SIN_UNIDAD_DECLARADA;
}

function pluralizarPalabra(palabra: string): string {
  if (/ón$/iu.test(palabra)) return palabra.replace(/ón$/iu, 'ones');
  if (/z$/iu.test(palabra)) return palabra.replace(/z$/iu, 'ces');
  if (/[aeiouáéíóú]$/iu.test(palabra)) return `${palabra}s`;
  return `${palabra}es`;
}

export function nombreUnidadPlural(unidad: UnidadGestion | null | undefined): string {
  const singular = nombreUnidad(unidad);
  if (!unidad) return singular;
  const [primera, ...resto] = singular.split(/\s+/u);
  return [pluralizarPalabra(primera ?? singular), ...resto].join(' ');
}
