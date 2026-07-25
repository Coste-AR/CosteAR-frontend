import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart3, TrendingUp, TrendingDown, Layers, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Money, Percent } from '@/components/ui/Money';
import { formatDate } from '@/lib/utils';

interface Metrics {
  productName: string;
  productionCost: number;
  grossMargin: number;
  grossMarginPct: number;
  rawMaterialConsumed: number;
  directLaborTotal: number;
  indirectCostsApplied: number;
  calculatedAt: string;
}

export function MetricsDashboard({
  activeConnectionId,
  activeStructureId,
}: {
  activeConnectionId: string | null;
  activeStructureId: string | null;
}) {
  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['portal-metrics', activeConnectionId, activeStructureId],
    queryFn: async () => {
      if (!activeConnectionId || !activeStructureId) return null;
      const res = await api.get<{ data: Metrics | null }>(
        `/empresa-portal/connections/${activeConnectionId}/structures/${activeStructureId}/metrics`
      );
      return res.data.data;
    },
    enabled: !!activeConnectionId && !!activeStructureId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-granate/50" />
      </div>
    );
  }

  if (isError || (!isLoading && !metrics)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <AlertCircle className="size-12 text-ink-soft/30 mb-3" />
        <h3 className="text-[15px] font-bold text-ink mb-1">Sin datos de cálculo</h3>
        <p className="text-[13px] text-ink-soft max-w-sm">
          Todavía no hay un cálculo cerrado para esta estructura. Cuando tu consultor finalice el período, vas a ver tus métricas acá.
        </p>
      </div>
    );
  }

  const chartData = [
    { name: 'Materia Prima', value: metrics!.rawMaterialConsumed, color: '#3b82f6' },
    { name: 'Mano de Obra', value: metrics!.directLaborTotal, color: '#f59e0b' },
    { name: 'Costos Indirectos', value: metrics!.indirectCostsApplied, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-[22px] font-extrabold tracking-tight text-ink">
          Métricas de <span className="text-granate">{metrics!.productName}</span>
        </h2>
        <p className="text-[13px] text-ink-soft mt-1">
          Último cálculo oficial (Congelado el {formatDate(metrics!.calculatedAt)})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[24px] bg-white border border-line/60 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layers className="size-20 text-granate" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">Costo Total Unitario</p>
          <Money value={metrics!.productionCost} className="text-3xl font-black text-ink block" />
        </div>

        <div className="rounded-[24px] bg-white border border-line/60 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 className="size-20 text-emerald-600" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">Margen Bruto</p>
          <Money value={metrics!.grossMargin} className="text-3xl font-black text-emerald-700 block" />
        </div>

        <div className="rounded-[24px] bg-white border border-line/60 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            {metrics!.grossMarginPct >= 0 ? <TrendingUp className="size-20 text-emerald-600" /> : <TrendingDown className="size-20 text-red-600" />}
          </div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">Rentabilidad</p>
          <Percent value={metrics!.grossMarginPct} className={`text-3xl font-black block ${metrics!.grossMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`} />
        </div>
      </div>

      <div className="rounded-[24px] bg-white border border-line/60 p-6 shadow-sm">
        <h3 className="text-[14px] font-bold text-ink mb-6">Composición del Costo</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
