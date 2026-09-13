import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleHelp,
  Save,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  isOptionCostParameter,
  useCostParameters,
  useLeaveOptionCostParameterPending,
  useSaveOptionCostParameter,
  type OptionCostParameter,
} from '../cost-parameters-hooks';
import {
  useRubroModules,
  useSetRubroModule,
  type RubroModule,
} from '../rubro-configuration-hooks';

type ConfigurationMode = 'profile' | 'onboarding';

interface CompanyRubroConfigurationProps {
  companyId: string;
  companyName?: string;
  mode?: ConfigurationMode;
  onComplete?: () => void;
}

function ModuleSwitch({
  module,
  onRequestChange,
}: {
  module: RubroModule;
  onRequestChange: (module: RubroModule) => void;
}) {
  const active = module.estado === 'prendido';

  return (
    <li>
      <Card className="h-full">
        <CardBody className="flex h-full items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-ink">{module.nombre}</h3>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  active
                    ? 'border-ok/25 bg-ok/10 text-ok'
                    : 'border-line bg-surface-alt text-ink-soft',
                )}
              >
                {active ? 'Prendido' : 'Apagado'}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{module.descripcion}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={`${active ? 'Apagar' : 'Prender'} ${module.nombre}`}
            onClick={() => onRequestChange(module)}
            className={cn(
              'relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-[3px] focus:ring-granate/15',
              active ? 'border-action bg-action' : 'border-line-strong bg-line-strong',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all',
                active ? 'left-6' : 'left-0.5',
              )}
            />
          </button>
        </CardBody>
      </Card>
    </li>
  );
}

function OptionQuestion({
  parameter,
  value,
  onChange,
}: {
  parameter: OptionCostParameter;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <li data-testid={`option-question-${parameter.clave}`}>
      <Card className="h-full">
        <CardBody className="space-y-4 p-5">
          <div>
            <h3 className="text-[15px] font-bold leading-snug text-ink">{parameter.descripcion}</h3>
            {!parameter.confirmado && (
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-warn">
                <CircleAlert className="size-3.5" aria-hidden /> Pendiente de responder
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">{parameter.descripcion}</legend>
            {parameter.opciones.map((option) => (
              <label
                key={option.valor}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] font-semibold transition-colors',
                  value === option.valor
                    ? 'border-granate bg-granate-tenue text-granate'
                    : 'border-line bg-surface text-ink hover:border-granate/30',
                )}
              >
                <input
                  type="radio"
                  name={`parameter-${parameter.clave}`}
                  value={option.valor}
                  checked={value === option.valor}
                  onChange={() => onChange(option.valor)}
                  className="accent-granate"
                />
                {option.etiqueta}
              </label>
            ))}
            <label
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] font-semibold transition-colors',
                value === null
                  ? 'border-warn/40 bg-warn/10 text-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-warn/40',
              )}
            >
              <input
                type="radio"
                name={`parameter-${parameter.clave}`}
                checked={value === null}
                onChange={() => onChange(null)}
                className="accent-granate"
              />
              <CircleHelp className="size-4 text-warn" aria-hidden />
              No sé todavía
            </label>
          </fieldset>
        </CardBody>
      </Card>
    </li>
  );
}

