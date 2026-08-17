import { useState } from 'react';
import { Activity, ArrowRight, TrendingDown, TrendingUp, Plus, Trash2, Bird } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { useSimulate } from '../cost-structure-hooks';
import type { CalculationResult } from '@/lib/types';

// ── Tipos del simulador de escala de aves ────────────────────────────────────

export interface EscalonCostoFijo {
  id: number;
  aves_desde: number;
  aves_hasta: number;
  costo_fijo: number;
  inversion_requerida: number;
  descripcion: string;
}

export interface ProyeccionAvicola {
  cajones: number;
  rawMaterial: number;
  directLabor: number;
  indirectCosts: number;
  productionCost: number;
  revenue: number;
  resultado: number;
  peEnCajones: number;
  peEnAves: number;
}

/**
 * Proyecta costos e ingresos cuando se cambia la escala de aves.
 *
 * Supuestos:
 * - La materia prima escala proporcionalmente con la producción (variable).
 * - La mano de obra directa es fija en el corto plazo (no contrata galponero extra
 *   por más gallinas en el mismo galpón).
 * - Los costos indirectos son fijos más los escalones que se activen.
 * - El ingreso por cajón es constante (precio de venta no cambia con escala).
 *
 * Se calculan dos proyecciones: una con postura de lote y otra con postura de
 * plantel. El PE se deriva siempre de los inputs del escenario, nunca de un
 * valor guardado.
 */
export function calcularProyeccionAvicola(
  currentResult: CalculationResult,
  avesBase: number,
  avesObjetivo: number,
  posturaFraccion: number,
  posturaBaseFraccion: number,
  escalones: EscalonCostoFijo[],
): ProyeccionAvicola | null {
  const cajonesBase = currentResult.detail.unitCost?.unitsProduced;
  if (!cajonesBase || cajonesBase === 0 || avesBase === 0 || avesObjetivo === 0) return null;

  // Cajones objetivo: escala por aves y ajusta por la diferencia de postura respecto
  // a la postura base (posturaLote). Si se proyecta con la misma postura base, el
  // factor de postura es 1 y solo cambia la cantidad de aves.
  const posturaFactor = posturaBaseFraccion > 0 ? posturaFraccion / posturaBaseFraccion : 1;
  const cajones = cajonesBase * (avesObjetivo / avesBase) * posturaFactor;

  const scale = cajones / cajonesBase;

  // Ingresos actuales → ingreso por cajón
  const revenueActual =
    Number(currentResult.costOfGoodsSold) + Number(currentResult.grossMargin);
  const revenuePorCajon = revenueActual / cajonesBase;

  // Costos escalados
  const rawMaterial = Number(currentResult.rawMaterialConsumed) * scale;
  const directLabor = Number(currentResult.directLaborTotal); // fijo

  // Escalones activos: todos los que inician antes de las aves objetivo
  const escaloneActivos = escalones.filter(
    (e) => e.aves_desde > 0 && avesObjetivo >= e.aves_desde,
  );
  const costoEscalones = escaloneActivos.reduce((sum, e) => sum + e.costo_fijo, 0);
  const indirectCosts = Number(currentResult.indirectCostsApplied) + costoEscalones;

  const productionCost = rawMaterial + directLabor + indirectCosts;
  const revenue = revenuePorCajon * cajones;
  const resultado = revenue - productionCost;

  // Punto de equilibrio: costos fijos / (precio por cajón - costo variable por cajón)
  const costosFijos = directLabor + indirectCosts;
  const variablePorCajon = cajones > 0 ? rawMaterial / cajones : 0;
  const margenPorCajon = revenuePorCajon - variablePorCajon;
  const peEnCajones = margenPorCajon > 0 ? costosFijos / margenPorCajon : Infinity;
  // Invertir la formula de cajones para obtener aves en la postura proyectada
  const peEnAves =
    posturaFraccion > 0 && cajonesBase > 0 && avesBase > 0
      ? peEnCajones * (avesBase / cajonesBase) * (1 / posturaFactor)
      : Infinity;

  return { cajones, rawMaterial, directLabor, indirectCosts, productionCost, revenue, resultado, peEnCajones, peEnAves };
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  structureId: string;
  currentResult: CalculationResult | null;
}

