import { ArrowUpRight, Gauge, Settings, TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MacroIndicator as MacroIndicatorContract } from './dashboard-hooks';

export type MacroIndicator = MacroIndicatorContract;

export interface HomeKpi {
  clave: string;
  etiqueta: string;
  unidad: string;
  valor: number | null;
  completo: boolean;
}

export interface QuickAccess {
  clave: string;
  etiqueta: string;
  destino: string | null;
}

export type PeriodState = 'ready' | 'no-period' | 'no-structure' | 'ambiguous-structure';

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

function Block({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section data-testid="home-block" className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm lg:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-action">{eyebrow}</p>
      <h2 className="mt-1 text-base font-extrabold text-granate-deep">{title}</h2>
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function MacroIndicators({ indicators, loading }: { indicators: MacroIndicator[]; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-2 gap-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;
  if (indicators.length === 0) return <p className="text-sm text-ink-soft">Sin indicadores configurados.</p>;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {indicators.map((indicator) => (
        <a key={`${indicator.clave}-${indicator.fuenteUrl}`} data-testid={`macro-${indicator.clave}`} href={indicator.fuenteUrl} target="_blank" rel="noreferrer" aria-label={`${indicator.etiqueta}: abrir fuente ${indicator.fuenteNombre}`} className="group rounded-xl border border-line bg-surface-alt px-3 py-2.5 transition-colors hover:border-granate/30">
          <span className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-ink">{indicator.etiqueta}</span>
            <ArrowUpRight className="size-3.5 shrink-0 text-granate" aria-hidden />
          </span>
          <span className="mt-1 block font-mono text-lg font-bold text-granate-deep">{indicator.valor === null ? 'Sin dato' : numberFormatter.format(indicator.valor)}</span>
          <span className="block truncate text-[10px] text-ink-soft">{indicator.unidad ?? 'Unidad no informada'} · {indicator.fuenteNombre}</span>
        </a>
      ))}
    </div>
  );
}

export function HomeKpis({ kpis, periodState, loading }: { kpis: HomeKpi[]; periodState: PeriodState; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-3 gap-2"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (periodState !== 'ready') {
    const message = periodState === 'no-period' ? 'Sin período abierto' : periodState === 'ambiguous-structure' ? 'Elegí una estructura' : 'Sin estructura de costos';
    return <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{[1, 2, 3].map((position) => <div key={position} data-testid={`home-kpi-pending-${position}`} className="rounded-xl border border-dashed border-line-strong bg-surface-alt p-3"><p className="text-xs font-bold text-ink-soft">KPI {position}</p><p className="mt-2 text-sm font-bold text-granate">{message}</p></div>)}</div>;
  }
  if (kpis.length === 0) return <p className="text-sm text-ink-soft">Sin KPI configurados.</p>;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {kpis.map((kpi) => <div key={kpi.clave} data-testid={`home-kpi-${kpi.clave}`} className="rounded-xl border border-line bg-surface-alt p-3"><p className="text-xs font-bold leading-tight text-ink">{kpi.etiqueta}</p><p className="mt-2 font-mono text-xl font-extrabold text-granate-deep">{!kpi.completo || kpi.valor === null ? 'Sin dato' : numberFormatter.format(kpi.valor)}</p><p className="mt-0.5 text-[10px] text-ink-soft">{kpi.unidad}</p></div>)}
    </div>
  );
}

export function QuickAccesses({ accesses, loading }: { accesses: QuickAccess[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-24" />;
  const navegables = accesses.filter((access): access is QuickAccess & { destino: string } => typeof access.destino === 'string' && access.destino.trim().length > 0);
  if (navegables.length === 0) return <p className="text-sm text-ink-soft">Sin accesos rápidos configurados.</p>;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{navegables.map((access) => <a key={access.clave} href={access.destino} className="flex min-h-16 items-center justify-between gap-2 rounded-xl border border-line bg-surface-alt px-3 py-2 text-sm font-bold text-ink transition-colors hover:border-granate/30 hover:text-granate">{access.etiqueta}<ArrowUpRight className="size-4 shrink-0" aria-hidden /></a>)}</div>;
}

export function HomeActions({ periodId }: { periodId?: string }) {
  const processHref = periodId ? `/owner-dashboard?periodId=${encodeURIComponent(periodId)}` : null;
  return <div className="grid grid-cols-3 gap-2">{processHref ? <a href={processHref} aria-label="Proceso" className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-granate px-2 py-3 text-xs font-bold text-white hover:bg-granate-deep"><Gauge className="size-5" aria-hidden />Proceso</a> : <span aria-label="Proceso no disponible" className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-line px-2 py-3 text-xs font-bold text-ink-soft"><Gauge className="size-5" aria-hidden />Proceso</span>}<a href="/alerts" aria-label="Alertas" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-alt px-2 py-3 text-xs font-bold text-ink hover:border-granate/30 hover:text-granate"><TriangleAlert className="size-5" aria-hidden />Alertas</a><a href="/profile" aria-label="Settings" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-alt px-2 py-3 text-xs font-bold text-ink hover:border-granate/30 hover:text-granate"><Settings className="size-5" aria-hidden />Settings</a></div>;
}

export { Block as HomeBlock };
