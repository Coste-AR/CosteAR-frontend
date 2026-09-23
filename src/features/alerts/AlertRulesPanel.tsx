import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCompanies } from '@/features/companies/company-hooks';
import { apiErrorMessage } from '@/lib/api';
import type { AlertRule, AlertRuleInput } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { useAlertRuleCatalog, useAlertRules, useSaveAlertRule } from './alert-hooks';

type RuleForm = {
  indicador: string;
  descripcion: string;
  condicion: AlertRule['condicion'];
  umbral: string;
  severidad: AlertRule['severidad'];
  canal: AlertRule['canal'];
  destinatarios: string;
};

const emptyForm: RuleForm = {
  indicador: '',
  descripcion: '',
  condicion: 'MAYOR',
  umbral: '',
  severidad: 'ADVERTENCIA',
  canal: 'IN_APP',
  destinatarios: '',
};

const selectClass = 'h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none focus:ring-2 focus:ring-granate/15';

export function AlertRulesPanel() {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const companyId = selectedCompanyId || (companies.length === 1 ? companies[0]?.id ?? '' : '');
  const { data: catalog = [], isLoading: catalogLoading, isError: catalogError } = useAlertRuleCatalog(companyId);
  const { data: rules = [], isLoading: rulesLoading, isError: rulesError } = useAlertRules(companyId);
  const saveRule = useSaveAlertRule(companyId);
  const [editingId, setEditingId] = useState<string | undefined>();
  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm<RuleForm>({ defaultValues: emptyForm });
  const selectedIndicator = watch('indicador');
  const selectedChannel = watch('canal');
  const indicator = catalog.find((item) => item.clave === selectedIndicator);

  function changeCompany(id: string) {
    setSelectedCompanyId(id);
    setEditingId(undefined);
    reset(emptyForm);
  }

  function editRule(rule: AlertRule) {
    setEditingId(rule.id);
    reset({
      indicador: rule.indicador,
      descripcion: rule.descripcion,
      condicion: rule.condicion,
      umbral: String(rule.umbral),
      severidad: rule.severidad,
      canal: rule.canal,
      destinatarios: rule.destinatarios.join(', '),
    });
  }

  const submit = handleSubmit(async (values) => {
    const input: AlertRuleInput = {
      indicador: values.indicador,
      descripcion: values.descripcion.trim(),
      condicion: values.condicion,
      umbral: Number.parseFloat(values.umbral),
      severidad: values.severidad,
      canal: values.canal,
      destinatarios: values.canal === 'EMAIL'
        ? values.destinatarios.split(',').map((address) => address.trim()).filter(Boolean)
        : [],
      activa: true,
    };
    try {
      await saveRule.mutateAsync({ id: editingId, input });
      setEditingId(undefined);
      reset(emptyForm);
    } catch (error) {
      setError('umbral', { type: 'server', message: apiErrorMessage(error) });
    }
  });

  return (
    <Card>
      <CardHeader title="Reglas de alerta" />
      <CardBody className="space-y-6">
        {companiesLoading ? <p className="text-sm text-ink-soft">Cargando negocios…</p> : companies.length === 0 ? (
          <p className="text-sm text-ink-soft">Agregá un negocio para configurar sus reglas de alerta.</p>
        ) : (
          <>
            {companies.length > 1 && (
              <label className="block space-y-1.5 text-xs font-medium uppercase text-ink-soft">
                Negocio
                <select aria-label="Negocio" className={selectClass} value={companyId} onChange={(event) => changeCompany(event.target.value)}>
                  <option value="">Seleccioná un negocio</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>
            )}
            {companyId && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-ink">Reglas guardadas</h3>
                  {rulesLoading ? <p className="mt-2 text-sm text-ink-soft">Cargando reglas…</p>
                    : rulesError ? <p role="alert" className="mt-2 text-sm text-danger">No se pudieron cargar las reglas.</p>
                    : rules.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Todavía no hay reglas para este negocio.</p>
                    : <ul className="mt-3 space-y-2">
                      {rules.map((rule) => (
                        <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                          <div>
                            <p className="font-semibold text-ink">{catalog.find((item) => item.clave === rule.indicador)?.etiqueta ?? rule.descripcion}</p>
                            <p className="text-xs text-ink-soft">{rule.condicion === 'MAYOR' ? 'Mayor que' : rule.condicion === 'MENOR' ? 'Menor que' : 'Fuera de rango'} {rule.umbral} · {rule.severidad} · {rule.activa ? 'Activa' : 'Inactiva'} · {formatDate(rule.updatedAt ?? rule.createdAt)}</p>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => editRule(rule)}>Editar</Button>
                        </li>
                      ))}
                    </ul>}
                </div>

                <form onSubmit={submit} className="space-y-4 border-t border-line pt-5">
                  <h3 className="text-sm font-bold text-ink">{editingId ? 'Editar regla' : 'Nueva regla'}</h3>
                  {catalogError ? <p role="alert" className="text-sm text-danger">No se pudo cargar el catálogo de indicadores.</p> : catalogLoading ? <p className="text-sm text-ink-soft">Cargando indicadores…</p> : catalog.length === 0 ? <p className="text-sm text-ink-soft">Este rubro todavía no tiene indicadores configurables.</p> : (
                    <>
                      <label className="block space-y-1.5 text-xs font-medium uppercase text-ink-soft">
                        Indicador
                        <select aria-label="Indicador" className={selectClass} {...register('indicador', { onChange: (event) => {
                          const chosen = catalog.find((item) => item.clave === event.target.value);
                          if (chosen && !editingId) setValue('descripcion', `Aviso para ${chosen.etiqueta}`);
                        } })}>
                          <option value="">Seleccioná un indicador</option>
                          {catalog.map((item) => <option key={item.clave} value={item.clave}>{item.etiqueta} ({item.unidad})</option>)}
                        </select>
                      </label>
                      <Input label="Descripción" {...register('descripcion')} />
                      <label className="block space-y-1.5 text-xs font-medium uppercase text-ink-soft">
                        Condición
                        <select aria-label="Condición" className={selectClass} {...register('condicion')}>
                          <option value="MAYOR">Mayor que el umbral</option>
                          <option value="MENOR">Menor que el umbral</option>
                          <option value="FUERA_DE_RANGO_PCT">Fuera de rango (%)</option>
                        </select>
                      </label>
                      <Input label={`Umbral${indicator ? ` (${indicator.unidad})` : ''}`} type="number" step="any" numeric error={errors.umbral?.message} {...register('umbral')} />
                      <label className="block space-y-1.5 text-xs font-medium uppercase text-ink-soft">
                        Severidad
                        <select aria-label="Severidad" className={selectClass} {...register('severidad')}>
                          <option value="INFO">Información</option>
                          <option value="ADVERTENCIA">Advertencia</option>
                          <option value="CRITICA">Crítica</option>
                        </select>
                      </label>
                      <label className="block space-y-1.5 text-xs font-medium uppercase text-ink-soft">
                        A quién avisar
                        <select aria-label="A quién avisar" className={selectClass} {...register('canal')}>
                          <option value="IN_APP">Titular del negocio, en la app</option>
                          <option value="EMAIL">Direcciones de correo</option>
                        </select>
                      </label>
                      {selectedChannel === 'EMAIL' && <Input label="Direcciones de correo (separadas por comas)" type="text" hint="Si queda vacío, se avisa al titular del negocio." {...register('destinatarios')} />}
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" loading={saveRule.isPending}>{editingId ? 'Guardar cambios' : 'Guardar regla'}</Button>
                        {editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(undefined); reset(emptyForm); }}>Cancelar</Button>}
                      </div>
                    </>
                  )}
                </form>
              </>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
