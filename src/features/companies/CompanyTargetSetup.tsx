import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ArrowLeft, Check, Percent, Target } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useCompany } from "./company-hooks";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export function CompanyTargetSetup() {
  const { id } = useParams({ from: '/companies/$id/setup' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Comparte hook y query key con CompanyDetailPage (useCompany en
  // company-hooks.ts) a propósito: antes esta pantalla tenía su propio fetch
  // ad-hoc con ["companies", id] que desempaquetaba res.data en vez de
  // res.data.data, y esa forma corrupta quedaba cacheada bajo la misma key —
  // la ficha del cliente mostraba "Cliente" en vez del nombre real hasta
  // recargar la página. Reusar el hook elimina la duplicación que causaba el bug.
  const { data: company } = useCompany(id);

  const { data: targetBudget } = useQuery({
    queryKey: ["companies", id, "target-budget"],
    queryFn: () => api.get(`/companies/${id}/target-budget`).then(res => res.data),
  });

  const industry = company?.industry;
  const { data: industryBenchmark } = useQuery({
    queryKey: ["benchmarks", industry],
    queryFn: () => api.get(`/benchmarks/${encodeURIComponent(industry ?? '')}`).then(res => res.data).catch(() => null),
    enabled: !!industry && industry !== 'Otro',
  });

  const { data: generalBenchmark } = useQuery({
    queryKey: ["benchmarks", "general"],
    queryFn: () => api.get(`/benchmarks/general`).then(res => res.data).catch(() => null),
    enabled: !industryBenchmark?.data,
  });

  const benchmark = industryBenchmark?.data || generalBenchmark?.data;

  const [rawMaterialsPct, setRawMaterialsPct] = useState<number>(0);
  const [laborPct, setLaborPct] = useState<number>(0);
  const [cifPct, setCifPct] = useState<number>(0);
  const [marginPct, setMarginPct] = useState<number>(0);

  useEffect(() => {
    if (targetBudget?.data) {
      setRawMaterialsPct(targetBudget.data.rawMaterialsPct || 0);
      setLaborPct(targetBudget.data.laborPct || 0);
      setCifPct(targetBudget.data.cifPct || 0);
      setMarginPct(targetBudget.data.marginPct || 0);
    }
  }, [targetBudget]);

  const total = rawMaterialsPct + laborPct + cifPct + marginPct;
  const isPerfect = Math.abs(total - 100) < 0.1;

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/companies/${id}/target-budget`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", id, "target-budget"] });
      toast.success("Estructura objetivo guardada");
      navigate({ to: "/companies/$id", params: { id } });
    },
    onError: () => toast.error("Error al guardar la estructura"),
  });

  const handleSave = () => {
    if (!isPerfect) {
      toast.error("La suma debe ser 100%");
      return;
    }
    updateMutation.mutate({
      rawMaterialsPct,
      laborPct,
      cifPct,
      marginPct,
    });
  };

  useKeyboardShortcut({ key: 's', ctrlKey: true }, () => {
    if (isPerfect && !updateMutation.isPending) {
      handleSave();
    } else if (!isPerfect) {
      toast.error("La suma debe ser 100% para guardar");
    }
  });

  const marketReference = industryBenchmark?.data 
    ? `Promedio en ${industry}`
    : "Promedio General PyME";

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate({ to: "/companies/$id", params: { id } })}
          className="size-10 p-0 rounded-xl bg-white border border-line hover:border-granate/30 hover:bg-zinc-50"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink-deep">
            Configuración de Estructura Objetivo
          </h1>
          <p className="text-[14px] text-ink-soft">
            Definamos los márgenes ideales para <strong className="text-ink">{company?.name || "tu cliente"}</strong>.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-line overflow-hidden shadow-[0_10px_30px_rgba(74,21,27,0.015)]">
            <div className="bg-gradient-to-r from-granate/5 to-transparent px-6 py-4 border-b border-line">
              <h2 className="text-[16px] font-extrabold text-granate-deep flex items-center gap-2">
                <Target className="size-5" /> Distribución de Ingresos
              </h2>
              <p className="text-sm text-ink-soft mt-1">
                ¿Cómo querés repartir cada $100 de ventas? Esto se usará para medir desviaciones.
              </p>
            </div>
            
            <CardBody className="p-6 space-y-8">
              {/* Sliders Area */}
              <div className="space-y-6">
                
                <SliderRow
                  label="Materia Prima / Insumos"
                  value={rawMaterialsPct}
                  onChange={setRawMaterialsPct}
                  accentHex="#f59e0b"
                  reference={benchmark ? `${benchmark.rawMaterialsPct}%` : "..."}
                />

                <SliderRow
                  label="Mano de Obra"
                  value={laborPct}
                  onChange={setLaborPct}
                  accentHex="#3b82f6"
                  reference={benchmark ? `${benchmark.laborPct}%` : "..."}
                />

                <SliderRow
                  label="Costos Indirectos (CIF)"
                  value={cifPct}
                  onChange={setCifPct}
                  accentHex="#a855f7"
                  reference={benchmark ? `${benchmark.cifPct}%` : "..."}
                />

                <SliderRow
                  label="Margen de Ganancia Neto"
                  value={marginPct}
                  onChange={setMarginPct}
                  accentHex="#10b981"
                  reference={benchmark ? `${benchmark.marginPct}%` : "..."}
                />

              </div>

              {/* Total Summary */}
              <div className="pt-6 border-t border-line/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-soft">Total Distribuido:</span>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[24px] font-extrabold",
                      isPerfect ? "text-emerald-600" : (total > 100 ? "text-red-500" : "text-amber-500")
                    )}>
                      {total}%
                    </span>
                    {isPerfect && (
                      <div className="bg-emerald-100 text-emerald-700 p-1 rounded-full">
                        <Check className="size-4" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress bar visual */}
                <div className="h-4 w-full bg-zinc-100 rounded-full mt-4 flex overflow-hidden">
                  <div style={{ width: `${rawMaterialsPct}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                  <div style={{ width: `${laborPct}%` }} className="h-full bg-blue-500 transition-all duration-300" />
                  <div style={{ width: `${cifPct}%` }} className="h-full bg-purple-500 transition-all duration-300" />
                  <div style={{ width: `${marginPct}%` }} className="h-full bg-emerald-500 transition-all duration-300" />
                </div>
                {!isPerfect && (
                  <p className="text-xs font-medium mt-2 text-right text-red-500">
                    {total > 100 ? "Te pasaste del 100%" : "Falta asignar porcentaje"}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate({ to: "/companies/$id", params: { id } })}>
              Saltar por ahora
            </Button>
            <Button 
              onClick={handleSave} 
              loading={updateMutation.isPending} 
              disabled={!isPerfect}
              className="gap-2"
            >
              <Check className="size-4" /> Guardar y Continuar
            </Button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="border border-line bg-zinc-50/50">
            <CardBody className="p-5">
              <h3 className="text-sm font-extrabold text-granate-deep uppercase tracking-wider mb-2">
                Benchmarking
              </h3>
              <p className="text-sm text-ink-soft mb-4">
                Tu referencia de mercado es: <strong className="text-ink">{marketReference}</strong>. 
                Los valores sugeridos al lado de cada ítem representan este estándar.
              </p>
              <div className="bg-white rounded-lg border border-line p-3 flex items-start gap-3">
                <div className="bg-granate-tenue text-granate p-2 rounded-lg shrink-0">
                  <Percent className="size-4" />
                </div>
                <p className="text-xs text-ink leading-relaxed">
                  Usaremos estos objetivos para comparar tu ejecución real mensual y emitir alertas si los márgenes se desvían de tu plan ideal.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  accentHex,
  reference
}: {
  label: string,
  value: number,
  onChange: (v: number) => void,
  /**
   * Hex fijo, no una clase Tailwind dinámica: `text-${x}` construido en
   * runtime (el patrón anterior) no lo detecta el escaneo estático de
   * Tailwind v4, así que la clase nunca se generaba — CIF y Margen quedaban
   * negros en vez de morado/verde. El hex evita depender del JIT acá.
   */
  accentHex: string,
  reference: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[13px] font-bold text-ink">{label}</label>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-medium text-ink-soft bg-zinc-100 px-2 py-0.5 rounded-full border border-line">
            Ref: {reference}
          </span>
          <div className="flex items-center gap-1">
            <input 
              type="number" 
              value={value || ""} 
              onChange={e => onChange(Number(e.target.value) || 0)}
              className="w-14 text-right rounded border border-line px-1 py-0.5 text-sm font-semibold focus:border-granate focus:ring-1 focus:ring-granate outline-none"
            />
            <span className="text-sm font-semibold text-ink-soft">%</span>
          </div>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        // El fill (izquierda del thumb = "ocupado") se arma a mano con un
        // gradient: appearance-none apaga el relleno nativo del navegador.
        // color: accentHex también alimenta currentColor, así el borde del
        // thumb (index.css) hace juego con el fill sin una segunda variable.
        style={{
          color: accentHex,
          background: `linear-gradient(to right, currentColor ${value}%, var(--color-line) ${value}%)`,
        }}
        className="w-full rounded-full cursor-pointer"
      />
    </div>
  );
}
