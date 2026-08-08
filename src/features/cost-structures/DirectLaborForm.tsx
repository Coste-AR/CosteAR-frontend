import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { Plus, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fractionToPercentInput, percentInputToFraction } from '@/lib/utils';
import { catedraExample } from './catedra-example';
import { SOCIAL_CHARGES_CATALOG, classifySocialCharge, buildItcsBreakdown } from './social-charges-catalog';
import type { DirectLaborConfig } from './cost-structure-types';

interface Props {
  defaultValues?: DirectLaborConfig;
  onSave: (data: DirectLaborConfig) => Promise<void>;
  saving: boolean;
  /** Si viene en true, al montar carga el ejemplo de la cátedra en el form. */
  autoLoadExample?: boolean;
}

export function ensureDefaultUncertainConcepts(config?: DirectLaborConfig): DirectLaborConfig {
  const base = config ? JSON.parse(JSON.stringify(config)) : emptyDirectLabor();
  if (!base.itcs) {
    base.itcs = { derivationBase: 0.27, fixedArt: 0.015, uncertainRemunerative: [], uncertainNonRemunerative: [] };
  }
  if (!base.itcs.uncertainRemunerative) {
    base.itcs.uncertainRemunerative = [];
  }
  
  // El IAP (Índice de Ausentismo Pago) NO va acá: se calcula automáticamente a
  // partir de las ausencias remuneradas y se muestra en el Resultado. Ponerlo como
  // concepto manual lo contaría dos veces.
  const defaults = [
    'PAP (Premio Asistencia Perfecta)',
    'PPP (Premio por Productividad)'
  ];
  
  defaults.forEach(name => {
    const exists = base.itcs.uncertainRemunerative.some((r: any) => r.name && r.name.startsWith(name.slice(0, 3)));
    if (!exists) {
      base.itcs.uncertainRemunerative.push({ name, coefficient: 0 });
    }
  });
  
  return base;
}

function cleanDirectLaborForForm(cfg?: DirectLaborConfig): any {
  const base = ensureDefaultUncertainConcepts(cfg);
  return {
    workingDays: {
      totalDaysPerYear: base.workingDays?.totalDaysPerYear === 0 ? '' : (base.workingDays?.totalDaysPerYear ?? ''),
      unpaidAbsence: {
        sundays: base.workingDays?.unpaidAbsence?.sundays === 0 ? '' : (base.workingDays?.unpaidAbsence?.sundays ?? ''),
        saturdays: base.workingDays?.unpaidAbsence?.saturdays === 0 ? '' : (base.workingDays?.unpaidAbsence?.saturdays ?? ''),
        unjustifiedAbsences: base.workingDays?.unpaidAbsence?.unjustifiedAbsences === 0 ? '' : (base.workingDays?.unpaidAbsence?.unjustifiedAbsences ?? ''),
        holidaysOnWeekend: base.workingDays?.unpaidAbsence?.holidaysOnWeekend === 0 ? '' : (base.workingDays?.unpaidAbsence?.holidaysOnWeekend ?? ''),
      },
      paidAbsence: {
        holidays: base.workingDays?.paidAbsence?.holidays === 0 ? '' : (base.workingDays?.paidAbsence?.holidays ?? ''),
        vacations: base.workingDays?.paidAbsence?.vacations === 0 ? '' : (base.workingDays?.paidAbsence?.vacations ?? ''),
        sickness: base.workingDays?.paidAbsence?.sickness === 0 ? '' : (base.workingDays?.paidAbsence?.sickness ?? ''),
        specialLeaves: base.workingDays?.paidAbsence?.specialLeaves === 0 ? '' : (base.workingDays?.paidAbsence?.specialLeaves ?? ''),
        workAccidents: base.workingDays?.paidAbsence?.workAccidents === 0 ? '' : (base.workingDays?.paidAbsence?.workAccidents ?? ''),
      },
    },
    itcs: {
      // Tasas en %: se guardan como fracción (0.27) y se muestran como porcentaje (27).
      derivationBase: fractionToPercentInput(base.itcs?.derivationBase),
      fixedArt: fractionToPercentInput(base.itcs?.fixedArt),
      // Se descarta cualquier concepto "IAP" manual: el IAP es derivado (ausencias
      // pagas / días efectivos) y se calcula solo. Si estuviera acá, contaría doble.
      uncertainRemunerative: (base.itcs?.uncertainRemunerative ?? [])
        .filter((r) => !r.name?.trim().toUpperCase().startsWith('IAP'))
        .map((r) => ({
          ...r,
          coefficient: fractionToPercentInput(r.coefficient),
        })),
      uncertainNonRemunerative: (base.itcs?.uncertainNonRemunerative ?? []).map((r) => ({
        ...r,
        coefficient: fractionToPercentInput(r.coefficient),
      })),
    },
    departments: (base.departments ?? []).map((d) => ({
      ...d,
      basicRemuneration: d.basicRemuneration === 0 ? '' : (d.basicRemuneration ?? ''),
      hoursWorked: d.hoursWorked === 0 ? '' : (d.hoursWorked ?? ''),
      realHours: d.realHours === 0 || d.realHours == null ? '' : d.realHours,
    })),
  };
}

