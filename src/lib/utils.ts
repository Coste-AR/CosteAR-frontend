import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formatea un monto en pesos argentinos: $ 1.234.567,89 */
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return arsFormatter.format(n);
}

const pctFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${pctFormatter.format(value)}%`;
}

/**
 * Conversión de TASAS: internamente se guardan como fracción (0.30), pero en la
 * UI siempre se muestran/tipean como porcentaje (30). Estos helpers hacen el
 * puente sin tocar el motor de cálculo (que sigue recibiendo la fracción).
 */
export function fractionToPercentInput(frac: number | null | undefined): number | '' {
  if (frac == null || !Number.isFinite(Number(frac)) || Number(frac) === 0) return '';
  return Number((Number(frac) * 100).toFixed(6));
}

export function percentInputToFraction(pct: unknown): number {
  if (pct === '' || pct == null || Number.isNaN(Number(pct))) return 0;
  return Number((Number(pct) / 100).toFixed(8));
}

/**
 * Etiqueta HUMANA de un centro de costo. Nunca expone el id interno
 * (prod1/serv2…): esos códigos autogenerados jamás deben aparecer en un texto
 * o rótulo que ve el usuario (regla del proyecto #7). Si el centro todavía no
 * tiene nombre cargado, se muestra un genérico —nunca el id—.
 */
export function centerLabel(
  center: { name?: string | null; id?: string | null } | null | undefined,
): string {
  return center?.name?.trim() || 'Centro sin nombre';
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

/**
 * 'YYYY-MM-DD' → 'DD/MM/AAAA' para fechas SIN hora (fecha_hecho, fecha de
 * factura). No pasa por `new Date()` a propósito: `new Date('2026-06-27')` se
 * interpreta como medianoche UTC y en Argentina (UTC-3) se mostraría un día
 * antes. Con fechas date-only reordenamos el string y listo.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return formatDate(value);
  return `${d}/${m}/${y}`;
}
