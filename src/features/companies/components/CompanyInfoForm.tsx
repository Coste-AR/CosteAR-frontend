import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import {
  PERIODICITY_OPTIONS,
  CONDICION_IVA_OPTIONS,
  CONDICION_IVA_AYUDA,
  type Periodicity,
  type CondicionIva,
} from '@/lib/types';
import { apiErrorMessage } from '@/lib/api';
import { useUpdateCompany } from '../company-hooks';
import toast from 'react-hot-toast';

export function CompanyInfoForm({
  company,
  onClose,
}: {
  company: {
    id: string;
    name: string;
    industry: string | null;
    cuit?: string | null;
    periodicity?: Periodicity;
    condicionIva?: CondicionIva;
    condicionIvaRevisar?: boolean;
    condicionIvaRevisarNota?: string | null;
  };
  onClose: () => void;
}) {
  const update = useUpdateCompany();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: {
      name: company.name,
      industry: company.industry ?? '',
      cuit: company.cuit ?? '',
      periodicity: company.periodicity ?? ('MONTHLY' as Periodicity),
      condicionIva: company.condicionIva ?? ('RESPONSABLE_INSCRIPTO' as CondicionIva),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: company.id,
        name: values.name,
        industry: values.industry || undefined,
        cuit: values.cuit || undefined,
        periodicity: values.periodicity,
        // Guardar acá también CONFIRMA la condición: el backend apaga la
        // bandera de revisión que hubiera levantado la IA.
        condicionIva: values.condicionIva,
      });
      onClose();
    } catch (e) {
      toast.error('Error al actualizar los datos: ' + apiErrorMessage(e));
    }
  });

  return (
    <PortalOverlay>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-rise border border-zinc-150">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Editar Cliente</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Razón Social" {...register('name', { required: true })} />
            <Input label="Sector / Actividad" {...register('industry')} />
            <Input label="CUIT (opcional)" {...register('cuit')} />
            <Select
              label="Ritmo de costeo"
              hint="Solo se puede cambiar mientras la empresa no tenga ningún período cargado."
              {...register('periodicity')}
              defaultValue={company.periodicity ?? 'MONTHLY'}
              options={PERIODICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            {company.condicionIvaRevisar && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
                <p className="font-bold mb-1">Revisá la condición frente al IVA</p>
                <p>{company.condicionIvaRevisarNota}</p>
              </div>
            )}
            <Select
              label="Condición frente al IVA"
              hint={CONDICION_IVA_AYUDA}
              {...register('condicionIva')}
              defaultValue={company.condicionIva ?? 'RESPONSABLE_INSCRIPTO'}
              options={CONDICION_IVA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" loading={formState.isSubmitting}>Guardar Cambios</Button>
            </div>
          </form>
        </div>
      </div>
    </PortalOverlay>
  );
}
