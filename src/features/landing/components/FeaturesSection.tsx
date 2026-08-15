import { useRef, useState } from 'react';
import { FileSpreadsheet, Calculator, TrendingUp, Building2, UploadCloud, Radar } from 'lucide-react';

export function FeaturesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / 3;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveCard(Math.min(2, Math.max(0, idx)));
  };
  return (
    <section id="features" className="bg-transparent py-12 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Header Block */}
        <div className="mx-auto max-w-3xl text-center mb-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-granate">Los 3 Elementos del Costo</p>
          <h2 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Cálculo científico del costo unitario
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Nuestros algoritmos están calibrados con la precisión teórica de la cátedra de costos, estructurando las tres bases operativas de tu planta en un flujo continuo y libre de errores.
          </p>
        </div>

        {/* Mobile: carousel con scroll snap | Desktop: grid escalonado */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hidden -mx-6 px-6 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:overflow-visible lg:pb-0"
        >
          
          {/* Tarjeta 1: Materia Prima */}
          <div className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-[0_8px_30px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-1.5 hover:border-granate/35 hover:shadow-[0_20px_50px_rgba(74,21,27,0.06)] shrink-0 w-[78vw] snap-start lg:w-auto lg:translate-y-0">
            <div>
              <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-granate-tenue text-granate">
                <FileSpreadsheet className="size-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-ink">1 · Materia Prima</h3>
              <p className="text-xs leading-relaxed text-ink-soft mb-6">
                Gestión inteligente de inventario con valuación a **Precio Promedio Ponderado (PPP)** y cálculo automático del **Lote Óptimo de Wilson** para minimizar costos de posesión y pedido.
              </p>
            </div>

            {/* Visual Mockup inside card */}
            <div className="mt-auto rounded-xl border border-line bg-surface-alt/70 p-4 font-mono text-[10px] space-y-2.5">
              <div className="flex justify-between items-center border-b border-line pb-1.5">
                <span className="font-bold text-ink">VALUACIÓN DE STOCK</span>
                <span className="rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 font-sans font-bold scale-90">PPP</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Chapa Galvanizada 22</span>
                <span className="text-ink font-bold">1,420 kg</span>
              </div>
              <div className="flex justify-between text-ink-soft border-b border-line/40 pb-1.5">
                <span>Costo Unitario PPP</span>
                <span className="text-ink font-bold">$4,850.00</span>
              </div>
              <div className="flex justify-between items-center text-granate font-sans text-[11px] font-bold pt-0.5">
                <span>Lote Óptimo (Wilson)</span>
                <span className="bg-granate-tenue px-2 py-0.5 rounded-full border border-granate/10">350 kg</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Mano de Obra */}
          <div className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-[0_8px_30px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-1.5 hover:border-granate/35 hover:shadow-[0_20px_50px_rgba(74,21,27,0.06)] shrink-0 w-[78vw] snap-start lg:w-auto lg:translate-y-6">
            <div>
              <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-granate-tenue text-granate">
                <Calculator className="size-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-ink">2 · Mano de Obra (MOD)</h3>
              <p className="text-xs leading-relaxed text-ink-soft mb-6">
                Calculadora integrada de tarifa horaria real. Pasa de la liquidación de haberes básica al costo productivo exacto, distribuyendo cargas sociales y ausentismo pago.
              </p>
            </div>

            {/* Visual Mockup inside card */}
            <div className="mt-auto rounded-xl border border-line bg-surface-alt/70 p-4 font-mono text-[10px] space-y-2.5">
              <div className="flex justify-between items-center border-b border-line pb-1.5">
                <span className="font-bold text-ink">INTEGRACIÓN DE CARGAS (ITCS)</span>
                <span className="text-ink-soft text-[9px]">UOM 2026</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Tarifa Básica Operario</span>
                <span className="text-ink">$3,800.00 /h</span>
              </div>
              <div className="flex justify-between text-ink-soft border-b border-line/40 pb-1.5">
                <span>Cargas Sociales (Leyes)</span>
                <span className="text-emerald-600 font-bold">+72.35%</span>
              </div>
              <div className="flex justify-between items-center text-ink font-bold pt-0.5 text-[11px]">
                <span>Costo Horario Real</span>
                <span className="text-granate font-extrabold">$6,549.30</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Carga Indirecta */}
          <div className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-[0_8px_30px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-1.5 hover:border-granate/35 hover:shadow-[0_20px_50px_rgba(74,21,27,0.06)] shrink-0 w-[78vw] snap-start lg:w-auto lg:translate-y-12">
            <div>
              <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-granate-tenue text-granate">
                <TrendingUp className="size-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-ink">3 · Carga Indirecta (CIP)</h3>
              <p className="text-xs leading-relaxed text-ink-soft mb-6">
                Distribución y prorrateo automatizado de los costos de departamentos de servicios. Detecta variaciones analizando los desvíos de volumen y de presupuesto en tiempo real.
              </p>
            </div>

            {/* Visual Mockup inside card */}
            <div className="mt-auto rounded-xl border border-line bg-surface-alt/70 p-4 font-mono text-[10px] space-y-2.5">
              <div className="flex justify-between items-center border-b border-line pb-1.5">
                <span className="font-bold text-ink">PRORRATEO SECUNDARIO</span>
                <span className="rounded bg-granate/5 text-granate px-1 py-0.2 font-sans font-bold scale-90">CIP</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-ink-soft">
                  <span>Mantenimiento -&gt; Corte</span>
                  <span className="text-ink">45% ($230K)</span>
                </div>
                <div className="w-full bg-line h-1.5 rounded-full overflow-hidden">
                  <div className="bg-granate h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div className="space-y-1 border-b border-line/40 pb-1.5">
                <div className="flex justify-between text-[9px] text-ink-soft">
                  <span>Fuerza Motriz -&gt; Plegado</span>
                  <span className="text-ink">55% ($281K)</span>
                </div>
                <div className="w-full bg-line h-1.5 rounded-full overflow-hidden">
                  <div className="bg-granate h-full rounded-full" style={{ width: '55%' }} />
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] pt-0.5 text-ink-soft">
                <span>Variación Presupuesto</span>
                <span className="text-emerald-600 font-bold">-$12,400 (Favorable)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Dots de paginación — solo mobile */}
        <div className="flex items-center justify-center gap-2 mt-5 lg:hidden">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              aria-label={`Ir a tarjeta ${i + 1}`}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.scrollWidth / 3;
                el.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
              }}
              className={`rounded-full transition-all duration-300 ${
                activeCard === i
                  ? 'w-6 h-2 bg-granate'
                  : 'w-2 h-2 bg-line-strong hover:bg-ink-soft'
              }`}
            />
          ))}
        </div>

        {/* Mini features (3 columnas) */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-8 border-t border-line/60 pt-10 sm:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-granate-tenue text-granate">
              <Building2 className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Múltiples Centros de Costo</h4>
              <p className="text-[11px] leading-relaxed text-ink-soft mt-1">
                Creá departamentos de servicios y productivos ilimitados con reglas contables a medida.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-granate-tenue text-granate">
              <UploadCloud className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Importación Masiva CSV</h4>
              <p className="text-[11px] leading-relaxed text-ink-soft mt-1">
                Actualizá miles de precios y fichas de materiales en un solo clic desde tu software de gestión ERP.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-granate-tenue text-granate">
              <Radar className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Tasas y Cambios en Vivo</h4>
              <p className="text-[11px] leading-relaxed text-ink-soft mt-1">
                Conversiones automáticas de materiales importados vinculadas a las cotizaciones del BCRA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
