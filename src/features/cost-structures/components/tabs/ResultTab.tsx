import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Money, Percent } from '@/components/ui/Money';
import { TraceableValue, toDerivation } from '@/components/ui/TraceableValue';
import { useCalculationTree, useResultadoVigente } from '@/features/cost-structures/trazabilidad-hooks';
import { useCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { buildIdleCapacity, DESTINO_COSTO_OCIOSO_VIGENTE } from '../labor/idle-capacity';
import { IdleCapacityResultLine } from '../labor/IdleCapacityPanel';
import type { DirectLaborConfig } from '@/features/cost-structures/cost-structure-types';
import { ProvisionalBanner } from '../RunHistoryPanel';
import { StatusBadge, marginStatus, isResultTrustworthy } from '@/components/ui/StatusBadge';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { ReconciliationCard } from '../shared/ReconciliationCard';
import type { CalculationResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calculator, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

export function EmptyResult() {
  return (
    <Card>
      <CardBody className="py-20 text-center">
        <Calculator className="mx-auto size-10 text-idle" />
        <p className="mt-3 text-sm text-ink-soft">
          Completá las secciones y presioná <strong>Calcular</strong> para ver el estado de costos.
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * Explicación breve (ES) de por qué el margen no es confiable. Regla #6/#7: sin
 * identificadores internos ni endpoints — solo términos de cátedra.
 */
function untrustworthyReason(
  result: CalculationResult,
  incompleto?: boolean,
  corridaTrazableFallo?: boolean,
): string {
  // T-08 — va PRIMERO: si la corrida trazable no terminó, no sabemos siquiera si
  // hay datos sin imputar. Es un estado peor que el de incompletitud conocida y
  // merece su propio texto, no el de "faltan imputaciones".
  if (corridaTrazableFallo) {
    return 'Estos números se calcularon, pero la corrida que arma el árbol de derivación no terminó. No se pudo verificar si hay datos sin imputar, así que el margen no es confiable. Volvé a calcular.';
  }
  if (incompleto) {
    return 'Resultado incompleto: se calculó con datos sin imputar a un período. El margen no es confiable hasta resolver la imputación.';
  }
  const sinMp = result.rawMaterialConsumed <= 0;
  const sinCip = result.indirectCostsApplied <= 0;
  if (sinMp && sinCip) {
    return 'El cálculo no incluye Materia Prima consumida ni CIP aplicados: el margen no refleja el costo real del producto.';
  }
  if (sinMp) {
    return 'El cálculo no incluye Materia Prima consumida: el margen no refleja el costo real del producto.';
  }
  return 'El cálculo no incluye CIP aplicados: el margen no refleja el costo real del producto.';
}

export function ResultTab({ result, companyId, period, incompleto, runId, structureId, corridaTrazableFallo }: { result: CalculationResult; companyId?: string; period?: string; incompleto?: boolean; runId?: string | null; structureId?: string; corridaTrazableFallo?: boolean }) {
  // ¿Lo que se está mirando ya lo validó alguien? El backend responde con la
  // última validada o, si no hay ninguna, con la última automática marcada.
  const { data: vigente } = useResultadoVigente(structureId ?? '');
  // F08 — un margen sobre un resultado sin MP, sin CIP o marcado incompleto no
  // es confiable: el badge nunca debe decir "sano" sobre un número así.
  // T-08 — si la corrida trazable falló, el resultado se marca no confiable por
  // el MISMO mecanismo de F08, no por uno nuevo. Se reusa el parámetro
  // `incompleto` porque significa exactamente lo mismo para esta decisión: no
  // hay garantía de que el número esté completo.
  const trustworthy = isResultTrustworthy({
    rawMaterialConsumed: result.rawMaterialConsumed,
    indirectCostsApplied: result.indirectCostsApplied,
    incompleto: incompleto || corridaTrazableFallo,
  });
  /**
   * TRAZABILIDAD DEL RESULTADO (U10).
   *
   * Es la pantalla donde más importa: el costista mira estos tres números y el
   * costo unitario, y lo primero que quiere saber es con qué fórmula salieron y
   * qué datos entraron. El árbol de derivación de la corrida ya tiene esa
   * información —una raíz por elemento del costo—; acá se engancha cada fila con
   * su raíz para poder abrirla desde el número mismo, sin ir a otra pestaña.
   *
   * Sin corrida trazada (`runId`) las filas se muestran igual, sin afordance:
   * un número sin respaldo no debe parecer trazable.
   */
  const { data: arbol } = useCalculationTree(runId ?? null);

  /**
   * CAPACIDAD OCIOSA (C-04). Las horas netas productivas son parte de la
   * configuración de Mano de Obra, no del resultado, así que la línea se arma
   * leyendo la estructura (misma query que ya tiene cacheada la pantalla) y los
   * importes del cálculo. Si la estructura no declara horas productivas —todas
   * las cargadas hasta hoy— no hay ociosidad y no se muestra nada.
   */
  const { data: estructura } = useCostStructure(structureId ?? '');
  const laborConfig = estructura?.directLaborConfig as DirectLaborConfig | null | undefined;
  const idleCapacity = laborConfig
    ? buildIdleCapacity(laborConfig, result.detail.directLabor)
    : null;

  /**
   * La pérdida por capacidad ociosa que sale del estado de costos.
   *
   * Solo tiene sentido mostrarla cuando el destino vigente la saca del costo del
   * producto: con `'absorbido-en-el-producto'` el importe sigue adentro de las
   * filas de arriba y ponerlo también abajo lo contaría dos veces a la vista.
   */
  const perdidaOciosa =
    DESTINO_COSTO_OCIOSO_VIGENTE === 'perdida-del-periodo'
      ? idleCapacity?.idleCost
      : undefined;

  /**
   * T-09 — el nombre del centro, no su id interno.
   *
   * `perDepartment` viene indexado por el id del centro (`prod1`, `mecanizado`),
   * y la tabla de variaciones lo imprimía crudo: el costista leía «mecanizado»
   * en minúscula y sin acento donde el resto de la pantalla dice «Mecanizado».
   * El árbol ya se corrigió en el backend; esto es la otra mitad.
   *
   * Cae al id sólo si el centro no está en `centers[]` — config vieja, o un
   * centro borrado de la lista sin borrar su configuración productiva. Un id
   * feo es mejor que una fila sin nombre.
   */
  const cipConfig = estructura?.indirectCostConfig as { centers?: { id?: string; name?: string }[] } | null | undefined;
  const centros = cipConfig?.centers ?? [];
  const nombreDeCentro = (id: string) =>
    centros.find((c) => c.id === id)?.name?.trim() || id;

  const raiz = (nombre: string) => {
    const nodo = arbol?.tree.find((n) => n.label.toLowerCase() === nombre.toLowerCase());
    return nodo ? toDerivation(nodo) : null;
  };

  const rows = [
    {
      label: 'Materia Prima consumida',
      value: result.rawMaterialConsumed,
      derivation: raiz('Materia Prima Consumida'),
    },
    {
      label: 'Mano de Obra Directa',
      value: result.directLaborTotal,
      derivation: raiz('Mano de Obra Directa'),
    },
    {
      label: 'CIP aplicados',
      value: result.indirectCostsApplied,
      derivation: raiz('Costos Indirectos de Producción Aplicados'),
    },
  ];

  const handleExportPDF = async () => {
    const input = document.getElementById('pdf-export-content');
    if (!input) return;
    
    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Añadir encabezado básico
      pdf.setFontSize(18);
      pdf.setTextColor(116, 33, 43); // granate
      pdf.text('Reporte Ejecutivo de Costos', 15, 20);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado por CosteAR el ${new Date().toLocaleDateString('es-AR')}`, 15, 28);
      
      pdf.addImage(imgData, 'PNG', 15, 35, pdfWidth - 30, pdfHeight - 30);
      pdf.save(`Reporte_Costos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.error('No se pudo exportar el PDF. Intentá de nuevo.');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div id="pdf-export-content" className="space-y-4 bg-surface p-2 rounded-xl">
        {/* Si lo que se está mirando lo calculó el sistema solo y nadie lo
            validó, se avisa ARRIBA de los números — al pie llegaría tarde, con
            la decisión de precio ya tomada. Va dentro del bloque exportable a
            propósito: un PDF de un resultado provisorio tiene que decirlo. */}
        {vigente?.provisorio && <ProvisionalBanner motivo={vigente.motivo} />}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-lg bg-granate px-4 py-2 text-[13px] font-bold text-white hover:bg-granate-deep transition-colors shadow-sm"
          >
            <Download className="size-4" /> Exportar PDF Ejecutivo
          </button>
        </div>
        <AdvisorPanel
          kind="cost_result"
          label="Analizar el resultado"
          context={{
            materiaPrima: result.rawMaterialConsumed,
            manoDeObra: result.directLaborTotal,
            costosIndirectos: result.indirectCostsApplied,
            costoProduccion: result.productionCost,
            cogs: result.costOfGoodsSold,
            margenBruto: result.grossMargin,
            margenBrutoPct: result.grossMarginPct,
          }}
        />
        {companyId && period && (
          <ReconciliationCard
            companyId={companyId}
            period={period}
            structureCosts={{
              MATERIA_PRIMA: result.rawMaterialConsumed,
              MANO_DE_OBRA: result.directLaborTotal,
              COSTOS_INDIRECTOS: result.indirectCostsApplied,
            }}
          />
        )}
        {result.detail.unitCost && (
          <Card>
            <CardBody className="space-y-2 py-8 text-center">
              <p className="text-[11px] uppercase tracking-widest text-ink-soft">Costo unitario de producción</p>
              {/* El número final del sistema de costos: es el que más se mira y
                  el que más hay que poder abrir. La cuenta se arma acá porque el
                  árbol llega hasta el costo de producción, no hasta el unitario. */}
              <TraceableValue
                title="Costo unitario de producción"
                derivation={{
                  label: 'Costo unitario de producción',
                  formula: 'costo de producción ÷ unidades producidas',
                  value: result.detail.unitCost.unitProductionCost,
                  unit: '$',
                  children: [
                    {
                      label: 'Costo de producción',
                      formula: 'materia prima + mano de obra + costos indirectos',
                      value: result.productionCost,
                      unit: '$',
                      children: rows.map((r) => ({
                        label: r.label,
                        formula: r.derivation?.formula ?? null,
                        value: r.value,
                        unit: '$',
                        children: r.derivation?.children ?? [],
                        dataPointId: r.derivation?.dataPointId ?? null,
                      })),
                    },
                    {
                      label: 'Unidades producidas',
                      formula: null,
                      value: result.detail.unitCost.unitsProduced,
                      unit: 'u',
                      children: [],
                    },
                  ],
                }}
              >
                <Money value={result.detail.unitCost.unitProductionCost} className="block text-5xl font-bold text-ink" />
              </TraceableValue>
              {result.detail.unitCost.unitsProduced > 0 && (
                <p className="text-[12px] text-ink-soft">
                  costo de producción ÷ {result.detail.unitCost.unitsProduced.toLocaleString('es-AR')} u producidas
                </p>
              )}
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="Desglose de costos" />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="px-6 py-3 text-left font-semibold">Concepto</th>
                  <th className="px-6 py-3 text-right font-semibold">Importe</th>
                  <th className="px-6 py-3 text-right font-semibold">% s/costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.label} className="hover:bg-surface-alt/40">
                    <td className="px-6 py-3 text-ink-soft">{r.label}</td>
                    <td className="px-6 py-3 text-right">
                      <TraceableValue derivation={r.derivation} title={r.label}>
                        <Money value={r.value} />
                      </TraceableValue>
                    </td>
                    <td className="px-6 py-3 text-right text-ink-soft">
                      {result.productionCost > 0 ? `${((r.value / result.productionCost) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-alt font-semibold">
                  <td className="px-6 py-3.5 text-ink">Costo de producción</td>
                  <td className="px-6 py-3.5 text-right"><Money value={result.productionCost} /></td>
                  <td className="px-6 py-3.5 text-right text-ink-soft">100%</td>
                </tr>
                <tr className="bg-granate-tenue font-bold">
                  <td className="px-6 py-3.5 text-granate">Costo de productos vendidos (COGS)</td>
                  <td className="px-6 py-3.5 text-right"><Money value={result.costOfGoodsSold} className="text-granate" /></td>
                  <td className="px-6 py-3.5" />
                </tr>
                {/* La pérdida por capacidad ociosa NO está en las filas de
                    arriba: salió del costo del producto y se fue al estado de
                    resultados. Se muestra igual, acá abajo y separada por una
                    línea, para que el costista sepa que el costo de producción
                    ya no la contiene y no la busque adentro. */}
                {perdidaOciosa != null && perdidaOciosa > 0 && (
                  <tr className="border-t-4 border-line">
                    <td className="px-6 py-3.5 text-ink">
                      Pérdida por capacidad ociosa
                      <span className="ml-2 text-[11px] font-normal text-ink-soft">
                        fuera del costo de producción — otro egreso del estado de resultados
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-warn"><Money value={perdidaOciosa} /></td>
                    <td className="px-6 py-3.5" />
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {Object.keys(result.detail.indirectCosts.perDepartment).length > 0 && (
          <Card>
            <CardHeader title="Análisis de variaciones — CIP" description="Detalle de base, cuota, aplicación y variaciones de costos indirectos" />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-line bg-surface-alt uppercase tracking-wider text-ink-soft text-[10px]">
                    <th className="px-4 py-3 text-left font-semibold">Dpto / Centro</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Base Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Cuota Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Base Real</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Aplicado</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Real</th>
                    <th className="px-4 py-3 text-right font-semibold">Var. Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Var. Volumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(result.detail.indirectCosts.perDepartment).map(([dept, d]) => {
                    const normalCapacity = d.normalCapacity ?? 0;
                    const quota = d.quota ?? 0;
                    const budgetedCip = normalCapacity * quota;
                    return (
                      <tr key={dept} className="hover:bg-surface-alt/45">
                        <td className="px-4 py-3 font-semibold text-ink">{nombreDeCentro(dept)}</td>
                        <td className="px-4 py-3 text-right"><Money value={budgetedCip} /></td>
                        <td className="px-4 py-3 text-right font-mono">{normalCapacity} hs</td>
                        <td className="px-4 py-3 text-right"><Money value={quota} /></td>
                        <td className="px-4 py-3 text-right font-mono">{d.actualActivity ?? 0} hs</td>
                        <td className="px-4 py-3 text-right font-bold text-ink"><Money value={d.appliedCip} /></td>
                        <td className="px-4 py-3 text-right font-bold text-ink"><Money value={d.actualCip ?? d.cipTotal} /></td>
                        <td className={cn('px-4 py-3 text-right font-medium', d.budgetVariance < 0 ? 'text-danger' : 'text-ok')}>
                          <Money value={d.budgetVariance} />
                        </td>
                        <td className={cn('px-4 py-3 text-right font-medium', d.volumeVariance < 0 ? 'text-danger' : 'text-ok')}>
                          <Money value={d.volumeVariance} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-3 py-8 text-center">
            <p className="text-[11px] uppercase tracking-widest text-ink-soft">Margen bruto</p>
            <Percent value={result.grossMarginPct} colorize className="text-5xl font-bold" />
            <Money value={result.grossMargin} className="block text-lg text-ink-soft" />
            <div className="pt-2">
              <StatusBadge status={marginStatus(result.grossMarginPct, 15, trustworthy)}>
                {!trustworthy
                  ? 'Margen no confiable'
                  : result.grossMarginPct < 0
                    ? 'Venta a pérdida'
                    : result.grossMarginPct < 15
                      ? 'Margen ajustado'
                      : 'Margen sano'}
              </StatusBadge>
              {!trustworthy && (
                <p className="mx-auto mt-2 max-w-[16rem] text-[11px] leading-snug text-ink-soft">
                  {untrustworthyReason(result, incompleto, corridaTrazableFallo)}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Detalle MOD" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Días hábiles efectivos</span><span className="font-medium">{result.detail.directLabor.workingDays} días</span></div>
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between"><span className="text-ink-soft">IAP — Inasistencias pagas</span><span className="font-medium">{result.detail.directLabor.iapPercent.toFixed(2)}%</span></div>
              {result.detail.directLabor.paidDays != null && (
                <span className="text-[11px] text-ink-soft">
                  IAP = {result.detail.directLabor.paidDays} días pagos / {result.detail.directLabor.workingDays} efectivos = {result.detail.directLabor.iapPercent.toFixed(2)}% · derivado, solo lectura
                </span>
              )}
            </div>
            <div className="flex justify-between"><span className="text-ink-soft">ITCS</span><span className="font-medium">{result.detail.directLabor.itcsPercent.toFixed(2)}%</span></div>
            {Object.entries(result.detail.directLabor.hourlyRates).map(([dept, rate]) => (
              <div key={dept} className="flex justify-between">
                <span className="text-ink-soft">{dept}</span>
                <span><Money value={rate} className="font-medium" /><span className="ml-1 text-[11px] text-ink-soft">/h</span></span>
              </div>
            ))}
            {/* C-04 — la capacidad ociosa NUNCA se pliega dentro de las órdenes:
                si hay horas pagadas sin trabajo asignado, van en su propia línea
                con sus horas y su costo. Sin horas netas productivas cargadas la
                línea no existe y el detalle se ve igual que siempre. */}
            {idleCapacity?.anyDeclared && <IdleCapacityResultLine summary={idleCapacity} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Detalle MP" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Lote óptimo</span><span className="font-medium">{result.detail.rawMaterial.optimalLot.toFixed(0)} u</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Stock final</span><span className="font-medium">{result.detail.rawMaterial.finalStockQty.toFixed(0)} u</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Valor stock final</span><Money value={result.detail.rawMaterial.finalStockValue} className="font-medium" /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
