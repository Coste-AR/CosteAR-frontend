import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, TrendingUp, DollarSign, BarChart3, Zap, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { api, apiErrorMessage } from '@/lib/api';
import type { MacroSnapshot } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const SOURCE_CONFIG: Record<string, { label: string; color: string; border: string; icon: typeof DollarSign }> = {
  BCRA:      { label: 'BCRA',      color: 'text-blue-600 bg-blue-50',     border: 'border-blue-200/70',   icon: DollarSign },
  INDEC:     { label: 'INDEC',     color: 'text-purple-600 bg-purple-50', border: 'border-purple-200/70', icon: BarChart3 },
  ARCA:      { label: 'ARCA',      color: 'text-orange-600 bg-orange-50', border: 'border-orange-200/70', icon: Zap },
  PARITARIA: { label: 'Paritaria', color: 'text-granate bg-granate-tenue', border: 'border-granate/15',   icon: TrendingUp },
};

const INDICATOR_LABELS: Record<string, string> = {
  USD_OFICIAL:     'Dólar oficial ($/USD)',
  IPC_NACIONAL:    'IPC Nacional (var. mensual %)',
  UATRE_PARITARIA: 'Paritaria UATRE',
  TARIFA_ENERGIA:  'Tarifa energía ($/kWh)',
};

export function MacroPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => { await api.post('/macro/sync-now'); },
    onSuccess: () => {
      setSyncMsg('Sincronización con BCRA e INDEC encolada. Los datos se actualizarán en segundos.');
      setTimeout(() => { qc.invalidateQueries({ queryKey: ['macro'] }); setSyncMsg(null); }, 4000);
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Variables macro"
        description="Tipo de cambio, inflación e índices que impactan tus costos"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" /> Cargar manual
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => syncNow.mutate()}
              loading={syncNow.isPending}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="size-4" /> Sincronizar BCRA/INDEC
            </Button>
            <Link to="/propagacion" className="block w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto">
                <Zap className="size-4" /> Ver impacto en cartera
              </Button>
            </Link>
          </div>
        }
      />

      {syncMsg && (
        <div className="mb-4 w-full rounded-xl border border-action/20 bg-action/5 px-4 py-2.5 text-[13px] font-medium text-action break-words">
          {syncMsg}
        </div>
      )}

      {showForm && <ManualEntryForm onDone={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['macro'] }); }} />}

      {!!data?.length && (
        <div className="mb-4">
          <AdvisorPanel
            kind="macro"
            label="Interpretar impacto en costos con análisis"
            context={{
              variables: data.map((m) => ({
                indicador: INDICATOR_LABELS[m.indicatorCode] ?? m.indicatorCode,
                valor: Number(m.value),
                fuente: m.source,
              })),
            }}
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : !data?.length ? (
        <Card>
          <CardBody className="py-14 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-granate/10 bg-granate-tenue text-granate">
              <TrendingUp className="size-5" />
            </div>
            <p className="text-sm text-ink-soft mb-4">
              Todavía no hay datos macro. Hacé clic en "Sincronizar BCRA/INDEC" para traer los valores actuales.
            </p>
            <Button size="sm" onClick={() => syncNow.mutate()} loading={syncNow.isPending}>
              <RefreshCw className="size-4" /> Sincronizar ahora
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => {
            const cfg = (SOURCE_CONFIG[m.source] ?? SOURCE_CONFIG.BCRA)!;
            const Icon = cfg.icon;
            const friendlyLabel = INDICATOR_LABELS[m.indicatorCode] ?? m.indicatorCode;
            return (
              <div
                key={m.id}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(74,21,27,0.015)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('flex size-9 items-center justify-center rounded-xl border shadow-[0_2px_8px_rgba(0,0,0,0.015)]', cfg.color, cfg.border)}>
                    <Icon className="size-4.5" />
                  </div>
                  <span className={cn('rounded-full border px-2.5 py-1 text-[10.5px] font-bold shadow-sm', cfg.color, cfg.border)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="font-mono-jb mt-4 text-[28px] font-bold leading-none tracking-tight text-granate-deep">
                  {Number(m.value).toLocaleString('es-AR', { maximumFractionDigits: 4 })}
                </p>
                <p className="mt-2.5 text-[12.5px] font-bold text-ink leading-tight">{friendlyLabel}</p>
                <p className="mt-1 text-[10.5px] font-semibold text-ink-soft/75">
                  Efectivo: {formatDate(m.effectiveDate)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function ManualEntryForm({ onDone }: { onDone: () => void }) {
  const [source, setSource] = useState<'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA'>('PARITARIA');
  const [indicatorCode, setIndicatorCode] = useState('');
  const [value, setValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      await api.post('/macro/manual-entry', {
        source,
        indicatorCode,
        value: Number(value),
        effectiveDate: new Date(effectiveDate).toISOString(),
      });
    },
    onSuccess: onDone,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Card className="mb-6 animate-rise border-action/30">
      <CardHeader
        title="Cargar variable manualmente"
        description="Paritarias, tarifas u otros índices no automáticos"
        action={
          <button
            type="button"
            onClick={onDone}
            className="flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-granate-tenue hover:text-granate"
          >
            <X className="size-4" />
          </button>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Fuente"
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            options={[
              { value: 'PARITARIA', label: 'Paritaria' },
              { value: 'ARCA', label: 'ARCA / Energía' },
              { value: 'BCRA', label: 'BCRA' },
              { value: 'INDEC', label: 'INDEC' },
            ]}
          />
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Código indicador</label>
            <input
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
              placeholder="Ej: UATRE_PARITARIA"
              value={indicatorCode}
              onChange={(e) => setIndicatorCode(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Valor / Factor</label>
            <input
              type="number"
              step="0.01"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
              placeholder="1.15 (= +15%)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Fecha efectiva</label>
            <input
              type="date"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!indicatorCode || !value} className="w-full sm:w-auto">
            Guardar y recalcular
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone} className="w-full sm:w-auto">Cancelar</Button>
        </div>
      </CardBody>
    </Card>
  );
}
