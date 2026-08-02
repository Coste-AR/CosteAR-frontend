import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apiErrorMessage } from '@/lib/api';
import {
  useProcessSetup,
  useProcessSetupPreview,
  useCompleteProcessSetup,
} from '../../process-costing-hooks';
import type { SetupDepartment, SetupIssue } from '../../process-costing-types';

/**
 * SETUP PREVIO DE COSTEO POR PROCESOS — el "CTO inicial".
 *
 * Del acta del 30/07: cuando llega un dato por ingesta el sistema no sabe nada
 * de la estructura interna de la empresa y no puede clasificarlo por
 * departamento. Acá el cliente declara su mapa productivo una sola vez, y a
 * partir de ahí la IA deja de adivinar.
 *
 * Cuatro pasos. En cada uno se dice qué consecuencia tiene la decisión ANTES de
 * tomarla, no después — es lo que pidió el equipo. Y los avisos que no bloquean
 * se muestran como avisos: si frenáramos todo lo que es una mala idea pero no un
 * error, el costista con un caso legítimo que no previmos queda sin salida.
 */

const PASOS = ['Departamentos', 'Coproductos', 'Recuento', 'Revisión'] as const;

export function ProcessSetupWizard({
  structureId,
  onCompleted,
}: {
  structureId: string;
  onCompleted?: () => void;
}) {
  const { data: setup, isLoading } = useProcessSetup(structureId);
  const preview = useProcessSetupPreview(structureId);
  const complete = useCompleteProcessSetup(structureId);

  const [paso, setPaso] = useState(0);
  const [departments, setDepartments] = useState<SetupDepartment[]>([]);
  const [hasJointProducts, setHasJointProducts] = useState(false);
  const [recuentoDias, setRecuentoDias] = useState<string>('');
  const [reporters, setReporters] = useState<string[]>([]);

  // Se precarga lo que ya exista: volver a entrar al wizard no puede hacerle
  // perder al costista lo que ya declaró.
  useEffect(() => {
    if (!setup) return;
    setDepartments(
      setup.departments.length > 0
        ? setup.departments.map((d) => ({ name: d.name, sequence: d.sequence }))
        : [{ name: '', sequence: 1 }],
    );
    setHasJointProducts(setup.hasJointProducts);
    setRecuentoDias(setup.wipCountFrequencyDays?.toString() ?? '');
    setReporters(setup.operarios.filter((o) => o.informaRecuento).map((o) => o.membershipId));
  }, [setup]);

  const input = useMemo(
    () => ({
      departments: departments.map((d, i) => ({ name: d.name, sequence: i + 1 })),
      hasJointProducts,
      wipCountFrequencyDays: recuentoDias === '' ? null : Number(recuentoDias),
      periodLengthDays: setup?.periodLengthDays ?? null,
      wipReporterMembershipIds: reporters,
    }),
    [departments, hasJointProducts, recuentoDias, reporters, setup?.periodLengthDays],
  );

  // Se valida al llegar a Revisión, no en cada tecla: pintar errores sobre un
  // formulario a medio llenar entrena a la gente a ignorarlos.
  useEffect(() => {
    if (paso === 3) preview.mutate(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  if (isLoading) return <p className="text-sm text-ink-soft">Cargando configuración…</p>;

  const problemas = preview.data?.problemas ?? [];
  const avisos = preview.data?.avisos ?? [];

  return (
    <Card>
      <CardHeader
        title="Configuración inicial del proceso"
        description="Se hace una sola vez. Sin esto el sistema no sabe a qué etapa corresponde cada costo que llega."
      />
      <CardBody className="space-y-5">
        <ol className="flex flex-wrap gap-2 text-[12px]">
          {PASOS.map((p, i) => (
            <li
              key={p}
              className={`rounded-full border px-3 py-1 ${
                i === paso
                  ? 'border-granate bg-granate-tenue font-semibold text-granate-deep'
                  : 'border-line text-ink-soft'
              }`}
            >
              {i + 1}. {p}
            </li>
          ))}
        </ol>

        {paso === 0 && (
          <PasoDepartamentos departments={departments} onChange={setDepartments} />
        )}
        {paso === 1 && (
          <PasoCoproductos value={hasJointProducts} onChange={setHasJointProducts} />
        )}
        {paso === 2 && (
          <PasoRecuento
            dias={recuentoDias}
            onDias={setRecuentoDias}
            periodLengthDays={setup?.periodLengthDays ?? null}
            operarios={setup?.operarios ?? []}
            reporters={reporters}
            onReporters={setReporters}
          />
        )}
        {paso === 3 && (
          <PasoRevision
            input={input}
            problemas={problemas}
            avisos={avisos}
            cargando={preview.isPending}
          />
        )}

        <div className="flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className="text-[13px] text-ink-soft hover:text-ink disabled:opacity-40"
          >
            ← Atrás
          </button>

          {paso < 3 ? (
            <button
              type="button"
              onClick={() => setPaso((p) => p + 1)}
              className="rounded-md bg-granate px-4 py-1.5 text-[13px] font-semibold text-white"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              disabled={problemas.length > 0 || preview.isPending || complete.isPending}
              onClick={() =>
                complete.mutate(input, { onSuccess: () => onCompleted?.() })
              }
              className="rounded-md bg-granate px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {complete.isPending ? 'Guardando…' : 'Confirmar configuración'}
            </button>
          )}
        </div>

        {complete.isError && (
          <p className="text-[12.5px] text-danger">{apiErrorMessage(complete.error)}</p>
        )}
      </CardBody>
    </Card>
  );
}

function PasoDepartamentos({
  departments,
  onChange,
}: {
  departments: SetupDepartment[];
  onChange: (d: SetupDepartment[]) => void;
}) {
  const set = (i: number, name: string) =>
    onChange(departments.map((d, j) => (j === i ? { ...d, name } : d)));

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-soft">
        ¿Por qué etapas pasa tu producción, en orden? Cada una es un departamento: acumula
        sus propios costos y le transfiere el total a la siguiente.{' '}
        <strong>El orden importa</strong> — define cuál recibe de cuál, y cambiarlo después
        de haber calculado alteraría resultados ya emitidos.
      </p>

      <div className="space-y-2">
        {departments.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-[12px] text-ink-soft">{i + 1}.</span>
            <input
              value={d.name}
              onChange={(e) => set(i, e.target.value)}
              placeholder="Ej.: Molienda"
              className="flex-1 rounded-md border border-line px-3 py-1.5 text-[13px]"
            />
            <button
              type="button"
              onClick={() => onChange(departments.filter((_, j) => j !== i))}
              disabled={departments.length === 1}
              className="text-[12px] text-ink-soft hover:text-danger disabled:opacity-30"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...departments, { name: '', sequence: departments.length + 1 }])}
        className="rounded-md border border-granate px-3 py-1 text-[12.5px] font-semibold text-granate"
      >
        + Agregar departamento
      </button>
    </div>
  );
}

