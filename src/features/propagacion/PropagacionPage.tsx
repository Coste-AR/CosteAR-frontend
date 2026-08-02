import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Layers, Zap, ArrowRight,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api';

// ─── tipos ──────────────────────────────────────────────────────────────────

interface PreviewItem {
  structureId: string;
  productName: string;
  period: string;
  companyId: string;
  companyName: string;
  indicator: string;
  changePct: number;
  before: { productionCost: number; grossMarginPct: number; salesUnitPrice: number | null };
  after: { productionCost: number; grossMarginPct: number; suggestedUnitPrice: number | null };
  marginDelta: number;
}

interface PreviewResult {
  preview: PreviewItem[];
  affectedCount: number;
  indicator: string;
}

// ─── preset de cambios frecuentes ───────────────────────────────────────────
const PRESETS = [
  { label: 'UATRE +10%', factor: 1.10, code: 'PARITARIA', indicatorCode: 'UATRE_PARITARIA' },
  { label: 'UATRE +15%', factor: 1.15, code: 'PARITARIA', indicatorCode: 'UATRE_PARITARIA' },
  { label: 'Energía +20%', factor: 1.20, code: 'ARCA', indicatorCode: 'TARIFA_ENERGIA' },
  { label: 'USD +5%', factor: 1.05, code: 'BCRA', indicatorCode: 'USD_OFICIAL' },
  { label: 'IPC +3%', factor: 1.03, code: 'INDEC', indicatorCode: 'IPC_NACIONAL' },
];

// ─── componente principal ────────────────────────────────────────────────────

