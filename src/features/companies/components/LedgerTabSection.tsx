import { useState } from 'react';
import { Plus, Table, BookOpen, Package, Users, Layers, DollarSign, FileDown, ImageIcon, PenLine, Pencil, Trash2, Megaphone, Briefcase, Landmark } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { LedgerEntryModal } from '@/features/libro/LedgerEntryModal';
import { useLedger, useDeleteLedgerEntry } from '@/features/libro/libro-hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatMoney, formatDate } from '@/lib/utils';

interface LedgerTabSectionProps {
  companyId: string;
  companyName: string;
}

export function LedgerTabSection({ companyId, companyName }: LedgerTabSectionProps) {
  const [period, setPeriod] = useState<string>('');
  const { data, isLoading } = useLedger(companyId, period || undefined);
  const del = useDeleteLedgerEntry();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);

  const handleDelete = (e: any) => {
    setEntryToDelete(e);
  };

  const entries = data?.entries ?? [];
  const SECTION_ORDER = [
    'MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS',
    'GASTO_COMERCIALIZACION', 'GASTO_ADMINISTRACION', 'GASTO_FINANCIERO',
  ];
  const SECTION_LABELS: Record<string, string> = {
    MATERIA_PRIMA: 'Materia Prima',
    MANO_DE_OBRA: 'Mano de Obra',
    COSTOS_INDIRECTOS: 'Costos Indirectos',
    VENTAS: 'Ventas',
    GASTO_COMERCIALIZACION: 'Gasto de Comercialización',
    GASTO_ADMINISTRACION: 'Gasto de Administración',
    GASTO_FINANCIERO: 'Gasto Financiero',
  };

  const SECTION_ICON: Record<string, typeof Table> = {
    MATERIA_PRIMA: Package,
    MANO_DE_OBRA: Users,
    COSTOS_INDIRECTOS: Layers,
    VENTAS: DollarSign,
    GASTO_COMERCIALIZACION: Megaphone,
    GASTO_ADMINISTRACION: Briefcase,
    GASTO_FINANCIERO: Landmark,
  };

  const grouped = SECTION_ORDER
    .map((s) => ({ section: s, items: entries.filter((e) => e.costSection === s) }))
    .filter((g) => g.items.length > 0);

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const periodLabel = (p: string) => {
    const [y, m] = p.split('-');
    return `${months[Number(m) - 1] ?? m} ${y}`;
  };

  const handleExport = () => {
    const headers = ['Periodo', 'Fecha', 'Seccion', 'Tipo', 'Proveedor', 'Descripcion', 'Monto', 'Moneda'];
    const rows = entries.map((e) => [
      e.period,
      e.docDate ? new Date(e.docDate).toLocaleDateString('es-AR') : '',
      SECTION_LABELS[e.costSection] ?? e.costSection,
      e.documentType,
      e.supplier ?? '',
      e.description.replace(/"/g, '""'),
      String(e.amount),
      e.currency,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro-costos-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Select
          className="sm:w-48"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Todos los períodos"
          options={(data?.periods ?? []).map((p) => ({ value: p, label: periodLabel(p) }))}
        />
        <div className="flex gap-2 font-medium">
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Agregar Manual
          </Button>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleExport}>
              <Table className="size-4" /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Totales */}
      {data && Object.keys(data.totalsBySection).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-rise">
          {SECTION_ORDER.filter((s) => data.totalsBySection[s] != null).map((s) => (
            <StatCard
              key={s}
              label={SECTION_LABELS[s] ?? s}
              value={formatMoney(data.totalsBySection[s])}
              sub="Total del período"
              icon={SECTION_ICON[s] ?? Table}
              variant="neutral"
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-ink-soft">Cargando…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <BookOpen className="size-6" />
            </div>
            <p className="text-sm font-bold text-ink">Sin costos registrados en este período</p>
            <p className="text-xs text-ink-soft">
              Aprobá documentos desde Validaciones o cargá líneas manualmente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-zinc-50/15">
                <p className="text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">{SECTION_LABELS[section] ?? section}</p>
                <span className="text-[14px] font-bold tabular-nums text-granate">
                  {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
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
          companyId={companyId}
          defaultPeriod={period || undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}

      {lightbox && (
        <PortalOverlay>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Comprobante" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(ev) => ev.stopPropagation()} />
            <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 size-9 rounded-full bg-black/50 text-lg text-white hover:bg-black/70">✕</button>
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
    </div>
  );
}

// ── Ledger Row ───────────────────────────────────────────────────────────────
function LedgerRow({
  entry,
  onZoom,
  onEdit,
  onDelete,
}: {
  entry: any;
  onZoom: (src: string) => void;
  onEdit: (e: any) => void;
  onDelete: (e: any) => void;
}) {
  const isImage = entry.sourceImageUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(entry.sourceImageUrl);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const periodLabel = (p: string) => {
    const [y, m] = p.split('-');
    return `${months[Number(m) - 1] ?? m} ${y}`;
  };

  return (
    <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {entry.sourceImageUrl ? (
          isImage ? (
            <button type="button" onClick={() => onZoom(entry.sourceImageUrl!)} className="shrink-0">
              <img src={entry.sourceImageUrl} alt="comprobante" className="size-10 rounded-xl object-cover border border-line hover:opacity-80" />
            </button>
          ) : (
            <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-ink-soft hover:bg-granate-tenue hover:text-granate">
              <FileDown className="size-4" />
            </a>
          )
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-idle">
            <ImageIcon className="size-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{entry.description}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span>{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
            {entry.wasCorrected && (
              <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700"><PenLine className="size-3" /> corregido</span>
            )}
            {entry.aiUsed && (
              <span className="flex items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700">Auto</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pl-[52px] sm:pl-0 sm:shrink-0 sm:justify-start">
        <div className="shrink-0 text-right">
          <p className="text-[14px] font-semibold tabular-nums text-ink">
            {entry.currency !== 'ARS' && <span className="text-[11px] text-ink-soft">{entry.currency} </span>}
            {formatMoney(entry.amount)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onEdit(entry)} title="Editar" aria-label="Editar entrada" className="rounded-xl p-1.5 text-ink-soft hover:bg-granate-tenue hover:text-granate transition-colors">
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => onDelete(entry)} title="Borrar" aria-label="Borrar entrada" className="rounded-xl p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger transition-colors">
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
