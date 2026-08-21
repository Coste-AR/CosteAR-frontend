import { useState } from 'react';
import { Plus, Table, BookOpen, FileDown, ImageIcon, PenLine, Pencil, Trash2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { useLedger, useDeleteLedgerEntry } from '@/features/libro/libro-hooks';
import { LedgerEntryModal } from '@/features/libro/LedgerEntryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatMoney, formatDate } from '@/lib/utils';

export function CompanyLedgerTab({ companyId, companyName }: { companyId: string; companyName: string }) {
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
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro-costos-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
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

      {data && Object.keys(data.totalsBySection).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-rise">
          {SECTION_ORDER.filter((s) => data.totalsBySection[s] != null).map((s) => (
            <div key={s} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-semibold">{SECTION_LABELS[s]}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-zinc-850">{formatMoney(data.totalsBySection[s])}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-zinc-400">Cargando…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 size-8 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-800">Sin costos registrados en este período</p>
            <p className="mt-1 text-xs text-zinc-400">
              Aprobá documentos desde Validaciones o cargá líneas manualmente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 bg-zinc-50/50">
                <p className="text-[14px] font-bold text-zinc-800">{SECTION_LABELS[section] ?? section}</p>
                <span className="text-[14px] font-bold tabular-nums text-granate">
                  {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
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
    <div className="flex items-center gap-3 px-5 py-3">
      {entry.sourceImageUrl ? (
        isImage ? (
          <button type="button" onClick={() => onZoom(entry.sourceImageUrl!)} className="shrink-0">
            <img src={entry.sourceImageUrl} alt="comprobante" className="size-10 rounded object-cover border border-zinc-200 hover:opacity-80" />
          </button>
        ) : (
          <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100">
            <FileDown className="size-4" />
          </a>
        )
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-400">
          <ImageIcon className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-zinc-800">{entry.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span>{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
          {entry.wasCorrected && (
            <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700"><PenLine className="size-3" /> corregido</span>
          )}
          {entry.aiUsed && (
            <span className="flex items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">IA</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-semibold tabular-nums text-zinc-800">
          {entry.currency !== 'ARS' && <span className="text-[11px] text-zinc-400">{entry.currency} </span>}
          {formatMoney(entry.amount)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onEdit(entry)} title="Editar" aria-label="Editar entrada" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-150 hover:text-zinc-800 transition-colors">
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button type="button" onClick={() => onDelete(entry)} title="Borrar" aria-label="Borrar entrada" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors">
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
