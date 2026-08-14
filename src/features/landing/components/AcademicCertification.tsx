import { GraduationCap, Award } from 'lucide-react';

export function AcademicCertification() {
  return (
    <section className="bg-transparent py-24 border-t border-line/40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-2xl border border-line bg-surface p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.01)] relative overflow-hidden animate-fade-in">
          
          {/* Subtle decoration stamp circle */}
          <div className="pointer-events-none absolute right-[-50px] bottom-[-50px] opacity-5 text-granate">
            <Award className="size-64" />
          </div>

          <div className="grid gap-8 md:grid-cols-[30%_70%] items-center">
            
            {/* Left Column: Visual Seal Badge */}
            <div className="flex flex-col items-center text-center p-4 border-b border-line md:border-b-0 md:border-r border-line/60">
              <div className="flex size-16 items-center justify-center rounded-full bg-granate text-white mb-4 shadow-lg shadow-granate/20">
                <GraduationCap className="size-8" />
              </div>
              <span className="text-[11px] font-bold text-ink leading-tight">AVAL PROFESIONAL</span>
              <span className="text-[10px] text-granate font-extrabold uppercase mt-1 tracking-widest">Y ACADÉMICO</span>
              <span className="text-[9px] text-ink-soft/75 font-mono mt-2">Normas de Costeo</span>
            </div>

            {/* Right Column: Quotes and trust factors */}
            <div className="space-y-4 md:pl-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-granate-tenue px-3 py-1 text-[10px] font-bold text-granate">
                <Award className="size-3.5" /> Metodología de Costos Auditada
              </div>
              <h3 className="text-xl font-extrabold text-ink sm:text-2xl">
                Exactitud contable y rigurosidad matemática
              </h3>
              <blockquote className="text-xs italic leading-relaxed text-ink-soft">
                "Los algoritmos de cálculo, valuación de stock (PPP y Wilson) y distribución de costos indirectos en CosteAR han sido auditados bajo las mejores prácticas académicas y profesionales. Garantiza cálculos libres de errores de redondeo o desvíos contables para directivos."
              </blockquote>
              <div className="pt-2 text-[10px] text-ink-soft/80 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <span className="font-bold text-ink block">Comité de Auditoría de Procesos</span>
                  <span className="text-[9px]">Validación de Fórmulas y Prorrateos</span>
                </div>
                <span className="text-[9px] font-mono bg-surface-alt px-2.5 py-1 rounded border border-line/50">Estándar Profesional de Costos</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
