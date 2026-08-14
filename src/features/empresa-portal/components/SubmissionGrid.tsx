import { MessageSquare, FileText, Image } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { Submission, STATUS_CONFIG } from './ChatTimeline';

// ── SubmissionCard Component ────────────────────────────────────────────────

interface SubmissionCardProps {
  s: Submission;
}

export function SubmissionCard({ s }: SubmissionCardProps) {
  const st = STATUS_CONFIG[s.status];
  const isImage = s.fileMimeType?.startsWith('image/');
  const isPdf = s.fileMimeType === 'application/pdf';

  return (
    <Card className="group relative overflow-hidden bg-white hover:-translate-y-1.5 transition-all duration-400 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.12)] border-line/40 hover:border-granate/20">
      {/* Decal background */}
      <div className="absolute -right-6 -top-6 size-24 bg-gradient-to-br from-granate/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-[10px] bg-surface-alt border border-line shadow-sm group-hover:bg-granate group-hover:text-white transition-colors duration-300 shrink-0">
              {isImage ? (
                <Image className="size-3.5" />
              ) : isPdf ? (
                <FileText className="size-3.5" />
              ) : (
                <FileText className="size-3.5" />
              )}
            </div>
            <span className="truncate max-w-[150px] font-black text-[13px] tracking-tight text-ink group-hover:text-granate transition-colors" title={s.fileName ?? 'Texto sin archivo'}>
              {s.fileName ?? 'Nota de texto'}
            </span>
          </div>
        }
        description={
          <span className="text-[10px] font-medium tracking-wide text-ink-soft/70">
            Enviado: {formatDate(s.createdAt)}
          </span>
        }
        action={
          <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border', st.color)}>
            {st.label}
          </span>
        }
      />
      <CardBody className="space-y-4 pt-1 pb-5 px-5">
        {s.rawContent && (
          <p className="text-[13px] text-ink-soft bg-surface/50 p-4 rounded-[16px] border border-line/60 whitespace-pre-wrap leading-relaxed shadow-inner">
            {s.rawContent}
          </p>
        )}

        {isImage && s.fileUrl && (
          <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[16px] border border-line/60 bg-black/5 relative group/img shadow-sm">
            <img
              src={s.fileUrl}
              alt="Documento"
              className="w-full max-h-48 object-cover group-hover/img:scale-[1.03] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover/img:opacity-100 bg-white/90 text-granate text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover/img:translate-y-0 transition-all duration-300">Ampliar</span>
            </div>
          </a>
        )}

        {isPdf && s.fileUrl && (
          <div className="flex items-center justify-between rounded-[16px] border border-line/60 bg-surface/50 p-3.5 shadow-sm group-hover:border-granate/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-full bg-granate-tenue text-granate flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-ink truncate">{s.fileName}</p>
                <p className="text-[9px] text-ink-soft uppercase tracking-wider font-semibold mt-0.5">Documento PDF</p>
              </div>
            </div>
            <a
              href={s.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-wider text-granate bg-white border border-line hover:border-granate hover:shadow-md rounded-full px-3 py-1.5 transition-all active:scale-95 shrink-0"
            >
              Abrir
            </a>
          </div>
        )}

        {s.costistaNote && (
          <div className="mt-4 rounded-[16px] border-l-4 border-l-granate bg-granate-tenue p-4 shadow-inner group-hover:bg-granate/10 transition-colors">
            <p className="font-black text-[10px] uppercase tracking-wider text-granate-deep mb-1.5">Nota de revisión de tu costista:</p>
            <p className="italic text-[12px] text-ink/80 leading-relaxed font-medium">"{s.costistaNote}"</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── SubmissionGrid Component ────────────────────────────────────────────────

interface SubmissionGridProps {
  submissions: Submission[];
  isLoadingSubmissions: boolean;
  activeStructureName: string | null;
  onNavigateToChat: () => void;
}

export function SubmissionGrid({
  submissions,
  isLoadingSubmissions,
  activeStructureName,
  onNavigateToChat,
}: SubmissionGridProps) {
  // Metric counts
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const correctedCount = submissions.filter((s) => s.status === 'CORRECTED').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28 lg:pb-8">
      {/* Métricas rápidas (Estilo Costista) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aprobados', val: approvedCount, color: 'text-ok bg-ok/5' },
          { label: 'Pendientes', val: pendingCount, color: 'text-warn bg-warn/5' },
          { label: 'Corregidos', val: correctedCount, color: 'text-granate bg-granate-tenue' },
        ].map(({ label, val, color }) => (
          <Card key={label} className={cn('text-center py-4 rounded-2xl', color)}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p>
            <p className="text-2xl font-black mt-1 font-mono-jb">{val}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-base font-extrabold text-granate-deep font-outfit">Historial de Comprobantes</h2>
          {activeStructureName ? (
            <p className="text-xs text-ink-soft">
              Filtrado por: <span className="font-semibold text-action">{activeStructureName}</span>
            </p>
          ) : (
            <p className="text-xs text-ink-soft">Mostrando todos los productos del período</p>
          )}
        </div>
        <Button size="sm" onClick={onNavigateToChat}>
          <MessageSquare className="size-4 mr-1" /> Ir a Charla
        </Button>
      </div>

      {isLoadingSubmissions ? (
        <p className="text-sm text-ink-soft text-center py-12">Cargando comprobantes...</p>
      ) : submissions.length === 0 ? (
        <Card className="py-16 text-center">
          <CardBody>
            <FileText className="mx-auto size-10 text-idle opacity-40 mb-3" />
            <p className="text-sm font-semibold text-ink-soft">No se encontraron comprobantes cargados.</p>
            <p className="text-xs text-ink-soft/70 mt-1">Presioná "Ir a Charla" para subir comprobantes.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {submissions.map((sub) => (
            <SubmissionCard key={sub.id} s={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
