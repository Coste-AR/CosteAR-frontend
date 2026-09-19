import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';

/**
 * DESAGREGACIÓN DE COSTOS SEMIFIJOS (M1-02).
 *
 * Un costo semifijo tiene una parte que no se mueve con el volumen y otra que
 * sí. El backend separa las dos; acá sólo se le pide la cuenta y se muestra.
 * La vista previa y el guardado mandan EL MISMO payload y el backend corre la
 * misma función de dominio con los dos, así que la pantalla no puede mostrar
 * un número distinto del que termina persistido.
 */

export const METODOS_SEMIFIJOS = [
  'PUNTOS_EXTREMOS',
  'CORRELACION',
  'DISPERSION_GRAFICA',
  'DECLARADO',
] as const;

export type MetodoSemifijo = (typeof METODOS_SEMIFIJOS)[number];

/**
 * Qué le pide cada método a la persona.
 *
 * `DISPERSION_GRAFICA` es el que engaña: por nombre parece que calcula como
 * los otros dos, pero el backend le exige observaciones Y además las dos
 * porciones declaradas — el gráfico lo lee la persona, no el servidor. Si el
 * formulario no pide las dos cosas, el método devuelve 422 siempre.
 */
export const EXIGENCIAS_POR_METODO: Record<
  MetodoSemifijo,
  { observaciones: boolean; porciones: boolean }
> = {
  PUNTOS_EXTREMOS: { observaciones: true, porciones: false },
  CORRELACION: { observaciones: true, porciones: false },
  DISPERSION_GRAFICA: { observaciones: true, porciones: true },
  DECLARADO: { observaciones: false, porciones: true },
};

export interface ObservacionSemifija {
  volumen: number;
  importe: number;
}

export interface SeparacionSemifija {
  importe: number;
  porcionFija: number;
  porcionVariable: number;
  metodo: MetodoSemifijo;
  observacionesBase: ObservacionSemifija[];
  /** `null` cuando el método no lo produce. Ausencia declarada, no cero. */
  costoVariableUnitario: number | null;
  coeficienteCorrelacion: number | null;
}

export interface SepararSemifijoInput {
  importe: number;
  metodo: MetodoSemifijo;
  observacionesBase?: ObservacionSemifija[];
  porcionFija?: number;
  porcionVariable?: number;
}

export interface ConceptoSemifijo {
  id: string;
  clave: string;
  descripcion: string | null;
  confirmado: boolean;
}

interface ConceptoCosteoApi {
  id: string;
  clave: string;
  descripcion: string | null;
  comportamientoVolumen: 'VARIABLE' | 'FIJO' | 'SEMIFIJO' | null;
  confirmado: boolean;
}

/**
 * Los importes persistidos son `Decimal` de Prisma y viajan como string; los
 * de la vista previa son `number` porque salen del dominio sin pasar por la
 * base. Las dos formas entran por acá para no repartir `Number(...)` sueltos
 * por la pantalla.
 */
function numero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : null;
  }
  return null;
}

interface TramoGuardadoApi {
  porcionFija: number | string;
  porcionVariable: number | string;
  metodo: MetodoSemifijo;
  observacionesBase: unknown;
  costoVariableUnitario: number | string | null;
  coeficienteCorrelacion: number | string | null;
}

function observaciones(valor: unknown): ObservacionSemifija[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    const volumen = numero((item as ObservacionSemifija | undefined)?.volumen);
    const importe = numero((item as ObservacionSemifija | undefined)?.importe);
    return volumen === null || importe === null ? [] : [{ volumen, importe }];
  });
}

/**
 * La fila guardada no trae `importe`: es la suma de las dos porciones, y el
 * backend ya garantizó esa igualdad antes de escribirla (si no suman, no
 * guarda). Se reconstruye acá en vez de pedir otro endpoint.
 */
function desdeFilaGuardada(fila: TramoGuardadoApi): SeparacionSemifija | null {
  const porcionFija = numero(fila.porcionFija);
  const porcionVariable = numero(fila.porcionVariable);
  if (porcionFija === null || porcionVariable === null) return null;
  return {
    importe: porcionFija + porcionVariable,
    porcionFija,
    porcionVariable,
    metodo: fila.metodo,
    observacionesBase: observaciones(fila.observacionesBase),
    costoVariableUnitario: numero(fila.costoVariableUnitario),
    coeficienteCorrelacion: numero(fila.coeficienteCorrelacion),
  };
}

/**
 * Sólo los conceptos clasificados `SEMIFIJO` se pueden separar: el backend
 * rechaza cualquier otro con un 422. Se filtra acá para no ofrecer en la lista
 * algo que va a fallar al tocarlo.
 */
export function useConceptosSemifijos(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'conceptos-costeo', 'semifijos'],
    queryFn: async () => {
      const res = await api.get<{ data: ConceptoCosteoApi[] }>(
        `/companies/${companyId}/conceptos-costeo`,
      );
      return res.data.data
        .filter((concepto) => concepto.comportamientoVolumen === 'SEMIFIJO')
        .map<ConceptoSemifijo>((concepto) => ({
          id: concepto.id,
          clave: concepto.clave,
          descripcion: concepto.descripcion,
          confirmado: concepto.confirmado,
        }));
    },
    enabled: !!companyId,
  });
}

/**
 * El 404 de este endpoint NO es un error: significa «todavía nadie separó este
 * concepto». Se traduce a `null` para que la pantalla lo pueda decir con
 * palabras en vez de mostrar un cartel rojo o, peor, ceros.
 */
export function useSeparacionGuardada(companyId: string, conceptoId: string | null) {
  return useQuery({
    queryKey: ['companies', companyId, 'tramo-semifijo', conceptoId],
    queryFn: async (): Promise<SeparacionSemifija | null> => {
      try {
        const res = await api.get<{ data: TramoGuardadoApi }>(
          `/companies/${companyId}/conceptos-costeo/${conceptoId}/tramo-semifijo`,
        );
        return desdeFilaGuardada(res.data.data);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!companyId && !!conceptoId,
    retry: false,
  });
}

export function usePrevisualizarSeparacion(companyId: string, conceptoId: string | null) {
  return useMutation({
    mutationFn: async (input: SepararSemifijoInput) => {
      const res = await api.post<{ data: SeparacionSemifija }>(
        `/companies/${companyId}/conceptos-costeo/${conceptoId}/tramo-semifijo/calcular`,
        input,
      );
      return res.data.data;
    },
  });
}

export function useGuardarSeparacion(companyId: string, conceptoId: string | null) {
  return useMutation({
    mutationFn: async (input: SepararSemifijoInput) => {
      const res = await api.put<{ data: TramoGuardadoApi }>(
        `/companies/${companyId}/conceptos-costeo/${conceptoId}/tramo-semifijo`,
        input,
      );
      return desdeFilaGuardada(res.data.data);
    },
  });
}
