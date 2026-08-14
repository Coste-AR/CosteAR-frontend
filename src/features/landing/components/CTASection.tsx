import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  onAccessClick: () => void;
}

export function CTASection({ onAccessClick }: CTASectionProps) {
  return (
    <section className="bg-transparent py-24 text-center">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-granate via-granate-deep to-slate-950 px-8 py-16 shadow-[0_20px_50px_rgba(74,21,27,0.18)] sm:px-16 sm:py-24 animate-fade-in">
          
          {/* Subtle glow sphere behind the text inside card */}
          <div className="pointer-events-none absolute -right-[20%] -top-[40%] h-[350px] w-[350px] rounded-full bg-action-soft/20 blur-[80px]" />
          <div className="pointer-events-none absolute -left-[20%] -bottom-[40%] h-[350px] w-[350px] rounded-full bg-action-soft/20 blur-[80px]" />

          <div className="relative z-10 mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Modelá tus estructuras científicamente hoy mismo
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-300">
              Dejá atrás las planillas manuales propensas a errores de tipeo. Automatizá tu gestión de costos y protegé tus márgenes con la precisión académica de CosteAR.
            </p>
            <div className="pt-4 flex justify-center">
              <button
                onClick={onAccessClick}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-granate shadow-lg shadow-white/5 transition-all hover:bg-slate-100 hover:scale-102 hover:shadow-xl"
              >
                Comenzar gratis <ArrowRight className="size-4 text-granate" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
