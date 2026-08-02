import { useState } from 'react';
import { BookOpen, ImageIcon, Bot, PenLine, FileText, FileDown, Plus, Pencil, Trash2, Table, Boxes, Users, Layers, TrendingUp, Megaphone, Briefcase, Landmark } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatMoney, formatDate } from '@/lib/utils';
import { useCompanies } from '@/features/companies/company-hooks';
import { useLedger, useDeleteLedgerEntry, type LedgerEntry } from './libro-hooks';
import { ClientReport } from './ClientReport';
import { LedgerEntryModal } from './LedgerEntryModal';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const SECTION_LABELS_FULL: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
  GASTO_COMERCIALIZACION: 'Gasto de Comercialización',
  GASTO_ADMINISTRACION: 'Gasto de Administración',
  GASTO_FINANCIERO: 'Gasto Financiero',
};

/** Exporta las líneas a CSV (Excel) — los costistas viven en Excel. */
function exportCsv(entries: LedgerEntry[], companyName: string) {
  const headers = ['Periodo', 'Fecha', 'Seccion', 'Tipo', 'Proveedor', 'Descripcion', 'Monto', 'Moneda', 'Confianza', 'Auto', 'Corregido'];
  const rows = entries.map((e) => [
    e.period,
    e.docDate ? new Date(e.docDate).toLocaleDateString('es-AR') : '',
    SECTION_LABELS_FULL[e.costSection] ?? e.costSection,
    e.documentType,
    e.supplier ?? '',
    e.description.replace(/"/g, '""'),
    String(e.amount),
    e.currency,
    e.confidence != null ? `${e.confidence}%` : '',
    e.aiUsed ? 'si' : 'no',
    e.wasCorrected ? 'si' : 'no',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `libro-costos-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
  GASTO_COMERCIALIZACION: 'Gasto de Comercialización',
  GASTO_ADMINISTRACION: 'Gasto de Administración',
  GASTO_FINANCIERO: 'Gasto Financiero',
};

// Gastos van al final, después de los costos y ventas, como grupo separado.
const SECTION_ORDER = [
  'MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS',
  'GASTO_COMERCIALIZACION', 'GASTO_ADMINISTRACION', 'GASTO_FINANCIERO',
];

const SECTION_ICONS: Record<string, typeof Boxes> = {
  MATERIA_PRIMA: Boxes,
  MANO_DE_OBRA: Users,
  COSTOS_INDIRECTOS: Layers,
  VENTAS: TrendingUp,
  GASTO_COMERCIALIZACION: Megaphone,
  GASTO_ADMINISTRACION: Briefcase,
  GASTO_FINANCIERO: Landmark,
};

function periodLabel(p: string): string {
  const [y, m] = p.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${months[Number(m) - 1] ?? m} ${y}`;
}

export function LibroCostosPage() {
  const { data: companies = [] } = useCompanies();
  const [companyId, setCompanyId] = useState<string>('');
  const [period, setPeriod] = useState<string>('');
  const { data, isLoading } = useLedger(companyId || undefined, period || undefined);
  const del = useDeleteLedgerEntry();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);

  const selectedCompanyName = companies.find((c) => c.id === companyId)?.name ?? 'Todas las empresas';

  const handleDelete = (e: LedgerEntry) => {
    setEntryToDelete(e);
  };

  useKeyboardShortcut({ key: 'n', altKey: true }, () => {
    if (!lightbox && !showReport && !editing && entryToDelete === null) {
      setAdding(true);
    }
  });

  const entries = data?.entries ?? [];
  const grouped = SECTION_ORDER
    .map((s) => ({ section: s, items: entries.filter((e) => e.costSection === s) }))
    .filter((g) => g.items.length > 0);

  return (
    <AppShell>
      <PageHeader
        title="Libro de costos"
        description="Costos reales respaldados por los documentos que aprobaste. Cada número es trazable a su comprobante."
      />

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 rounded-[28px] border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(74,21,27,0.015)] sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          className="sm:w-56"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="Todas mis empresas"
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          className="sm:w-48"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Todos los períodos"
          options={(data?.periods ?? []).map((p) => ({ value: p, label: periodLabel(p) }))}
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)} title={companyId ? '' : 'Elegí una empresa para cargar manual'}>
            <Plus className="size-4" /> Agregar manual
          </Button>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => exportCsv(entries, selectedCompanyName)}>
              <Table className="size-4" /> Excel (CSV)
            </Button>
          )}
          {entries.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowReport(true)}>
              <FileDown className="size-4" /> Reporte para el cliente
            </Button>
          )}
        </div>
      </div>

      {/* Totales por sección */}
      {data && Object.keys(data.totalsBySection).length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SECTION_ORDER.filter((s) => data.totalsBySection[s] != null).map((s) => (
            <StatCard
              key={s}
              label={SECTION_LABELS[s] ?? s}
              value={formatMoney(data.totalsBySection[s])}
              sub="Total del período"
              icon={SECTION_ICONS[s] ?? Layers}
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader
                title={<Skeleton className="h-5 w-40" />}
                action={<Skeleton className="h-7 w-24 rounded-full" />}
              />
              <div className="divide-y divide-line">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-3.5 sm:px-6">
                    <div className="flex items-center gap-3.5 sm:contents">
                      <Skeleton className="size-11 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      <div className="shrink-0 text-right">
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Skeleton className="size-7 rounded-xl" />
                        <Skeleton className="size-7 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm">
              <BookOpen className="size-6" />
            </div>
            <p className="text-[13px] font-bold text-ink">Todavía no hay costos cargados</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-soft">
              Cuando apruebes documentos en Validaciones, sus montos aparecen acá automáticamente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <CardHeader
                title={SECTION_LABELS[section] ?? section}
                action={
                  <span className="inline-flex items-center rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 font-mono-jb text-[12.5px] font-bold text-granate shadow-sm">
                    {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                  </span>
                }
              />
              <div className="divide-y divide-line">
                {items.map((e) => (
                  <LedgerRow key={e.id} entry={e} onZoom={setLightbox} onEdit={setEditing} onDelete={handleDelete} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <LedgerEntryModal
          entry={editing ?? undefined}
          companyId={companyId || undefined}
          defaultPeriod={period || undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}

      {showReport && data && (
        <ClientReport
          companyName={selectedCompanyName}
          period={period}
          entries={entries}
          totalsBySection={data.totalsBySection}
          onClose={() => setShowReport(false)}
        />
      )}

      {lightbox && (
        <PortalOverlay>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Comprobante" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" onClick={(ev) => ev.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/50 text-lg text-white shadow-lg transition-colors hover:bg-black/70">✕</button>
        </div>
        </PortalOverlay>
      )}

      <ConfirmDialog
        open={entryToDelete !== null}
        title="Borrar entrada"
        message={`¿Estás seguro de borrar "${entryToDelete?.description}" (${entryToDelete ? formatMoney(entryToDelete.amount) : ''})? Esta acción no se puede deshacer.`}
        confirmLabel="Borrar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          if (entryToDelete) await del.mutateAsync(entryToDelete.id);
          setEntryToDelete(null);
        }}
        onCancel={() => setEntryToDelete(null)}
      />
    </AppShell>
  );
}

function LedgerRow({ entry, onZoom, onEdit, onDelete }: {
  entry: LedgerEntry;
  onZoom: (src: string) => void;
  onEdit: (e: LedgerEntry) => void;
  onDelete: (e: LedgerEntry) => void;
}) {
  const isImage = entry.sourceImageUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(entry.sourceImageUrl);
  return (
    <div className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-zinc-50/40 sm:flex-row sm:items-center sm:gap-3.5 sm:px-6">
      <div className="flex items-center gap-3.5 sm:contents">
        {/* Origen: miniatura o ícono, clickeable */}
        {entry.sourceImageUrl ? (
          isImage ? (
            <button type="button" onClick={() => onZoom(entry.sourceImageUrl!)} className="shrink-0">
              <img src={entry.sourceImageUrl} alt="comprobante" className="size-11 rounded-xl border border-line object-cover shadow-sm transition-opacity hover:opacity-80" />
            </button>
          ) : (
            <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-alt text-ink-soft shadow-sm hover:bg-surface">
              <FileText className="size-4" />
            </a>
          )
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-alt text-ink-soft/40">
            <ImageIcon className="size-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink">{entry.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
            <span className="font-semibold">{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
            {entry.wasCorrected && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
                <PenLine className="size-3" /> corregido
              </span>
            )}
            {entry.aiUsed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200/60 bg-purple-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-purple-700 shadow-sm">
                <Bot className="size-3" /> auto
              </span>
            )}
            {entry.confidence != null && entry.confidence < 72 && (
              <StatusBadge status="warn">conf. {entry.confidence}%</StatusBadge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="shrink-0 text-right">
          <p className="font-mono-jb text-[14px] font-bold tabular-nums text-ink">
            {entry.currency !== 'ARS' && <span className="text-[11px] font-semibold text-ink-soft">{entry.currency} </span>}
            {formatMoney(entry.amount)}
          </p>
        </div>

        {/* Editar / borrar */}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onEdit(entry)} title="Editar" className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-granate-tenue hover:text-granate">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(entry)} title="Borrar" className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
