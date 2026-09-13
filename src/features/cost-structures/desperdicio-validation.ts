export interface DesperdicioDraft {
  concepto: string;
  valor: string;
  valorRecupero: string;
  naturaleza: '' | 'normal' | 'extraordinaria';
  motivo: string;
}

export type DesperdicioErrors = Partial<Record<keyof DesperdicioDraft, string>>;

export function validateDesperdicioDraft(draft: DesperdicioDraft): DesperdicioErrors {
  const errors: DesperdicioErrors = {};
  const valor = Number(draft.valor);
  const recupero = draft.valorRecupero.trim() === '' ? 0 : Number(draft.valorRecupero);

  if (!draft.concepto.trim()) errors.concepto = 'Escribí qué se perdió.';
  if (draft.concepto.trim().length > 200) errors.concepto = 'Usá hasta 200 caracteres.';
  if (draft.valor.trim() === '' || !Number.isFinite(valor) || valor < 0) {
    errors.valor = 'Ingresá un importe válido, igual o mayor que cero.';
  }
  if (!Number.isFinite(recupero) || recupero < 0) {
    errors.valorRecupero = 'Ingresá un recupero válido, igual o mayor que cero.';
  } else if (Number.isFinite(valor) && recupero > valor) {
    errors.valorRecupero = 'El recupero no puede ser mayor que el valor de lo perdido.';
  }
  if (draft.motivo.trim().length > 1000) errors.motivo = 'Usá hasta 1.000 caracteres.';

  return errors;
}
