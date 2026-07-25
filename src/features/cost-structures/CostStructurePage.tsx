import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  ArrowLeft, Calculator, Package, Users, Factory, Activity,
  TrendingUp, BarChart2, CheckCircle2, History, GitCompare,
  Download, Upload, Lock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useCostStructure,
  useUpdateCostSection,
  useUpdateSales,
  useCalculate,
  useLatestCalculation,
  useExportExcel,
  useImportExcel,
  type ImportedExcelData,
} from './cost-structure-hooks';
import { RawMaterialForm } from './RawMaterialForm';
import { DerivationTree } from './DerivationTree';
import { useCalculateTraced, useStructureRuns } from './trazabilidad-hooks';
import { IncompleteNotice } from './ImputacionResolver';
import type { Incompletitud } from './trazabilidad-types';
import { usePeriods } from './period-hooks';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { PeriodBar } from './components/PeriodBar';
import { PeriodComparison } from './components/PeriodComparison';
import type { RawMaterialConfig, DirectLaborConfig, IndirectCostConfig } from './cost-structure-types';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CalculationResult } from '@/lib/types';

// Extracted Components
import { Frozen } from './components/shared/Frozen';
import { SectionShell } from './components/shared/SectionShell';
import { ImportOverwriteWarning } from './components/shared/ImportOverwriteWarning';
import { FullScreenCalculatorLoader } from './components/shared/FullScreenCalculatorLoader';
import { IndirectCostsTab } from './components/tabs/IndirectCostsTab';
import { DirectLaborTab } from './components/tabs/DirectLaborTab';
import { SalesTab } from './components/tabs/SalesTab';
import { ResultTab, EmptyResult } from './components/tabs/ResultTab';
import { HistoryTab } from './components/tabs/HistoryTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionTab = 'raw-material' | 'direct-labor' | 'indirect-costs' | 'sales' | 'result' | 'history' | 'simulate' | 'comparison';

const IMPORT_REVIEW_SECTIONS = [
  { key: 'rawMaterialConfig', label: 'Materia Prima' },
  { key: 'directLaborConfig', label: 'Mano de Obra' },
  { key: 'indirectCostConfig', label: 'Costos Indirectos' },
  { key: 'sales', label: 'Ventas' },
] as const;

/**
 * Cuenta valores efectivamente encontrados dentro de un resultado parcial de
 * import: cada campo definido cuenta 1, cada fila de un array (departamento,
 * concepto) también cuenta 1. No hay un "total esperado" fijo para comparar
 * — la config varía según qué tan detallado sea el Excel de cada costista —
 * así que se muestra la cuenta sola, no una fracción.
 */
