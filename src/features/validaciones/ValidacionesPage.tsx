import { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  ClipboardCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  usePendingEntries,
  useReviewEntry,
  useAccuracyStats,
  useBulkApprove,
  type DataEntry,
} from "./validaciones-hooks";
import { ReviewValidationModal } from "./components/ReviewValidationModal";
import { CompanyValidationsSection } from "./components/CompanyValidationsSection";
import { VaultProposalsSection } from "./components/VaultProposalsSection";
import { useAuthStore } from "@/stores/auth-store";
import { TabList, Tab } from "@/components/ui/Tabs";

export function ValidacionesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<"data" | "vault">("data");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingEntries(page);
  const { data: accuracy } = useAccuracyStats();
  const review = useReviewEntry();
  const bulkApprove = useBulkApprove();
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const confidentCount = (data?.items ?? []).filter(
    (e) =>
      e.classificationAudits?.[0] && !e.classificationAudits[0].requiresReview,
  ).length;

  const handleBulkApprove = async () => {
    const res = await bulkApprove.mutateAsync(undefined);
    setBulkMsg(
      res.approved > 0
        ? `Aprobaste ${res.approved} ${res.approved === 1 ? "entrada" : "entradas"} de confianza alta. ${res.skipped > 0 ? `Quedan ${res.skipped} para revisar a mano.` : ""}`
        : "No había entradas de confianza alta para aprobar en bloque.",
    );
    // Igual que en la revisión individual: aprobar no garantiza que el dato
    // se haya aplicado a la estructura (Costeo por Procesos, período
    // cerrado). En bloque es más fácil no darse cuenta — se aprueban varias
    // de una y el mensaje de éxito de arriba tapaba cualquier problema.
    if (res.populationWarnings > 0) {
      toast(
        `${res.populationWarnings} de las aprobadas no se pudo aplicar automáticamente a su estructura — revisá /admin/system-alerts o el detalle de cada una.`,
        { icon: "⚠️", duration: 10000 },
      );
    }
  };

  const [reviewing, setReviewing] = useState<{
    entry: DataEntry;
    action: "APPROVED" | "REJECTED" | "CORRECTED";
  } | null>(null);
  const [note, setNote] = useState("");
  const [correctedContent, setCorrectedContent] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [correctedType, setCorrectedType] = useState<string>("");
  const [correctedSection, setCorrectedSection] = useState<string>("");
  const [processDepartmentId, setProcessDepartmentId] = useState<
    string | null
  >(null);

  const handleReview = async (
    status: "APPROVED" | "REJECTED" | "CORRECTED",
  ) => {
    if (!reviewing) return;
    const result = await review.mutateAsync({
      entryId: reviewing.entry.id,
      status,
      note: note || undefined,
      correctedContent: status === "CORRECTED" ? correctedContent : undefined,
      correctedDocumentType:
        status === "CORRECTED" && correctedType ? correctedType : undefined,
      correctedCostSection:
        status === "CORRECTED" && correctedSection
          ? correctedSection
          : undefined,
      processDepartmentId:
        status !== "REJECTED" && processDepartmentId
          ? processDepartmentId
          : undefined,
    });
    // El estado se guardó bien (si no, mutateAsync ya hubiera tirado), pero
    // el dato puede no haberse aplicado a la estructura (ej. Costeo por
    // Procesos, o período cerrado) — antes esto solo se veía revisando
    // alertas de admin. Duración larga: es información que importa leer,
    // no una confirmación de un click.
    if (result.populationWarning) {
      toast(result.populationWarning, { icon: "⚠️", duration: 8000 });
    }
    setReviewing(null);
    setNote("");
    setCorrectedContent("");
    setCorrectedType("");
    setCorrectedSection("");
    setProcessDepartmentId(null);
  };

  const byCompany = (data?.items ?? []).reduce<
    Map<string, { name: string; industry: string | null; entries: DataEntry[] }>
  >((map, entry) => {
    const { id, name, industry } = entry.connection.company;
    if (!map.has(id)) map.set(id, { name, industry, entries: [] });
    map.get(id)!.entries.push(entry);
    return map;
  }, new Map());

  return (
    <AppShell wide>
      {/* Hero Section */}
      <div className="mb-10 rounded-2xl border border-line bg-white p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(74,21,27,0.015)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-action/10 blur-3xl" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1 text-[11px] font-bold text-granate tracking-wide">
              <ClipboardCheck className="size-3.5" /> Valida documentos
            </span>
          </div>
          <h1 className="text-[36px] font-extrabold leading-[1.1] text-granate-deep tracking-tight">
            Revisa documentos
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-soft max-w-2xl">
            Validá los datos cargados por tus clientes. El clasificador te ayuda
            identificando documentos, pero vos eres el experto en el negocio.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-line/60 relative z-10 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-granate-tenue text-granate">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Pendientes
              </p>
              <p className="text-[20px] font-extrabold text-granate-deep leading-none mt-1">
                {data?.total ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Precisión
              </p>
              <p className="text-[20px] font-extrabold text-emerald-700 leading-none mt-1">
                {accuracy?.accuracy != null ? `${accuracy.accuracy}%` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/50">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Empresas
              </p>
              <p className="text-[20px] font-extrabold text-violet-700 leading-none mt-1">
                {byCompany.size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <TabList className="mb-6">
        <Tab active={activeTab === 'data'} onClick={() => setActiveTab('data')}>
          <FileText className="size-4" aria-hidden />
          Validación de Costos
          {data?.total ? (
            <span className="rounded-full bg-granate/10 px-2 py-0.5 text-xs font-semibold text-granate">
              {data.total}
            </span>
          ) : null}
        </Tab>
        {isAdmin && (
          <Tab
            active={activeTab === 'vault'}
            onClick={() => setActiveTab('vault')}
            className={activeTab === 'vault' ? 'text-amber-700' : undefined}
          >
            <BookOpen className="size-4" aria-hidden />
            Aprendizaje (Plantillas IA)
          </Tab>
        )}
      </TabList>

      {activeTab === "vault" && isAdmin ? (
        <VaultProposalsSection />
      ) : (
        <>
          {reviewing && (
            <ReviewValidationModal
              reviewing={reviewing}
              note={note}
              setNote={setNote}
              correctedContent={correctedContent}
              setCorrectedContent={setCorrectedContent}
              correctedType={correctedType}
              setCorrectedType={setCorrectedType}
              correctedSection={correctedSection}
              setCorrectedSection={setCorrectedSection}
              processDepartmentId={processDepartmentId}
              setProcessDepartmentId={setProcessDepartmentId}
              setLightboxSrc={setLightboxSrc}
              onCancel={() => {
                setReviewing(null);
                setProcessDepartmentId(null);
              }}
              onConfirm={() => handleReview(reviewing.action)}
              isPending={review.isPending}
            />
          )}

          {isLoading ? (
            <div className="space-y-4">
              <div className="mb-4 flex gap-2">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          ) : !data?.items.length ? (
            <Card>
              <CardBody className="py-16 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm">
                  <ClipboardCheck className="size-6" />
                </div>
                <p className="text-[13px] font-bold text-ink">Todo al día</p>
                <p className="mt-1 text-[11px] text-ink-soft">
                  No hay datos pendientes de validación.
                </p>
              </CardBody>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="rounded-full border border-action/15 bg-action/10 px-3.5 py-1.5 text-[12px] font-bold text-action shadow-sm">
                  {data.total} pendientes
                </span>
                <span className="text-[12px] font-semibold text-ink-soft">
                  en {byCompany.size}{" "}
                  {byCompany.size === 1 ? "empresa" : "empresas"}
                </span>
                {confidentCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    loading={bulkApprove.isPending}
                    className="w-full sm:ml-auto sm:w-auto bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="size-3.5" /> Aprobar {confidentCount}{" "}
                    de confianza alta
                  </Button>
                )}
              </div>
              {bulkMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[12.5px] font-semibold text-green-800 shadow-sm">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {bulkMsg}
                </div>
              )}

              <div className="space-y-4">
                {[...byCompany.entries()].map(
                  ([companyId, { name, industry, entries }]) => (
                    <CompanyValidationsSection
                      key={companyId}
                      companyName={name}
                      industry={industry}
                      entries={entries}
                      onApprove={(entry) =>
                        setReviewing({ entry, action: "APPROVED" })
                      }
                      onReject={(entry) =>
                        setReviewing({ entry, action: "REJECTED" })
                      }
                      onCorrect={(entry) => {
                        setCorrectedContent(entry.rawContent);
                        setCorrectedType(
                          entry.classificationAudits?.[0]?.documentType ?? "",
                        );
                        setCorrectedSection(
                          entry.classificationAudits?.[0]?.costSection ?? "",
                        );
                        setReviewing({ entry, action: "CORRECTED" });
                      }}
                      onZoom={setLightboxSrc}
                    />
                  ),
                )}
              </div>

              {data.total > 20 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-[12px] font-semibold text-ink-soft">
                    Página {page} de {Math.ceil(data.total / 20)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= Math.ceil(data.total / 20)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {lightboxSrc && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Vista ampliada"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full size-9 text-lg transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
