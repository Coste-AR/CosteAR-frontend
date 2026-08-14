import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'neutral' | 'urgent' | 'warn' | 'ok';

const STYLES: Record<Variant, { card: string; num: string; icon: string; dot: string }> = {
  neutral: { card: 'border-line bg-white/90 hover:border-granate/20', num: 'text-granate-deep', icon: 'bg-zinc-50 text-zinc-500 border-zinc-200/50', dot: '' },
  urgent: { card: 'border-red-200 bg-white/90 hover:border-red-400', num: 'text-action', icon: 'bg-red-50 text-action border-red-100', dot: 'bg-action animate-pulse' },
  warn: { card: 'border-amber-200 bg-white/90 hover:border-amber-400', num: 'text-amber-700', icon: 'bg-amber-50 text-amber-600 border-amber-100/50', dot: 'bg-amber-500 animate-pulse' },
  ok: { card: 'border-emerald-250 bg-white/90 hover:border-emerald-400', num: 'text-emerald-700', icon: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', dot: '' },
};

/**
 * Tarjeta de KPI estilo bento (mismo patrón que las 4 stat cards del dashboard).
 * `to` es opcional: si no se pasa, renderiza un `<div>` no clickeable.
 */
export function StatCard({
  label, value, sub, icon: Icon, to, variant = 'neutral',
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: LucideIcon;
  to?: string;
  variant?: Variant;
}) {
  const styles = STYLES[variant];

  const content = (
    <div className={cn(
      'relative rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 shadow-[0_8px_24px_rgba(74,21,27,0.01)]',
      styles.card,
    )}>
      {styles.dot && (
        <span className={cn('absolute right-4.5 top-4.5 size-1.5 rounded-full', styles.dot)} />
      )}
      <div className={cn('mb-3.5 flex size-9 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.015)]', styles.icon)}>
        <Icon className="size-4.5" />
      </div>
      <p className={cn('font-mono-jb text-[32px] leading-none tracking-tight font-bold', styles.num)}>
        {value}
      </p>
      <p className="mt-2 text-[12.5px] font-bold text-ink leading-tight">{label}</p>
      <p className="mt-0.5 truncate text-[10.5px] text-ink-soft/75 font-semibold">{sub}</p>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group">
        {content}
      </Link>
    );
  }
  return <div className="group">{content}</div>;
}
