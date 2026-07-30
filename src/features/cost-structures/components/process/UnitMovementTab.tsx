import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TraceableValue } from '@/components/ui/TraceableValue';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useUnitMovement, useSaveUnitMovement } from '../../process-costing-hooks';
import type { ProcessDepartment, UnitMovementInput } from '../../process-costing-types';
import { DepartmentSelector } from './DepartmentSelector';

/**
 * CUADRO DE MOVIMIENTO DE UNIDADES (U05) — la pantalla clave de Procesos.
 *
 * Dos bloques, entran y salen, como en el mockup. Reglas que vienen del dominio
 * y se hacen visibles acá:
 *
 *   · El departamento inicial no recibe del anterior ni tiene aumento de
 *     unidades; los posteriores no ponen unidades en elaboración. Los campos que
 *     no aplican no se muestran: un cero cargado y un campo que no corresponde
 *     no son lo mismo.
 *   · El cuadro admite UNA incógnita, que se despeja por diferencia. Si dejás en
 *     blanco las transferidas o la existencia final, el sistema la calcula y la
 *     muestra en solo-lectura con su fórmula (mismo patrón que la fila IAP de
 *     Mano de Obra).
 *   · Guardar está deshabilitado hasta que el cuadro cuadre.
 *
 * AGREGADO respecto del mockup: los IMPORTES del período por elemento. El mockup
 * solo maqueta unidades, pero sin los costos el motor calcula todo en cero — no
 * habría forma de llegar a un costo unitario desde la pantalla. Van en su propia
 * tarjeta, separados de las unidades, porque son otra naturaleza de dato.
 */

type Campo = keyof UnitMovementInput;

const n = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const x = Number(v.replace(',', '.'));
  return Number.isFinite(x) ? x : undefined;
};

const fmt = (v: number | null | undefined, dec = 0): string =>
  v == null ? '—' : v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/**
 * Una fila del cuadro: etiqueta a la izquierda, número a la derecha.
 *
 * `traceId` es el DataPoint del valor YA GUARDADO. Cuando existe, la etiqueta se
 * vuelve trazable: se puede abrir la ficha de ese dato sin salir del formulario.
 * Los campos que se derivan por diferencia no tienen ficha, porque no son un
 * dato cargado sino un cálculo.
 */
function Fila({
  label,
  hint,
  traceId,
  children,
}: {
  label: string;
  hint?: string;
  traceId?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">
          <TraceableValue dataPointId={traceId} title={label}>
            {label}
          </TraceableValue>
        </div>
        {hint && <div className="text-[11px] text-ink-soft">{hint}</div>}
      </div>
      <div className="w-36 shrink-0">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  disabled,
  placeholder = '0',
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-sm border border-line-strong bg-surface px-2.5 py-1.5 text-right font-mono-jb text-[13px] text-ink disabled:bg-surface-alt disabled:text-ink-soft"
    />
  );
}

/** Campo derivado por diferencia: no se edita y muestra de dónde sale. */
function Derivado({ value, formula }: { value: number | null; formula: string }) {
  return (
    <div className="text-right">
      <div className="rounded-sm border border-dashed border-line-strong bg-surface-alt px-2.5 py-1.5 font-mono-jb text-[13px] italic text-ink-soft">
        {fmt(value)}
      </div>
      <div className="mt-1 text-[10.5px] leading-tight text-ink-soft">{formula}</div>
    </div>
  );
}

