import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Plus, FileSpreadsheet, ChevronRight, CalendarClock } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import {
  CostingSystemSelector,
  type CostingSystem,
} from '@/features/cost-structures/components/shared/CostingSystemSelector';
import { PERIODICITY_LABEL, type Periodicity } from '@/lib/types';
import { apiErrorMessage } from '@/lib/api';

const STATUS: Record<string, { label: string; status: 'ok' | 'warn' | 'idle' }> = {
  DRAFT: { label: 'Borrador', status: 'idle' },
  ACTIVE: { label: 'Activa', status: 'ok' },
  ARCHIVED: { label: 'Archivada', status: 'idle' },
};

export function CompanyStructuresList({ companyId, periodicity, structures }: { companyId: string; periodicity?: Periodicity; structures: any[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Estructuras de costos"
        description="Por producto y período"
        action={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Nueva estructura
          </Button>
        }
      />
      {showForm && (
        <PortalOverlay>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-rise border border-zinc-150">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Nueva estructura</h3>
              <NewStructureForm
                companyId={companyId}
                periodicity={periodicity}
                onDone={() => setShowForm(false)}
              />
            </div>
          </div>
        </PortalOverlay>
      )}
      <CardBody className={structures?.length ? "p-0" : "p-6"}>
        {!structures?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-line bg-zinc-50/50">
            <div className="flex size-14 items-center justify-center rounded-full bg-granate-tenue text-granate shadow-sm mb-5 relative">
              <FileSpreadsheet className="size-6" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Plus className="size-3.5 text-granate" />
              </div>
            </div>
            <h3 className="text-[16px] font-bold text-ink">Empezá a Costear</h3>
            <p className="mt-1.5 text-[13px] text-ink-soft max-w-sm mb-6">
              Creá la primera estructura de costos para este cliente. Podrás importar datos desde Excel o configurar el modelo manualmente.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-2 bg-granate hover:bg-granate-deep text-white shadow-md">
              <Plus className="size-4" /> Crear Estructura
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {structures.map((s) => (
              <li key={s.id}>
                <Link
                  to="/cost-structures/$id"
                  params={{ id: s.id }}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div>
                    <div className="font-medium text-zinc-800">{s.productName}</div>
                    <div className="text-[13px] text-zinc-400">Período {s.period}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={STATUS[s.status]?.status ?? 'idle'}>
                      {STATUS[s.status]?.label ?? s.status}
                    </StatusBadge>
                    <ChevronRight className="size-5 text-zinc-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function NewStructureForm({
  companyId,
  periodicity,
  onDone,
}: {
  companyId: string;
  periodicity?: Periodicity;
  onDone: () => void;
}) {
  const create = useCreateCostStructure(companyId);
  const [error, setError] = useState<string | null>(null);
  // El sistema de costeo define toda la estructura de ahí en adelante y
  // prácticamente no se puede cambiar después (solo mientras no haya cálculos
  // hechos). Arranca sin elegir a propósito: forzar un clic activo evita crear
  // una estructura con el sistema equivocado solo porque nadie tocó el campo.
  const [costingSystem, setCostingSystem] = useState<CostingSystem | null>(null);
  const { register, handleSubmit, formState } = useForm<{ productName: string }>();

  const onSubmit = handleSubmit(async (values) => {
    if (!costingSystem) {
      setError('Elegí un sistema de costeo antes de crear la estructura.');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ productName: values.productName, costingSystem });
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Producto" placeholder="Ej: Mesa de roble" {...register('productName', { required: true })} />

      <CostingSystemSelector
        value={costingSystem}
        onChange={setCostingSystem}
        idPrefix="nueva-estructura-costeo"
        stacked
      />

      <div className="flex items-start gap-2.5 rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
        <CalendarClock className="size-4 shrink-0 text-zinc-400 mt-0.5" />
        <p className="text-[13px] text-zinc-500 leading-relaxed">
          El período de arranque lo pone el sistema: el que corre hoy según el ritmo{' '}
          <strong className="text-zinc-700">
            {periodicity ? PERIODICITY_LABEL[periodicity].toLowerCase() : 'de costeo'}
          </strong>{' '}
          de esta empresa. Después lo cerrás y abrís el siguiente desde la pantalla de
          la estructura.
        </p>
      </div>

      {error && (
        <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={formState.isSubmitting} disabled={!costingSystem}>
          Crear
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
