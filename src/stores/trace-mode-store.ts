import { create } from 'zustand';

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
 * El resalte de los valores trazables está siempre activo; este store sólo
 * conserva qué ficha o derivación está abierta.
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
  /** El DataPoint cuya ficha está abierta en el panel lateral. */
  openDataPointId: string | null;
  /** El cálculo cuya derivación está abierta en el panel lateral. */
  openDerivation: DerivationDetail | null;
  openTrace: (dataPointId: string) => void;
  openNode: (node: DerivationDetail) => void;
  closeTrace: () => void;
}

export const useTraceMode = create<TraceModeState>((set) => ({
  openDataPointId: null,
  openDerivation: null,
  // Abrir una vista cierra la otra: el panel muestra UNA cosa a la vez.
  openTrace: (dataPointId) => set({ openDataPointId: dataPointId, openDerivation: null }),
  openNode: (node) => set({ openDerivation: node, openDataPointId: null }),
  closeTrace: () => set({ openDataPointId: null, openDerivation: null }),
}));
