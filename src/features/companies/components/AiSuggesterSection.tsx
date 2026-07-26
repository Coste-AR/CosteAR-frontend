import { useState } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDictation } from '@/lib/use-dictation';
import toast from 'react-hot-toast';

export function AiSuggesterSection({ companyName }: { companyName: string }) {
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
    <Card className="mb-6 border-zinc-200 shadow-xs bg-zinc-50/20">
      <CardHeader
        title="Asistente de Configuración Inicial (IA)"
        description="Describí el proceso de la empresa o dictalo por voz para recibir recomendaciones de modelado de costos en base a la cátedra de la UNT."
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ej: Es una panificadora familiar. Compran harina, levadura y grasa. Tienen 3 empleados en amasado y horneado, y el alquiler del local se distribuye entre producción y ventas..."
            className="flex-1 min-h-[80px] rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-855 placeholder-zinc-400 focus:border-granate focus:outline-none"
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
      </CardBody>
    </Card>
  );
}
