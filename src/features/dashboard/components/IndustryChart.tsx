import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Company {
  id: string;
  industry?: string | null;
}

const COLORS = ['#9b2226', '#ca6702', '#0a9396', '#005f73', '#e9d8a6', '#94d2bd', '#ee9b00'];

export function IndustryChart({ companies }: { companies: Company[] }) {
  const data = useMemo(() => {
    const counts = companies.reduce((acc, c) => {
      const ind = c.industry || 'General';
      acc[ind] = (acc[ind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    if (sorted.length <= 5) return sorted;
    
    const top4 = sorted.slice(0, 4);
    const others = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
    return [...top4, { name: 'Otros', value: others }];
  }, [companies]);

  if (data.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center w-full mt-2">
      <p className="text-[12px] text-ink-soft mb-2 text-center">Distribución de clientes por rubro/industria</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', padding: '8px 12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#09090b', fontWeight: 600 }}
              formatter={(value: number) => [value === 1 ? '1 cliente' : `${value} clientes`, 'Cantidad']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle" 
              wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }} 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