function countFilled(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') {
    return Object.values(value).reduce((sum: number, v) => sum + countFilled(v), 0);
  }
  return 1;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure, isLoading } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales   = useUpdateSales(id);
  const calculate     = useCalculate(id);
  const exportExcel   = useExportExcel(id);
  const importExcel   = useImportExcel(id);
  const { data: latest } = useLatestCalculation(id);

  // Trazabilidad Total v1 (D.1): corrida nueva con árbol persistido, en
  // paralelo a la corrida legada (que sigue alimentando ResultPanel de
  // abajo sin cambios). Cache-first del último run: si no calculaste en
  // esta sesión todavía, usamos el último run que ya existía en el server.
  const calculateTraced = useCalculateTraced(id);
  const { data: runsList } = useStructureRuns(id);
  const [tracedRunId, setTracedRunId] = useState<string | null>(null);
  const [tracedError, setTracedError] = useState<string | null>(null);
  const [incompletitud, setIncompletitud] = useState<Incompletitud | null>(null);
  const effectiveRunId = tracedRunId ?? runsList?.[0]?.id ?? null;

  // Período de costeo que se está mirando (problema C — Fase 2). Por defecto, el
  // que está abierto; si ya se cerraron todos, el más nuevo.
  const { data: periods } = usePeriods(id);
  const [periodId, setPeriodId] = useState<string | null>(null);
  useEffect(() => {
    if (!periods?.length) return;
    if (periods.some((p) => p.id === periodId)) return;
    const fallback = periods.find((p) => p.status === 'OPEN') ?? periods[0];
    if (fallback) setPeriodId(fallback.id);
  }, [periods, periodId]);

  const selectedPeriod = periods?.find((p) => p.id === periodId) ?? null;
  /** Un mes cerrado está congelado: se puede mirar, no editar. */
  const readOnly = selectedPeriod?.status === 'CLOSED';

  const [activeTab, setActiveTab] = useState<SectionTab>('raw-material');
  const [result,    setResult]    = useState<{ result: CalculationResult; calculationId: string } | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [importedDefaults, setImportedDefaults] = useState<ImportedExcelData | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  // Resultado crudo del parseo, en revisión — todavía NO se aplicó a los
  // formularios. Se separa de `importedDefaults` a propósito: hasta que la
  // costista no confirma en el diálogo, nada de esto toca la pantalla real.
  const [pendingImport, setPendingImport] = useState<ImportedExcelData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const configured = {
    mp:    !!structure?.rawMaterialConfig,
    mod:   !!structure?.directLaborConfig,
    cip:   !!structure?.indirectCostConfig,
    sales: !!(structure?.salesUnitPrice && structure?.salesQuantity),
  };
  const allReady = configured.mp && configured.mod && configured.cip && configured.sales;
  const shown    = result ?? (latest ? { result: latestToResult(latest), calculationId: latest.id } : null);

  const IMPORTED_KEY_BY_SECTION = {
    'raw-material': 'rawMaterialConfig',
    'direct-labor': 'directLaborConfig',
    'indirect-costs': 'indirectCostConfig',
  } as const;

  /** Un período cerrado no se toca. Reabrirlo es la única puerta, y deja rastro. */
  const blockedByClosedPeriod = (): boolean => {
    if (!readOnly) return false;
    setError(
      `"${selectedPeriod?.label}" está cerrado: sus números están congelados. ` +
        'Para corregir algo, reabrí el período (te va a pedir el motivo).',
    );
    return true;
  };

  const saveSection = async (
    section: 'raw-material' | 'direct-labor' | 'indirect-costs',
    config: unknown,
  ) => {
    setError(null);
    if (blockedByClosedPeriod()) return;
    try {
      await updateSection.mutateAsync({ section, config });
      // No se auto-avanza a la siguiente sección: el usuario se queda en la
      // pestaña actual para seguir revisando lo que cargó.
      // El aviso de "importación pendiente de guardar" ya no aplica para esta
      // sección: se acaba de guardar, así que lo que se ve ahora es lo persistido.
      const importedKey = IMPORTED_KEY_BY_SECTION[section];
      setImportedDefaults((prev) => (prev ? { ...prev, [importedKey]: undefined } : prev));
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const runCalculate = async () => {
    setError(null);
    setTracedError(null);
    setIncompletitud(null);
    if (blockedByClosedPeriod()) return;
    try {
      const data = await calculate.mutateAsync();
      setResult(data);
      setActiveTab('result');
    } catch (e) { setError(apiErrorMessage(e)); return; }

    // Corrida de trazabilidad (árbol persistido): no bloquea ni tapa el
    // resultado de arriba si falla (ej. hay datos sin imputar) — el aviso
    // queda solo dentro de la caja del árbol.
    try {
      const traced = await calculateTraced.mutateAsync();
      setTracedRunId(traced.runId);
      setIncompletitud(traced.incompleto ?? null);
    } catch (e) {
      setTracedError(apiErrorMessage(e));
    }
  };

  const runExport = async () => {
    setError(null);
    try {
      await exportExcel.mutateAsync();
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si hace falta reintentar
    if (!file) return;
    setError(null);
    setImportNotice(null);
    try {
      const data = await importExcel.mutateAsync(file);
      // No se aplica todavía — se muestra en el diálogo de revisión y la
      // costista decide si lo carga o lo descarta. Nada toca la pantalla
      // real hasta ese "Cargar en el formulario".
      setPendingImport(data);
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const data = pendingImport;
    setImportedDefaults(data);
    // El backend omite del todo una sección si no encontró nada en el
    // Excel para ella (nunca la manda "vacía"). Avisamos si falta
    // CUALQUIERA de las cuatro, no solo cuando no se encontró nada de
    // nada — un import parcial (ej. Materia Prima sí, el resto no) es
    // tan silencioso como uno vacío si no se dice explícitamente qué
    // quedó sin leer.
    const missing = [
      !data.rawMaterialConfig && 'Materia Prima',
      !data.directLaborConfig && 'Mano de Obra',
      !data.indirectCostConfig && 'Costos Indirectos',
      !data.sales && 'Ventas',
    ].filter((s): s is string => typeof s === 'string');
    setImportNotice(
      missing.length === 0
        ? null
        : `No pudimos reconocer datos automáticamente para: ${missing.join(', ')}. No es un error — completá esas secciones a mano.`,
    );
    // Llevar a la costista a la primera sección para que vea de entrada lo
    // que se pre-llenó, en vez de dejarla en la pestaña donde clickeó.
    setActiveTab('raw-material');
    setPendingImport(null);
  };

  const discardImport = () => setPendingImport(null);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-ink-soft">Cargando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <FullScreenCalculatorLoader active={calculate.isPending} />
      {/* Header */}
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:justify-between">
        <div>
          <Link
            to="/companies/$id"
            params={{ id: structure?.companyId ?? '' }}
            className="mb-1.5 flex items-center gap-1 text-[13px] text-granate hover:text-action"
          >
            <ArrowLeft className="size-3.5" /> Volver a la empresa
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-granate-deep">{structure?.productName ?? 'Estructura de costos'}</h1>
          {/* El período de costo dejó de ser un texto tipeado: es el período real,
              con su estado y sus tres operaciones (problema C — Fase 2). */}
          <div className="mt-1.5 flex flex-wrap items-start gap-x-2 gap-y-1.5">
            <PeriodBar
              structureId={id}
              legacyPeriod={structure?.period}
              selectedId={periodId}
              onSelect={setPeriodId}
              runIdToFreeze={effectiveRunId}
              periodoCosto={structure?.period}
              pendingDatos={incompletitud?.datosPendientes ?? []}
              onGoToResolve={() => { setActiveTab('result'); void runCalculate(); }}
            />
            <span className="inline-flex items-center self-start rounded-full border border-line bg-surface-alt px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-soft">
              Captación: continua
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="secondary" size="sm" onClick={triggerImport} loading={importExcel.isPending}>
            <Upload className="size-4" /> Importar desde Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={runExport} loading={exportExcel.isPending} disabled={!allReady}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button
            onClick={runCalculate}
            loading={calculate.isPending}
            disabled={!allReady || readOnly}
            title={readOnly ? 'El período está cerrado: sus números están congelados.' : undefined}
          >
            <Calculator className="size-4" /> Calcular
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-danger/60 hover:text-danger">✕</button>
        </div>
      )}

      {/* Revisión del import: nada se aplica a los formularios hasta que la
          costista confirma acá — ve qué se encontró (y qué no) antes de que
          toque la pantalla real. */}
      <ConfirmDialog
        open={pendingImport !== null}
        title="Revisá lo que encontramos en tu Excel"
        message={
          <div className="space-y-2">
            <p>Antes de cargar esto en el formulario, confirmá que está bien. No se guarda nada todavía — vas a poder revisar y editar cada campo igual que siempre antes de apretar &quot;Guardar&quot;.</p>
            <ul className="space-y-1 rounded-lg bg-surface-alt p-3">
              {IMPORT_REVIEW_SECTIONS.map(({ key, label }) => {
                const data = pendingImport?.[key];
                const count = countFilled(data);
                return (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{label}</span>
                    {data ? (
                      <span className="text-ok">{count} {count === 1 ? 'dato encontrado' : 'datos encontrados'}</span>
                    ) : (
                      <span className="text-ink-soft">No se encontró nada</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        }
        confirmLabel="Cargar en el formulario"
        cancelLabel="Descartar"
        onConfirm={confirmImport}
        onCancel={discardImport}
      />

      {/* Aviso de import sin resultados — no es un error, el pedido funcionó
          bien, simplemente no encontramos nada reconocible en el archivo. */}
      {importNotice && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-[13px] text-warn">
          <span className="min-w-0 flex-1 break-words">{importNotice}</span>
          <button type="button" onClick={() => setImportNotice(null)} className="shrink-0 text-warn/60 hover:text-warn">✕</button>
        </div>
      )}

      {/* Período cerrado: se mira, no se toca. */}
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-alt px-4 py-2.5 text-[13px] text-ink">
          <Lock className="size-4 shrink-0 text-ink-soft" />
          <span>
            Estás viendo <strong>{selectedPeriod?.label}</strong>, que está cerrado. Los números
            quedaron congelados: podés consultarlos, pero no editarlos ni recalcular. Para corregir
            algo, reabrí el período.
          </span>
        </div>
      )}

      {/* Aviso de progreso */}
      {!allReady && !readOnly && (
        <div className="mb-4 rounded-xl border border-action/20 bg-action/5 px-4 py-2.5 text-[13px] text-ink">
          Completá las 4 secciones para habilitar el cálculo.
        </div>
      )}

      {/* Tab bar — con gap entre pestañas para evitar errar de botón al cargar datos */}
      <div className="mb-8 flex gap-4 overflow-x-auto border-b border-line">
        {(
          [
            { id: 'raw-material'    as SectionTab, label: 'Materia Prima',        icon: Package,    configKey: 'mp'    as const },
            { id: 'direct-labor'    as SectionTab, label: 'Mano de Obra',          icon: Users,      configKey: 'mod'   as const },
            { id: 'indirect-costs'  as SectionTab, label: 'Costos Indirectos',     icon: Factory,    configKey: 'cip'   as const },
            { id: 'sales'           as SectionTab, label: 'Venta',                 icon: TrendingUp, configKey: 'sales' as const },
            { id: 'result'          as SectionTab, label: 'Resultado',             icon: BarChart2,  configKey: undefined },
            { id: 'simulate'        as SectionTab, label: 'Simulador',             icon: Activity,   configKey: undefined },
            { id: 'comparison'      as SectionTab, label: 'Comparación',           icon: GitCompare, configKey: undefined },
            { id: 'history'         as SectionTab, label: 'Historial',             icon: History,    configKey: undefined },
          ] as { id: SectionTab; label: string; icon: typeof Package; configKey: keyof typeof configured | undefined }[]
        ).map(({ id: tabId, label, icon: Icon, configKey }) => {
          const isDone = configKey ? configured[configKey] : !!shown;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-medium transition-colors',
                activeTab === tabId
                  ? 'border-granate text-granate'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              <Icon className="size-4" />
              {label}
              {isDone && <CheckCircle2 className="size-3.5 text-ok" />}
            </button>
          );
        })}
      </div>

      {/* Tab content — los 4 formularios de carga se mantienen MONTADOS (solo se
          ocultan con `hidden`). Así lo que cargues sin guardar queda como borrador
          al cambiar de pestaña y sigue ahí al volver. */}
      <div className={cn(activeTab !== 'raw-material' && 'hidden')}>
        <SectionShell
          title="Materia Prima"
          description="Lote óptimo de Wilson · Política de stock · Ficha PPP (Precio Promedio Ponderado)"
          configured={configured.mp}
          structureId={id}
          historySection="rawMaterial"
        >
          <Frozen when={readOnly}>
            {importedDefaults?.rawMaterialConfig && configured.mp && <ImportOverwriteWarning />}
            <RawMaterialForm
              structureId={id}
              period={structure?.period}
              defaultValues={(importedDefaults?.rawMaterialConfig ?? structure?.rawMaterialConfig) as RawMaterialConfig | undefined}
              onSave={(d) => saveSection('raw-material', d)}
              saving={updateSection.isPending}
              isProcesses={structure?.costingSystem === 'PROCESSES'}
            />
          </Frozen>
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'direct-labor' && 'hidden')}>
        <SectionShell
          title="Mano de Obra Directa"
          description="Días hábiles efectivos · ITCS (Índice Total de Cargas Sociales) · Tarifa horaria por departamento"
          configured={configured.mod}
          structureId={id}
          historySection="directLabor"
        >
          <Frozen when={readOnly}>
            {importedDefaults?.directLaborConfig && configured.mod && <ImportOverwriteWarning />}
            <DirectLaborTab
              config={(importedDefaults?.directLaborConfig ?? structure?.directLaborConfig) as DirectLaborConfig | undefined}
              directLabor={shown?.result?.detail?.directLabor}
              onSave={(d) => saveSection('direct-labor', d)}
              saving={updateSection.isPending}
            />
          </Frozen>
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'indirect-costs' && 'hidden')}>
        <SectionShell
          title="Costos Indirectos de Producción"
          description="Centros de costo · Prorrateo primario y secundario · Cuotas por hora y variaciones"
          configured={configured.cip}
          structureId={id}
          historySection="indirectCosts"
        >
          <Frozen when={readOnly}>
            {importedDefaults?.indirectCostConfig && configured.cip && <ImportOverwriteWarning />}
            <IndirectCostsTab
              config={(importedDefaults?.indirectCostConfig ?? structure?.indirectCostConfig) as IndirectCostConfig | undefined}
              perDepartment={shown?.result?.detail?.indirectCosts?.perDepartment}
              onSave={(d) => saveSection('indirect-costs', d)}
              saving={updateSection.isPending}
              companyId={structure?.companyId}
              structureId={id}
            />
          </Frozen>
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'sales' && 'hidden')}>
        <Frozen when={readOnly}>
          {importedDefaults?.sales && configured.sales && <ImportOverwriteWarning />}
          <SalesTab
            defaultPrice={importedDefaults?.sales?.salesUnitPrice ?? (structure?.salesUnitPrice ? Number(structure.salesUnitPrice) : undefined)}
            defaultQty={importedDefaults?.sales?.salesQuantity ?? (structure?.salesQuantity ? Number(structure.salesQuantity) : undefined)}
            defaultProducedQty={structure?.productionQuantity ? Number(structure.productionQuantity) : undefined}
            onSave={async (p, q, produced) => {
              setError(null);
              if (blockedByClosedPeriod()) return;
              try {
                await updateSales.mutateAsync({
                  salesUnitPrice: p,
                  salesQuantity: q,
                  productionQuantity: produced,
                });
                // Se queda en Venta tras guardar (no salta a Resultado).
                // Una vez guardado, el aviso de importación pendiente ya no aplica para Venta.
                setImportedDefaults((prev) => (prev ? { ...prev, sales: undefined } : prev));
              } catch (e) { setError(apiErrorMessage(e)); }
            }}
            saving={updateSales.isPending}
            allReady={allReady}
            onCalculate={runCalculate}
            calculating={calculate.isPending}
          />
        </Frozen>
      </div>

      {activeTab === 'result' && (
        <div className="space-y-4">
          {incompletitud?.incompleto && (
            <IncompleteNotice
              datos={incompletitud.datosPendientes}
              motivos={incompletitud.motivos}
              periodoCosto={structure?.period}
              structureId={id}
              doneTitle="Volvé a calcular para ver el resultado limpio."
              doneLabel="Volver a calcular"
              onDone={() => void runCalculate()}
              busy={calculate.isPending || calculateTraced.isPending}
            />
          )}
          <DerivationTree
            runId={effectiveRunId}
            isMissingRun={!!tracedError}
            missingRunMessage={tracedError}
            structureId={id}
            period={structure?.period}
          />
          {shown
            ? <ResultTab result={shown.result} companyId={structure?.companyId} period={structure?.period} incompleto={incompletitud?.incompleto} />
            : <EmptyResult />}
        </div>
      )}

      {activeTab === 'simulate' && (
        <ScenarioSimulator structureId={id} currentResult={shown?.result || null} />
      )}

      {activeTab === 'comparison' && (
        <PeriodComparison structureId={id} />
      )}

      {activeTab === 'history' && (
        <HistoryTab structureId={id} />
      )}
    </AppShell>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function latestToResult(latest: any): CalculationResult {
  return {
    rawMaterialConsumed:  Number(latest.rawMaterialConsumed),
    directLaborTotal:     Number(latest.directLaborTotal),
    indirectCostsApplied: Number(latest.indirectCostsApplied),
    productionCost:       Number(latest.productionCost),
    costOfGoodsSold:      Number(latest.costOfGoodsSold),
    grossMargin:          Number(latest.grossMargin),
    grossMarginPct:       Number(latest.grossMarginPct),
    detail:               latest.detail,
  };
}
