import { cn } from '@/lib/utils';

type Status = 'ok' | 'warn' | 'idle' | 'danger';

/*
 * Chip de estado: pill con borde, fondo tenue, punto de color sólido y texto
 * bold uppercase — mismo patrón que los chips de industria/salud del dashboard.
 * SIEMPRE con texto, nunca solo color (accesibilidad — regla de la guía).
 */
const config: Record<Status, { dot: string; bg: string; text: string; border: string }> = {
  ok: { dot: 'bg-ok', bg: 'bg-ok/10', text: 'text-ok', border: 'border-ok/20' },
  warn: { dot: 'bg-warn', bg: 'bg-warn/10', text: 'text-warn', border: 'border-warn/20' },
  idle: { dot: 'bg-idle', bg: 'bg-idle/10', text: 'text-idle', border: 'border-idle/20' },
  danger: { dot: 'bg-danger', bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' },
};

export function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide shadow-sm',
        c.bg,
        c.text,
        c.border,
      )}
    >
      <span className={cn('size-1.5 rounded-full', c.dot)} />
      {children}
    </span>
  );
}

/**
 * Deriva el estado del semáforo a partir de un margen y su umbral.
 *
 * `trustworthy` (F08): un resultado NO confiable —sin Materia Prima consumida,
 * sin CIP aplicados, o marcado incompleto por F04— nunca se pinta "sano". Ante
 * la duda, el semáforo se degrada a advertencia: es preferible una alerta de
 * más que afirmar un margen sano sobre un número que no contiene el costo real.
 */
export function marginStatus(marginPct: number, thresholdPct: number, trustworthy = true): Status {
  if (!trustworthy) return 'warn';
  if (marginPct < 0) return 'danger';
  if (marginPct < thresholdPct) return 'warn';
  return 'ok';
}

/**
 * ¿El resultado de costos es confiable para afirmar algo sobre su margen? Un
 * cálculo sin Materia Prima consumida o sin CIP aplicados no contiene el costo
 * real del producto; uno marcado incompleto (F04) corrió con datos sin imputar.
 * En cualquiera de esos casos el margen no es confiable. Regla de negocio
 * reusable por cualquier consumidor del semáforo, no solo el panel de resultados.
 */
export function isResultTrustworthy(input: {
  rawMaterialConsumed: number;
  indirectCostsApplied: number;
  incompleto?: boolean;
}): boolean {
  if (input.incompleto) return false;
  if (input.rawMaterialConsumed <= 0) return false;
  if (input.indirectCostsApplied <= 0) return false;
  return true;
}