function PasoCoproductos({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-soft">
        ¿De alguna etapa salen <strong>varios productos a la vez</strong> a partir de un
        mismo costo? Por ejemplo, un proceso que rinde el producto principal y además un
        subproducto vendible.
      </p>

      {[
        {
          v: false,
          label: 'No, un solo producto',
          detalle: 'El costo de cada etapa va entero al producto que sale de ella.',
        },
        {
          v: true,
          label: 'Sí, hay coproductos o subproductos',
          detalle:
            'Vas a tener que definir en qué etapa se separan y con qué método se reparte el costo entre ellos antes de poder calcular.',
        },
      ].map((op) => (
        <label
          key={String(op.v)}
          className={`flex cursor-pointer gap-2.5 rounded-md border p-3 ${
            value === op.v ? 'border-granate bg-granate-tenue' : 'border-line'
          }`}
        >
          <input
            type="radio"
            className="mt-1"
            checked={value === op.v}
            onChange={() => onChange(op.v)}
          />
          <span>
            <span className="block text-[13px] font-medium text-ink">{op.label}</span>
            <span className="block text-[11.5px] text-ink-soft">{op.detalle}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function PasoRecuento({
  dias,
  onDias,
  periodLengthDays,
  operarios,
  reporters,
  onReporters,
}: {
  dias: string;
  onDias: (v: string) => void;
  periodLengthDays: number | null;
  operarios: { membershipId: string; nombre: string; email: string }[];
  reporters: string[];
  onReporters: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    onReporters(reporters.includes(id) ? reporters.filter((r) => r !== id) : [...reporters, id]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[13px] text-ink-soft">
          Al cerrar cada período hay que saber cuántas unidades quedaron sin terminar y con
          qué grado de avance. Ese dato <strong>sale de la planta</strong>, no del sistema:
          lo informa la oficina técnica, y el área de costos lo recibe y lo aplica.
        </p>
        <label className="block text-[12.5px] font-medium text-ink">
          ¿Cada cuántos días puede tu planta informarlo?
        </label>
        <input
          type="number"
          min={1}
          max={366}
          value={dias}
          onChange={(e) => onDias(e.target.value)}
          placeholder="Ej.: 30"
          className="w-40 rounded-md border border-line px-3 py-1.5 text-[13px]"
        />
        {periodLengthDays !== null && (
          <p className="text-[11.5px] text-ink-soft">
            Elegiste costear cada {periodLengthDays} día(s). Si la planta releva más
            espaciado, los períodos intermedios se calculan con el último dato disponible y
            quedan marcados como provisorios.
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-[12.5px] font-medium text-ink">
          ¿Quién de tu equipo informa ese dato?
        </p>
        <p className="text-[11.5px] text-ink-soft">
          Lo que carguen ellos queda registrado como informado por planta. Si lo cargás vos,
          queda registrado como estimación del área de costos. Las dos cosas se permiten —
          pero no valen lo mismo, y la diferencia se ve en la trazabilidad.
        </p>

        {operarios.length === 0 ? (
          <p className="text-[12px] italic text-ink-soft">
            Todavía no hay operarios de empresa invitados. Podés completar esto ahora y
            asignarlo más adelante.
          </p>
        ) : (
          <div className="space-y-1.5">
            {operarios.map((o) => (
              <label key={o.membershipId} className="flex items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={reporters.includes(o.membershipId)}
                  onChange={() => toggle(o.membershipId)}
                />
                <span className="text-ink">{o.nombre}</span>
                <span className="text-ink-soft">· {o.email}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PasoRevision({
  input,
  problemas,
  avisos,
  cargando,
}: {
  input: { departments: SetupDepartment[]; hasJointProducts: boolean; wipCountFrequencyDays: number | null };
  problemas: SetupIssue[];
  avisos: SetupIssue[];
  cargando: boolean;
}) {
  if (cargando) return <p className="text-sm text-ink-soft">Revisando…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-line p-3 text-[12.5px]">
        <p className="font-medium text-ink">Tu proceso</p>
        <p className="text-ink-soft">
          {input.departments.map((d, i) => `${i + 1}. ${d.name || '(sin nombre)'}`).join('  →  ')}
        </p>
        <p className="mt-2 text-ink-soft">
          {input.hasJointProducts ? 'Con coproductos o subproductos' : 'Un solo producto'}
          {input.wipCountFrequencyDays
            ? ` · recuento cada ${input.wipCountFrequencyDays} día(s)`
            : ' · sin frecuencia de recuento declarada'}
        </p>
      </div>

      {problemas.length > 0 && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-3">
          <p className="text-[12.5px] font-semibold text-ink">Hay que corregir esto antes</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] text-ink-soft">
            {problemas.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
          {/* No bloquean: son cosas que conviene saber, no errores. */}
          <p className="text-[12.5px] font-semibold text-ink">Tené en cuenta</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] text-ink-soft">
            {avisos.map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      {problemas.length === 0 && (
        <p className="text-[12px] text-ink-soft">
          Podés cambiar esta configuración después. Lo que no conviene es reordenar
          departamentos una vez que empezaste a calcular.
        </p>
      )}
    </div>
  );
}
