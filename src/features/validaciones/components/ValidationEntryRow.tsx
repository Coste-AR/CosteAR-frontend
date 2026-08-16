import { useState } from 'react';
import { Clock, Image as ImageIcon, FileText, CheckCircle2, XCircle, PenLine, AlertTriangle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { parseAIAnalysis, SECTION_LABELS, fmt } from './helpers';
import type { DataEntry } from '../validaciones-hooks';

interface Props {
  entry: DataEntry;
  onApprove: () => void;
  onReject: () => void;
  onCorrect: () => void;
  onZoom: (src: string) => void;
}

export function ValidationEntryRow({
  entry,
  onApprove,
  onReject,
  onCorrect,
  onZoom,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isImage = entry.fileMimeType?.startsWith("image/");
  const isPdf = entry.fileMimeType === "application/pdf";
  const aiAnalysis = parseAIAnalysis(entry.reviewNote);
  // H18: la tarjeta leía aiAnalysis.costSection (sugerencia cruda de la IA)
  // pero la decisión final es classificationAudits[0].costSection, que es lo
  // que aprueba el costista y lo que entra al libro. Cuando la cascada corrige
  // a la IA, la tarjeta y el modal mostraban valores distintos.
  const finalSection = entry.classificationAudits?.[0]?.costSection;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-4.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <button
          type="button"
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-zinc-50 text-zinc-400">
            {isImage ? (
              <ImageIcon className="size-3.5" />
            ) : isPdf ? (
              <FileText className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {finalSection && finalSection !== "DESCONOCIDO" && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 shadow-sm">
                  {SECTION_LABELS[finalSection] ?? finalSection}
                </span>
              )}
              {aiAnalysis?.quality === "ilegible" && (
                <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700 shadow-sm">
                  <AlertTriangle className="size-3" /> Ilegible
                </span>
              )}
            </div>
            <p className="text-[12.5px] font-bold text-ink line-clamp-2">
              {entry.fileName ?? entry.rawContent}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10.5px] font-semibold text-ink-soft/70">
                {formatDate(entry.createdAt)}
              </span>
              <span className="text-[10.5px] text-ink-soft/40">·</span>
              <span className="text-[10.5px] font-bold text-action hover:underline">
                {expanded ? "Cerrar" : "Ver todo"}
              </span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCorrect}
            className="text-action hover:bg-action/10"
            title="Corregir y aprobar"
          >
            <PenLine className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onApprove}
            className="text-green-600 hover:bg-green-50"
            title="Aprobar"
          >
            <CheckCircle2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            className="text-danger hover:bg-danger/10"
            title="Rechazar"
          >
            <XCircle className="size-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-line/60 pt-4 animate-rise space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
              <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                <div className="bg-zinc-50 border-b border-line px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider">Documento Adjunto</span>
                  {(isImage || isPdf) && (
                    <span className="text-[10px] bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full text-indigo-700 font-bold">
                      {isImage ? 'Imagen' : 'PDF'}
                    </span>
                  )}
                </div>
                
                <div className="p-4 flex items-center justify-center bg-zinc-50/20 min-h-[220px] max-h-[380px] overflow-auto">
                  {isImage && (entry.fileUrl ?? entry.fileData) ? (
                    <button
                      type="button"
                      onClick={() =>
                        onZoom(
                          entry.fileUrl ??
                            `data:${entry.fileMimeType};base64,${entry.fileData}`,
                        )
                      }
                      className="group relative cursor-zoom-in focus:outline-none max-w-full"
                    >
                      <img
                        src={
                          entry.fileUrl ??
                          `data:${entry.fileMimeType};base64,${entry.fileData}`
                        }
                        alt={entry.fileName ?? "documento"}
                        className="rounded-xl object-contain max-h-[340px] hover:opacity-95 transition-opacity border border-line shadow-xs"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors flex items-center justify-center">
                        <span className="bg-black/75 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          Hacer clic para ampliar
                        </span>
                      </div>
                    </button>
                  ) : isPdf && (entry.fileUrl ?? entry.fileData) ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-400">
                        <FileText className="size-6 text-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-ink truncate max-w-[200px]" title={entry.fileName ?? ""}>
                          {entry.fileName}
                        </p>
                        <p className="text-[10px] text-ink-soft">Documento PDF cargado por operario</p>
                      </div>
                      {entry.fileUrl ? (
                        <a
                          href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-action px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-action-soft transition-colors"
                        >
                          Ver PDF en pestaña nueva
                        </a>
                      ) : (
                        <a
                          href={`data:${entry.fileMimeType};base64,${entry.fileData}`}
                          download={entry.fileName ?? "documento.pdf"}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-action px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-action-soft transition-colors"
                        >
                          Descargar archivo PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center text-ink-soft">
                      <Clock className="size-6 text-zinc-300" />
                      <p className="text-xs">Sin archivo adjunto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {entry.rawContent && !entry.rawContent.startsWith("[Archivo:") && (
                <div className="rounded-2xl border border-line bg-zinc-50/50 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nota Cargada por Operario</span>
                  <p className="text-[12.5px] text-ink leading-relaxed whitespace-pre-wrap font-medium">
                    {entry.rawContent}
                  </p>
                </div>
              )}

              {aiAnalysis && (
                <div className="space-y-4">
                  {aiAnalysis.qualityNote && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-yellow-50 border border-yellow-250 px-3.5 py-2.5">
                      <AlertTriangle className="size-4 shrink-0 text-yellow-600 mt-0.5" />
                      <p className="text-xs font-medium text-yellow-800 leading-relaxed">
                        {aiAnalysis.qualityNote}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.message && (
                    <div className="rounded-xl bg-indigo-50/20 border border-indigo-100 p-4 shadow-xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5">
                        <Bot className="size-3.5 text-indigo-500" />
                        <span>Análisis del documento</span>
                      </div>
                      <p className="text-[12.5px] text-indigo-950 font-medium leading-relaxed">
                        {aiAnalysis.message}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.extractedData &&
                    (() => {
                      const d = aiAnalysis.extractedData as Record<string, unknown>;
                      const rows: { label: string; value: string; isTotal?: boolean }[] = [];
                      if (d.supplier) rows.push({ label: "Proveedor", value: String(d.supplier) });
                      if (d.invoiceNumber) rows.push({ label: "Nº Comprobante", value: String(d.invoiceNumber) });
                      if (d.date) rows.push({ label: "Fecha Emisión", value: String(d.date) });
                      if (d.netAmount != null) rows.push({ label: "Monto Neto", value: fmt(Number(d.netAmount)) ?? "" });
                      if (d.taxAmount != null) rows.push({ label: "IVA / Impuestos", value: fmt(Number(d.taxAmount)) ?? "" });
                      if (d.totalAmount != null) rows.push({ label: "Total Facturado", value: fmt(Number(d.totalAmount)) ?? "", isTotal: true });
                      if (d.hoursWorked != null) rows.push({ label: "Horas trabajadas (real)", value: `${d.hoursWorked} hs` });
                      if (d.department) rows.push({ label: "Departamento", value: String(d.department) });
                      if (!rows.length) return null;
                      return (
                        <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                          <div className="bg-zinc-50 border-b border-line px-4 py-2.5">
                            <span className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider">Metadatos de Facturación Extraditados</span>
                          </div>
                          <div className="divide-y divide-line">
                            {rows.map((r) => (
                              <div
                                key={r.label}
                                className={cn(
                                  "flex justify-between px-4 py-3 text-xs items-center",
                                  r.isTotal ? "bg-zinc-50/50 font-bold text-ink text-[13px] border-t border-line/60" : "text-ink-soft"
                                )}
                              >
                                <span>{r.label}</span>
                                <span className={cn("font-semibold text-ink", r.isTotal && "text-granate font-extrabold")}>
                                  {r.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {entry.classificationAudits?.[0] && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                          <Bot className="size-4 text-indigo-500 animate-pulse" />
                          <span>Análisis del Asistente IA</span>
                        </div>
                        {entry.classificationAudits[0].confidence != null && (
                          <span className="rounded-full bg-indigo-100/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                            Confianza: {entry.classificationAudits[0].confidence}%
                          </span>
                        )}
                      </div>

                      {entry.classificationAudits[0].explanation && (
                        <p className="text-[12px] text-ink-soft leading-relaxed font-sans">
                          {entry.classificationAudits[0].explanation
                            .replace(
                              /\.?\s*Confianza:\s*\d+(?:[.,]\d+)?\s*%\.?/i,
                              "",
                            )
                            .trim()}
                        </p>
                      )}

                      {entry.classificationAudits[0].confidence != null && (
                        <div className="w-full bg-indigo-100/50 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${entry.classificationAudits[0].confidence}%` }}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.classificationAudits[0].definitiveSignal && (
                          <span className="rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-[10px] text-indigo-700 font-mono shadow-sm">
                            señal: {entry.classificationAudits[0].definitiveSignal}
                          </span>
                        )}
                        {entry.classificationAudits[0].requiresReview && (
                          <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-800 font-semibold shadow-sm">
                            ⚠️ requiere revisión
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-line/60 sm:flex-row justify-end">
            <Button
              size="sm"
              onClick={onReject}
              className="w-full sm:w-auto bg-danger hover:bg-danger/90 order-last sm:order-first"
            >
              <XCircle className="size-3.5" /> Rechazar
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row flex-1 sm:justify-end">
              <Button
                size="sm"
                onClick={onCorrect}
                variant="secondary"
                className="w-full sm:w-auto border-line hover:bg-zinc-50"
              >
                <PenLine className="size-3.5" /> Corregir
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="size-3.5" /> Aprobar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
