import { create } from 'zustand';

const KEY = 'costear_trace_mode';

/**
 * MODO TRAZABILIDAD GLOBAL (U10).
 *
 * Un solo interruptor para toda la app. Cuando está encendido, cada número que
 * tiene origen rastreable se resalta; cuando está apagado, la pantalla queda
 * limpia pero los números siguen siendo clickeables.
 *
 * Se guarda en `localStorage` porque es una preferencia de visualización, no un
 * dato: sobrevive a la navegación y a recargar la página, que es justo lo que se
 * espera de un modo. No hay nada sensible acá.
 */
/**
 * Lo que puede haber detrás de un número, y son dos cosas distintas:
 *
 *   · un DATO CARGADO — tiene ficha propia: quién lo cargó, cuándo, con qué
 *     comprobante, sus versiones;
 *   · un DERIVADO — no lo cargó nadie, salió de una cuenta. Lo que hay para
 *     mostrar es la FÓRMULA y los números que entraron.
 *
 * El panel muestra una u otra según el caso. Mezclarlas en una sola vista sería
 * mentir sobre el origen de la mitad de los números de la app.
 */
export interface DerivationDetail {
  label: string;
  formula: string | null;
  value: number | null;
  unit: string | null;
  children: DerivationDetail[];
  /** Si el nodo es una hoja cargada a mano, su DataPoint. */
  dataPointId?: string | null;
}

interface TraceModeState {
  /** Resaltar todos los valores trazables. */
  on: boolean;
  /** El DataPoint cuya ficha está abierta en el panel lateral. */
  openDataPointId: string | null;
  /** El cálculo cuya derivación está abierta en el panel lateral. */
  openDerivation: DerivationDetail | null;
  toggle: () => void;
  openTrace: (dataPointId: string) => void;
  openNode: (node: DerivationDetail) => void;
  closeTrace: () => void;
}

const leerPreferencia = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Modo privado o storage bloqueado: el modo arranca apagado y funciona igual.
    return false;
  }
};

export const useTraceMode = create<TraceModeState>((set, get) => ({
  on: leerPreferencia(),
  openDataPointId: null,
  openDerivation: null,
  toggle: () => {
    const on = !get().on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* preferencia no persistida: no es motivo para romper el toggle */
    }
    set({ on });
  },
  // Abrir una vista cierra la otra: el panel muestra UNA cosa a la vez.
  openTrace: (dataPointId) => set({ openDataPointId: dataPointId, openDerivation: null }),
  openNode: (node) => set({ openDerivation: node, openDataPointId: null }),
  closeTrace: () => set({ openDataPointId: null, openDerivation: null }),
}));