function cleanDirectLaborForSubmit(data: any): DirectLaborConfig {
  const fallbackNum = (val: any, def = 0) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return def;
    return Number(val);
  };
  return {
    workingDays: {
      totalDaysPerYear: fallbackNum(data.workingDays?.totalDaysPerYear, 365),
      unpaidAbsence: {
        sundays: fallbackNum(data.workingDays?.unpaidAbsence?.sundays),
        saturdays: fallbackNum(data.workingDays?.unpaidAbsence?.saturdays),
        unjustifiedAbsences: fallbackNum(data.workingDays?.unpaidAbsence?.unjustifiedAbsences),
        holidaysOnWeekend: fallbackNum(data.workingDays?.unpaidAbsence?.holidaysOnWeekend),
      },
      paidAbsence: {
        holidays: fallbackNum(data.workingDays?.paidAbsence?.holidays),
        vacations: fallbackNum(data.workingDays?.paidAbsence?.vacations),
        sickness: fallbackNum(data.workingDays?.paidAbsence?.sickness),
        specialLeaves: fallbackNum(data.workingDays?.paidAbsence?.specialLeaves),
        workAccidents: fallbackNum(data.workingDays?.paidAbsence?.workAccidents),
      },
    },
    itcs: {
      // % tipeado → fracción para el motor. Si se deja vacío, valores estándar de cátedra.
      derivationBase: data.itcs?.derivationBase === '' || data.itcs?.derivationBase == null
        ? 0.27 : percentInputToFraction(data.itcs.derivationBase),
      fixedArt: data.itcs?.fixedArt === '' || data.itcs?.fixedArt == null
        ? 0.015 : percentInputToFraction(data.itcs.fixedArt),
      uncertainRemunerative: (data.itcs?.uncertainRemunerative ?? []).map((r: any) => ({
        ...r,
        coefficient: percentInputToFraction(r.coefficient),
      })),
      uncertainNonRemunerative: (data.itcs?.uncertainNonRemunerative ?? []).map((r: any) => ({
        ...r,
        coefficient: percentInputToFraction(r.coefficient),
      })),
    },
    departments: (data.departments ?? []).map((d: any) => ({
      ...d,
      basicRemuneration: fallbackNum(d.basicRemuneration),
      hoursWorked: fallbackNum(d.hoursWorked),
      realHours: d.realHours === '' || d.realHours == null ? undefined : fallbackNum(d.realHours),
    })),
  };
}

