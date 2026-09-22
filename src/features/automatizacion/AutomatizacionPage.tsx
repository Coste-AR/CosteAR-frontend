/**
 * Centro de Automatización — Flujo de documentos recibidos de los operadores.
 *
 * Muestra:
 *  - Diagrama del pipeline de procesamiento (4 pasos)
 *  - KPIs de la sesión actual
 *  - Feed de entradas con resultado del clasificador en tiempo real
 */

import { useQuery } from '@tanstack/react-query';
import {
  FileText, Image, MessageSquare, FileInput, Clock, CheckCircle2,
  Webhook, BrainCircuit, ShieldCheck, Bell,
  ArrowRight, Zap, Cpu, RefreshCw,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── tipos ──────────────────────────────────────────────────────────────────

type DataEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
type DataEntrySourceType = 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';

interface ClassificationAudit {
  documentType: string;
  costSection: string;
  confidence: number;
  requiresReview: boolean;
  aiUsed: boolean;
  definitiveSignal: string | null;
  explanation: string | null;
}

interface DataEntry {
  id: string;
  status: DataEntryStatus;
  sourceType: DataEntrySourceType;
  fileName: string | null;
  rawContent: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  connection: {
    company: { id: string; name: string; industry: string | null };
  };
  classificationAudits: ClassificationAudit[];
}

interface FeedResponse {
  data: DataEntry[];
  total: number;
}

// ─── config visual ──────────────────────────────────────────────────────────

const STATUS_META: Record<DataEntryStatus, { label: string; status: 'ok' | 'warn' | 'idle' | 'danger' }> = {
  PENDING:   { label: 'Pendiente', status: 'warn' },
  APPROVED:  { label: 'Aprobado',  status: 'ok' },
  REJECTED:  { label: 'Rechazado', status: 'danger' },
  CORRECTED: { label: 'Corregido', status: 'idle' },
};

const SOURCE_CONFIG: Record<DataEntrySourceType, { label: string; icon: typeof FileText }> = {
  TEXT:     { label: 'Texto',    icon: FileText },
  PDF:      { label: 'PDF',      icon: FileInput },
  IMAGE:    { label: 'Imagen',   icon: Image },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
};

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA:         'Mat. Prima',
  MANO_DE_OBRA:          'M. de Obra',
  COSTOS_INDIRECTOS:     'C. Indirectos',
  VENTAS:                'Ventas',
  // Gastos (no-costo): grupo aparte, no forman parte del costo del producto.
  GASTO_COMERCIALIZACION:'Gasto Comerc.',
  GASTO_ADMINISTRACION:  'Gasto Admin.',
  GASTO_FINANCIERO:      'Gasto Financ.',
  DESCONOCIDO:           'Sin sección',
};

const SECTION_COLORS: Record<string, string> = {
  MATERIA_PRIMA:    'border-violet-200 bg-violet-50 text-violet-700',
  MANO_DE_OBRA:     'border-blue-200 bg-blue-50 text-blue-700',
  COSTOS_INDIRECTOS:'border-orange-200 bg-orange-50 text-orange-700',
  VENTAS:           'border-emerald-200 bg-emerald-50 text-emerald-700',
  // Familia rosa/rojo = gasto (no inventariable), distinta de los costos.
  GASTO_COMERCIALIZACION:'border-rose-200 bg-rose-50 text-rose-700',
  GASTO_ADMINISTRACION:  'border-pink-200 bg-pink-50 text-pink-700',
  GASTO_FINANCIERO:      'border-red-200 bg-red-50 text-red-700',
  DESCONOCIDO:      'border-line bg-zinc-50 text-ink-soft',
};

