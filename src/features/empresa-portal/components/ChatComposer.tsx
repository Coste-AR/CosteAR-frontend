import { useRef, type Dispatch, type SetStateAction } from 'react';
import { Paperclip, X, Send, FileText, Mic, MicOff, Camera } from 'lucide-react';
import { StructureSelectDropdown } from './StructureSelector';
import { cn } from '@/lib/utils';
import { useDictation } from '@/lib/use-dictation';

const MAX_FILE_BYTES = 4.5 * 1024 * 1024;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        } else {
          resolve(file);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

interface ChatComposerProps {
  text: string;
  /**
   * El setter de verdad, no `(t: string) => void`. Hace falta la forma funcional
   * (`setText(prev => ...)`) para agregar lo dictado sin pisar lo que ya estaba escrito.
   */
  setText: Dispatch<SetStateAction<string>>;
  file: File | null;
  setFile: (f: File | null) => void;
  fileError: string | null;
  setFileError: (err: string | null) => void;
  sendError: string | null;
  sending: boolean;
  activeConnectionId: string | null;
  activeStructureId: string | null;
  onSelectStructure: (id: string | null, name: string | null) => void;
  onSend: () => void;
}

export function ChatComposer({
  text,
  setText,
  file,
  setFile,
  fileError,
  setFileError,
  sendError,
  sending,
  activeConnectionId,
  activeStructureId,
  onSelectStructure,
  onSend,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // El texto dictado se AGREGA al que ya había (forma funcional). Antes se leía `text`
  // congelado en el momento de arrancar, así que la segunda frase pisaba a la primera.
  const dictado = useDictation((chunk) => {
    setText((prev) => (prev.trim() ? `${prev} ${chunk}` : chunk));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
      }
    }, 0);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    let selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type.startsWith('image/')) {
      try {
        selected = await compressImage(selected);
      } catch (err) {
        console.error('Error compressing image, using original', err);
      }
    }

    if (selected.size > MAX_FILE_BYTES) {
      setFileError('El archivo supera el límite de 4.5 MB');
      return;
    }
    setFile(selected);
  };

  const handleClearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="shrink-0 bg-transparent px-4 py-4 pb-6 sm:px-6 lg:px-8 z-10 relative pointer-events-none">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_40px_rgba(74,21,27,0.08)] p-2 pointer-events-auto transition-all duration-300">
        
        {file && (
          <div className="mb-2 mx-2 mt-2 flex items-center gap-3 rounded-2xl border border-granate/10 bg-granate-tenue/50 px-4 py-3 shadow-inner">
          {file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="size-10 rounded-lg object-cover border border-line"
            />
          ) : (
            <FileText className="size-6 text-granate" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{file.name}</p>
            <p className="text-[10px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="text-ink-soft hover:text-danger transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {fileError && <p className="mb-2 text-xs text-danger">{fileError}</p>}
      {sendError && <p className="mb-2 text-xs text-danger">{sendError}</p>}

      {/* Audio soundwave visualization helper when listening */}
      {dictado.listening && (
        <p className="mx-4 mb-2 flex items-center gap-2 text-xs text-granate font-bold">
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-granate rounded-full animate-ping" />
          </span>
          Escuchando… podés frenar a pensar.
        </p>
      )}
      {dictado.error && <p className="mx-4 mb-2 text-xs text-danger font-medium">{dictado.error}</p>}

      <div className="flex items-end gap-2.5 rounded-2xl bg-surface/50 border border-transparent focus-within:border-granate/20 focus-within:bg-white px-2 py-2 transition-all duration-300">
        {/* Attach File */}
        <label className="shrink-0 cursor-pointer flex items-center justify-center size-10 rounded-full text-ink-soft hover:text-granate hover:bg-granate-tenue transition-all" title="Adjuntar archivo o imagen">
          <Paperclip className="size-5" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Direct Camera Capture */}
        <label className="shrink-0 cursor-pointer flex items-center justify-center size-10 rounded-full text-ink-soft hover:text-granate hover:bg-granate-tenue transition-all" title="Sacar foto directamente">
          <Camera className="size-5" />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Dictado por voz */}
        {dictado.supported && (
          <button
            type="button"
            onClick={dictado.toggle}
            disabled={!activeConnectionId}
            className={cn(
              "shrink-0 flex items-center justify-center size-10 rounded-full transition-all duration-300",
              dictado.listening
                ? "bg-granate text-white shadow-lg shadow-granate/30 scale-110"
                : "text-ink-soft hover:text-granate hover:bg-granate-tenue"
            )}
            title={dictado.listening ? "Detener el dictado" : "Dictar por voz"}
          >
            {dictado.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}

        {/* Textarea */}
        <div className="flex-1 flex flex-col justify-center min-h-[40px] py-1">
          <textarea
            ref={textareaRef}
            className="w-full resize-none bg-transparent text-[14px] text-ink placeholder:text-ink-soft/50 focus:!outline-none focus-visible:!outline-none focus-visible:!ring-0 max-h-32 min-h-[20px] leading-relaxed scrollbar-thin"
            placeholder={
              dictado.listening
                ? 'Escuchando... Hablá ahora...'
                : activeConnectionId
                  ? 'Escribí una nota o adjuntá comprobantes...'
                  : 'Seleccioná una empresa primero'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={!activeConnectionId || dictado.listening}
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
        </div>

        {/* Audio soundwave visualization helper */}
        {dictado.listening && (
          <div className="flex items-center gap-1.5 px-3 h-10 shrink-0">
            <span className="w-[3px] h-3 bg-granate rounded-full animate-pulse" />
            <span className="w-[3px] h-5 bg-granate rounded-full animate-pulse delay-75" />
            <span className="w-[3px] h-4 bg-granate rounded-full animate-pulse delay-150" />
            <span className="w-[3px] h-2 bg-granate rounded-full animate-pulse delay-200" />
          </div>
        )}

        {/* Send */}
        <button
          type="button"
          onClick={onSend}
          disabled={(!text.trim() && !file) || sending || !activeConnectionId}
          className="flex shrink-0 size-10 items-center justify-center rounded-full bg-granate text-white hover:bg-granate-deep shadow-md shadow-granate/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
        >
          {sending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Send className="size-4 mr-0.5 mt-0.5" />
          )}
        </button>
      </div>

      {/* Selector de Producto rápido */}
      <div className="mt-3 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-soft/70">
            Imputar a:
          </span>
          {activeConnectionId ? (
            <StructureSelectDropdown
              connectionId={activeConnectionId}
              selectedStructureId={activeStructureId}
              onSelect={onSelectStructure}
            />
          ) : (
            <span className="text-[10px] text-danger font-bold">Empresa requerida</span>
          )}
        </div>
        <p className="text-[10px] text-ink-soft/50 hidden sm:block font-medium tracking-wide">
          Enter para enviar · Shift+Enter para salto de línea
        </p>
      </div>
      </div>
    </div>
  );
}