export function ScenarioSimulator({ structureId, currentResult }: Props) {
  const [activeTab, setActiveTab] = useState<'shock' | 'aves'>('shock');

  // ── Shock tab (existente) ─────────────────────────────────────────────────
  const [shocks, setShocks] = useState({
    rawMaterial: 0,
    directLabor: 0,
    indirectCosts: 0,
    sales: 0,
  });
  const simulate = useSimulate(structureId);
  const [projected, setProjected] = useState<CalculationResult | null>(null);

  const handleRun = async () => {
    const payload = {
      rawMaterial: shocks.rawMaterial / 100,
      directLabor: shocks.directLabor / 100,
      indirectCosts: shocks.indirectCosts / 100,
      sales: shocks.sales / 100,
    };
    const res = await simulate.mutateAsync(payload);
    setProjected(res);
  };

  // ── Bird scale tab (nuevo) ────────────────────────────────────────────────
  const [avesBase, setAvesBase] = useState(0);
  const [avesObjetivo, setAvesObjetivo] = useState(0);
  const [posturaLote, setPosturaLote] = useState(94);
  const [posturaPlanteil, setPosturaPlanteil] = useState(88.5);
  const [escalones, setEscalones] = useState<EscalonCostoFijo[]>([]);
  const [nextId, setNextId] = useState(1);
  const [proyLote, setProyLote] = useState<ProyeccionAvicola | null>(null);
  const [proyPlanteil, setProyPlanteil] = useState<ProyeccionAvicola | null>(null);

  const addEscalon = () => {
    setEscalones((prev) => [
      ...prev,
      { id: nextId, aves_desde: 0, aves_hasta: 0, costo_fijo: 0, inversion_requerida: 0, descripcion: '' },
    ]);
    setNextId((n) => n + 1);
  };

  const removeEscalon = (id: number) =>
    setEscalones((prev) => prev.filter((e) => e.id !== id));

  const updateEscalon = (
    id: number,
    field: keyof Omit<EscalonCostoFijo, 'id'>,
    value: string | number,
  ) =>
    setEscalones((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );

  const handleRunBirdScale = () => {
    if (!currentResult) return;
    const base = posturaLote / 100;
    setProyLote(calcularProyeccionAvicola(currentResult, avesBase, avesObjetivo, base, base, escalones));
    setProyPlanteil(
      calcularProyeccionAvicola(
        currentResult,
        avesBase,
        avesObjetivo,
        posturaPlanteil / 100,
        base,
        escalones,
      ),
    );
  };

  // ── Helpers de render ─────────────────────────────────────────────────────
  const getDeltaColor = (curr: number, proj: number, inverse = false) => {
    if (proj === curr) return 'text-ink-soft';
    const diff = proj - curr;
    const isPositive = diff > 0;
    const good = inverse ? !isPositive : isPositive;
    return good ? 'text-ok' : 'text-danger';
  };

  const renderDelta = (curr: number, proj: number, inverse = false) => {
    const color = getDeltaColor(curr, proj, inverse);
    const Icon = proj > curr ? TrendingUp : TrendingDown;
    if (proj === curr) return <span className="text-ink-soft text-xs">-</span>;
    return (
      <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon className="size-3" />
        {proj > curr ? '+' : ''}
        {(((proj - curr) / curr) * 100).toFixed(1)}%
      </span>
    );
  };

  const hasCajonesBase = Boolean(currentResult?.detail.unitCost?.unitsProduced);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* ── Selector de pestaña ──────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-line">
        {(
          [
            { key: 'shock', label: 'Shock de costos', icon: Activity },
            { key: 'aves', label: 'Escala de aves', icon: Bird },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-action text-action'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Shock de costos (existente) ───────────────────────────────────── */}
      {activeTab === 'shock' && (
        <>
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded bg-action/10 text-action">
                <Activity className="size-5" />
              </div>
              <h3 className="font-semibold text-ink">Simulador de Escenarios (Shock Test)</h3>
            </div>
            <p className="mb-6 text-sm text-ink-soft leading-relaxed max-w-3xl">
              Aplicá shocks porcentuales para proyectar cómo impactaría la inflación o aumentos
              de tarifas en tu rentabilidad. Estos cambios se calculan{' '}
              <span className="font-semibold">en memoria</span> y no afectan la estructura
              original.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Materia Prima (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none"
                  value={shocks.rawMaterial}
                  onChange={(e) =>
                    setShocks((s) => ({ ...s, rawMaterial: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Mano de Obra (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none"
                  value={shocks.directLabor}
                  onChange={(e) =>
                    setShocks((s) => ({ ...s, directLabor: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Costos Indirectos (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none"
                  value={shocks.indirectCosts}
                  onChange={(e) =>
                    setShocks((s) => ({ ...s, indirectCosts: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Precio de Venta (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus:border-action focus:outline-none"
                  value={shocks.sales}
                  onChange={(e) =>
                    setShocks((s) => ({ ...s, sales: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-line pt-4">
              <Button variant="primary" onClick={handleRun} loading={simulate.isPending}>
                Ejecutar Simulación
              </Button>
            </div>
          </div>

          {projected && currentResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h4 className="text-sm font-bold text-ink mb-4">Costo de Producción</h4>
                <div className="flex items-center justify-between text-2xl font-mono">
                  <span className="text-ink-soft line-through opacity-70">
                    <Money value={currentResult.productionCost} />
                  </span>
                  <ArrowRight className="size-5 text-line-heavy" />
                  <span className="text-ink">
                    <Money value={projected.productionCost} />
                  </span>
                  {renderDelta(
                    Number(currentResult.productionCost),
                    Number(projected.productionCost),
                    true,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h4 className="text-sm font-bold text-ink mb-4">Margen Bruto (Rentabilidad)</h4>
                <div className="flex items-center justify-between text-2xl font-mono">
                  <span className="text-ink-soft line-through opacity-70">
                    {currentResult.grossMarginPct}%
                  </span>
                  <ArrowRight className="size-5 text-line-heavy" />
                  <span
                    className={getDeltaColor(
                      Number(currentResult.grossMarginPct),
                      Number(projected.grossMarginPct),
                    )}
                  >
                    {projected.grossMarginPct}%
                  </span>
                  {renderDelta(
                    Number(currentResult.grossMarginPct),
                    Number(projected.grossMarginPct),
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Escala de aves (nuevo) ────────────────────────────────────────── */}
      {activeTab === 'aves' && (
        <>
          {!hasCajonesBase && (
            <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-soft">
              Para usar este simulador necesitás un cálculo guardado que incluya la cantidad
              de unidades producidas. Ejecutá el cálculo del período antes de simular.
            </div>
          )}

          {hasCajonesBase && (
            <>
              <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded bg-action/10 text-action">
                    <Bird className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">Simulador de Escala de Aves</h3>
                    <p className="text-xs text-ink-soft">
                      Proyectá costos e ingresos para una cantidad diferente de gallinas. Los
                      números son estimaciones: no afectan la estructura original.
                    </p>
                  </div>
                </div>

                {/* Inputs principales */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
                  <Input
                    label="Aves actuales"
                    type="number"
                    numeric
                    value={avesBase || ''}
                    onChange={(e) => setAvesBase(Number(e.target.value))}
                    hint="Aves del período calculado"
                  />
                  <Input
                    label="Aves objetivo"
                    type="number"
                    numeric
                    value={avesObjetivo || ''}
                    onChange={(e) => setAvesObjetivo(Number(e.target.value))}
                    hint="Escala a proyectar"
                  />
                  <Input
                    label="Postura de lote"
                    type="number"
                    step="0.1"
                    suffix="%"
                    numeric
                    value={posturaLote}
                    onChange={(e) => setPosturaLote(Number(e.target.value))}
                    hint="% postura del lote (ej: 94%)"
                  />
                  <Input
                    label="Postura de plantel"
                    type="number"
                    step="0.1"
                    suffix="%"
                    numeric
                    value={posturaPlanteil}
                    onChange={(e) => setPosturaPlanteil(Number(e.target.value))}
                    hint="% postura del plantel (ej: 88.5%)"
                  />
                </div>

                {/* Escalones de costo fijo */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Escalones de costo fijo</p>
                      <p className="text-xs text-ink-soft">
                        Costos fijos adicionales que se activan al superar cierta cantidad de
                        aves (nuevo galpón, personal extra, etc.)
                      </p>
                    </div>
                    <Button variant="secondary" onClick={addEscalon}>
                      <Plus className="size-4 mr-1" />
                      Agregar escalón
                    </Button>
                  </div>

                  {escalones.length === 0 && (
                    <p className="text-xs text-ink-soft py-2">
                      Sin escalones — los costos fijos actuales se mantienen iguales para
                      cualquier escala de aves.
                    </p>
                  )}

                  {escalones.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs text-ink-soft uppercase tracking-wide">
                            <th className="text-left pb-2 pr-3">Aves desde</th>
                            <th className="text-left pb-2 pr-3">Aves hasta</th>
                            <th className="text-right pb-2 pr-3">Costo fijo adicional</th>
                            <th className="text-right pb-2 pr-3">Inversión requerida</th>
                            <th className="text-left pb-2 pr-3">Descripción</th>
                            <th className="pb-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {escalones.map((e) => (
                            <tr key={e.id}>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm tabular focus:border-action focus:outline-none"
                                  value={e.aves_desde || ''}
                                  onChange={(ev) =>
                                    updateEscalon(e.id, 'aves_desde', Number(ev.target.value))
                                  }
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm tabular focus:border-action focus:outline-none"
                                  value={e.aves_hasta || ''}
                                  onChange={(ev) =>
                                    updateEscalon(e.id, 'aves_hasta', Number(ev.target.value))
                                  }
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  className="w-36 rounded border border-line bg-surface px-2 py-1 text-right text-sm tabular focus:border-action focus:outline-none"
                                  value={e.costo_fijo || ''}
                                  onChange={(ev) =>
                                    updateEscalon(e.id, 'costo_fijo', Number(ev.target.value))
                                  }
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  className="w-36 rounded border border-line bg-surface px-2 py-1 text-right text-sm tabular focus:border-action focus:outline-none"
                                  value={e.inversion_requerida || ''}
                                  onChange={(ev) =>
                                    updateEscalon(
                                      e.id,
                                      'inversion_requerida',
                                      Number(ev.target.value),
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  className="w-full min-w-40 rounded border border-line bg-surface px-2 py-1 text-sm focus:border-action focus:outline-none"
                                  value={e.descripcion}
                                  placeholder="ej: galpón nuevo, supervisor"
                                  onChange={(ev) =>
                                    updateEscalon(e.id, 'descripcion', ev.target.value)
                                  }
                                />
                              </td>
                              <td className="py-2">
                                <button
                                  onClick={() => removeEscalon(e.id)}
                                  className="text-ink-soft hover:text-danger transition-colors"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-line pt-4">
                  <Button
                    variant="primary"
                    onClick={handleRunBirdScale}
                    disabled={avesBase === 0 || avesObjetivo === 0}
                  >
                    Proyectar escenario
                  </Button>
                </div>
              </div>

              {/* Resultados de la proyección */}
              {(proyLote || proyPlanteil) && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
                  <h4 className="font-semibold text-ink">
                    Proyección para{' '}
                    <span className="text-action">
                      {avesObjetivo.toLocaleString('es-AR')} aves
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: `Postura de lote (${posturaLote}%)`, proy: proyLote },
                      { label: `Postura de plantel (${posturaPlanteil}%)`, proy: proyPlanteil },
                    ].map(({ label, proy }) => (
                      <div key={label} className="rounded-xl border border-line bg-surface p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-4">
                          {label}
                        </p>

                        {!proy && (
                          <p className="text-sm text-ink-soft">
                            Datos insuficientes para proyectar.
                          </p>
                        )}

                        {proy && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline text-sm">
                              <span className="text-ink-soft">Cajones proyectados</span>
                              <span className="font-mono tabular font-semibold text-ink">
                                {Math.round(proy.cajones).toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                              <span className="text-ink-soft">Materia prima</span>
                              <span className="font-mono tabular text-ink">
                                <Money value={proy.rawMaterial} />
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                              <span className="text-ink-soft">Mano de obra</span>
                              <span className="font-mono tabular text-ink">
                                <Money value={proy.directLabor} />
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                              <span className="text-ink-soft">Costos indirectos</span>
                              <span className="font-mono tabular text-ink">
                                <Money value={proy.indirectCosts} />
                              </span>
                            </div>
                            <div className="border-t border-line pt-2 flex justify-between items-baseline text-sm">
                              <span className="font-semibold text-ink">Costo total</span>
                              <span className="font-mono tabular font-semibold text-ink">
                                <Money value={proy.productionCost} />
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                              <span className="font-semibold text-ink">Ingresos</span>
                              <span className="font-mono tabular font-semibold text-ink">
                                <Money value={proy.revenue} />
                              </span>
                            </div>
                            <div
                              className={`flex justify-between items-baseline text-base font-bold pt-1 ${proy.resultado >= 0 ? 'text-ok' : 'text-danger'}`}
                            >
                              <span>Resultado neto</span>
                              <span className="font-mono tabular">
                                <Money value={proy.resultado} />
                              </span>
                            </div>

                            {/* Punto de equilibrio */}
                            <div className="mt-4 rounded-lg bg-surface-raised p-3 border border-line">
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
                                Punto de equilibrio
                              </p>
                              {isFinite(proy.peEnCajones) ? (
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-ink-soft">En cajones</span>
                                    <span className="font-mono tabular font-semibold text-ink">
                                      {Math.ceil(proy.peEnCajones).toLocaleString('es-AR')} caj.
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-ink-soft">En aves</span>
                                    <span className="font-mono tabular font-semibold text-ink">
                                      {Math.ceil(proy.peEnAves).toLocaleString('es-AR')} aves
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-danger">
                                  El margen por cajón es negativo — el PE no es alcanzable con
                                  este precio de venta.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Escalones activos en este escenario */}
                  {escalones.filter((e) => e.aves_desde > 0 && avesObjetivo >= e.aves_desde)
                    .length > 0 && (
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
                        Escalones activos en este escenario
                      </p>
                      <ul className="space-y-1">
                        {escalones
                          .filter((e) => e.aves_desde > 0 && avesObjetivo >= e.aves_desde)
                          .map((e) => (
                            <li
                              key={e.id}
                              className="flex justify-between text-sm text-ink"
                            >
                              <span>{e.descripcion || `Desde ${e.aves_desde.toLocaleString('es-AR')} aves`}</span>
                              <span className="font-mono tabular font-semibold">
                                <Money value={e.costo_fijo} />
                                {e.inversion_requerida > 0 && (
                                  <span className="ml-2 text-xs text-ink-soft">
                                    (inv. <Money value={e.inversion_requerida} />)
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
