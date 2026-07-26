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
interface TraceModeState {
  /** Resaltar todos los valores trazables. */
  on: boolean;
  /** El DataPoint cuya ficha está abierta en el panel lateral. */
  openDataPointId: string | null;
  toggle: () => void;
  openTrace: (dataPointId: string) => void;
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
  toggle: () => {
    const on = !get().on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* preferencia no persistida: no es motivo para romper el toggle */
    }
    set({ on });
  },
  openTrace: (dataPointId) => set({ openDataPointId: dataPointId }),
  closeTrace: () => set({ openDataPointId: null }),
}));