export function DirectLaborForm({ defaultValues, onSave, saving, autoLoadExample }: Props) {
  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<DirectLaborConfig>({
    defaultValues: cleanDirectLaborForForm(defaultValues) as any,
  });

  // Cargar el ejemplo de la cátedra al abrir el form desde "Cargar ejemplo"
  // en la lista (cuando la estructura ya tenía datos y el form estaba oculto).
  const exampleLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadExample && !exampleLoadedRef.current) {
      exampleLoadedRef.current = true;
      reset(cleanDirectLaborForForm(catedraExample.directLabor as unknown as DirectLaborConfig));
    }
  }, [autoLoadExample, reset]);

  // Recargar el form solo si el contenido persistido cambió de verdad, para no
  // pisar la edición en curso cuando la estructura se re-fetchea por invalidación
  // de la query (BUG-05).
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!defaultValues) return;
    const snapshot = JSON.stringify(defaultValues);
    if (snapshot === loadedRef.current) return;
    loadedRef.current = snapshot;
    reset(cleanDirectLaborForForm(defaultValues));
  }, [defaultValues, reset]);

  const { fields: remFields, append: appendRem, remove: removeRem } = useFieldArray({ control, name: 'itcs.uncertainRemunerative' });
  const { fields: nonRemFields, append: appendNonRem, remove: removeNonRem } = useFieldArray({ control, name: 'itcs.uncertainNonRemunerative' });
  const { fields: deptFields, append: appendDept, remove: removeDept } = useFieldArray({ control, name: 'departments' });

  // D-1: nombres tipeados en cada lista, para avisar si el sistema los reconoce
  // con la clasificación CONTRARIA (una mala clasificación desvía el costo).
  const watchedRem = useWatch({ control, name: 'itcs.uncertainRemunerative' });
  const watchedNonRem = useWatch({ control, name: 'itcs.uncertainNonRemunerative' });

  /** Agrega el concepto del catálogo a la lista que le corresponde (auto). */
  const addFromCatalog = (name: string) => {
    const item = SOCIAL_CHARGES_CATALOG.find((c) => c.name === name);
    if (!item) return;
    if (item.kind === 'remunerative') appendRem({ name: item.name, coefficient: 0 });
    else appendNonRem({ name: item.name, coefficient: 0 });
  };

  const [pending, setPending] = useState<DirectLaborConfig | null>(null);

  return (
    <>
    <form onSubmit={handleSubmit((data) => setPending(cleanDirectLaborForSubmit(data)))} className="space-y-5 pt-3">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => reset(cleanDirectLaborForForm(catedraExample.directLabor as unknown as DirectLaborConfig))}
        >
          <Sparkles className="size-3.5" /> Cargar ejemplo de la cátedra
        </Button>
      </div>

      {/* Distribución del año */}
      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Distribución del año
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Total días/año" type="number" step="1" numeric placeholder="Ej: 365" info="Días totales del año (normalmente 365). Número entero. De acá se descuentan las ausencias." {...register('workingDays.totalDaysPerYear', { valueAsNumber: true })} />
        </div>
        <p className="mt-2 mb-1 text-[11px] text-ink-soft font-medium">Ausencias no remuneradas</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Domingos" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.sundays', { valueAsNumber: true })} />
          <Input label="Sábados" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.saturdays', { valueAsNumber: true })} />
          <Input label="Lic. injustificadas" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.unjustifiedAbsences', { valueAsNumber: true })} />
          <Input label="Feriados en finde" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.holidaysOnWeekend', { valueAsNumber: true })} />
        </div>
        <p className="mt-2 mb-1 text-[11px] text-ink-soft font-medium">Ausencias remuneradas</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="Feriados" type="number" step="1" numeric {...register('workingDays.paidAbsence.holidays', { valueAsNumber: true })} />
          <Input label="Vacaciones" type="number" step="1" numeric {...register('workingDays.paidAbsence.vacations', { valueAsNumber: true })} />
          <Input label="Enfermedad" type="number" step="1" numeric {...register('workingDays.paidAbsence.sickness', { valueAsNumber: true })} />
          <Input label="Lic. especiales" type="number" step="1" numeric {...register('workingDays.paidAbsence.specialLeaves', { valueAsNumber: true })} />
          <Input label="Accidentes" type="number" step="1" numeric {...register('workingDays.paidAbsence.workAccidents', { valueAsNumber: true })} />
        </div>
      </section>

      {/* ITCS */}
      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          ITCS — Índice Total de Cargas Sociales
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Base de derivación" type="number" step="0.1" numeric suffix="%" placeholder="Ej: 27" info="Contribuciones patronales + ART variable, base para derivar cargas. En porcentaje (ej: 27 = 27%)." {...register('itcs.derivationBase', { valueAsNumber: true })} />
          <Input label="ART fija" type="number" step="0.01" numeric suffix="%" placeholder="Ej: 1.5" info="Alícuota fija de ART. En porcentaje (ej: 1.5 = 1,5%)." {...register('itcs.fixedArt', { valueAsNumber: true })} />
        </div>

        <CertainChargesPreview control={control} />

        {/* D-1 — Clasificación AUTOMÁTICA: el costista elige del catálogo de la
            cátedra y el sistema lo manda a la lista correcta. Si prefiere
            hacerlo a mano, usa el "Agregar" de cada lista (clasificación manual). */}
        <div className="mt-3 rounded-lg border border-dashed border-action/40 bg-surface-alt/40 p-2.5">
          <Select
            label="Agregar del catálogo — lo clasifica el sistema"
            value=""
            onChange={(e) => addFromCatalog(e.target.value)}
            className="sm:w-80"
            placeholder="Elegir concepto…"
            options={[
              ...SOCIAL_CHARGES_CATALOG.filter((c) => c.kind === 'remunerative').map((c) => ({
                value: c.name,
                label: c.name,
                group: 'Remunerativas — generan cargas derivadas',
              })),
              ...SOCIAL_CHARGES_CATALOG.filter((c) => c.kind === 'nonRemunerative').map((c) => ({
                value: c.name,
                label: c.name,
                group: 'No remunerativas — NO generan derivadas',
              })),
            ]}
          />
          <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">
            Según la cátedra, de las cargas inciertas <strong className="font-medium text-ink">solo las remunerativas generan cargas derivadas</strong> (IAP, PAP y PPP).
            Clasificar mal un concepto desvía el costo. Si preferís decidirlo vos, cargalo a mano con <em>Agregar</em> en la lista que corresponda.
          </p>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-soft font-medium">Conceptos remunerativos inciertos</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => appendRem({ name: '', coefficient: 0 })}>
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
          <p className="mb-2 text-[11px] text-ink-soft">
            El <strong className="font-medium text-ink">IAP (Índice de Ausentismo Pago)</strong> se calcula automáticamente a partir de las ausencias remuneradas y se muestra en el Resultado — no lo cargues acá.
          </p>
          {remFields.map((f, i) => {
            // El sistema lo reconoce como NO remunerativo → está en la lista equivocada.
            const misfit = classifySocialCharge(watchedRem?.[i]?.name ?? '') === 'nonRemunerative';
            return (
            <div key={f.id} className="mb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-granate focus:outline-none sm:flex-1" placeholder="Nombre (ej: Antigüedad)" {...register(`itcs.uncertainRemunerative.${i}.name`)} />
                <div className="flex items-center gap-2 sm:contents">
                  <div className="relative w-28">
                    <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-2 py-1.5 pr-6 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="Ej: 5" title="Coeficiente en porcentaje (ej: 5 = 5%)" {...register(`itcs.uncertainRemunerative.${i}.coefficient`, { valueAsNumber: true })} />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-ink-soft">%</span>
                  </div>
                  <button type="button" onClick={() => removeRem(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </div>
              </div>
              {misfit && (
                <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-warn">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>Según la cátedra este concepto es <strong>no remunerativo</strong>: acá le suma cargas derivadas que no corresponden e <strong>infla el costo</strong>. Convendría moverlo a la lista de no remunerativos.</span>
                </p>
              )}
            </div>
            );
          })}
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-soft font-medium">Conceptos no remunerativos inciertos</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => appendNonRem({ name: '', coefficient: 0 })}>
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
          {nonRemFields.map((f, i) => {
            // El sistema lo reconoce como REMUNERATIVO → está en la lista equivocada.
            const misfit = classifySocialCharge(watchedNonRem?.[i]?.name ?? '') === 'remunerative';
            return (
            <div key={f.id} className="mb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-granate focus:outline-none sm:flex-1" placeholder="Nombre (ej: Viandas)" {...register(`itcs.uncertainNonRemunerative.${i}.name`)} />
                <div className="flex items-center gap-2 sm:contents">
                  <div className="relative w-28">
                    <input type="number" step="0.1" className="w-full rounded border border-line bg-surface px-2 py-1.5 pr-6 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="Ej: 2" title="Coeficiente en porcentaje (ej: 2 = 2%)" {...register(`itcs.uncertainNonRemunerative.${i}.coefficient`, { valueAsNumber: true })} />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-ink-soft">%</span>
                  </div>
                  <button type="button" onClick={() => removeNonRem(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                </div>
              </div>
              {misfit && (
                <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-warn">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>Según la cátedra este concepto es <strong>remunerativo</strong>: acá no genera las cargas derivadas que le corresponden y <strong>subestima el costo</strong>. Convendría moverlo a la lista de remunerativos.</span>
                </p>
              )}
            </div>
            );
          })}
        </div>
      </section>

      {/* Departamentos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Departamentos productivos</h4>
          <Button type="button" size="sm" variant="secondary" onClick={() => appendDept({ name: '', basicRemuneration: 0, hoursWorked: 0 })}>
            <Plus className="size-3" /> Agregar
          </Button>
        </div>
        <p className="mb-2 text-[11px] leading-snug text-ink-soft">
          Las <strong className="font-medium text-ink">horas presupuestadas</strong> son la capacidad normal
          del departamento (con las que se calcula la tarifa horaria). No son las horas realmente trabajadas:
          esas son el dato real de fin de mes.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Departamento</th>
                <th className="px-3 py-2 text-right font-medium">Remuneración básica $</th>
                <th className="px-3 py-2 text-right font-medium text-action">Horas presupuestadas</th>
                <th className="border-l-2 border-line px-3 py-2 text-right font-medium">Horas reales (fin de mes)</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
              {deptFields.map((f, i) => (
                <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <td data-label="Departamento" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre del dpto." {...register(`departments.${i}.name`)} />
                  </td>
                  <td data-label="Remuneración básica $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`departments.${i}.basicRemuneration`, { valueAsNumber: true })} />
                  </td>
                  <td data-label="Horas presupuestadas" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`departments.${i}.hoursWorked`, { valueAsNumber: true })} />
                  </td>
                  <td data-label="Horas reales (fin de mes)" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:border-l-2 sm:border-line sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input type="number" step="1" placeholder="opcional" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`departments.${i}.realHours`, { valueAsNumber: true })} />
                  </td>
                  <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                    <button type="button" onClick={() => removeDept(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {deptFields.length === 0 && (
                <tr className="block sm:table-row"><td colSpan={5} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Sin departamentos — agregá al menos uno.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-2">
        {isDirty && (
          <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
          </p>
        )}
        <Button type="submit" loading={saving} className="w-full">
          Guardar Mano de Obra Directa
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={!!pending}
      title="Actualizar Mano de Obra"
      message="¿Querés actualizar los datos de Mano de Obra Directa?"
      confirmLabel="Guardar"
      loading={saving}
      onConfirm={async () => {
        if (!pending) return;
        await onSave(pending);
        reset(cleanDirectLaborForForm(pending)); // limpia "cambios sin guardar" al toque, sin esperar el refetch
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />
    </>
  );
}

/**
 * Muestra, mientras el costista escribe, las cargas CIERTAS que resultan de lo
 * que cargó — incluido el SAC, que se devenga por ley y por eso aparece aunque
 * ponga todo en cero. Es lectura: la cuenta final la hace el motor al calcular.
 */
function CertainChargesPreview({ control }: { control: Control<DirectLaborConfig> }) {
  const base = useWatch({ control, name: 'itcs.derivationBase' });
  const art = useWatch({ control, name: 'itcs.fixedArt' });

  const certain = buildItcsBreakdown({
    derivationBase: percentInputToFraction(base),
    fixedArt: percentInputToFraction(art),
  }).blocks.find((b) => b.key === 'certain');
  if (!certain) return null;

  const pct = (n: number) =>
    `${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} %`;

  return (
    <div className="mt-2 rounded-lg border border-line bg-surface-alt/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        Cargas ciertas que resultan de estos dos valores
      </p>
      <ul className="mt-1 space-y-0.5">
        {certain.lines.map((l, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-[11.5px]">
            <span className={l.alwaysApplies ? 'font-medium text-ink' : 'text-ink-soft'}>
              {l.label}
              {l.alwaysApplies && (
                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-granate">
                  se aplica siempre
                </span>
              )}
            </span>
            <span className="tabular-nums text-ink">{pct(l.percent)}</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 border-t border-line pt-1 text-[11.5px] font-semibold">
          <span className="text-ink">Subtotal de cargas ciertas</span>
          <span className="tabular-nums text-ink">{pct(certain.percent)}</span>
        </li>
      </ul>
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">
        El <strong className="font-medium text-ink">SAC (aguinaldo)</strong> es una carga cierta:
        un doceavo de la remuneración. Se suma siempre, aun con todo lo demás en cero — por eso el
        costo de mano de obra nunca queda igual a la remuneración básica. A esto todavía le faltan
        las cargas inciertas y sus derivadas; el índice completo se ve en la lista de departamentos
        después de calcular.
      </p>
    </div>
  );
}

export function emptyDirectLabor(): DirectLaborConfig {
  return {
    workingDays: {
      totalDaysPerYear: 365,
      unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
      paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 },
    },
    itcs: { derivationBase: 0.27, fixedArt: 0.015, uncertainRemunerative: [], uncertainNonRemunerative: [] },
    departments: [],
  };
}
