import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import {
  Plus,
  Building2,
  ChevronRight,
  Trash2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
} from "./company-hooks";
import { apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PERIODICITY_OPTIONS, type Periodicity } from "@/lib/types";
import { useDictation } from "@/lib/use-dictation";
import toast from 'react-hot-toast';
const PREDEFINED_INDUSTRIES = [
  'Gastronomía',
  'Comercio Minorista (Retail)',
  'Fábrica / Manufactura',
  'Construcción',
  'Servicios Profesionales',
  'Logística y Transporte',
  'Agropecuario',
  'Otro'
];

const INDUSTRY_CLASSES: Record<string, string> = {
  Agropecuaria: "bg-amber-50 text-amber-700 border-amber-200/50",
  Manufactura: "bg-granate-tenue text-granate border-granate/10",
  Transporte: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
  Construcción: "bg-orange-50 text-orange-700 border-orange-200/50",
  Comercio: "bg-sky-50 text-sky-700 border-sky-200/50",
  Servicios: "bg-zinc-100 text-zinc-700 border-zinc-200/60",
  Logística: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  Gastronomía: "bg-rose-50 text-rose-700 border-rose-200/50",
  Salud: "bg-teal-50 text-teal-700 border-teal-200/50",
  Tecnología: "bg-violet-50 text-violet-700 border-violet-200/50",
};

