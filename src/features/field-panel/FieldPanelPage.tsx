import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Bird, Egg, Scale, Wheat } from 'lucide-react';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/lib/api';
import { useCompanies } from '@/features/companies/company-hooks';
import { useRubroModules } from '@/features/companies/rubro-configuration-hooks';
import {
  useCreateDailyProduction,
  useCreateLotLoss,
  useProductiveLots,
  type LotLossInput,
} from './field-panel-hooks';

type ActionKey = 'produccion' | 'plantel' | 'alimento' | 'peso';

const ACTIONS = [
  { key: 'produccion', label: 'Huevos', detail: 'Producción del día', icon: Egg, available: true },
  { key: 'plantel', label: 'Gallinas', detail: 'Bajas del lote', icon: Bird, available: true },
  { key: 'alimento', label: 'Alimento', detail: 'Bachada o entrega', icon: Wheat, available: false },
  { key: 'peso', label: 'Peso', detail: 'Muestreo', icon: Scale, available: false },
] as const;

const LOSS_REASONS: Array<{ value: LotLossInput['motivo']; label: string }> = [
  { value: 'mortalidad', label: 'Mortalidad' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'canibalismo', label: 'Canibalismo' },
  { value: 'faena', label: 'Faena' },
];

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function visibleDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function FieldPanelPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/panel-campo' });
  const companies = useCompanies();
  const requestedCompany = companies.data?.find((item) => item.id === search.companyId);
  const company = requestedCompany ?? (companies.data?.length === 1 ? companies.data[0] : undefined);
  const companyId = company?.id ?? '';
  const modules = useRubroModules(companyId);
  const lots = useProductiveLots(companyId);
  const activeLots = useMemo(
    () => (lots.data ?? []).filter((lot) => lot.activo && (lot.unidadProductiva?.activa ?? true)),
    [lots.data],
  );
  const [chosenLotId, setChosenLotId] = useState('');
  const selectedLotId = activeLots.length === 1 ? (activeLots[0]?.id ?? '') : chosenLotId;
  const selectedLot = activeLots.find((lot) => lot.id === selectedLotId);
  const [action, setAction] = useState<ActionKey | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<LotLossInput['motivo'] | ''>('');
  const date = todayLocal();
  const production = useCreateDailyProduction(selectedLotId);
  const loss = useCreateLotLoss(selectedLotId);

  useEffect(() => {
    if (activeLots.length <= 1 || !activeLots.some((lot) => lot.id === chosenLotId)) {
      setChosenLotId('');
    }
  }, [activeLots, chosenLotId]);

  const activeModuleKeys = new Set(
    (modules.data ?? []).filter((module) => module.estado === 'prendido').map((module) => module.clave),
  );
  const visibleActions = ACTIONS.filter(
    (item) => item.available && activeModuleKeys.has(item.key),
  );

  const resetAction = () => {
    setAction(null);
    setAmount('');
    setReason('');
    production.reset();
    loss.reset();
  };

  const submitProduction = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!selectedLotId || !Number.isFinite(numericAmount) || numericAmount < 0) return;
    try {
      await production.mutateAsync({
        fecha: date,
        variante: 'total_diario',
        unidadesProducidas: numericAmount,
        roturas: 0,
        descartes: 0,
      });
      resetAction();
    } catch {
      // React Query conserva el error para mostrar la salida de reintento.
    }
  };

  const submitLoss = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!selectedLotId || !reason || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    try {
      await loss.mutateAsync({ tipo: 'baja', cantidad: numericAmount, fecha: date, motivo: reason });
      resetAction();
    } catch {
      // React Query conserva el error para mostrar la salida de reintento.
    }
  };

  const loading = companies.isLoading || (!!companyId && (modules.isLoading || lots.isLoading));
  const error = companies.error ?? modules.error ?? lots.error;
  const mutationError = production.error ?? loss.error;

  return (
    <main data-testid="field-panel" className="min-h-screen bg-surface-alt px-4 pb-8 pt-5 text-ink sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3.25rem)] max-w-2xl flex-col">
        <header className="flex items-center justify-between">
          <Link
            to="/dashboard"
            aria-label="Volver al inicio"
            className="flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <CosteARLogo className="h-10 w-11 text-granate" />
          <span className="size-12" aria-hidden="true" />
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center" role="status">Cargando panel…</div>
        ) : error ? (
          <div className="my-auto rounded-2xl border border-line bg-white p-6 text-center">
            <p className="font-bold">No pudimos preparar el panel.</p>
            <p className="mt-2 text-sm text-ink-soft">{apiErrorMessage(error)}</p>
          </div>
        ) : !company ? (
          <section className="my-auto space-y-5 text-center">
            <div>
              <h1 className="text-2xl font-extrabold text-granate-deep">Elegí la empresa</h1>
              <p className="mt-2 text-sm text-ink-soft">La carga va a quedar asociada a esta empresa.</p>
            </div>
            {(companies.data ?? []).length === 0 ? (
              <p className="rounded-2xl border border-line bg-white p-5">Todavía no hay una empresa disponible.</p>
            ) : (
              <div className="grid gap-3">
                {(companies.data ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="min-h-20 rounded-2xl border border-line bg-white px-5 text-left text-lg font-bold shadow-sm active:scale-[0.99]"
                    onClick={() => navigate({ to: '/panel-campo', search: { companyId: item.id } })}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : action === null ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <div className="mb-7 text-center">
              <p className="text-sm font-semibold text-ink-soft">{company.name}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-granate-deep">¿Qué querés cargar?</h1>
              <p className="mt-2 text-sm text-ink-soft">Hoy · {visibleDate(date)}</p>
            </div>

            {activeLots.length > 1 && (
              <label className="mb-5 block text-sm font-bold text-ink">
                Lote activo
                <select
                  value={chosenLotId}
                  onChange={(event) => setChosenLotId(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-granate focus:ring-3 focus:ring-granate/15"
                >
                  <option value="">Elegí un lote</option>
                  {activeLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.referencia}</option>)}
                </select>
              </label>
            )}

            {activeLots.length === 0 ? (
              <p className="rounded-2xl border border-line bg-white p-6 text-center font-semibold">
                No hay un lote activo para cargar hoy.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {visibleActions.map(({ key, label, detail, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    data-testid="field-action"
                    disabled={!selectedLotId}
                    onClick={() => setAction(key)}
                    className="flex min-h-36 flex-col items-center justify-center rounded-3xl border border-line bg-white p-4 text-center shadow-sm transition active:scale-[0.98] disabled:opacity-45 sm:min-h-44"
                  >
                    <Icon className="size-11 text-granate sm:size-13" strokeWidth={1.8} />
                    <span className="mt-3 text-xl font-extrabold uppercase tracking-wide text-granate-deep">{label}</span>
                    <span className="mt-1 text-xs font-semibold text-ink-soft">{detail}</span>
                  </button>
                ))}
              </div>
            )}

            {visibleActions.length === 0 && activeLots.length > 0 && (
              <p className="rounded-2xl border border-line bg-white p-6 text-center font-semibold">
                No hay cargas habilitadas para esta empresa.
              </p>
            )}
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8">
            <button type="button" onClick={resetAction} className="mb-6 inline-flex items-center gap-2 self-start text-sm font-bold text-granate">
              <ArrowLeft className="size-4" /> Volver a las cargas
            </button>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold text-ink-soft">
                {selectedLot?.referencia}{selectedLot?.unidadProductiva ? ` · ${selectedLot.unidadProductiva.referencia}` : ''}
              </p>
              <p className="mt-1 text-sm text-ink-soft">Hoy · {visibleDate(date)}</p>

              {action === 'produccion' && (
                <form className="mt-7 space-y-6" onSubmit={submitProduction}>
                  <label className="block text-lg font-extrabold text-granate-deep">
                    Huevos
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="mt-3 h-24 w-full rounded-2xl border border-line bg-surface-alt px-4 text-center font-mono text-4xl font-bold outline-none focus:border-granate focus:ring-3 focus:ring-granate/15"
                    />
                  </label>
                  <Button type="submit" loading={production.isPending} className="h-14 w-full text-base">Guardar huevos</Button>
                </form>
              )}

              {action === 'plantel' && (
                <form className="mt-7 space-y-6" onSubmit={submitLoss}>
                  <label className="block text-lg font-extrabold text-granate-deep">
                    Gallinas
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="mt-3 h-24 w-full rounded-2xl border border-line bg-surface-alt px-4 text-center font-mono text-4xl font-bold outline-none focus:border-granate focus:ring-3 focus:ring-granate/15"
                    />
                  </label>
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold text-ink">Motivo de la baja</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {LOSS_REASONS.map((item) => (
                        <label key={item.value} className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold has-checked:border-granate has-checked:bg-granate-tenue">
                          <input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Button type="submit" disabled={!reason} loading={loss.isPending} className="h-14 w-full text-base">Guardar gallinas</Button>
                </form>
              )}

              {mutationError && <p className="mt-4 text-center text-sm font-semibold text-ink">No se pudo guardar. Volvé a intentar.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
