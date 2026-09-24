import { useEffect, useState } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { ASISTENTE_INACTIVIDAD_MS } from './config';
import { homeHelp } from './content/home';
import { fieldHelp } from './content/field';
import { ownerHelp } from './content/owner';

export type HelpScreen = 'home' | 'field' | 'owner';

const content = { home: homeHelp, field: fieldHelp, owner: ownerHelp };

export function HelpAssistant({ screen }: { screen: HelpScreen }) {
  const [open, setOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const help = content[screen];

  useEffect(() => {
    if (open) return;
    let timer: ReturnType<typeof setTimeout>;
    const restart = () => {
      setBubbleVisible(false);
      clearTimeout(timer);
      timer = setTimeout(() => setBubbleVisible(true), ASISTENTE_INACTIVIDAD_MS);
    };
    restart();
    window.addEventListener('mousemove', restart);
    window.addEventListener('keydown', restart);
    window.addEventListener('touchstart', restart);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', restart);
      window.removeEventListener('keydown', restart);
      window.removeEventListener('touchstart', restart);
    };
  }, [open]);

  const showPanel = () => {
    setBubbleVisible(false);
    setExpandedQuestion(null);
    setOpen(true);
  };

  return (
    <aside aria-label="Asistente de uso" className="fixed bottom-24 right-4 z-40 lg:right-6">
      {bubbleVisible && !open && (
        <button
          type="button"
          onClick={showPanel}
          className="mb-2 block max-w-64 rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-granate shadow-lg"
        >
          ¿Necesitás ayuda con esta pantalla?
        </button>
      )}

      {open && (
        <section aria-label={help.title} className="mb-3 w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
            <h2 className="text-base font-bold text-granate-deep">{help.title}</h2>
            <button type="button" aria-label="Cerrar ayuda" onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-soft hover:bg-granate-tenue">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <ul className="space-y-2">
            {help.questions.map(({ question, answer }) => (
              <li key={question} className="rounded-xl border border-line">
                <button
                  type="button"
                  aria-expanded={expandedQuestion === question}
                  onClick={() => setExpandedQuestion(expandedQuestion === question ? null : question)}
                  className="w-full px-3 py-3 text-left text-sm font-semibold text-ink"
                >
                  {question}
                </button>
                {expandedQuestion === question && <p className="px-3 pb-3 text-sm text-ink-soft">{answer}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        aria-label="Abrir ayuda de esta pantalla"
        aria-expanded={open}
        onClick={() => { if (open) setOpen(false); else showPanel(); }}
        className="ml-auto flex size-12 items-center justify-center rounded-full bg-granate text-white shadow-lg hover:bg-granate-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-granate"
      >
        <CircleHelp className="size-6" aria-hidden="true" />
      </button>
    </aside>
  );
}
