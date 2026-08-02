import { useState } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDictation } from '@/lib/use-dictation';
import toast from 'react-hot-toast';

/**
 * Botón flotante + panel (no una tarjeta fija arriba de la página): es una
 * ayuda opcional para el alta de un cliente, no el contenido principal de la
 * pantalla — antes competía visualmente con "Estructuras de Costos", que es
 * lo que el costista realmente vino a hacer acá. Mismo patrón que
 * CostitaChat (botón abajo a la derecha, cerrable) para consistencia; viven
 * en pantallas distintas así que nunca se pisan.
 */
export function AiSuggesterSection({
  companyName,
  attention = false,
}: {
  companyName: string;
  /**
   * NO abre el panel solo — eso se probó y molestaba (interrumpe aunque el
   * costista solo quería mirar algo rápido). En cambio agrega un pulso al
   * botón para llamar la atención sin forzar nada; abrir sigue siendo una
   * decisión del costista.
   */
  attention?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [suggs, setSuggs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dictado = useDictation((chunk) =>
    setPromptText((prev) => (prev.trim() ? `${prev} ${chunk}` : chunk)),
  );

  const handleSuggest = async () => {
    if (!promptText.trim()) return;
    setLoading(true);
    setSuggs(null);
    try {
      const res = await api.post<{ data: { reply: string } }>('/costista-chat/interpret', {
        message: `Dada la siguiente descripción de mi cliente "${companyName}", sugerí detalladamente cómo estructurar su costeo en CosteAR. Incluí sugerencias específicas para Materia Prima (valuación PPP, lote óptimo, etc.), Mano de Obra (cargas sociales, ITCS, incentivos) y Costos Indirectos (prorrateo dual fijo/variable por centro productivo/servicio): ${promptText}`,
      });
      setSuggs(res.data.data.reply);
    } catch {
      toast.error('No se pudo obtener sugerencias. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalOverlay>
      {/* Botón flotante. bottom-24 en las dos resoluciones a propósito: en
          mobile despeja la barra de navegación inferior, en desktop despeja
          el footer del AppShell (~80px) — el mismo valor sirve para las dos
          cosas que hay que esquivar, así que no hace falta un lg:bottom-6
          aparte (eso era lo que quedaba tapado por el footer).
          El pulso (animate-soft-pulse) es un anillo de box-shadow, no un
          transform:scale: en una píldora ancha, escalar por porcentaje crece
          muchos más píxeles a los costados que arriba/abajo — con box-shadow
          crece lo mismo en las cuatro direcciones sin importar la forma. */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-24 right-4 lg:right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3',
          'bg-gray-900 text-white shadow-xl hover:bg-gray-800 transition-all hover:scale-105',
          'text-[13px] font-semibold',
          open && 'opacity-0 pointer-events-none',
          attention && !open && 'animate-soft-pulse',
        )}
      >
        <Sparkles className="size-4" />
        Asistente de Configuración (IA)
      </button>

      {/* Overlay (solo en mobile, donde el panel ocupa toda la pantalla) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel. bottom-0 en mobile (hoja de abajo, sin footer que esquivar
          ahí — el footer del AppShell es lg:block, no existe en mobile);
          lg:bottom-24 en desktop para despejar el footer. */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 flex flex-col',
          'w-full lg:w-[440px] max-h-[85vh] lg:max-h-[620px] lg:bottom-24 lg:right-6',
          'rounded-t-2xl lg:rounded-2xl bg-white shadow-2xl border border-zinc-150',
          'transition-all duration-300 ease-out',
          open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="text-[13px] font-bold text-zinc-900">Asistente de Configuración Inicial (IA)</h3>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Describí el proceso de la empresa o dictalo por voz para recibir recomendaciones de modelado de costos en base a la cátedra de la UNT.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 p-5">
          <div className="flex gap-2">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ej: Es una panificadora familiar. Compran harina, levadura y grasa. Tienen 3 empleados en amasado y horneado, y el alquiler del local se distribuye entre producción y ventas..."
              className="flex-1 min-h-[80px] rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-855 placeholder-zinc-400 focus:border-granate focus:outline-none"
            />
            <button
              type="button"
              onClick={dictado.toggle}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-all",
                dictado.listening
                  ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                  : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100"
              )}
              title={dictado.listening ? "Detener el dictado" : "Dictar por voz"}
            >
              {dictado.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          </div>

          {dictado.listening && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-granate">
              <span className="inline-block size-1.5 rounded-full bg-granate animate-ping" />
              Escuchando… hablá tranquilo, podés frenar a pensar.
            </p>
          )}
          {dictado.error && <p className="text-xs text-danger">{dictado.error}</p>}

          <div className="flex justify-end">
            <Button
              onClick={handleSuggest}
              loading={loading}
              disabled={!promptText.trim()}
              className="flex items-center gap-2"
            >
              <Sparkles className="size-4" />
              Analizar y Sugerir
            </Button>
          </div>

          {suggs && (
            <div className="rounded-xl border border-zinc-150 bg-white p-4 animate-rise text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap shadow-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-800 mb-2">
                <Sparkles className="size-4 text-granate" />
                Sugerencia de Configuración IA
              </div>
              {suggs}
            </div>
          )}
        </div>
      </div>
    </PortalOverlay>
  );
}
