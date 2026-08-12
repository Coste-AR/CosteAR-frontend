import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  ArrowLeft, Calculator, CheckCircle2,
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
import { CostingSystemBadge } from './components/shared/CostingSystemBadge';
import { DepartmentsTab } from './components/process/DepartmentsTab';
import { ProcessSetupWizard } from './components/process/ProcessSetupWizard';
import { PendingDocumentsTab } from './components/process/PendingDocumentsTab';
import { UnitMovementTab } from './components/process/UnitMovementTab';
import { EquivalentProductionTab } from './components/process/EquivalentProductionTab';
import { JointCostsTab } from './components/process/JointCostsTab';
import { ProductionCostReportView } from './components/process/ProductionCostReportView';
import { useProcessDepartments, useProcessSetup, useProcessCalculate } from './process-costing-hooks';
import {
  tabsFor,
  defaultTabFor,
  type SectionTab,
} from './components/tabs/tab-definitions';

// ── Types ─────────────────────────────────────────────────────────────────────

// El juego de pestañas y su tipo viven en `components/tabs/tab-definitions.ts`:
// dependen del sistema de costeo (U02) y no de esta pantalla.

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

  // ¿Esta estructura de Procesos todavía no declaró su mapa productivo? Mientras
  // no lo haga, el backend rechaza el cálculo, así que la pantalla muestra el
  // wizard en lugar de las secciones. `shownTab` en null apaga todo el contenido
  // de pestañas sin tener que envolverlo bloque por bloque.
  const { data: processSetup } = useProcessSetup(id);
  const needsProcessSetup =
    structure?.costingSystem === 'PROCESSES' && processSetup?.completado === false;
  const shownTab: SectionTab | null = needsProcessSetup ? null : activeTab;
  // La estructura llega después del primer render, y al cambiar el sistema de
  // costeo el juego de pestañas cambia entero: si la que estaba activa no existe
  // en el sistema nuevo, la pantalla quedaría en blanco. Se cae a la primera del
  // set (U02).
  const costingSystem = structure?.costingSystem;
  const isProcesses = costingSystem === 'PROCESSES';

  // La cadena de departamentos se consulta una sola vez en la página y se pasa a
  // las cuatro pestañas: todas la necesitan y así comparten el mismo dato.
  const { data: processData } = useProcessDepartments(id, isProcesses);
  // El cálculo de Procesos corre por período y departamento, con su propio
  // motor. Lo usa `runCalculate` cuando la estructura es de Procesos.
  const processCalculate = useProcessCalculate(id, periodId);
  // El `?? []` tiene que ir memoizado: sin esto, cada render crea un array nuevo
  // y el efecto de abajo —que lo tiene como dependencia— se dispara siempre.
  const processDepartments = useMemo(
    () => processData?.departments ?? [],
    [processData?.departments],
  );
  const [processDeptId, setProcessDeptId] = useState<string | null>(null);

  // Al entrar (o al quedar apuntando a un departamento que se dio de baja) se
  // cae al primero de la cadena, para que las pestañas nunca queden en blanco.
  useEffect(() => {
    if (processDepartments.length === 0) return;
    if (!processDeptId || !processDepartments.some((d) => d.id === processDeptId)) {
      setProcessDeptId(processDepartments[0]!.id);
    }
  }, [processDepartments, processDeptId]);

  useEffect(() => {
    if (!costingSystem) return;
    const disponibles = tabsFor(costingSystem);
    if (!disponibles.some((t) => t.id === activeTab)) {
      setActiveTab(defaultTabFor(costingSystem));
    }
  }, [costingSystem, activeTab]);
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
  // "LISTO PARA CALCULAR" NO SIGNIFICA LO MISMO EN LOS DOS SISTEMAS.
  //
  // En Órdenes son las cuatro secciones (MP, MOD, CIP y Venta). En Procesos esas
  // secciones no existen —los costos viven en el cuadro de movimiento— así que
  // `allReady` nunca daba true: el botón Calcular quedaba gris para siempre, el
  // cartel "Completá las 4 secciones" no se iba nunca aunque estuviera todo
  // cargado y calculando bien, y los tildes de las pestañas jamás se encendían.
  //
  // Los tres juntos hacían parecer que el módulo estaba a medio hacer cuando en
  // realidad funcionaba: es buena parte de por qué se creyó que había que
  // rehacerlo.
  //
  // En Procesos lo que habilita el cálculo es tener departamentos y un período.
  const ordersReady = configured.mp && configured.mod && configured.cip && configured.sales;
  const allReady = isProcesses ? processDepartments.length > 0 && !!periodId : ordersReady;
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

    // DESPACHO POR SISTEMA DE COSTEO.
    //
    // Los dos sistemas tienen motores, endpoints e informes distintos. Hasta acá
    // este botón llamaba SIEMPRE al de Órdenes, así que en una estructura de
    // Procesos fallaba con "cargá MP, MOD y CIP" —campos que en esa pantalla no
    // existen— y, como el catch cortaba con `return`, tampoco redirigía a
    // Resultado. Un solo bug que se veía como dos: "no calcula" y "no redirige".
    //
    // El cálculo de Procesos ya existía y andaba: estaba enterrado en el botón de
    // adentro de la pestaña Resultado. Acá se conecta al botón principal.
    if (isProcesses) {
      if (!periodId) {
        setError('Abrí un período de costeo antes de calcular.');
        return;
      }
      try {
        await processCalculate.mutateAsync();
        // La redirección va SIEMPRE que el cálculo salga bien, en los dos
        // sistemas. Antes, en Procesos, no llegaba nunca.
        setActiveTab('result');
      } catch (e) {
        setError(apiErrorMessage(e));
      }
      return;
    }

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

  const triggerImport = () => {
    setError(null);
    if (blockedByClosedPeriod()) return;
    fileInputRef.current?.click();
  };

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
    setPendingImport(null);
    if (blockedByClosedPeriod()) return;
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
    // que se pre-llenó, en vez de dejarla en la pestaña donde clickeó. En
    // Procesos "raw-material" no es una pestaña válida (el import de Excel no
    // aplica a ese sistema todavía — B25), así que no redirigimos ahí.
    if (!isProcesses) setActiveTab('raw-material');
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
            {structure && (
              <CostingSystemBadge
                structureId={id}
                costingSystem={structure.costingSystem ?? 'ORDERS'}
                readOnly={readOnly}
              />
            )}
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
          {/* El import de Excel extrae MP/MOD/CIP clásicos (rawMaterialConfig /
              directLaborConfig / indirectCostConfig): en Procesos no hay ningún
              servicio que lea esos campos, así que hoy no aplica (B25). Se
              oculta en vez de dejarla habilitada para no prometer algo que no
              hace nada. */}
          {!isProcesses && (
            <Button
              variant="secondary"
              size="sm"
              onClick={triggerImport}
              loading={importExcel.isPending}
              disabled={readOnly}
              title={readOnly ? 'El período está cerrado: sus números están congelados.' : undefined}
            >
              <Upload className="size-4" /> Importar desde Excel
            </Button>
          )}
          {/* El Excel reproduce el estado de costos de Órdenes: en Procesos no
              aplica y el servidor lo rechaza. Un botón que siempre da error es
              peor que no tenerlo. */}
          {!isProcesses && (
            <Button variant="secondary" size="sm" onClick={runExport} loading={exportExcel.isPending} disabled={!allReady}>
              <Download className="size-4" /> Exportar
            </Button>
          )}
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

      {/* SETUP PREVIO OBLIGATORIO.
          Una estructura de Procesos sin configurar no puede calcular: el backend
          la frena con un 422. Mostrar las pestañas igual dejaría al costista
          cargando datos durante media hora para chocarse con el bloqueo recién
          al apretar Calcular. El wizard va primero y en lugar de todo lo demás. */}
      {needsProcessSetup && (
        <ProcessSetupWizard
          structureId={id}
          onCompleted={() => setActiveTab(defaultTabFor(structure?.costingSystem))}
        />
      )}

      {/* Aviso de progreso */}
      {!needsProcessSetup && !allReady && !readOnly && (
        <div className="mb-4 rounded-xl border border-action/20 bg-action/5 px-4 py-2.5 text-[13px] text-ink">
          {isProcesses
            ? 'Agregá al menos un departamento y abrí un período para poder calcular.'
            : 'Completá las 4 secciones para habilitar el cálculo.'}
        </div>
      )}

      {/* Tab bar — scrollable horizontal menu for systems with many tabs (e.g. Costeo por Procesos) */}
      <div className={cn("relative mb-8 border-b border-line", needsProcessSetup && "hidden")}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden pb-[2px] snap-x snap-mandatory">
          {tabsFor(structure?.costingSystem).map(({ id: tabId, label, icon: Icon, configKey }) => {
            // En Procesos las secciones de Órdenes no existen, así que su tilde
            // no puede depender de ellas: se enciende cuando la pestaña tiene su
            // propio contenido cargado.
            const isDone = isProcesses
              ? (configKey ? processDepartments.length > 0 : !!shown)
              : (configKey ? configured[configKey] : !!shown);
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  'flex shrink-0 snap-start items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all relative',
                  active
                    ? 'text-granate'
                    : 'text-ink-soft hover:text-ink hover:bg-zinc-50/50 rounded-t-xl',
                )}
              >
                <Icon className="size-4" />
                <span className="whitespace-nowrap">{label}</span>
                {isDone && <CheckCircle2 className="size-3.5 text-ok" />}
                {active && (
                  <span className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-granate rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>
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
            calculating={calculate.isPending || processCalculate.isPending}
          />
        </Frozen>
      </div>

      {/* En Procesos el resultado es el informe de costos por departamento, no el
          estado de costos de Órdenes: son dos informes distintos. */}
      {shownTab === 'result' && isProcesses && (
        <ProductionCostReportView
          structureId={id}
          periodId={periodId}
          departments={processDepartments}
          deptId={processDeptId}
          onDeptChange={setProcessDeptId}
          // La marca F04 sale de la mutación del botón de la cabecera, que es el
          // único "Calcular" que quedó. Antes la leía una mutación propia de la
          // pestaña, así que calcular desde arriba tampoco pintaba el aviso.
          incompletitud={processCalculate.data?.results.incompletitud ?? null}
        />
      )}

      {shownTab === 'result' && !isProcesses && (
        <div className="space-y-4">
          {/* T-08 — El aviso va ARRIBA, pegado a los números.
              Antes, si la corrida trazable fallaba, el error quedaba solo dentro
              de la caja del árbol y el costista se quedaba mirando el costo
              unitario, el margen y su badge —calculados por el camino legado, que
              NO aplica la regla de imputación— sin enterarse de nada hasta que
              scrolleara. El caso en que el árbol falla es exactamente el caso en
              que los números no son confiables: el peor momento posible para
              poner el aviso abajo de todo. */}
          {tracedError && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3">
              <p className="text-[13px] font-semibold text-danger">
                Los números de abajo no se pudieron verificar
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink">
                El cálculo se hizo, pero la corrida que arma el árbol de derivación no terminó, así
                que no se pudo comprobar si hay datos sin imputar a un período. Tomá el costo
                unitario y el margen con reserva hasta volver a calcular.
              </p>
              <p className="mt-1.5 text-[12px] text-ink-soft">{tracedError}</p>
              <button
                type="button"
                onClick={() => void runCalculate()}
                disabled={calculate.isPending || calculateTraced.isPending}
                className="mt-2 rounded-md bg-danger px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Volver a calcular
              </button>
            </div>
          )}
          {incompletitud?.incompleto && (
            <IncompleteNotice
              datos={incompletitud.datosPendientes}
              motivos={incompletitud.motivos}
              periodoCosto={structure?.period}
              structureId={id}
              doneTitle="Volvé a calcular para ver el resultado limpio."
              doneLabel="Volver a calcular"
              onDone={() => void runCalculate()}
              busy={calculate.isPending || calculateTraced.isPending || processCalculate.isPending}
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
            ? <ResultTab result={shown.result} companyId={structure?.companyId} period={structure?.period} incompleto={incompletitud?.incompleto} runId={effectiveRunId} structureId={id} corridaTrazableFallo={!!tracedError} />
            : <EmptyResult />}
        </div>
      )}

      {shownTab === 'simulate' && (
        <ScenarioSimulator structureId={id} currentResult={shown?.result || null} />
      )}

      {shownTab === 'comparison' && (
        <PeriodComparison structureId={id} />
      )}

      {shownTab === 'history' && (
        <HistoryTab structureId={id} />
      )}

      {/* Costeo por Procesos (U04-U08). */}
      {shownTab === 'process-departments' && (
        <DepartmentsTab structureId={id} readOnly={readOnly} />
      )}

      {shownTab === 'process-pending' && (
        <PendingDocumentsTab structureId={id} />
      )}

      {shownTab === 'process-movement' && (
        <UnitMovementTab
          structureId={id}
          periodId={periodId}
          departments={processDepartments}
          deptId={processDeptId}
          onDeptChange={setProcessDeptId}
          readOnly={readOnly}
        />
      )}

      {shownTab === 'process-equivalent' && (
        <EquivalentProductionTab
          structureId={id}
          periodId={periodId}
          departments={processDepartments}
          deptId={processDeptId}
          onDeptChange={setProcessDeptId}
        />
      )}

      {shownTab === 'process-joint-costs' && (
        <JointCostsTab
          structureId={id}
          periodId={periodId}
          departments={processDepartments}
          deptId={processDeptId}
          onDeptChange={setProcessDeptId}
          readOnly={readOnly}
        />
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
