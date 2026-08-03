import { useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DerivationTree } from '../../DerivationTree';
import { useProcessCalculate, useProcessProductionReport } from '../../process-costing-hooks';
import type { ProcessDepartment, ProcessDepartmentResult } from '../../process-costing-types';
import { DepartmentSelector } from './DepartmentSelector';

/**
 * INFORME DE COSTOS DE PRODUCCIÓN (U08).
 *
 * La estructura del informe de la cátedra, departamento por departamento:
 *
 *   costo del departamento anterior → costo propio → acumulado a justificar
 *   → justificación → verificación de la existencia final
 *
 * La verificación es el corazón: la existencia final se calcula por DOS caminos
 * independientes —por diferencia contra el acumulado, y valuando cada elemento
 * por su producción equivalente— y tienen que dar lo mismo. Cuando no dan, el
 * informe lo dice en vez de mostrar un número redondeado.
 *
 * Regla F08: si el resultado está marcado incompleto —hay datos sin decisión de
 * imputación— NO se pinta ninguna insignia de "sano". Un número incompleto que
 * se ve saludable es peor que uno que se ve incompleto.
 */

const money = (v: number, dec = 2) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function Kpi({
  label,
  value,
  destacado = false,
}: {
  label: string;
  value: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-4',
        destacado ? 'border-action bg-granate-tenue' : 'border-line bg-surface',
      )}
    >
      <div
        className={cn(
          'text-[11px] font-semibold uppercase tracking-wide',
          destacado ? 'text-granate' : 'text-ink-soft',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-mono-jb text-[21px] font-semibold',
          destacado ? 'text-granate' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Linea({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{label}</div>
        {hint && <div className="text-[11px] text-ink-soft">{hint}</div>}
      </div>
      <span className="shrink-0 font-mono-jb text-[13px] text-ink">{money(value)}</span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-1 flex items-center justify-between rounded-sm bg-granate-tenue px-3 py-2">
      <span className="text-[13px] font-semibold text-granate">{label}</span>
      <span className="font-mono-jb text-[13px] font-bold text-granate">{money(value)}</span>
    </div>
  );
}

function InformeDepartamento({ d }: { d: ProcessDepartmentResult }) {
  const { report } = d;
  const cierra = Math.abs(report.ajustePorRedondeo) < 0.01;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {report.previousDepartment && (
          <Kpi
            label="Depto. anterior"
            value={`$${money(report.previousDepartment.costoUnitarioTransferido, 3)}`}
          />
        )}
        {report.elements.map((e) => (
          <Kpi key={e.element} label={e.label} value={`$${money(e.costoUnitario, 3)}`} />
        ))}
        <Kpi
          label="Costo unitario acumulado"
          value={`$${money(report.costoUnitarioTotalAcumulado, 3)}`}
          destacado
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Acumulado a justificar
          </div>
          {report.previousDepartment && (
            <Linea
              label="Costo del departamento anterior"
              value={report.previousDepartment.costoTotal}
              hint="Costo modificado + CAUP de la etapa previa"
            />
          )}
          {report.elements.map((e) => (
            <Linea
              key={e.element}
              label={e.label}
              value={e.costoTotal}
              hint={`Existencia inicial ${money(e.costoInventarioInicial)} + del período ${money(e.costoDelPeriodo)}`}
            />
          ))}
          <Total label="Total acumulado" value={report.costoAcumuladoAJustificar} />
        </div>

        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Justificación
          </div>
          <Linea label="Terminadas y transferidas" value={report.costoTerminadasYTransferidas} />
          <Linea label="Terminadas y en existencia" value={report.costoTerminadasEnStock} />
          {report.costoPerdidasExtraordinarias > 0 && (
            <Linea
              label="Pérdidas extraordinarias"
              value={report.costoPerdidasExtraordinarias}
              hint="No las absorbe el producto: van al resultado del período"
            />
          )}
          <Linea
            label="Existencia final en proceso"
            value={report.costoExistenciaFinalPorDiferencia}
            hint="Por diferencia contra el acumulado"
          />
          <Total label="Total justificado" value={report.totalJustificado} />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {cierra ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-[12px] font-semibold text-ok">
                  <CheckCircle2 className="size-3.5" /> Cierra
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  Verificado por diferencia y por elemento
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 text-[12px] font-semibold text-warn">
                  <AlertTriangle className="size-3.5" /> Diferencia de redondeo
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  Los dos caminos difieren en{' '}
                  <strong className="font-mono-jb">{money(report.ajustePorRedondeo)}</strong>. La
                  existencia final por elemento da{' '}
                  <strong className="font-mono-jb">
                    {money(report.valuacionExistenciaFinalPorElemento)}
                  </strong>
                  .
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {d.transferredCost && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Costo recibido de la etapa anterior
          </div>
          <Linea
            label="Costo modificado"
            value={d.transferredCost.costoModificado}
            hint="El costo del anterior repartido sobre las unidades a justificar (incluye el aumento de unidades)"
          />
          <Linea
            label="CAUP — costo adicional por unidades perdidas"
            value={d.transferredCost.caup}
            hint={`Las ${money(d.transferredCost.unidadesAJustificar - d.transferredCost.unidadesBuenas, 0)} unidades perdidas normales las absorben las ${money(d.transferredCost.unidadesBuenas, 0)} buenas`}
          />
          <Total label="Costo transferido por unidad" value={d.transferredCost.costoTransferido} />
        </div>
      )}
    </div>
  );
}

export function ProductionCostReportView({
  structureId,
  periodId,
  departments,
  deptId,
  onDeptChange,
}: {
  structureId: string;
  periodId: string | null;
  departments: ProcessDepartment[];
  deptId: string | null;
  onDeptChange: (id: string) => void;
}) {
  const informe = useProcessProductionReport(structureId, periodId);
  const calcular = useProcessCalculate(structureId, periodId);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const correr = async () => {
    setError(null);
    try {
      const r = await calcular.mutateAsync();
      // El server manda `runId`, no `run.id`. Leer la forma equivocada devolvía
      // undefined, rompía acá y pintaba "ocurrió un error inesperado" sobre un
      // cálculo que había guardado perfecto (200 y la corrida en la base).
      // Peor: sin el id, el árbol de derivación no aparecía NUNCA — la pantalla
      // que muestra de dónde sale cada número, que es la promesa del producto.
      setRunId(r.runId);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  if (!periodId || departments.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-soft">
        {departments.length === 0
          ? 'Primero cargá los departamentos del proceso.'
          : 'Elegí un período en la barra de arriba.'}
      </p>
    );
  }

  const data = informe.data;
  const activo = data?.departments.find((d) => d.id === deptId) ?? data?.departments[0] ?? null;
  const incompletitud = calcular.data?.results.incompletitud;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DepartmentSelector departments={departments} value={deptId} onChange={onDeptChange} />
        <Button size="sm" variant="primary" onClick={() => void correr()} loading={calcular.isPending}>
          <Calculator className="size-4" /> Calcular y guardar
        </Button>
      </div>

      {error && <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>}

      {/* F04/F08 — un resultado con datos sin imputar no se presenta como sano. */}
      {incompletitud?.incompleto && (
        <div className="rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <div className="text-[13px] leading-relaxed text-ink">
              <strong>Resultado incompleto.</strong> Hay datos sin decisión de imputación de
              período, así que estos números no son confiables todavía.
              {incompletitud.motivos.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12.5px] text-ink-soft">
                  {incompletitud.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {informe.isLoading && <p className="py-10 text-center text-[13px] text-ink-soft">Calculando…</p>}

      {informe.error && !data && (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-[13px] text-ink-soft">{apiErrorMessage(informe.error)}</p>
        </div>
      )}

      {data && (
        <>
          <div className="rounded-lg border border-line bg-surface px-5 py-4">
            <div className="text-[12px] uppercase tracking-wide text-ink-soft">
              Costo del producto terminado · {data.product} · {data.period}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono-jb text-[26px] font-bold text-granate">
                ${money(data.finalUnitCost, 3)}
              </span>
              <span className="text-[12.5px] text-ink-soft">
                por unidad, al salir de <strong>{data.finalDepartmentName}</strong>
              </span>
            </div>
          </div>

          {activo && <InformeDepartamento d={activo} />}
        </>
      )}

      {runId && (
        <DerivationTree runId={runId} structureId={structureId} period={data?.period} />
      )}
    </div>
  );
}