export function CompanyRubroConfiguration({
  companyId,
  companyName,
  mode = 'profile',
  onComplete,
}: CompanyRubroConfigurationProps) {
  const modules = useRubroModules(companyId);
  const parameters = useCostParameters(companyId);
  const setModule = useSetRubroModule(companyId);
  const saveOption = useSaveOptionCostParameter(companyId);
  const leavePending = useLeaveOptionCostParameterPending(companyId);
  const [step, setStep] = useState(0);
  const [moduleToChange, setModuleToChange] = useState<RubroModule | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  const optionParameters = useMemo(
    () => (parameters.data ?? []).filter(isOptionCostParameter),
    [parameters.data],
  );

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, string | null> = {};
      for (const parameter of optionParameters) {
        next[parameter.clave] = Object.prototype.hasOwnProperty.call(current, parameter.clave)
          ? current[parameter.clave]!
          : parameter.valor;
      }
      return next;
    });
  }, [optionParameters]);

  const activeModules = (modules.data ?? []).filter((module) => module.estado === 'prendido');
  const answeredQuestions = optionParameters.filter((parameter) => drafts[parameter.clave] !== null);
  const isOnboarding = mode === 'onboarding';
  const showModules = !isOnboarding || step === 0;
  const showQuestions = !isOnboarding || step === 1;
  const showSummary = isOnboarding && step === 2;

  const confirmModuleChange = async () => {
    if (!moduleToChange) return;
    const target = moduleToChange;
    const active = target.estado !== 'prendido';
    setModuleError(null);
    try {
      await setModule.mutateAsync({ key: target.clave, active });
      setModuleToChange(null);
    } catch (error) {
      // El 422 del backend nombra el módulo dependiente. No se reemplaza por
      // una traducción genérica porque ésa es la información accionable.
      setModuleError(apiErrorMessage(error));
      setModuleToChange(null);
    }
  };

  const saveAnswers = async () => {
    setAnswerFeedback(null);
    try {
      for (const parameter of optionParameters) {
        const draft = drafts[parameter.clave] ?? null;
        if (draft === parameter.valor) continue;
        if (draft === null) {
          // "No sé todavía" nunca inventa un valor ni manda PUT. Si había una
          // respuesta previa, DELETE vuelve a dejarla pendiente; si no, no se
          // hace ninguna escritura.
          if (parameter.valor !== null) {
            await leavePending.mutateAsync(parameter.clave);
          }
          continue;
        }
        await saveOption.mutateAsync({ key: parameter.clave, value: draft });
      }
      setAnswerFeedback({ tone: 'ok', text: 'Respuestas guardadas. Podés volver cuando quieras.' });
      if (isOnboarding) setStep(2);
    } catch (error) {
      setAnswerFeedback({ tone: 'error', text: apiErrorMessage(error) });
    }
  };

  if (modules.isLoading || parameters.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-label="Cargando configuración del rubro">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-44 rounded-xl" />)}
      </div>
    );
  }

  if (modules.isError || parameters.isError) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-danger" role="alert">
          {apiErrorMessage(modules.error ?? parameters.error)}
        </CardBody>
      </Card>
    );
  }

  return (
    <section data-testid="rubro-configuration" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-granate">
            <Settings2 className="size-5" aria-hidden />
            <h2 className="text-xl font-bold text-granate-deep">
              {isOnboarding ? 'Configurá cómo trabaja tu empresa' : 'Configuración del rubro'}
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
            {companyName ? `${companyName}: ` : ''}prendé solamente lo que usás y respondé lo que ya sabés.
            Ningún pendiente te bloquea.
          </p>
        </div>
        {isOnboarding && (
          <span className="w-fit rounded-full border border-line bg-surface-alt px-3 py-1 text-[11px] font-bold text-ink-soft">
            Paso {step + 1} de 3
          </span>
        )}
      </div>

      {moduleError && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-[13px] font-semibold text-danger">
          {moduleError}
        </p>
      )}

      {showModules && (
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <SlidersHorizontal className="size-4 text-granate" aria-hidden /> Lo que usás
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Al apagar algo deja de aparecer en la app, pero los datos que ya cargaste no se borran.
            </p>
          </div>
          {(modules.data ?? []).length === 0 ? (
            <Card>
              <CardBody className="py-10 text-center text-sm text-ink-soft">
                Este rubro no tiene módulos configurables.
              </CardBody>
            </Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2" aria-label="Módulos del rubro">
              {(modules.data ?? []).map((module) => (
                <ModuleSwitch key={module.clave} module={module} onRequestChange={setModuleToChange} />
              ))}
            </ul>
          )}
        </div>
      )}

      {showQuestions && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-ink">Preguntas del negocio</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Las opciones y sus nombres vienen del rubro. Si todavía no lo sabés, dejalo pendiente:
              no se guarda ningún valor sugerido por vos.
            </p>
          </div>
          {optionParameters.length === 0 ? (
            <Card>
              <CardBody className="py-10 text-center text-sm text-ink-soft">
                Los módulos prendidos no tienen preguntas de opción pendientes.
              </CardBody>
            </Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2" aria-label="Preguntas del rubro">
              {optionParameters.map((parameter) => (
                <OptionQuestion
                  key={parameter.clave}
                  parameter={parameter}
                  value={drafts[parameter.clave] ?? null}
                  onChange={(value) => {
                    setDrafts((current) => ({ ...current, [parameter.clave]: value }));
                    setAnswerFeedback(null);
                  }}
                />
              ))}
            </ul>
          )}
          {answerFeedback && (
            <p
              role={answerFeedback.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'text-[12.5px] font-semibold',
                answerFeedback.tone === 'error' ? 'text-danger' : 'text-ok',
              )}
            >
              {answerFeedback.text}
            </p>
          )}
        </div>
      )}

      {showSummary && (
        <Card>
          <CardBody className="space-y-5 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ok/10 text-ok">
              <Check className="size-6" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Configuración lista para empezar</h3>
              <p className="mx-auto mt-1 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                Dejaste {activeModules.length} módulo{activeModules.length === 1 ? '' : 's'} prendido{activeModules.length === 1 ? '' : 's'}
                {' '}y respondiste {answeredQuestions.length} de {optionParameters.length} pregunta{optionParameters.length === 1 ? '' : 's'}.
                Lo pendiente no bloquea el alta y podés cambiarlo después desde tu perfil.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
        {isOnboarding && step > 0 && step < 2 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> Volver
          </Button>
        ) : <span />}

        {!isOnboarding && (
          <Button
            type="button"
            onClick={() => void saveAnswers()}
            loading={saveOption.isPending || leavePending.isPending}
          >
            <Save className="size-4" aria-hidden /> Guardar respuestas
          </Button>
        )}
        {isOnboarding && step === 0 && (
          <Button type="button" onClick={() => setStep(1)}>
            Seguir con las preguntas <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
        {isOnboarding && step === 1 && (
          <Button
            type="button"
            onClick={() => void saveAnswers()}
            loading={saveOption.isPending || leavePending.isPending}
          >
            Ver resumen <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
        {isOnboarding && step === 2 && (
          <Button type="button" onClick={onComplete}>
            Continuar <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={moduleToChange !== null}
        title={moduleToChange?.estado === 'prendido' ? 'Apagar módulo' : 'Prender módulo'}
        message={moduleToChange && (
          <div className="space-y-2">
            <p>
              <strong>{moduleToChange.estado === 'prendido' ? 'Dejarás de ver:' : 'Va a aparecer:'}</strong>{' '}
              {moduleToChange.descripcion}
            </p>
            {moduleToChange.estado === 'prendido' ? (
              <p>Los datos que ya cargaste no se borran. Volverán a aparecer si lo prendés otra vez.</p>
            ) : (
              <p>
                También te vamos a pedir {moduleToChange.parametros.length}{' '}
                {moduleToChange.parametros.length === 1 ? 'dato relacionado' : 'datos relacionados'} cuando correspondan.
              </p>
            )}
          </div>
        )}
        confirmLabel={moduleToChange?.estado === 'prendido' ? 'Sí, apagar' : 'Sí, prender'}
        loading={setModule.isPending}
        onConfirm={() => void confirmModuleChange()}
        onCancel={() => setModuleToChange(null)}
      />
    </section>
  );
}
