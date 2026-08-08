import { type IndirectCostConfig } from '../../cost-structure-types';

export function emptyIndirectCosts(): IndirectCostConfig {
  return {
    centers: [],
    concepts: [],
    serviceDistributions: [],
    productiveSettings: [],
  };
}

export function cleanIndirectCostsForForm(cfg?: IndirectCostConfig): any {
  const base = cfg ?? emptyIndirectCosts();

  const cleanRecord = (rec?: Record<string, number>) => {
    if (!rec) return {};
    const res: Record<string, any> = {};
    for (const k in rec) {
      res[k] = rec[k] === 0 ? '' : rec[k];
    }
    return res;
  };

  return {
    centers: base.centers ?? [],
    concepts: (base.concepts ?? []).map((c) => ({
      ...c,
      allocationMode: c.allocationMode === 'base' ? 'base' : 'percent',
      baseCode: c.baseCode ?? '',
      amount: {
        fixed: c.amount?.fixed === 0 ? '' : (c.amount?.fixed ?? ''),
        variable: c.amount?.variable === 0 ? '' : (c.amount?.variable ?? ''),
      },
      distribution: cleanRecord(c.distribution),
    })),
    serviceDistributions: (base.serviceDistributions ?? []).map((s) => {
      const fijoRec: Record<string, number> = {};
      const varRec: Record<string, number> = {};
      const unitsRec: Record<string, number> = {};
      for (const p of s.distributions ?? []) {
        if (!p || !p.centroDestinoId) continue;
        fijoRec[p.centroDestinoId] = p.fijo;
        varRec[p.centroDestinoId] = p.variable;
        unitsRec[p.centroDestinoId] = p.fijo;
      }
      return {
        serviceCenterId: s.serviceCenterId,
        distributionMode: s.distributionMode ?? 'manual',
        baseCode: s.baseCode ?? '',
        toProductive: cleanRecord(unitsRec),
        toProductiveFixed: cleanRecord(fijoRec),
        toProductiveVariable: cleanRecord(varRec),
      };
    }),
    productiveSettings: (base.productiveSettings ?? []).map((p) => ({
      ...p,
      budget: {
        fixed: p.budget?.fixed === 0 ? '' : (p.budget?.fixed ?? ''),
        variable: p.budget?.variable === 0 ? '' : (p.budget?.variable ?? ''),
      },
      normalCapacity: p.normalCapacity === 0 ? '' : (p.normalCapacity ?? ''),
      actualActivity: p.actualActivity === 0 ? '' : (p.actualActivity ?? ''),
      actualCip: p.actualCip === 0 ? '' : (p.actualCip ?? ''),
    })),
  };
}

