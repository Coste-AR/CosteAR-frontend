import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { Edit2, Trash2, ArrowLeft, Users, FileSpreadsheet, BookOpen, History, Tags } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCompany, useCostStructures, useDeleteCompany } from './company-hooks';
import { apiErrorMessage } from '@/lib/api';
import { TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { CompanyInfoForm } from './components/CompanyInfoForm';
import { AiSuggesterSection } from './components/AiSuggesterSection';
import { CompanyStructuresList } from './components/CompanyStructuresList';
import { CompanyLedgerTab } from './components/CompanyLedgerTab';
import { CompanyHistoryTab } from './components/CompanyHistoryTab';
import { CompanyOperatorsTab } from './components/CompanyOperatorsTab';
import { DeviationWidget } from './components/DeviationWidget';
import { BenchmarkRadarWidget } from './components/BenchmarkRadarWidget';
import { CostBehaviorClassificationTab } from './components/CostBehaviorClassificationTab';
import toast from 'react-hot-toast';
import { useRubroModules } from './rubro-configuration-hooks';
import { isCompanyConfigurationComplete, useCostParameters } from './cost-parameters-hooks';

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const navigate = useNavigate();
  const { data: company } = useCompany(id);
  const { data: structures, isLoading: structuresLoading } = useCostStructures(id);
  const modules = useRubroModules(id);
  const parameters = useCostParameters(id);
  const delCompany = useDeleteCompany();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'structures' | 'classification' | 'ledger' | 'history' | 'operators'>('structures');
  const configurationLoaded = modules.isSuccess && parameters.isSuccess;
  const configurationComplete = configurationLoaded
    && isCompanyConfigurationComplete(modules.data, parameters.data);

  useEffect(() => {
    if (configurationLoaded && !configurationComplete) {
      navigate({ to: '/companies/$id/setup', params: { id }, replace: true });
    }
  }, [configurationComplete, configurationLoaded, id, navigate]);

  const handleDeleteCompany = () => {
    setShowDeleteConfirm(true);
  };

  if (!configurationComplete) {
    return (
      <AppShell>
        {modules.isError || parameters.isError ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center">
            <p role="alert" className="text-sm font-semibold text-danger">
              No pudimos verificar si la configuración está completa. {apiErrorMessage(modules.error ?? parameters.error)}
            </p>
            <button
              type="button"
              className="mt-4 text-sm font-bold text-granate underline"
              onClick={() => void Promise.all([modules.refetch(), parameters.refetch()])}
            >
              Volver a intentar
            </button>
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center text-sm text-ink-soft" role="status">
            {configurationLoaded ? 'Abriendo la configuración obligatoria…' : 'Revisando la configuración…'}
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-zinc-950">{company?.name ?? 'Cliente'}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                title="Editar Cliente"
              >
                <Edit2 className="size-4" />
              </button>
              <button
                onClick={handleDeleteCompany}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Eliminar Cliente"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          {company?.industry && <p className="mt-1 text-sm text-zinc-500">{company.industry}</p>}
        </div>
      </div>

      {/* Asistente de Configuración Inicial (IA) — solo tiene sentido antes de
          que exista la primera estructura: una vez armada, el costista ya
          sabe cómo se hace y el botón flotante es puro ruido. Se espera a que
          la consulta resuelva (!structuresLoading) para no ocultarlo/mostrarlo
          de golpe mientras structures todavía es undefined. `attention` pulsa
          el botón en vez de abrirlo solo — abrir lo decide el costista. */}
      {!structuresLoading && (structures?.length ?? 0) === 0 && (
        <AiSuggesterSection companyName={company?.name ?? ''} attention />
      )}

      {/* Monitor de Desvíos */}
      {id && <DeviationWidget companyId={id} />}

      {/* Radar Competitivo */}
      {id && <BenchmarkRadarWidget companyId={id} />}

      <TabList className="mb-6">
        {[
          { id: 'structures', label: 'Estructuras de Costos', icon: FileSpreadsheet },
          { id: 'classification', label: 'Fijo / variable', icon: Tags },
          { id: 'ledger', label: 'Libro de Costos', icon: BookOpen },
          { id: 'history', label: 'Historial', icon: History },
          { id: 'operators', label: 'Personal Autorizado', icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <Tab
              key={t.id}
              active={activeTab === t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Tab>
          );
        })}
      </TabList>

      <TabPanel>
        {activeTab === 'structures' && (
          <CompanyStructuresList companyId={id} periodicity={company?.periodicity} structures={structures ?? []} />
        )}
        {activeTab === 'classification' && <CostBehaviorClassificationTab companyId={id} />}
        {activeTab === 'ledger' && (
          <CompanyLedgerTab companyId={id} companyName={company?.name ?? 'Cliente'} />
        )}
        {activeTab === 'history' && <CompanyHistoryTab companyId={id} />}
        {activeTab === 'operators' && <CompanyOperatorsTab companyId={id} />}
      </TabPanel>

      {/* Modals */}
      {showEditModal && company && (
        <CompanyInfoForm company={company} onClose={() => setShowEditModal(false)} />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar cliente"
        message={`¿Estás seguro de eliminar a ${company?.name}? Esta acción eliminará permanentemente la empresa, todas sus estructuras de costos, libro de costos, firmas y operadores vinculados.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          try {
            await delCompany.mutateAsync(id);
            navigate({ to: '/companies' });
          } catch (e) {
            toast.error('Error al eliminar la empresa: ' + apiErrorMessage(e));
          }
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AppShell>
  );
}