export function UnitMovementTab({
  structureId,
  periodId,
  departments,
  deptId,
  onDeptChange,
  readOnly,
}: {
  structureId: string;
  periodId: string | null;
  departments: ProcessDepartment[];
  deptId: string | null;
  onDeptChange: (id: string) => void;
  readOnly: boolean;
}) {
  const { data, isLoading, isError: isFetchError, error: fetchError } = useUnitMovement(structureId, deptId, periodId);
  const guardar = useSaveUnitMovement(structureId, deptId, periodId);

  const dept = departments.find((d) => d.id === deptId) ?? null;
  const esInicial = (dept?.sequence ?? 1) === 1;

  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Al cambiar de departamento o período se recarga lo guardado. `null` en la
  // base = campo nunca cargado, así que se muestra vacío y no como 0.
  useEffect(() => {
    // Si el fetch falló no hay que pisar el formulario con blanco: eso se ve
    // idéntico a "cuadro nunca cargado" y podría hacer que se vuelva a cargar
    // algo que ya existe. Se deja el formulario como estaba y se muestra el
    // error en su lugar (más abajo, antes del `return` principal).
    if (isFetchError) return;
    const s = data?.saved;
    const v = (x: number | null | undefined) => (x == null ? '' : String(x));
    setForm({
      initialWip: v(s?.initialWip),
      startedInProduction: v(s?.startedInProduction),
      receivedFromPrevious: v(s?.receivedFromPrevious),
      unitIncrease: v(s?.unitIncrease),
      transferredOut: v(s?.transferredOut),
      finishedInStock: v(s?.finishedInStock),
      normalLossPct: s?.normalLossPct == null ? '' : String(s.normalLossPct * 100),
      totalLossReported: v(s?.totalLossReported),
      finalWip: v(s?.finalWip),
      initialWipMpAvance: s?.initialWipMpAvance == null ? '' : String(s.initialWipMpAvance * 100),
      initialWipConvAvance: s?.initialWipConvAvance == null ? '' : String(s.initialWipConvAvance * 100),
      finalWipMpAvance: s?.finalWipMpAvance == null ? '' : String(s.finalWipMpAvance * 100),
      finalWipConvAvance: s?.finalWipConvAvance == null ? '' : String(s.finalWipConvAvance * 100),
      periodCostMp: v(s?.periodCostMp),
      periodCostMo: v(s?.periodCostMo),
      periodCostCif: v(s?.periodCostCif),
      initialWipCostMp: v(s?.initialWipCostMp),
      initialWipCostMo: v(s?.initialWipCostMo),
      initialWipCostCif: v(s?.initialWipCostCif),
    });
    setError(null);
  }, [data, deptId, periodId, isFetchError]);

  const set = (campo: string) => (v: string) => setForm((f) => ({ ...f, [campo]: v }));

  /**
   * Mismo criterio que la validación del servidor: el cuadro solo se puede
   * contrastar cuando están cargadas LAS DOS incógnitas. Si falta una, se deriva
   * por diferencia y cuadra por construcción.
   */
  const balance = useMemo(() => {
    const num = (c: string) => n(form[c] ?? '') ?? 0;
    const transferidasCargadas = n(form.transferredOut ?? '') !== undefined;
    const efCargada = n(form.finalWip ?? '') !== undefined;

    const entran =
      num('initialWip') +
      num('startedInProduction') +
      num('receivedFromPrevious') +
      num('unitIncrease');
    const salen =
      num('transferredOut') + num('finishedInStock') + num('totalLossReported') + num('finalWip');

    if (!transferidasCargadas && !efCargada) {
      return { estado: 'incompleto' as const, entran, salen, diferencia: 0 };
    }
    if (!transferidasCargadas || !efCargada) {
      // Una se deriva ⇒ cuadra por construcción. La que falta se muestra abajo.
      return { estado: 'derivable' as const, entran, salen, diferencia: 0 };
    }
    // Con un % de merma admitida y sin pérdida total informada, las unidades que
    // salen incluyen una pérdida normal que calcula el servidor sobre las
    // unidades del período. No se replica esa cuenta acá —duplicar la
    // matemática del dominio es la forma segura de que se desincronicen—: se
    // deja que el guardado la resuelva y la verificación quede del lado del
    // servidor, que es el que manda.
    const hayMermaSinTotal =
      n(form.normalLossPct ?? '') !== undefined && n(form.totalLossReported ?? '') === undefined;
    if (hayMermaSinTotal) {
      return { estado: 'con-merma' as const, entran, salen, diferencia: 0 };
    }
    const diferencia = entran - salen;
    return {
      estado: Math.abs(diferencia) < 1e-6 ? ('cuadra' as const) : ('no-cuadra' as const),
      entran,
      salen,
      diferencia,
    };
  }, [form]);

  const derivada = useMemo(() => {
    const num = (c: string) => n(form[c] ?? '') ?? 0;
    const entran =
      num('initialWip') +
      num('startedInProduction') +
      num('receivedFromPrevious') +
      num('unitIncrease');
    const otros = num('finishedInStock') + num('totalLossReported');
    if (n(form.transferredOut ?? '') === undefined) {
      return { campo: 'transferredOut' as const, valor: entran - otros - num('finalWip') };
    }
    if (n(form.finalWip ?? '') === undefined) {
      return { campo: 'finalWip' as const, valor: entran - otros - num('transferredOut') };
    }
    return null;
  }, [form]);

  const puedeGuardar =
    !readOnly &&
    balance.estado !== 'incompleto' &&
    balance.estado !== 'no-cuadra' &&
    !!deptId;

  const enviar = async () => {
    setError(null);
    const num = (c: Campo) => n(form[c] ?? '');
    const pct = (c: Campo) => {
      const x = n(form[c] ?? '');
      return x === undefined ? undefined : x / 100;
    };

    const payload: UnitMovementInput = {
      initialWip: num('initialWip'),
      startedInProduction: esInicial ? num('startedInProduction') : undefined,
      receivedFromPrevious: esInicial ? undefined : num('receivedFromPrevious'),
      unitIncrease: esInicial ? undefined : num('unitIncrease'),
      transferredOut: num('transferredOut'),
      finishedInStock: num('finishedInStock'),
      normalLossPct: pct('normalLossPct'),
      totalLossReported: num('totalLossReported'),
      finalWip: num('finalWip'),
      initialWipMpAvance: pct('initialWipMpAvance'),
      initialWipConvAvance: pct('initialWipConvAvance'),
      finalWipMpAvance: pct('finalWipMpAvance'),
      finalWipConvAvance: pct('finalWipConvAvance'),
      periodCostMp: num('periodCostMp'),
      periodCostMo: num('periodCostMo'),
      periodCostCif: num('periodCostCif'),
      initialWipCostMp: num('initialWipCostMp'),
      initialWipCostMo: num('initialWipCostMo'),
      initialWipCostCif: num('initialWipCostCif'),
    };

    try {
      await guardar.mutateAsync(payload);
      setConfirmando(false);
    } catch (e) {
      setError(apiErrorMessage(e));
      setConfirmando(false);
    }
  };

  if (!periodId) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-soft">
        Elegí un período en la barra de arriba para cargar el cuadro.
      </p>
    );
  }
  if (departments.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-soft">
        Primero cargá los departamentos del proceso en la pestaña «Departamentos».
      </p>
    );
  }
  // Fetch falló: esto NO es "cuadro vacío" — son cosas distintas y hay que
  // distinguirlas, así que se corta acá en vez de seguir al formulario en
  // blanco (que se ve igual que un cuadro nunca cargado).
  if (isFetchError) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DepartmentSelector departments={departments} value={deptId} onChange={onDeptChange} />
        </div>
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-[13px] text-ink-soft">
            No se pudo cargar el cuadro de movimiento: {apiErrorMessage(fetchError)}
          </p>
        </div>
      </div>
    );
  }

  const hayEF = (n(form.finalWip ?? '') ?? derivada?.valor ?? 0) > 0;
  /** `dataPointId` por campo del cuadro ya guardado (U10). */
  const traces = data?.traces ?? {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DepartmentSelector departments={departments} value={deptId} onChange={onDeptChange} />
        {isLoading && <span className="text-[12px] text-ink-soft">Cargando…</span>}
      </div>

      {error && <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── ENTRAN ─────────────────────────────────────────────── */}
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Entran
          </div>

          <Fila label="Existencia inicial en proceso" traceId={traces.initialWip}>
            <NumInput value={form.initialWip ?? ''} onChange={set('initialWip')} disabled={readOnly} />
          </Fila>

          {esInicial ? (
            <Fila
              label="Puestas en elaboración"
              hint="Solo el primer departamento de la cadena"
              traceId={traces.startedInProduction}
            >
              <NumInput
                value={form.startedInProduction ?? ''}
                onChange={set('startedInProduction')}
                disabled={readOnly}
              />
            </Fila>
          ) : (
            <>
              <Fila label="Recibidas del departamento anterior" traceId={traces.receivedFromPrevious}>
                <NumInput
                  value={form.receivedFromPrevious ?? ''}
                  onChange={set('receivedFromPrevious')}
                  disabled={readOnly}
                />
              </Fila>
              <Fila
                label="Aumento de número de unidades"
                hint="Por agregado de material o dilución"
                traceId={traces.unitIncrease}
              >
                <NumInput
                  value={form.unitIncrease ?? ''}
                  onChange={set('unitIncrease')}
                  disabled={readOnly}
                />
              </Fila>
            </>
          )}

          <div className="mt-1 flex items-center justify-between rounded-sm bg-granate-tenue px-3 py-2">
            <span className="text-[13px] font-semibold text-granate">Total a justificar</span>
            <span className="font-mono-jb text-[13px] font-bold text-granate">
              {fmt(balance.entran)}
            </span>
          </div>
        </div>

        {/* ── SALEN ──────────────────────────────────────────────── */}
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-granate">
            ▸ Salen
          </div>

          <Fila label="Terminadas y transferidas" traceId={traces.transferredOut}>
            {derivada?.campo === 'transferredOut' ? (
              <Derivado
                value={derivada.valor}
                formula="= entran − stock − pérdidas − existencia final"
              />
            ) : (
              <NumInput
                value={form.transferredOut ?? ''}
                onChange={set('transferredOut')}
                disabled={readOnly}
                placeholder="dejar vacío para deducir"
              />
            )}
          </Fila>

          <Fila
            label="Terminadas y en existencia"
            hint="Terminadas que no se transfirieron"
            traceId={traces.finishedInStock}
          >
            <NumInput
              value={form.finishedInStock ?? ''}
              onChange={set('finishedInStock')}
              disabled={readOnly}
            />
          </Fila>

          <Fila
            label="Pérdida normal admitida"
            hint="% sobre las unidades del período"
            traceId={traces.normalLossPct}
          >
            <NumInput
              value={form.normalLossPct ?? ''}
              onChange={set('normalLossPct')}
              disabled={readOnly}
              placeholder="%"
            />
          </Fila>

          <Fila
            label="Pérdida real total del período"
            hint="La extraordinaria sale por diferencia contra la normal"
          >
            <NumInput
              value={form.totalLossReported ?? ''}
              onChange={set('totalLossReported')}
              disabled={readOnly}
            />
          </Fila>

          <Fila label="Existencia final en proceso" traceId={traces.finalWip}>
            {derivada?.campo === 'finalWip' ? (
              <Derivado
                value={derivada.valor}
                formula="= entran − transferidas − stock − pérdidas"
              />
            ) : (
              <NumInput
                value={form.finalWip ?? ''}
                onChange={set('finalWip')}
                disabled={readOnly}
                placeholder="dejar vacío para deducir"
              />
            )}
          </Fila>

          <div className="mt-1 flex items-center justify-between rounded-sm bg-granate-tenue px-3 py-2">
            <span className="text-[13px] font-semibold text-granate">Total justificado</span>
            <span className="font-mono-jb text-[13px] font-bold text-granate">
              {fmt(balance.estado === 'derivable' ? balance.entran : balance.salen)}
            </span>
          </div>
        </div>
      </div>

      {/* ── GRADOS DE AVANCE ─────────────────────────────────────── */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-wider text-granate">
          ▸ Grados de avance
        </div>
        <p className="mb-3 text-[12px] text-ink-soft">
          Qué parte del trabajo tienen hecho las existencias en proceso. Sin el avance en conversión,
          una existencia final con unidades se valuaría en cero.
        </p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Fila label="Existencia inicial · materia prima" hint="Vacío = 100 % (se incorpora al inicio)">
            <NumInput
              value={form.initialWipMpAvance ?? ''}
              onChange={set('initialWipMpAvance')}
              disabled={readOnly}
              placeholder="%"
            />
          </Fila>
          <Fila label="Existencia inicial · conversión">
            <NumInput
              value={form.initialWipConvAvance ?? ''}
              onChange={set('initialWipConvAvance')}
              disabled={readOnly}
              placeholder="%"
            />
          </Fila>
          <Fila label="Existencia final · materia prima" hint="Vacío = 100 %">
            <NumInput
              value={form.finalWipMpAvance ?? ''}
              onChange={set('finalWipMpAvance')}
              disabled={readOnly}
              placeholder="%"
            />
          </Fila>
          <Fila label="Existencia final · conversión">
            <NumInput
              value={form.finalWipConvAvance ?? ''}
              onChange={set('finalWipConvAvance')}
              disabled={readOnly}
              placeholder="%"
            />
          </Fila>
        </div>
        {hayEF && !form.finalWipConvAvance && (
          <div className="mt-2 flex items-start gap-2 rounded-sm bg-warn/10 px-3 py-2 text-[12.5px] text-warn">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Hay unidades en existencia final sin grado de avance en conversión. Sin ese dato se
            valuarían en cero.
          </div>
        )}
      </div>

      {/* ── COSTOS DEL PERÍODO (agregado: no está en el mockup) ───── */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-wider text-granate">
          ▸ Costos del período
        </div>
        <p className="mb-3 text-[12px] text-ink-soft">
          Los importes con los que se valúa esta producción. Sin ellos el costo del departamento da
          cero.
          {(dept?.defaultConversionAvanceEqualsMO ?? true) &&
            ' Este departamento sigue la conversión unificada: mano de obra y carga fabril se suman en una sola columna al calcular.'}
        </p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Fila label="Materia prima del período" traceId={traces.periodCostMp}>
            <NumInput value={form.periodCostMp ?? ''} onChange={set('periodCostMp')} disabled={readOnly} />
          </Fila>
          <Fila label="Materia prima en la existencia inicial" traceId={traces.initialWipCostMp}>
            <NumInput
              value={form.initialWipCostMp ?? ''}
              onChange={set('initialWipCostMp')}
              disabled={readOnly}
            />
          </Fila>
          <Fila label="Mano de obra del período" traceId={traces.periodCostMo}>
            <NumInput value={form.periodCostMo ?? ''} onChange={set('periodCostMo')} disabled={readOnly} />
          </Fila>
          <Fila label="Mano de obra en la existencia inicial" traceId={traces.initialWipCostMo}>
            <NumInput
              value={form.initialWipCostMo ?? ''}
              onChange={set('initialWipCostMo')}
              disabled={readOnly}
            />
          </Fila>
          <Fila label="Carga fabril del período" traceId={traces.periodCostCif}>
            <NumInput
              value={form.periodCostCif ?? ''}
              onChange={set('periodCostCif')}
              disabled={readOnly}
            />
          </Fila>
          <Fila label="Carga fabril en la existencia inicial" traceId={traces.initialWipCostCif}>
            <NumInput
              value={form.initialWipCostCif ?? ''}
              onChange={set('initialWipCostCif')}
              disabled={readOnly}
            />
          </Fila>
        </div>
        {data?.saved?.initialWipCostPrevDept != null && data.saved.initialWipCostPrevDept > 0 && (
          <p className="mt-2 text-[12px] text-ink-soft">
            Además, la existencia inicial trae{' '}
            <strong className="font-mono-jb">
              ${fmt(data.saved.initialWipCostPrevDept, 2)}
            </strong>{' '}
            de costo del departamento anterior, arrastrado automáticamente al abrir el período.
          </p>
        )}
      </div>

      {/* ── BARRA DE ESTADO + GUARDAR ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          {balance.estado === 'cuadra' && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-[12px] font-semibold text-ok">
                <CheckCircle2 className="size-3.5" /> Cuadra
              </span>
              <span className="text-[13px] text-ink-soft">Entran = salen · listo para calcular</span>
            </>
          )}
          {balance.estado === 'derivable' && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-granate-tenue px-2.5 py-1 text-[12px] font-semibold text-granate">
                Se deduce por diferencia
              </span>
              <span className="text-[13px] text-ink-soft">
                El sistema calcula el dato que dejaste en blanco.
              </span>
            </>
          )}
          {balance.estado === 'no-cuadra' && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[12px] font-semibold text-danger">
                <AlertTriangle className="size-3.5" /> No cuadra
              </span>
              <span className="text-[13px] text-ink-soft">
                {balance.diferencia > 0 ? 'Sobran' : 'Faltan'}{' '}
                <strong className="font-mono-jb">{fmt(Math.abs(balance.diferencia))}</strong>{' '}
                unidades sin justificar.
              </span>
            </>
          )}
          {balance.estado === 'con-merma' && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-granate-tenue px-2.5 py-1 text-[12px] font-semibold text-granate">
                Con merma admitida
              </span>
              <span className="text-[13px] text-ink-soft">
                Al guardar, el sistema calcula la pérdida normal y verifica que cuadre.
              </span>
            </>
          )}
          {balance.estado === 'incompleto' && (
            <span className="text-[13px] text-ink-soft">
              Cargá las transferidas o la existencia final — el sistema deduce la otra.
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          disabled={!puedeGuardar}
          loading={guardar.isPending}
          onClick={() => setConfirmando(true)}
          className={cn(!puedeGuardar && 'opacity-50')}
        >
          Guardar cuadro
        </Button>
      </div>

      <ConfirmDialog
        open={confirmando}
        title="Guardar el cuadro de movimiento"
        confirmLabel="Guardar"
        loading={guardar.isPending}
        onConfirm={() => void enviar()}
        onCancel={() => setConfirmando(false)}
        message={
          <p>
            Cada valor que cargaste queda guardado con su ficha de trazabilidad: quién lo cargó,
            cuándo y desde dónde. Los datos que se deducen por diferencia no generan ficha, porque
            son calculados.
          </p>
        }
      />
    </div>
  );
}