export function cleanIndirectCostsForSubmit(data: any): IndirectCostConfig {
  // DEFECT 2 — red de seguridad en el BORDE del payload: sólo son destinos
  // válidos los centros que existen. Si se eliminó un centro que se usaba como
  // destino del reparto secundario, ningún par colgado (`centroDestinoId`
  // apuntando a un centro inexistente) llega al backend, aunque el estado del
  // formulario quedara con una clave vieja.
  const validCenterIds = new Set<string>(
    (data.centers ?? []).map((c: any) => c?.id).filter((x: any): x is string => !!x)
  );

  const fallbackNum = (val: any) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };

  const cleanRecord = (rec?: Record<string, any>) => {
    if (!rec) return {};
    const res: Record<string, number> = {};
    for (const k in rec) {
      res[k] = fallbackNum(rec[k]);
    }
    return res;
  };

  return {
    centers: data.centers ?? [],
    concepts: (data.concepts ?? []).map((c: any) => {
      const mode = c.allocationMode === 'base' ? 'base' : 'percent';
      const common = {
        name: c.name,
        amount: { fixed: fallbackNum(c.amount?.fixed), variable: fallbackNum(c.amount?.variable) },
        allocationMode: mode,
        distribution: cleanRecord(c.distribution),
      };
      return mode === 'base' ? { ...common, baseCode: (c.baseCode ?? '').trim() } : common;
    }),
    serviceDistributions: (data.serviceDistributions ?? []).map((s: any, idx: number) => {
      const mode = s.distributionMode === 'base' ? 'base' : 'manual';
      const serviceCenterId = s.serviceCenterId;

      // Escalonado (Parte 4.4): el orden de las filas es el orden de cierre. Un
      // servicio sólo puede repartir a servicios que TODAVÍA NO cerraron (filas
      // posteriores) y a los productivos; nunca a un servicio ya cerrado ni a sí
      // mismo. Los servicios de las filas 0..idx ya cerraron para esta fila, así
      // que descartamos cualquier destino que apunte a ellos. Es una red de
      // seguridad: aunque la UI dejara un valor viejo en una columna que quedó
      // bloqueada tras un reordenamiento, jamás llega al motor de cálculo.
      const closedServiceIds = new Set<string>(
        (data.serviceDistributions ?? [])
          .slice(0, idx + 1)
          .map((r: any) => r?.serviceCenterId)
          .filter((x: any): x is string => !!x)
      );

      let distributions: any[] = [];
      if (mode === 'base') {
        const units = cleanRecord(s.toProductive);
        distributions = Object.keys(units)
          .filter((id) => id && validCenterIds.has(id) && !closedServiceIds.has(id))
          .map((id) => ({ centroDestinoId: id, fijo: units[id]!, variable: units[id]! }))
          .filter((p) => p.fijo !== 0);
      } else {
        const fx = cleanRecord(s.toProductiveFixed);
        const va = cleanRecord(s.toProductiveVariable);
        const ids = new Set([...Object.keys(fx), ...Object.keys(va)]);
        distributions = [...ids]
          .filter((id) => id && validCenterIds.has(id) && !closedServiceIds.has(id))
          .map((id) => ({ centroDestinoId: id, fijo: fx[id] ?? 0, variable: va[id] ?? 0 }))
          .filter((p) => p.fijo !== 0 || p.variable !== 0);
      }

      return mode === 'base'
        ? { serviceCenterId, distributionMode: 'base' as const, baseCode: (s.baseCode ?? '').trim(), distributions }
        : { serviceCenterId, distributionMode: 'manual' as const, distributions };
    }),
    productiveSettings: (data.productiveSettings ?? []).map((p: any) => ({
      ...p,
      budget: {
        fixed: fallbackNum(p.budget?.fixed),
        variable: fallbackNum(p.budget?.variable),
      },
      normalCapacity: fallbackNum(p.normalCapacity),
      actualActivity: fallbackNum(p.actualActivity),
      actualCip: fallbackNum(p.actualCip),
    })),
    closureOrder: (data.serviceDistributions ?? [])
      .map((s: any) => s.serviceCenterId)
      .filter((x: string) => !!x),
  };
}

export function fmtBudget(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n) || n === 0) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Centros productivos que quedarían guardados sin capacidad normal.
 *
 * La capacidad normal es el divisor de la cuota de costos indirectos. En cero,
 * la cuota da cero, el producto sale costeado sin carga fabril y el margen
 * parece sano: es un número plausible y mal, que es el peor tipo de número.
 *
 * El backend lo rechaza con un 422 que nombra el centro (corrección C-02). Esta
 * función existe para avisarlo en la pantalla antes de mandar el guardado, para
 * que el costista no pierda el viaje. El 422 se mantiene como red de atrás: hay
 * otros caminos de escritura (el poblador automático de documentos) que no pasan
 * por este formulario.
 *
 * Devuelve los NOMBRES de los centros, nunca sus ids.
 */
export function centrosSinCapacidadNormal(
  productiveSettings: { centerId?: string; normalCapacity?: number }[] | undefined,
  centers: { id?: string; name?: string }[] | undefined,
): string[] {
  return (productiveSettings ?? [])
    .filter((p) => !p.normalCapacity || p.normalCapacity <= 0)
    .map((p) => centers?.find((c) => c.id === p.centerId)?.name?.trim() || 'sin nombre');
}