function industryChip(industry: string | null | undefined): string {
  if (!industry) return "bg-zinc-50 text-zinc-400 border-zinc-100";
  for (const [key, classes] of Object.entries(INDUSTRY_CLASSES)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return classes;
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200/60";
}

function companyHealth(structCount: number): {
  label: string;
  color: string;
  dot: string;
} {
  if (structCount === 0)
    return { label: "Sin datos", color: "text-zinc-400", dot: "bg-zinc-300" };
  if (structCount <= 1)
    return { label: "Inicial", color: "text-zinc-500", dot: "bg-zinc-400" };
  if (structCount <= 3)
    return {
      label: "En progreso",
      color: "text-granate",
      dot: "bg-action-soft animate-pulse",
    };
  return { label: "Activo", color: "text-emerald-700", dot: "bg-emerald-500" };
}

export function CompaniesPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  /**
   * Abrir el formulario y LLEVARLO al viewport.
   *
   * El botón vive en el encabezado y el formulario se monta abajo: con la lista
   * de clientes larga, se abría fuera de pantalla y parecía que el botón no
   * hacía nada. El scroll espera un frame porque el nodo todavía no existe en el
   * momento del click.
   */
  const abrirFormulario = () => {
    const abriendo = !showForm;
    setShowForm(abriendo);
    if (!abriendo) return;
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string, name: string } | null>(null);
  const deleteCompany = useDeleteCompany();

  const handleDelete = (companyId: string, name: string) => {
    setCompanyToDelete({ id: companyId, name });
  };

  const totalStructures = companies.reduce(
    (acc, c) => acc + (c._count?.costStructures ?? 0),
    0,
  );
  const companiesWithData = companies.filter(
    (c) => (c._count?.costStructures ?? 0) > 0,
  ).length;

  return (
    <AppShell wide>
      {/* Hero Section */}
      <div className="mb-10 rounded-[28px] border border-line bg-white p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(74,21,27,0.015)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-action/10 blur-3xl" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1 text-[11px] font-bold text-granate tracking-wide">
              <Building2 className="size-3.5" /> Tu cartera de clientes
            </span>
          </div>
          <h1 className="text-[36px] font-extrabold leading-[1.1] text-granate-deep tracking-tight">
            Gestiona tus PyMEs
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-soft max-w-2xl">
            Monitorea la evolución de costos, auditorías de documentos y
            estructuras de costos de tu cartera. Cada cliente es una oportunidad
            para optimizar operaciones.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-line/60 relative z-10 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-granate-tenue text-granate">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Total de Clientes
              </p>
              <p className="text-[20px] font-extrabold text-granate-deep leading-none mt-1">
                {companies.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Con Estructuras
              </p>
              <p className="text-[20px] font-extrabold text-emerald-700 leading-none mt-1">
                {companiesWithData}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/50">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Estructuras Totales
              </p>
              <p className="text-[20px] font-extrabold text-violet-700 leading-none mt-1">
                {totalStructures}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-extrabold text-granate-deep uppercase tracking-wider">
            {companies.length} cliente{companies.length !== 1 ? "s" : ""} en tu
            cartera
          </h2>
        </div>
        <Button onClick={abrirFormulario} className="gap-2">
          <Plus className="size-4" /> Nuevo cliente
        </Button>
      </div>

      {showForm && (
        <div ref={formRef}>
          <NewCompanyForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-3 p-4 border border-line rounded-xl bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-14 sm:pl-0 sm:shrink-0 sm:justify-end">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="size-5 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !companies?.length ? (
        <Card className="border border-line">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-50 border border-line text-granate">
              <AlertCircle className="size-7" />
            </div>
            <div>
              <p className="font-semibold text-ink">Sin clientes registrados</p>
              <p className="text-sm text-ink-soft mt-1">
                Comenzá a agregar PyMEs a tu cartera
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus className="size-4" /> Agregar primer cliente
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3">
            {companies.map((c) => {
              const health = companyHealth(c._count?.costStructures ?? 0);
              return (
                <Link
                  key={c.id}
                  to="/companies/$id"
                  params={{ id: c.id }}
                  className="group relative flex flex-col gap-3 p-4 border border-line rounded-xl bg-white hover:border-granate/30 hover:bg-zinc-50/50 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  {/* Left: Icon + Info */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-granate-tenue text-granate border border-granate/10 group-hover:scale-105 transition-transform duration-300">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink group-hover:text-granate transition-colors">
                        {c.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {c.industry && (
                          <span
                            className={cn(
                              "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                              industryChip(c.industry),
                            )}
                          >
                            {c.industry}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                            health.color,
                          )}
                        >
                          <span
                            className={cn("size-1.5 rounded-full", health.dot)}
                          />
                          {health.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-between gap-2 pl-14 sm:pl-0 sm:shrink-0 sm:justify-end">
                    <span className="text-xs text-zinc-400 font-medium">
                      {c._count?.costStructures ?? 0} estructura
                      {(c._count?.costStructures ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(c.id, c.name);
                        }}
                        className="rounded-lg p-1.5 text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 duration-200"
                        title="Eliminar Cliente"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <ChevronRight className="size-5 text-zinc-300 group-hover:text-granate transition-all duration-200" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={companyToDelete !== null}
        title="Eliminar cliente"
        message={`¿Estás seguro de eliminar a ${companyToDelete?.name}? Esta acción eliminará permanentemente la empresa, todas sus estructuras de costos, libro de costos, firmas y operadores vinculados.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          if (companyToDelete) {
            try {
              await deleteCompany.mutateAsync(companyToDelete.id);
            } catch (e) {
              toast.error("Error al eliminar la empresa: " + apiErrorMessage(e));
            }
          }
          setCompanyToDelete(null);
        }}
        onCancel={() => setCompanyToDelete(null)}
      />
    </AppShell>
  );
}

function NewCompanyForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCompany();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<{
    name: string;
    industry?: string;
    customIndustry?: string;
    cuit?: string;
    description?: string;
    // '' = todavía sin elegir. No se puede cambiar una vez que la empresa
    // tenga períodos cargados, así que —igual que Rubro— no debe quedar
    // fijado en Mensual sin que el costista lo haya elegido a propósito.
    periodicity: Periodicity | '';
  }>({ defaultValues: { periodicity: '' } });

  const selectedIndustry = watch("industry");

  const dictado = useDictation((chunk) => {
    const actual = watch("description") ?? "";
    setValue("description", actual.trim() ? `${actual} ${chunk}` : chunk);
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const finalIndustry = values.industry === 'Otro' ? values.customIndustry : values.industry;
      const company = await create.mutateAsync({
        name: values.name,
        industry: finalIndustry || undefined,
        cuit: values.cuit || undefined,
        description: values.description || undefined,
        periodicity: values.periodicity as Periodicity,
      });
      // Redirect to the target budget setup screen
      navigate({ to: "/companies/$id/setup", params: { id: company.id } });
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <div className="mb-8 rounded-[28px] border border-line bg-white p-5 sm:p-8 shadow-[0_10px_30px_rgba(74,21,27,0.015)]">
      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1 text-[11px] font-bold text-granate tracking-wide">
          <Plus className="size-3.5" /> Nuevo cliente
        </div>
        <h2 className="text-[24px] font-extrabold text-granate-deep tracking-tight">
          Agregar PyME a tu cartera
        </h2>
        <p className="text-sm text-ink-soft max-w-2xl">
          Completá los datos básicos de la empresa. Podrás agregar estructuras
          de costos después.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-[13px] font-extrabold text-granate-deep uppercase tracking-wider">
            Datos Básicos
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-2 uppercase tracking-wide">
                Nombre de la Empresa *
              </label>
              <Input
                placeholder="Ej: ABC Metalúrgica"
                {...register("name", { required: true })}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-2 uppercase tracking-wide">
                CUIT
              </label>
              <Input placeholder="20-12345678-6" {...register("cuit")} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-2 uppercase tracking-wide">
              Rubro / Sector Industrial *
            </label>
            <Select
              {...register("industry", { required: true })}
              placeholder="Seleccioná un rubro"
              options={PREDEFINED_INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
            />
            {selectedIndustry === 'Otro' && (
              <Input
                placeholder="Ingresá tu rubro..."
                className="mt-2"
                {...register("customIndustry", { required: true })}
              />
            )}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-2 uppercase tracking-wide">
              Ritmo de Costeo *
            </label>
            <Select
              {...register("periodicity", { required: true })}
              placeholder="Seleccioná un ritmo"
              options={PERIODICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <p className="text-xs text-ink-soft mt-2">
              Cada cuánto esta empresa cierra un período de costos. Define los
              períodos de todas sus estructuras.{" "}
              <strong className="text-ink">
                Se elige ahora y no se puede cambiar
              </strong>{" "}
              una vez que haya períodos cargados.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-line/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-extrabold text-granate-deep uppercase tracking-wider">
                Contexto de la Empresa
              </h3>
              <p className="text-xs text-ink-soft mt-1">
                Descripción de operación, procesos, insumos principales...
              </p>
            </div>
            <button
              type="button"
              onClick={dictado.toggle}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition-all shrink-0",
                dictado.listening
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-granate-tenue text-granate border-granate/20 hover:bg-granate/5",
              )}
            >
              {dictado.listening ? (
                <>
                  <span className="inline-block size-1.5 rounded-full bg-red-600 animate-ping" />
                  {/* Decía "Deteniendo..." MIENTRAS grababa: mentía sobre lo que pasaba. */}
                  Escuchando…
                </>
              ) : (
                <>
                  <span className="text-sm">🎙️</span>
                  Dictar por voz
                </>
              )}
            </button>
          </div>
          <textarea
            {...register("description")}
            placeholder="Ej: Fabrica muebles de madera. Costea por órdenes de producción. Principal insumo: madera de pino y chapa MDF. Producen 50-100 órdenes/mes..."
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink placeholder-zinc-400 focus:border-granate focus:outline-none focus:ring-2 focus:ring-granate/10 min-h-24"
          />
          {dictado.listening && (
            <p className="text-xs text-granate font-medium">
              Hablá tranquilo: podés frenar a pensar, el micrófono no se corta.
            </p>
          )}
          {dictado.error && <p className="text-xs text-danger">{dictado.error}</p>}
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-line/60">
          <Button type="submit" loading={create.isPending}>
            <Plus className="size-4" /> Crear cliente
          </Button>
          <Button onClick={onDone} variant="secondary">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
