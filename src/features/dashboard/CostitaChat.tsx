/**
 * CostitaChat — Chat de IA para el costista.
 *
 * Flujo UX:
 *  1. Botón flotante en el dashboard → abre un panel lateral
 *  2. Pantalla inicial: botones de acciones frecuentes (bot-like quick replies)
 *  3. El costista elige una o escribe libremente
 *  4. La IA interpreta y muestra una tarjeta de acción propuesta
 *  5. Confirmación explícita antes de cualquier cambio en la DB
 */

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  X, Send, Loader2, Sparkles, Building2, ClipboardCheck, Zap, User, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { CompanyChips, ActionCard, needsCompanySelection } from './components/ChatBubble';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProposedEntry {
  companyId: string;
  companyName: string;
  rawContent: string;
  costSection: string;
  documentType: string;
  estimatedImpact?: string;
}

interface ProposedAlert {
  companyId: string;
  companyName: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AIResponse {
  reply: string;
  actionType: 'CREATE_ENTRY' | 'CREATE_ALERT' | 'INFO_ONLY';
  proposedEntry?: ProposedEntry;
  proposedAlert?: ProposedAlert;
  confidence: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  aiResponse?: AIResponse;   // Solo en mensajes del asistente
  confirmed?: boolean;       // Si la acción ya fue confirmada/rechazada
}

// ── Opciones precargadas ──────────────────────────────────────────────────────

const QUICK_OPTIONS = [
  {
    id: 'empresa',
    icon: Building2,
    label: '¿Cómo cargo una nueva empresa?',
    sub: 'Gestión y alta de clientes',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'estructura',
    icon: ClipboardCheck,
    label: '¿Cómo creo una estructura de costos?',
    sub: 'Configurar productos y procesos',
    color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  },
  {
    id: 'invitar',
    icon: User,
    label: '¿Cómo invito a un operador?',
    sub: 'Asignar permisos de carga',
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  {
    id: 'exportar',
    icon: Zap,
    label: '¿Cómo descargo reportes en Excel?',
    sub: 'Exportar cálculos terminados',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
] as const;

// ── Tipos de empresa (prop) ───────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  industry?: string | null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CostitaChat({ companies = [] }: { companies?: Company[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [feedbackMsgId, setFeedbackMsgId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  // --- Mutations ---

  const interpretMutation = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await api.post<{ data: AIResponse }>('/costista-chat/interpret', {
        message,
        conversationHistory: history,
      });
      return res.data.data;
    },
    onSuccess: (aiResponse, _message) => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse.reply,
        aiResponse,
        confirmed: aiResponse.actionType === 'INFO_ONLY' ? true : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Ups, hubo un problema. Intentá de nuevo.',
        },
      ]);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      msgId,
      aiResponse,
    }: {
      msgId: string;
      aiResponse: AIResponse;
    }) => {
      const res = await api.post<{ data: { success: true; id: string } }>(
        '/costista-chat/confirm',
        {
          actionType: aiResponse.actionType,
          proposedEntry: aiResponse.proposedEntry,
          proposedAlert: aiResponse.proposedAlert,
        },
      );
      return { msgId, result: res.data.data };
    },
    onSuccess: ({ msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m)),
      );
      // Mensaje de éxito del sistema
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '✅ Listo, la acción fue registrada correctamente.',
        },
      ]);
    },
    onError: (_err, { msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmed: false } : m)),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'No se pudo aplicar la acción. Revisá los datos e intentá de nuevo.',
        },
      ]);
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: { type: 'ASSISTANT_MISS' | 'IMPROVEMENT_REPORT'; message: string; details?: string }) => {
      await api.post('/costista-chat/feedback', data);
    },
    onSuccess: () => {
      toast.success('¡Gracias por tu feedback!', { icon: '🤖' });
      setFeedbackMsgId(null);
      setFeedbackText('');
    },
    onError: () => {
      toast.error('Error al enviar el feedback');
    }
  });

  // --- Handlers ---

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || interpretMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowQuick(false);
    interpretMutation.mutate(msg);
  }

  function handleQuick(opt: (typeof QUICK_OPTIONS)[number]) {
    handleSend(opt.label);
  }

  function handleConfirm(msgId: string, aiResponse: AIResponse) {
    confirmMutation.mutate({ msgId, aiResponse });
    // Marcar como procesando
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmed: undefined } : m)),
    );
  }

  function handleReject(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmed: false } : m)),
    );
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Entendido, la acción fue descartada. ¿Necesitás algo más?',
      },
    ]);
  }

  function handleReset() {
    setMessages([]);
    setShowQuick(true);
    setInput('');
  }

  // --- Render ---

  return (
    <PortalOverlay>
    <>
      {/* ── Botón flotante. bottom-24 en las dos resoluciones: en mobile
          despeja la barra de navegación inferior, en desktop despeja el
          footer del AppShell (~80px) — con lg:bottom-6 quedaba tapado
          por el footer cuando la página tenía poco contenido. ──────────── */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-24 right-4 lg:right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3',
          'bg-gray-900 text-white shadow-xl hover:bg-gray-800 transition-all hover:scale-105',
          'text-[13px] font-semibold',
          open && 'opacity-0 pointer-events-none',
        )}
      >
        <Sparkles className="size-4" />
        Asistente CosteAR
      </button>

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel lateral ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 flex flex-col',
          'w-full lg:w-[420px] h-[85vh] lg:h-[620px] lg:bottom-24 lg:right-6',
          'rounded-t-2xl lg:rounded-2xl bg-white shadow-2xl',
          'transition-all duration-300 ease-out',
          open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none',
        )}
        style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gray-900">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">Asistente CosteAR</p>
              <p className="text-[11px] text-gray-400">Guía de uso y soporte</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Nueva consulta
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Welcome + quick options */}
            {showQuick && messages.length === 0 && (
              <div>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 mt-0.5">
                    <Sparkles className="size-3 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-700">
                    ¡Hola! Soy tu asistente de CosteAR. Podés preguntarme cómo operar el sistema, cómo crear estructuras de costos, invitar operadores o exportar tus reportes a Excel. ¿En qué te puedo ayudar hoy?
                  </div>
                </div>

                {/* Quick option buttons */}
                <div className="grid grid-cols-2 gap-2 pl-10">
                  {QUICK_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleQuick(opt)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                        opt.color,
                      )}
                    >
                      <opt.icon className="size-3.5" />
                      <p className="text-[12px] font-semibold leading-tight">{opt.label}</p>
                      <p className="text-[10px] opacity-70">{opt.sub}</p>
                    </button>
                  ))}
                </div>

                <p className="mt-3 pl-10 text-[11px] text-gray-400">
                  O escribí libremente ↓
                </p>
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-gray-900 px-4 py-2.5 text-[13px] text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 mt-0.5">
                      <Sparkles className="size-3 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-700">
                        {msg.content}
                      </div>

                      {/* Botones de Feedback (ThumbsUp / ThumbsDown) */}
                      {!msg.aiResponse?.actionType || msg.aiResponse.actionType === 'INFO_ONLY' ? (
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <button
                            onClick={() => toast.success('¡Gracias por tu feedback!', { icon: '🤖' })}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Respuesta útil"
                          >
                            <ThumbsUp className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setFeedbackMsgId(msg.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Respuesta incorrecta"
                          >
                            <ThumbsDown className="size-3.5" />
                          </button>
                        </div>
                      ) : null}

                      {/* Modal de Feedback Negativo (In-line) */}
                      {feedbackMsgId === msg.id && (
                        <div className="mt-2 rounded-xl border border-red-100 bg-red-50/50 p-3 shadow-sm">
                          <p className="text-[11px] font-semibold text-red-800 mb-2">¿En qué se equivocó Costita?</p>
                          <textarea
                            autoFocus
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Ej: El concepto no es Materia Prima, es Mano de Obra..."
                            className="w-full text-[12px] p-2 rounded-lg border border-red-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 min-h-[60px] resize-none"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => { setFeedbackMsgId(null); setFeedbackText(''); }}
                              className="px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => feedbackMutation.mutate({ type: 'ASSISTANT_MISS', message: msg.content, details: feedbackText })}
                              disabled={feedbackMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                            >
                              {feedbackMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                              Enviar reporte
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Selector de empresa (cuando la IA no pudo identificarla) */}
                      {msg.aiResponse &&
                        msg.aiResponse.actionType !== 'INFO_ONLY' &&
                        msg.confirmed === undefined &&
                        !interpretMutation.isPending &&
                        needsCompanySelection(msg.aiResponse) &&
                        companies.length > 0 && (
                          <CompanyChips
                            companies={companies}
                            onSelect={(company) => {
                              handleSend(`La empresa es ${company.name}`);
                            }}
                          />
                        )}

                      {/* Tarjeta de acción propuesta (solo cuando ya tiene empresa) */}
                      {msg.aiResponse &&
                        msg.aiResponse.actionType !== 'INFO_ONLY' &&
                        !needsCompanySelection(msg.aiResponse) && (
                          <ActionCard
                            aiResponse={msg.aiResponse}
                            msgId={msg.id}
                            confirmed={msg.confirmed}
                            onConfirm={handleConfirm}
                            onReject={handleReject}
                            isPending={confirmMutation.isPending && confirmMutation.variables?.msgId === msg.id}
                          />
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {interpretMutation.isPending && (
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none bg-gray-50 px-4 py-3">
                  <Loader2 className="size-3.5 animate-spin text-gray-400" />
                  <span className="text-[12px] text-gray-400">Analizando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-400 focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribí tu consulta..."
                className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
                disabled={interpretMutation.isPending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || interpretMutation.isPending}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  input.trim()
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                <Send className="size-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-300">
              Soporte técnico y guía de uso del software CosteAR
            </p>
          </div>
        </div>
      </div>
    </>
    </PortalOverlay>
  );
}


