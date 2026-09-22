import { CheckCircle2, AlertTriangle, ChevronRight, Check, XIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIResponse, Company } from '../CostitaChat';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function sectionLabel(section: string) {
  const map: Record<string, string> = {
    MATERIA_PRIMA: 'Materia Prima',
    MANO_DE_OBRA: 'Mano de Obra',
    COSTOS_INDIRECTOS: 'Costos Indirectos',
    VENTAS: 'Ventas',
    DESCONOCIDO: 'Sin clasificar',
  };
  return map[section] ?? section;
}

export function severityLabel(s: string) {
  return s === 'HIGH' ? 'Alta' : s === 'MEDIUM' ? 'Media' : 'Baja';
}

export function severityColor(s: string) {
  return s === 'HIGH'
    ? 'bg-red-100 text-red-700'
    : s === 'MEDIUM'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600';
}

export function needsCompanySelection(aiResponse: AIResponse): boolean {
  if (aiResponse.actionType === 'CREATE_ENTRY') {
    return !aiResponse.proposedEntry?.companyId;
  }
  if (aiResponse.actionType === 'CREATE_ALERT') {
    return !aiResponse.proposedAlert?.companyId;
  }
  return false;
}

// ── Componentes ───────────────────────────────────────────────────────────────

export function CompanyChips({
  companies,
  onSelect,
}: {
  companies: Company[];
  onSelect: (company: Company) => void;
}) {
  return (
    <div className="space-y-1.5 mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        ¿Para qué negocio?
      </p>
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 active:scale-95"
          >
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600">
              {c.name[0]?.toUpperCase()}
            </span>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ActionCard({
  aiResponse,
  msgId,
  confirmed,
  onConfirm,
  onReject,
  isPending,
}: {
  aiResponse: AIResponse;
  msgId: string;
  confirmed?: boolean;
  onConfirm: (msgId: string, aiResponse: AIResponse) => void;
  onReject: (msgId: string) => void;
  isPending: boolean;
}) {
  const isEntry = aiResponse.actionType === 'CREATE_ENTRY';
  const isAlert = aiResponse.actionType === 'CREATE_ALERT';

  if (confirmed === true) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 mt-3">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        <p className="text-[11px] font-medium text-emerald-700">Acción confirmada y registrada</p>
      </div>
    );
  }

  if (confirmed === false) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 mt-3">
        <XIcon className="size-3.5 text-gray-400" />
        <p className="text-[11px] text-gray-500">Acción descartada</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white mt-3">
      {/* Header de la tarjeta */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
        {isEntry ? (
          <ChevronRight className="size-3.5 text-violet-600" />
        ) : (
          <AlertTriangle className="size-3.5 text-amber-600" />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {isEntry ? 'Acción propuesta: Registrar evento' : 'Acción propuesta: Crear alerta'}
        </p>
        {aiResponse.confidence >= 70 && (
          <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {aiResponse.confidence}% confianza
          </span>
        )}
      </div>

      {/* Detalles */}
      <div className="px-3 py-3 space-y-2">
        {isEntry && aiResponse.proposedEntry && (
          <>
            <Row label="Negocio" value={aiResponse.proposedEntry.companyName || 'Sin negocio'} />
            <Row label="Sección" value={sectionLabel(aiResponse.proposedEntry.costSection)} />
            <Row label="Tipo" value={aiResponse.proposedEntry.documentType} />
            {aiResponse.proposedEntry.estimatedImpact && (
              <Row label="Impacto" value={aiResponse.proposedEntry.estimatedImpact} highlight />
            )}
            <div className="rounded-lg bg-gray-50 px-3 py-2 mt-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Descripción</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">
                {aiResponse.proposedEntry.rawContent}
              </p>
            </div>
          </>
        )}

        {isAlert && aiResponse.proposedAlert && (
          <>
            <Row label="Negocio" value={aiResponse.proposedAlert.companyName || 'Sin negocio'} />
            <div className="flex items-center gap-2 justify-between">
              <span className="text-[11px] font-medium text-gray-500">Severidad</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', severityColor(aiResponse.proposedAlert.severity))}>
                {severityLabel(aiResponse.proposedAlert.severity)}
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 mt-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Mensaje de alerta</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">
                {aiResponse.proposedAlert.message}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Botones de confirmación */}
      <div className="flex gap-2 border-t border-gray-100 px-3 py-2.5">
        <button
          onClick={() => onReject(msgId)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <XIcon className="size-3.5" />
          Descartar
        </button>
        <button
          onClick={() => onConfirm(msgId, aiResponse)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2 text-[12px] font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Confirmar
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <span className={cn('text-[12px] font-semibold text-right', highlight ? 'text-violet-700' : 'text-gray-700')}>
        {value}
      </span>
    </div>
  );
}
