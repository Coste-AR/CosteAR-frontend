import { useState } from 'react';
import { Activity, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { useSimulate } from '../cost-structure-hooks';
import type { CalculationResult } from '@/lib/types';

interface Props {
  structureId: string;
  currentResult: CalculationResult | null;
}

export function ScenarioSimulator({ structureId, currentResult }: Props) {
  const [shocks, setShocks] = useState({
    rawMaterial: 0,
    directLabor: 0,
    indirectCosts: 0,
    sales: 0,
  });

  const simulate = useSimulate(structureId);
  const [projected, setProjected] = useState<CalculationResult | null>(null);

  const handleRun = async () => {
    // Convert percentage to decimal (e.g., 15 -> 0.15)
    const payload = {
      rawMaterial: shocks.rawMaterial / 100,
      directLabor: shocks.directLabor / 100,
      indirectCosts: shocks.indirectCosts / 100,
      sales: shocks.sales / 100,
    };
    const res = await simulate.mutateAsync(payload);
    setProjected(res);
  };

  const getDeltaColor = (curr: number, proj: number, inverse = false) => {
    if (proj === curr) return 'text-ink-soft';
    const diff = proj - curr;
    const isPositive = diff > 0;
    const good = inverse ? !isPositive : isPositive;
    // `text-ok` es el token del semáforo en `index.css`; `text-success` no
    // existe, así que la variación favorable se venía pintando sin color.
    return good ? 'text-ok' : 'text-danger';
  };

  const renderDelta = (curr: number, proj: number, inverse = false) => {
    const color = getDeltaColor(curr, proj, inverse);
    const Icon = proj > curr ? TrendingUp : TrendingDown;
    if (proj === curr) return <span className="text-ink-soft text-xs">-</span>;
    return (
      <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon className="size-3" />
        {proj > curr ? '+' : ''}{((proj - curr) / curr * 100).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded bg-action/10 text-action">
            <Activity className="size-5" />
          </div>
          <h3 className="font-semibold text-ink">Simulador de Escenarios (Shock Test)</h3>
        </div>
        <p className="mb-6 text-sm text-ink-soft leading-relaxed max-w-3xl">
          Aplicá shocks porcentuales para proyectar cómo impactaría la inflación o aumentos de tarifas en tu rentabilidad. 
          Estos cambios se calculan <span className="font-semibold">en memoria</span> y no afectan la estructura original.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Materia Prima (%)</label>
            <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none" value={shocks.rawMaterial} onChange={e => setShocks(s => ({ ...s, rawMaterial: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Mano de Obra (%)</label>
            <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none" value={shocks.directLabor} onChange={e => setShocks(s => ({ ...s, directLabor: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Costos Indirectos (%)</label>
            <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none" value={shocks.indirectCosts} onChange={e => setShocks(s => ({ ...s, indirectCosts: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Precio de Venta (%)</label>
            <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none" value={shocks.sales} onChange={e => setShocks(s => ({ ...s, sales: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button variant="primary" onClick={handleRun} loading={simulate.isPending}>
            Ejecutar Simulación
          </Button>
        </div>
      </div>

      {projected && currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h4 className="text-sm font-bold text-ink mb-4">Costo de Producción</h4>
            <div className="flex items-center justify-between text-2xl font-mono">
              <span className="text-ink-soft line-through opacity-70">
                <Money value={currentResult.productionCost} />
              </span>
              <ArrowRight className="size-5 text-line-heavy" />
              <span className="text-ink">
                <Money value={projected.productionCost} />
              </span>
              {renderDelta(Number(currentResult.productionCost), Number(projected.productionCost), true)}
            </div>
          </div>
          
          <div className="rounded-xl border border-line bg-surface p-5">
            <h4 className="text-sm font-bold text-ink mb-4">Margen Bruto (Rentabilidad)</h4>
            <div className="flex items-center justify-between text-2xl font-mono">
              <span className="text-ink-soft line-through opacity-70">
                {currentResult.grossMarginPct}%
              </span>
              <ArrowRight className="size-5 text-line-heavy" />
              <span className={getDeltaColor(Number(currentResult.grossMarginPct), Number(projected.grossMarginPct))}>
                {projected.grossMarginPct}%
              </span>
              {renderDelta(Number(currentResult.grossMarginPct), Number(projected.grossMarginPct))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
