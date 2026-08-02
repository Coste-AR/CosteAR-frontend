import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PortalOverlay } from '@/components/ui/PortalOverlay';

export function FullScreenCalculatorLoader({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    { pct: 10, msg: "Obteniendo datos de la estructura..." },
    { pct: 30, msg: "Calculando consumos de materia prima por ficha PPP..." },
    { pct: 55, msg: "Procesando días hábiles efectivos y cargas sociales MOD..." },
    { pct: 75, msg: "Ejecutando distribución primaria y secundaria dual de CIP..." },
    { pct: 90, msg: "Analizando variaciones presupuestarias y de volumen..." },
    { pct: 98, msg: "Generando reporte de costos finales..." }
  ];

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 850);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const current = steps[step]!;

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6 text-white animate-fade-in">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="relative flex justify-center">
          <div className="absolute inset-0 size-16 rounded-full bg-granate/20 blur-xl animate-pulse mx-auto" />
          <Loader2 className="size-16 animate-spin text-granate relative" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold tracking-tight">Ejecutando Cálculo de Costos</h3>
          <p className="text-sm text-zinc-400 min-h-[40px] px-4 leading-relaxed transition-all duration-300">
            {current.msg}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <div
              className="h-full bg-granate transition-all duration-500 ease-out rounded-full"
              style={{ width: `${current.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-zinc-500 font-mono">
            <span>PROGRESO</span>
            <span>{current.pct}%</span>
          </div>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
