import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';

export function DeviationWidget({ companyId }: { companyId: string }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['companies', companyId, 'deviations'],
    queryFn: () => api.get(`/companies/${companyId}/deviations`).then(res => res.data.data),
  });

  if (isLoading) {
    return (
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-48 bg-zinc-200 rounded animate-pulse mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-zinc-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!report || !report.actual || !report.target) return null;

  const { actual, target } = report;
  const isDeviating = report.deviations.length > 0;

  const chartData = [
    { name: 'Materia Prima', Real: actual.rawMaterialsPct, Objetivo: target.rawMaterialsPct },
    { name: 'Mano de Obra', Real: actual.laborPct, Objetivo: target.laborPct },
    { name: 'Indirectos', Real: actual.cifPct, Objetivo: target.cifPct },
    { name: 'Margen Neto', Real: actual.marginPct, Objetivo: target.marginPct },
  ];

  return (
    <div className={cn(
      "mb-6 rounded-2xl border p-6 shadow-sm transition-all duration-300",
      isDeviating ? "border-danger/30 bg-danger/5" : "border-emerald-200 bg-emerald-50/40"
    )}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className={cn("text-[16px] font-extrabold uppercase tracking-tight flex items-center gap-2",
            isDeviating ? "text-danger-deep" : "text-emerald-800"
          )}>
            Monitor de Rentabilidad en Tiempo Real
            {isDeviating && <AlertTriangle className="size-5 text-danger" />}
          </h3>
          <p className={cn("text-[12px] font-medium mt-1", isDeviating ? "text-danger-deep/70" : "text-emerald-700/70")}>
            Comparación de tu Estructura Objetivo vs. Ejecución Real del mes.
          </p>
        </div>
      </div>

      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(val) => `${val}%`} />
            <Tooltip 
              cursor={{ fill: '#f4f4f5', opacity: 0.5 }}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', padding: '10px 14px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 700 }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
            <Bar dataKey="Objetivo" fill="#a1a1aa" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Real" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => {
                const diff = entry.Real - entry.Objetivo;
                const isMargin = entry.name === 'Margen Neto';
                let color = '#10b981'; // emerald-500
                if (isMargin) {
                  if (diff < -5) color = '#ef4444'; // red-500
                  else if (diff < 0) color = '#f59e0b'; // amber-500
                } else {
                  if (diff > 5) color = '#ef4444';
                  else if (diff > 0) color = '#f59e0b';
                }
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