export function PropagacionPage() {
  const [changePct, setChangePct] = useState('');
  const [label, setLabel] = useState('');
  const [source, setSource] = useState<'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA'>('PARITARIA');
  const [indicatorCode, setIndicatorCode] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (body: { changeFactor: number; indicatorLabel: string }) => {
      const res = await api.post<{ data: PreviewResult }>('/macro/propagation-preview', body);
      return res.data.data;
    },
    onSuccess: (data) => { setPreview(data); setConfirmed(false); setError(null); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await api.post('/macro/manual-entry', {
        source,
        indicatorCode: indicatorCode || label,
        value: 1 + Number(changePct) / 100,
        effectiveDate: new Date().toISOString(),
        label,
      });
      await api.post('/macro/sync-now');
    },
    onSuccess: () => setConfirmed(true),
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const applyPreset = (p: (typeof PRESETS)[0]) => {
    const pct = ((p.factor - 1) * 100).toFixed(0);
    setChangePct(pct);
    setLabel(p.label);
    setSource(p.code as typeof source);
    setIndicatorCode(p.indicatorCode);
  };

  const handlePreview = () => {
    const factor = 1 + Number(changePct) / 100;
    if (!label || isNaN(factor) || factor <= 0) return;
    previewMutation.mutate({ changeFactor: factor, indicatorLabel: label });
  };

  const avgMarginDelta = preview
    ? preview.preview.reduce((acc, p) => acc + p.marginDelta, 0) / Math.max(preview.preview.length, 1)
    : 0;

  if (confirmed) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <CardBody className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-granate-deep">Propagación confirmada</h2>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
                  El cambio fue registrado. El motor de recálculo actualizará todas las
                  estructuras afectadas en segundo plano y generará alertas si algún margen cae bajo umbral.
                </p>
              </div>
              <Button onClick={() => { setPreview(null); setConfirmed(false); setChangePct(''); setLabel(''); }}>
                Nueva propagación
              </Button>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Revisión de propagación"
        description="Simulá el impacto de un cambio macro en toda tu cartera antes de confirmar"
      />

      {/* Formulario de entrada */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Tipo de variable"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              options={[
                { value: 'PARITARIA', label: 'Paritaria / Convenio' },
                { value: 'BCRA', label: 'BCRA — Tipo de cambio' },
                { value: 'INDEC', label: 'INDEC — Índice' },
                { value: 'ARCA', label: 'ARCA — Tarifa / Energía' },
              ]}
            />
            <Input
              label="Descripción"
              placeholder="Ej: UATRE paritaria Nov 2025"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              label="Variación (%)"
              type="number"
              step="0.1"
              suffix="%"
              placeholder="15"
              value={changePct}
              onChange={(e) => setChangePct(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handlePreview}
                loading={previewMutation.isPending}
                disabled={!label || !changePct}
              >
                <Zap className="size-4" /> Ver impacto
              </Button>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft/70">Accesos rápidos</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink shadow-sm transition-colors hover:border-granate hover:bg-granate-tenue hover:text-granate"
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] font-semibold text-danger shadow-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resultados del preview */}
      {preview && (
        <>
          {/* Resumen */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Estructuras afectadas"
              value={preview.affectedCount}
              sub="en tu cartera activa"
              icon={Layers}
              variant="neutral"
            />
            <StatCard
              label="Variación de precio"
              value={`${(Number(changePct) || 0) > 0 ? '+' : ''}${(Number(changePct) || 0).toFixed(1)}%`}
              sub={preview.indicator}
              icon={TrendingUp}
              variant="neutral"
            />
            <StatCard
              label="Impacto en margen"
              value={`${avgMarginDelta > 0 ? '+' : ''}${avgMarginDelta.toFixed(1)} pts`}
              sub="promedio por estructura"
              icon={avgMarginDelta < 0 ? TrendingDown : TrendingUp}
              variant={avgMarginDelta < 0 ? 'warn' : 'ok'}
            />
          </div>

          <Card>
            <CardHeader
              title={`Detalle de propagación — ${preview.indicator}`}
              description="Costo anterior vs. proyectado por estructura. El precio sugerido mantiene el margen actual."
              action={
                <div className="flex min-w-0 flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate()}
                    loading={confirmMutation.isPending}
                  >
                    Confirmar y aplicar ({preview.affectedCount}) <ArrowRight className="size-4" />
                  </Button>
                </div>
              }
            />
            <CardBody className="p-0">
              {/* Tabla — tablet/desktop */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                      <th className="px-6 py-3 text-left font-semibold">Empresa / Producto</th>
                      <th className="px-4 py-3 text-right font-semibold">Costo anterior</th>
                      <th className="px-4 py-3 text-right font-semibold">Costo nuevo</th>
                      <th className="px-4 py-3 text-right font-semibold">Margen ant.</th>
                      <th className="px-4 py-3 text-right font-semibold">Margen nuevo</th>
                      <th className="px-4 py-3 text-right font-semibold">Precio sugerido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.preview.map((item) => (
                      <PropagationRow key={item.structureId} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="space-y-3 p-4 sm:hidden">
                {preview.preview.map((item) => (
                  <PropagationCard key={item.structureId} item={item} />
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {preview?.affectedCount === 0 && (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <Layers className="size-6" />
            </div>
            <p className="max-w-sm text-[13px] text-ink-soft">
              No hay estructuras ACTIVAS con configuración completa para simular.
              Activá al menos una estructura en "Clientes".
            </p>
          </CardBody>
        </Card>
      )}
    </AppShell>
  );
}

function PropagationRow({ item }: { item: PreviewItem }) {
  const marginDown = item.marginDelta < -1;

  return (
    <tr className="hover:bg-surface-alt/40">
      <td className="px-6 py-3.5">
        <div className="font-bold text-ink">{item.companyName}</div>
        <div className="text-[12px] text-ink-soft">{item.productName} · {item.period}</div>
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink">
        ${item.before.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3.5 text-right tabular font-semibold text-action">
        ${item.after.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink">
        {item.before.grossMarginPct.toFixed(1)}%
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold shadow-sm',
          marginDown ? 'border-danger/20 bg-danger/10 text-danger' : 'border-ok/20 bg-ok/10 text-ok',
        )}>
          {marginDown ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
          {item.after.grossMarginPct.toFixed(1)}%
          <span className="opacity-70">({item.marginDelta > 0 ? '+' : ''}{item.marginDelta.toFixed(1)})</span>
        </span>
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink-soft">
        {item.after.suggestedUnitPrice
          ? `$${item.after.suggestedUnitPrice.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
          : '—'}
      </td>
    </tr>
  );
}

function PropagationCard({ item }: { item: PreviewItem }) {
  const marginDown = item.marginDelta < -1;

  return (
    <div className="rounded-2xl border border-line bg-surface-alt/40 p-3.5">
      {/* Dato principal */}
      <div className="font-bold text-ink">{item.companyName}</div>
      <div className="text-[12px] text-ink-soft">{item.productName} · {item.period}</div>

      {/* Metadata */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">Costo anterior</div>
          <div className="tabular text-[13px] text-ink">
            ${item.before.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">Costo nuevo</div>
          <div className="tabular text-[13px] font-semibold text-action">
            ${item.after.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">Margen ant.</div>
          <div className="tabular text-[13px] text-ink">{item.before.grossMarginPct.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">Margen nuevo</div>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm',
            marginDown ? 'border-danger/20 bg-danger/10 text-danger' : 'border-ok/20 bg-ok/10 text-ok',
          )}>
            {marginDown ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
            {item.after.grossMarginPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Precio sugerido */}
      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">Precio sugerido</span>
        <span className="tabular text-[13px] font-semibold text-ink">
          {item.after.suggestedUnitPrice
            ? `$${item.after.suggestedUnitPrice.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
            : '—'}
        </span>
      </div>
    </div>
  );
}
