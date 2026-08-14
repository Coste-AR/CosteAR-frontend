import { fractionToPercentInput, percentInputToFraction } from '@/lib/utils';
import { type RawMaterialConfig } from '../../cost-structure-types';

/**
 * LA CLAVE DE UN PARÁMETRO DE MATERIA PRIMA (T-05).
 *
 * Los insumos de una MP que NO son movimientos —los cuatro de Wilson y la
 * existencia inicial— se guardan como `mp.<discriminante>.<sufijo>`. El
 * discriminante es lo primero que identifica a la materia prima dentro de la
 * sección: su id, si no su código, si no su nombre, y si no la posición.
 *
 * Es la MISMA regla que aplica el lado de escritura (`materialKey()` en
 * `orders-input-points.ts` del backend), replicada acá porque es la única forma
 * de que la pantalla nombre el dato que ella misma cargó. Si divergiera, la
 * clave no resolvería y el valor quedaría sin marcar — nunca marcado de más:
 * el índice solo devuelve fichas que existen.
 */
export function mpMaterialKey(m: RawMaterialConfig, index: number): string {
  const fallback = `mp${index + 1}`;
  const raw = m.id ?? m.code ?? m.name ?? fallback;
  return raw.trim().slice(0, 60) || fallback;
}

/** `fieldKey` de un parámetro de MP, con la convención del lado de escritura. */
export function mpFieldKey(m: RawMaterialConfig, index: number, suffix: string): string {
  return `mp.${mpMaterialKey(m, index)}.${suffix}`;
}

export function emptyRawMaterial(): RawMaterialConfig {
  return {
    wilson: { annualDemand: 0, orderCost: 0, holdingRate: 0, unitCost: 0 },
    stockPolicy: { minConsumption: 0, maxConsumption: 0, minLeadTime: 0, maxLeadTime: 0, safetyStock: 0 },
    initialStock: { quantity: 0, unitCost: 0 },
    movements: [],
  };
}

export function cleanRawMaterialForForm(cfg?: RawMaterialConfig): any {
  const base = cfg ?? emptyRawMaterial();
  return {
    id: base.id,
    code: base.code ?? '',
    name: base.name ?? '',
    unit: base.unit ?? '',
    supplier: base.supplier ?? '',
    wilson: {
      annualDemand: base.wilson?.annualDemand === 0 ? '' : (base.wilson?.annualDemand ?? ''),
      orderCost: base.wilson?.orderCost === 0 ? '' : (base.wilson?.orderCost ?? ''),
      holdingRate: fractionToPercentInput(base.wilson?.holdingRate),
      unitCost: base.wilson?.unitCost === 0 ? '' : (base.wilson?.unitCost ?? ''),
    },
    stockPolicy: {
      minConsumption: base.stockPolicy?.minConsumption === 0 ? '' : (base.stockPolicy?.minConsumption ?? ''),
      maxConsumption: base.stockPolicy?.maxConsumption === 0 ? '' : (base.stockPolicy?.maxConsumption ?? ''),
      minLeadTime: base.stockPolicy?.minLeadTime === 0 ? '' : (base.stockPolicy?.minLeadTime ?? ''),
      maxLeadTime: base.stockPolicy?.maxLeadTime === 0 ? '' : (base.stockPolicy?.maxLeadTime ?? ''),
      safetyStock: base.stockPolicy?.safetyStock === 0 ? '' : (base.stockPolicy?.safetyStock ?? ''),
    },
    initialStock: {
      quantity: base.initialStock?.quantity === 0 ? '' : (base.initialStock?.quantity ?? ''),
      unitCost: base.initialStock?.unitCost === 0 ? '' : (base.initialStock?.unitCost ?? ''),
    },
    movements: (base.movements ?? []).map((m) => ({
      ...m,
      quantity: m.quantity === 0 ? '' : (m.quantity ?? ''),
      unitCost: m.type === 'consumption' ? null : (m.unitCost === 0 ? '' : (m.unitCost ?? '')),
    })),
  };
}

export function cleanRawMaterialForSubmit(data: any): RawMaterialConfig {
  const fallbackNum = (val: any) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };
  const str = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    id: data.id ?? crypto.randomUUID(),
    code: str(data.code),
    name: str(data.name),
    unit: str(data.unit),
    supplier: str(data.supplier),
    wilson: {
      annualDemand: fallbackNum(data.wilson?.annualDemand),
      orderCost: fallbackNum(data.wilson?.orderCost),
      holdingRate: percentInputToFraction(data.wilson?.holdingRate),
      unitCost: fallbackNum(data.wilson?.unitCost),
    },
    stockPolicy: {
      minConsumption: fallbackNum(data.stockPolicy?.minConsumption),
      maxConsumption: fallbackNum(data.stockPolicy?.maxConsumption),
      minLeadTime: fallbackNum(data.stockPolicy?.minLeadTime),
      maxLeadTime: fallbackNum(data.stockPolicy?.maxLeadTime),
      safetyStock: fallbackNum(data.stockPolicy?.safetyStock),
    },
    initialStock: {
      quantity: fallbackNum(data.initialStock?.quantity),
      unitCost: fallbackNum(data.initialStock?.unitCost),
    },
    movements: (data.movements ?? []).map((m: any) => ({
      ...m,
      quantity: fallbackNum(m.quantity),
      unitCost: fallbackNum(m.unitCost),
    })),
  };
}