// ─── pipeline steps ──────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    icon: Webhook,
    label: 'Ingesta',
    sub: 'Operador envía doc',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: BrainCircuit,
    label: 'Clasificador',
    sub: '6 capas en cascada',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    icon: ShieldCheck,
    label: 'Validación',
    sub: 'Revisión pendiente',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: Bell,
    label: 'Registro',
    sub: 'Entra a la estructura',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function confidenceColor(c: number) {
  if (c >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (c >= 60) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

// ─── componente principal ───────────────────────────────────────────────────

export function AutomatizacionPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['automatizacion', 'feed'],
    queryFn: async () => {
      const res = await api.get<FeedResponse>('/validaciones/feed');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const entries   = data?.data ?? [];
  const pending   = entries.filter((e) => e.status === 'PENDING').length;
  const approved  = entries.filter((e) => e.status === 'APPROVED').length;
  const rejected  = entries.filter((e) => e.status === 'REJECTED').length;
  const withAI    = entries.filter((e) => e.classificationAudits[0]?.aiUsed).length;
  const total     = entries.length;
  const autoRate  = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;

  return (
    <AppShell>
      <PageHeader
        title="Centro de Automatización"
        description="Documentos clasificados automáticamente por IA · actualiza cada 30s"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        }
      />

      {/* ── Pipeline visual ───────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader
          title="Pipeline activo"
          description="Ingesta de documentos contables · clasificación automática en cascada"
          action={
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10.5px] font-bold text-emerald-700 shadow-sm">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </span>
          }
        />
        <CardBody className="flex items-center justify-start gap-0 overflow-x-auto py-6 sm:justify-center">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex min-w-[78px] flex-col items-center gap-2 sm:min-w-[92px]">
                <div className={cn('flex size-10 items-center justify-center rounded-2xl border shadow-sm sm:size-12', step.color)}>
                  <step.icon className="size-4 sm:size-5" />
                </div>
                <p className="text-[12px] font-bold text-ink">{step.label}</p>
                <p className="max-w-[76px] text-center text-[10px] text-ink-soft/75 sm:max-w-[84px]">{step.sub}</p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ArrowRight className="mx-2.5 size-4 shrink-0 text-ink-soft/30 sm:mx-3" />
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatCard label="Total procesados" value={total} sub="en el historial" icon={Zap} variant="neutral" />
        <StatCard label="Pendientes" value={pending} sub="requieren revisión" icon={Clock} variant={pending > 0 ? 'warn' : 'neutral'} />
        <StatCard label="Aprobados" value={approved} sub="registrados ok" icon={CheckCircle2} variant="ok" />
        <StatCard label="Auto-clasificados" value={withAI} sub={`${autoRate}% del total`} icon={Cpu} variant="neutral" />
      </div>

      {/* ── Feed ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Actividad reciente"
          description={`${total} documento${total !== 1 ? 's' : ''} · se actualiza automáticamente`}
          action={rejected > 0 && (
            <StatusBadge status="danger">{rejected} rechazado{rejected !== 1 ? 's' : ''}</StatusBadge>
          )}
        />

        <CardBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-ink-soft">
                <RefreshCw className="size-4 animate-spin" />
                <span className="text-[13px] font-semibold">Cargando actividad…</span>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm">
                <Webhook className="size-7" />
              </div>
              <p className="text-[13px] font-bold text-ink">Sin actividad todavía</p>
              <p className="mt-1 max-w-xs text-[11.5px] text-ink-soft">
                Invitá a un operador desde la página de cada negocio para que empiece a cargar documentación.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {entries.map((entry) => (
                <FeedRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}

// ─── FeedRow ─────────────────────────────────────────────────────────────────

function FeedRow({ entry }: { entry: DataEntry }) {
  const statusMeta = STATUS_META[entry.status] ?? STATUS_META.PENDING;
  const sourceCfg = SOURCE_CONFIG[entry.sourceType] ?? SOURCE_CONFIG.TEXT;
  const SourceIcon = sourceCfg.icon;
  const audit = entry.classificationAudits[0];

  return (
    <li className="flex items-start gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(74,21,27,0.005)] transition-colors hover:border-granate/15 sm:gap-3.5 sm:px-4 sm:py-3.5">
      {/* Ícono fuente */}
      <div className="mt-0.5 flex size-7.5 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-zinc-400 sm:size-8.5">
        <SourceIcon className="size-3.5" />
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        {/* Empresa + fecha */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-ink">
            {entry.connection.company.name}
          </span>
          {entry.connection.company.industry && (
            <span className="rounded-full border border-line bg-zinc-50 px-2 py-0.5 text-[9.5px] font-semibold text-ink-soft">
              {entry.connection.company.industry}
            </span>
          )}
          <span className="text-[10px] text-ink-soft/70">{formatTime(entry.createdAt)}</span>
          {entry.fileName && (
            <span className="max-w-[120px] truncate text-[10px] text-ink-soft/60 sm:max-w-[160px]">
              · {entry.fileName}
            </span>
          )}
        </div>

        {/* Preview del contenido */}
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-soft">
          {entry.rawContent}
        </p>

        {/* Resultado del clasificador */}
        {audit && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Sección de costos */}
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm',
              SECTION_COLORS[audit.costSection] ?? SECTION_COLORS.DESCONOCIDO,
            )}>
              {SECTION_LABELS[audit.costSection] ?? audit.costSection}
            </span>

            {/* Tipo de documento */}
            <span className="rounded-full border border-line bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
              {audit.documentType}
            </span>

            {/* Confianza */}
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm', confidenceColor(audit.confidence))}>
              {audit.confidence}% conf.
            </span>

            {/* IA usada */}
            {audit.aiUsed && (
              <span className="flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 shadow-sm">
                <Cpu className="size-2.5" /> Auto
              </span>
            )}

            {/* Señal definitiva */}
            {audit.definitiveSignal && (
              <span className="text-[10px] text-ink-soft/60">
                via {audit.definitiveSignal}
              </span>
            )}
          </div>
        )}

        {/* Nota de revisión */}
        {entry.reviewNote && (
          <p className="mt-1 text-[10.5px] font-semibold text-action">
            Nota: {entry.reviewNote}
          </p>
        )}
      </div>

      {/* Badge de estado */}
      <div className="mt-0.5 shrink-0">
        <StatusBadge status={statusMeta.status}>{statusMeta.label}</StatusBadge>
      </div>
    </li>
  );
}
