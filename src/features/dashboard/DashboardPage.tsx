import { Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useCompanies, useCostStructures } from '@/features/companies/company-hooks';
import { useOpenPeriod } from '@/features/cost-structures/period-hooks';
import { useOwnerDashboard } from '@/features/owner-dashboard/owner-dashboard-hooks';
import { HomeActions, HomeBlock, HomeKpis, MacroIndicators, QuickAccesses, type PeriodState, type QuickAccess } from './HomeBlocks';
import { useHomeMacroIndicators, useQuickAccessCatalog, useUserPreferences } from './dashboard-hooks';

export function DashboardPage() {
  const companies = useCompanies();
  const activeCompany = companies.data?.length === 1 ? companies.data[0] : undefined;
  const structures = useCostStructures(activeCompany?.id ?? '');
  const activeStructure = structures.data?.length === 1 ? structures.data[0] : undefined;
  const openPeriod = useOpenPeriod(activeStructure?.id);
  const ownerDashboard = useOwnerDashboard(openPeriod.data?.id);
  const macros = useHomeMacroIndicators(activeCompany?.id);
  const preferences = useUserPreferences(Boolean(activeCompany));
  const catalog = useQuickAccessCatalog(Boolean(activeCompany));

  if (!companies.isLoading && companies.data?.length !== 1) {
    return (
      <AppShell wide>
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold text-granate-deep">Elegí un negocio</h1>
            <p className="mt-2 text-sm text-ink-soft">El home de cada negocio muestra sus propios datos.</p>
            <Link to="/companies" className="mt-5 inline-flex rounded-xl bg-granate px-4 py-2 text-sm font-bold text-white hover:bg-granate-deep">Ver negocios</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const periodState: PeriodState = structures.data && structures.data.length > 1
    ? 'ambiguous-structure'
    : structures.data && structures.data.length === 0
      ? 'no-structure'
      : openPeriod.data === null
        ? 'no-period'
        : 'ready';

  const catalogByKey = new Map((catalog.data ?? []).map((item) => [item.clave, item]));
  const quickAccesses: QuickAccess[] = (preferences.data?.home.accesosRapidos ?? []).map((key) => {
    const item = catalogByKey.get(key);
    return { clave: key, etiqueta: item?.etiqueta ?? key, destino: item?.destino ?? null };
  });
  const loadingStructure = structures.isLoading || (Boolean(activeStructure) && openPeriod.isLoading);
  const kpis = ownerDashboard.data?.rubro?.kpisHome ?? [];

  return (
    <AppShell wide rubro={ownerDashboard.data?.rubro}>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 lg:h-[500px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-action">Inicio</p>
            <h1 className="text-2xl font-extrabold text-granate-deep">Lo importante, de un vistazo</h1>
          </div>
          {periodState === 'no-period' && activeStructure && (
            <Link to="/cost-structures/$id" params={{ id: activeStructure.id }} className="rounded-xl bg-granate px-4 py-2 text-sm font-bold text-white hover:bg-granate-deep">Abrir período</Link>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:grid-rows-2">
          <HomeBlock title="Indicadores macro" eyebrow="Contexto">
            <MacroIndicators indicators={macros.data ?? []} loading={macros.isLoading} />
          </HomeBlock>
          <HomeBlock title="Indicadores del negocio" eyebrow="Decisiones">
            <HomeKpis kpis={kpis} periodState={periodState} loading={loadingStructure || ownerDashboard.isLoading} />
          </HomeBlock>
          <HomeBlock title="Accesos rápidos" eyebrow="Tu selección">
            <QuickAccesses accesses={quickAccesses} loading={preferences.isLoading || catalog.isLoading} />
          </HomeBlock>
          <HomeBlock title="Acciones" eyebrow="Siguiente paso">
            <HomeActions periodId={openPeriod.data?.id} />
          </HomeBlock>
        </div>
      </div>
    </AppShell>
  );
}
