import { Check } from 'lucide-react';

interface PricingSectionProps {
  onAccessClick: () => void;
}

export function PricingSection({ onAccessClick }: PricingSectionProps) {
  return (
    <section id="pricing" className="bg-transparent py-24 border-t border-line/40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-granate">Membresías</p>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl mt-1 animate-fade-in">
            Planes adaptados a tu escala productiva
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft max-w-xl mx-auto">
            Comenzá a modelar gratis y elegí una membresía profesional a medida que tu volumen de centros de costo y clientes crezca.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 items-stretch">
          
          {/* Plan 1: Profesional */}
          <div className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-xs transition-all duration-300 hover:border-granate/10 hover:shadow-md animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Plan Inicial</span>
              <h3 className="text-lg font-bold text-ink mt-1">Profesional</h3>
              <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                Para consultores contables o ingenieros de costos independientes.
              </p>
              <div className="my-6">
                <span className="font-mono text-3xl font-extrabold text-ink">$19</span>
                <span className="text-xs text-ink-soft"> / mes</span>
              </div>
              <ul className="space-y-3 text-xs text-ink-soft border-t border-line/40 pt-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Hasta 3 empresas clientes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> 5 centros de costo por empresa
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Sincronización oficial BCRA/INDEC
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Exportaciones en PDF estándar
                </li>
              </ul>
            </div>
            <button
              onClick={onAccessClick}
              className="mt-8 w-full py-3 rounded-xl border border-line hover:border-granate/30 hover:bg-granate-tenue/20 text-xs font-bold text-granate transition-colors"
            >
              Comenzar gratis
            </button>
          </div>

          {/* Plan 2: Empresa (Destacado) */}
          <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-granate bg-surface p-8 shadow-[0_15px_40px_rgba(74,21,27,0.06)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(74,21,27,0.1)] animate-fade-in">
            {/* Pop de recomendado */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-granate px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
              Más Popular
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-granate/80">Plan Pyme</span>
              <h3 className="text-lg font-bold text-ink mt-1">Empresa</h3>
              <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                Para pequeñas y medianas fábricas con múltiples procesos.
              </p>
              <div className="my-6">
                <span className="font-mono text-3xl font-extrabold text-granate">$49</span>
                <span className="text-xs text-ink-soft"> / mes</span>
              </div>
              <ul className="space-y-3 text-xs text-ink-soft border-t border-line/40 pt-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Empresas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Centros de costo ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Importador masivo de precios (CSV)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Alertas tempranas de pérdida de margen
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Exportaciones en Excel con fórmulas nativas
                </li>
              </ul>
            </div>
            <button
              onClick={onAccessClick}
              className="mt-8 w-full py-3 rounded-xl bg-granate text-white text-xs font-bold transition-all hover:bg-granate-deep hover:shadow-lg hover:shadow-granate/10"
            >
              Comenzar Prueba Gratis
            </button>
          </div>

          {/* Plan 3: Corporativo */}
          <div className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-xs transition-all duration-300 hover:border-granate/10 hover:shadow-md animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Plan Corporativo</span>
              <h3 className="text-lg font-bold text-ink mt-1">Industrial / Custom</h3>
              <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                Para grandes industrias o cátedras que requieren soporte prioritario.
              </p>
              <div className="my-6">
                <span className="font-mono text-2xl font-bold text-ink">A medida</span>
                <span className="text-xs text-ink-soft"> / cotización</span>
              </div>
              <ul className="space-y-3 text-xs text-ink-soft border-t border-line/40 pt-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Integración directa via API con ERP local
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Auditorías de fórmulas por la cátedra
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> SLA de soporte 24/7 y RLS dedicado
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" /> Capacitación a personal de administración
                </li>
              </ul>
            </div>
            <button
              onClick={onAccessClick}
              className="mt-8 w-full py-3 rounded-xl border border-line hover:border-granate/30 hover:bg-granate-tenue/20 text-xs font-bold text-granate transition-colors"
            >
              Contactar Ventas
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
