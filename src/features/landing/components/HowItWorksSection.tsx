import { AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-t border-line bg-surface-alt/30 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          
          {/* Left Column: Timeline Steps */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-granate">Flujo de Trabajo</p>
            <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">
              De las compras a la rentabilidad en tiempo real
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              CosteAR se integra en el flujo diario de tu negocio para recolectar, procesar y prorratear datos contables de forma automática, sin requerir horas de tipeo manual.
            </p>

            <div className="relative mt-12 pl-8 space-y-12">
              {/* Vertical connecting line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-granate/40 via-granate/10 to-transparent" />

              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -left-[30px] top-0.5 flex size-6 items-center justify-center rounded-full bg-granate text-white text-[11px] font-bold shadow-md shadow-granate/10 group-hover:scale-110 transition-transform">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink transition-colors group-hover:text-granate">Clasificación Automática</h4>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    Importá facturas y comprobantes fiscales. El sistema asocia y clasifica cada egreso de forma inteligente al centro de costo correspondiente.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute -left-[30px] top-0.5 flex size-6 items-center justify-center rounded-full bg-granate text-white text-[11px] font-bold shadow-md shadow-granate/10 group-hover:scale-110 transition-transform">
                  2
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink transition-colors group-hover:text-granate">Distribución y Prorrateo</h4>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    Calculá las horas hombre reales incurridas y distribuí las cargas sociales e indirectas (CIP) con reglas de asignación científica avaladas académicamente.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute -left-[30px] top-0.5 flex size-6 items-center justify-center rounded-full bg-granate text-white text-[11px] font-bold shadow-md shadow-granate/10 group-hover:scale-110 transition-transform">
                  3
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink transition-colors group-hover:text-granate">Simulación y Reportes</h4>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    Monitoreá desvíos en tiempo real con alertas automáticas. Simulá nuevos escenarios de costos ante aumentos paritarios o devaluación del dólar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Dashboard Calculator Mockup */}
          <div className="relative rounded-2xl border border-line bg-surface p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden">
            
            {/* Header bar of mockup app */}
            <div className="flex items-center justify-between border-b border-line/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-granate" />
                <span className="text-[11px] font-bold tracking-wider text-ink uppercase">Fórmula de Costo Activa</span>
              </div>
              <span className="text-[10px] font-mono bg-surface-alt border border-line/60 px-2 py-0.5 rounded text-ink-soft">ID: EST-2026-F</span>
            </div>

            {/* Content: Main price card info */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-soft/75">Costo Unitario Total</span>
                  <div className="text-3xl font-mono font-extrabold text-ink mt-1">$284,500.00</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-ink-soft/75">Margen Objetivo</span>
                  <div className="flex items-center gap-1 text-emerald-600 font-mono font-bold text-lg mt-1 justify-end">
                    <TrendingUp className="size-4" /> 35.2%
                  </div>
                </div>
              </div>

              {/* Elements Breakdown with custom bar indicators */}
              <div className="space-y-4 border-t border-b border-line/60 py-6 font-mono text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-ink-soft">
                    <span>Materia Prima (MP)</span>
                    <span className="text-ink font-bold">$120,400.00 (42%)</span>
                  </div>
                  <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                    <div className="bg-granate h-full rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-ink-soft">
                    <span>Mano de Obra Directa (MOD)</span>
                    <span className="text-ink font-bold">$98,200.00 (35%)</span>
                  </div>
                  <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                    <div className="bg-granate/75 h-full rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-ink-soft">
                    <span>Cargas Indirectas (CIP)</span>
                    <span className="text-ink font-bold">$65,900.00 (23%)</span>
                  </div>
                  <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                    <div className="bg-granate/40 h-full rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>
              </div>

              {/* Glowing Alert Overlay Card */}
              <div className="relative rounded-2xl bg-action-soft bg-red-50 border border-action/20 p-4 shadow-[0_8px_30px_rgba(179,25,41,0.06)] animate-pulse-slow">
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-action text-white">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-action uppercase tracking-wider block">¡Alerta de Desvío de Margen!</span>
                    <p className="text-[10px] text-ink leading-relaxed font-sans">
                      El aumento del dólar BCRA impactará el costo de la chapa galvanizada. El margen estimado bajará del 35.2% al <strong className="text-action font-extrabold">30.7%</strong>.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-[9px] font-bold text-white shadow-md hover:bg-action-soft transition-all">
                    <RefreshCw className="size-3" /> Recalcular Margen
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
