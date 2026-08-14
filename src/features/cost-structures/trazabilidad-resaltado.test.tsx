// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LaborDepartmentsView } from './LaborDepartmentsView';
import { CostCentersView } from './CostCentersView';
import { MaterialDetailForm } from './components/raw-materials/MaterialDetailForm';
import { RawMaterialsList } from './components/raw-materials/RawMaterialsList';
import { SalesTab } from './components/tabs/SalesTab';
import { ResultTab } from './components/tabs/ResultTab';
import { useTraceMode } from '@/stores/trace-mode-store';
import type { AllocationBase, AllocationBaseValue } from './allocation-base-hooks';
import type { DirectLaborConfig, IndirectCostConfig, RawMaterialConfig } from './cost-structure-types';
import type { MpMovement } from './trazabilidad-types';
import type { StructureDataPoint } from './trazabilidad-hooks';
import type { CalculationResult } from '@/lib/types';

/**
 * EL MODO TRAZABILIDAD TIENE QUE RESALTAR ALGO (T-05).
 *
 * El defecto que cubren estos tests: el interruptor global se prendía, el cartel
 * prometía "cada valor resaltado tiene origen rastreable"… y en 7 de las 8
 * pestañas no había un solo valor resaltado. Un modo que se prende y no cambia
 * nada le enseña al costista que la función no anda.
 *
 * La otra mitad —igual de importante— es que NO se resalte lo que no tiene
 * origen. La auditoría no encontró un solo valor que prometiera ficha y no la
 * abriera; esa propiedad es la que hace creíble al resto y se prueba acá pantalla
 * por pantalla, con el par completo: un valor CON origen queda marcado y uno SIN
 * origen queda igual que siempre.
 *
 * "Marcado" = `TraceableValue` lo envolvió en su botón, que siempre lleva el
 * mismo `title` (…"ver cómo se calculó" para un derivado, …"ver de dónde sale"
 * para un dato cargado). Sin origen, el componente devuelve el texto pelado y no
 * hay botón que buscar.
 */

// Resultado enlaza a la vista de trazabilidad; acá no hay router montado. Venta
// saca la estructura de la ruta (se monta siempre bajo /cost-structures/$id).
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useNavigate: () => () => {},
  useParams: () => ({ id: 'est-1' }),
}));

// Nada de red: lo que cada pantalla necesita se siembra en la cache de react-query.
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    post: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    put: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    patch: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
    delete: vi.fn(() => Promise.reject(new Error('sin red en los tests'))),
  },
  apiErrorMessage: () => 'error',
}));

/** Los valores marcados de la pantalla, sea cual sea su tipo de origen. */
const marcados = (): HTMLElement[] => [
  ...screen.queryAllByTitle(/ver cómo se calculó$/),
  ...screen.queryAllByTitle(/ver de dónde sale$/),
];

/** Los marcados que abren una FICHA de dato cargado (no una cuenta). */
const conFicha = (): HTMLElement[] => screen.queryAllByTitle(/ver de dónde sale$/);

const conCache = (siembra: (qc: QueryClient) => void) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  siembra(qc);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

afterEach(cleanup);
beforeEach(() => {
  // El modo arranca prendido: es el escenario del defecto.
  useTraceMode.setState({ on: true, openDataPointId: null, openDerivation: null });
});

// ── Mano de Obra ─────────────────────────────────────────────────────────────

const configMod: DirectLaborConfig = {
  workingDays: {
    totalDaysPerYear: 365,
    unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
    paidAbsence: { holidays: 12, vacations: 14, sickness: 3, specialLeaves: 1, workAccidents: 0 },
  },
  itcs: { derivationBase: 0, fixedArt: 0, uncertainRemunerative: [], uncertainNonRemunerative: [] },
  departments: [{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000 }],
};

const calculoMod: CalculationResult['detail']['directLabor'] = {
  workingDays: 231,
  paidDays: 30,
  itcsPercent: 8.3333,
  iapPercent: 12.99,
  hourlyRates: { Armado: 942.5 },
  itcsBreakdown: { certain: 8.3333, uncertainRemunerative: 0, derived: 0, uncertainNonRemunerative: 0 },
  departments: [{
    name: 'Armado',
    basicRemuneration: 870_000,
    socialChargesCost: 72_500,
    totalMod: 942_500,
    hourlyRate: 942.5,
    budgetedHours: 1_000,
  }],
};

describe('Mano de Obra — el modo resalta lo que tiene origen', () => {
  it('con el cálculo hecho, los derivados quedan marcados y abren su cuenta', () => {
    render(<LaborDepartmentsView config={configMod} directLabor={calculoMod} onEdit={() => {}} />);

    // Días efectivos, IAP, ITCS y la tarifa horaria del departamento.
    expect(marcados().length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTitle(/Días hábiles efectivos — ver cómo se calculó/)).toBeTruthy();
    expect(screen.getByTitle(/Índice total de cargas sociales — ver cómo se calculó/)).toBeTruthy();

    // Y la cuenta se abre de verdad: la fórmula queda en el store del panel.
    fireEvent.click(screen.getByTitle(/Días hábiles efectivos — ver cómo se calculó/));
    expect(useTraceMode.getState().openDerivation?.formula).toContain('365 días del año');
  });

  it('sin cálculo no hay derivados: la pantalla no promete nada', () => {
    render(<LaborDepartmentsView config={configMod} onEdit={() => {}} />);
    expect(marcados()).toHaveLength(0);
  });

  it('la remuneración básica es un dato cargado sin ficha alcanzable: queda sin marcar', () => {
    render(<LaborDepartmentsView config={configMod} directLabor={calculoMod} onEdit={() => {}} />);
    fireEvent.click(screen.getByText('Armado'));

    // Su importe se ve, pero no como algo tocable.
    expect(screen.getAllByText('Remuneración básica').length).toBeGreaterThan(0);
    expect(screen.queryByTitle(/Remuneración básica —/)).toBeNull();
    // Ningún valor de esta pantalla promete una ficha que no exista.
    expect(conFicha()).toHaveLength(0);
  });
});

// ── Costos Indirectos ────────────────────────────────────────────────────────

const configCip: IndirectCostConfig = {
  centers: [{ id: 'c1', name: 'Mecanizado', type: 'productive' }],
  concepts: [],
  serviceDistributions: [],
  productiveSettings: [{ centerId: 'c1', budget: { fixed: 0, variable: 0 }, normalCapacity: 1_000, actualActivity: 900, actualCip: 480_000 }],
} as unknown as IndirectCostConfig;

const perDepartment: CalculationResult['detail']['indirectCosts']['perDepartment'] = {
  c1: {
    cipTotal: 480_000,
    appliedCip: 450_000,
    budgetVariance: -10_000,
    volumeVariance: -20_000,
    normalCapacity: 1_000,
    actualActivity: 900,
    quota: 500,
    actualCip: 480_000,
    budgetFixed: 300_000,
    budgetVariable: 200_000,
    quotaFixed: 300,
    quotaVariable: 200,
    overUnderApplied: -30_000,
    appliedOn: 'actualActivity',
  },
};

const baseHsMaquina: AllocationBase = {
  id: 'b1', companyId: 'emp-1', code: 'hs_maquina', name: 'Horas máquina',
  unit: 'hs', isSystem: false, createdAt: '2026-08-01T10:00:00.000Z',
};

const valorConFicha: AllocationBaseValue = {
  id: 'v1', baseId: 'b1', structureId: 'est-1', centerId: 'c1',
  value: 900, dataPointId: 'dp-hs-maquina', createdAt: '2026-08-01T10:00:00.000Z',
};

const montarCip = (valores: AllocationBaseValue[]) => {
  const Wrapper = conCache((qc) => {
    qc.setQueryData(['structures', 'est-1', 'allocation-values'], valores);
    qc.setQueryData(['companies', 'emp-1', 'allocation-bases'], [baseHsMaquina]);
  });
  return render(
    <Wrapper>
      <CostCentersView
        config={configCip}
        perDepartment={perDepartment}
        onEdit={() => {}}
        structureId="est-1"
        companyId="emp-1"
      />
    </Wrapper>,
  );
};

describe('Costos Indirectos — el modo resalta lo que tiene origen', () => {
  it('en la ficha del centro, presupuesto, cuotas y variaciones abren su cuenta', () => {
    montarCip([]);
    fireEvent.click(screen.getByText('Mecanizado'));

    expect(screen.getByTitle(/Cuota total · Mecanizado — ver cómo se calculó/)).toBeTruthy();
    expect(screen.getByTitle(/CIP aplicado · Mecanizado — ver cómo se calculó/)).toBeTruthy();
    expect(marcados().length).toBeGreaterThanOrEqual(8);

    fireEvent.click(screen.getByTitle(/CIP aplicado · Mecanizado — ver cómo se calculó/));
    expect(useTraceMode.getState().openDerivation?.formula).toContain('actividad real');
  });

  it('la capacidad normal, la actividad real y el CIP real quedan sin marcar', () => {
    montarCip([]);
    fireEvent.click(screen.getByText('Mecanizado'));

    expect(screen.getByText('Capacidad normal')).toBeTruthy();
    expect(screen.queryByTitle(/^Capacidad normal —/)).toBeNull();
    expect(screen.queryByTitle(/^Actividad real —/)).toBeNull();
    expect(screen.queryByTitle(/^CIP real —/)).toBeNull();
  });

  it('un valor del registro auditable CON ficha se marca como dato cargado', () => {
    montarCip([valorConFicha]);
    fireEvent.click(screen.getByText('Mecanizado'));

    const ficha = screen.getByTitle(/Horas máquina — base de prorrateo — ver de dónde sale/);
    fireEvent.click(ficha);
    expect(useTraceMode.getState().openDataPointId).toBe('dp-hs-maquina');
  });

  it('el mismo valor SIN ficha no se marca: no hay ficha que abrir', () => {
    montarCip([{ ...valorConFicha, dataPointId: null }]);
    fireEvent.click(screen.getByText('Mecanizado'));

    expect(screen.queryByTitle(/Horas máquina — base de prorrateo —/)).toBeNull();
    expect(conFicha()).toHaveLength(0);
  });
});

// ── Materia Prima ────────────────────────────────────────────────────────────

const materia: RawMaterialConfig = {
  id: 'mp-1', code: 'MP-001', name: 'Chapa BWG 18', unit: 'kg', supplier: 'Acindar',
  wilson: { annualDemand: 15_000, orderCost: 8_500, holdingRate: 30, unitCost: 1_200 },
  stockPolicy: { minConsumption: 30, maxConsumption: 60, minLeadTime: 4, maxLeadTime: 10, safetyStock: 150 },
  initialStock: { quantity: 400, unitCost: 1_150 },
  movements: [{ date: '2026-08-05', type: 'purchase', detail: 'Factura A-123', quantity: 100, unitCost: 1_500 }],
} as unknown as RawMaterialConfig;

const movimientoTrazable: MpMovement = {
  movementId: 'mov-1',
  label: 'Compra — Factura A-123',
  detail: 'Factura A-123',
  type: 'purchase',
  fechaHecho: '2026-08-05',
  fechaCaptacion: '2026-08-06T09:00:00.000Z',
  periodoImputado: '2026-08',
  pending: false,
  dataPointIds: ['dp-cantidad', 'dp-precio'],
} as unknown as MpMovement;

/**
 * Los insumos de MP que NO son movimientos (Wilson, existencia inicial) y los de
 * Venta se ubican por `fieldKey`, con la convención del lado de escritura. La
 * materia prima de arriba tiene `id: 'mp-1'`, así que ése es su discriminante.
 */
const dp = (fieldKey: string, id: string): StructureDataPoint => ({
  id,
  element: 'MP',
  fieldKey,
  label: fieldKey,
  unit: null,
  periodoImputado: '2026-08',
  pending: false,
});

const insumosMp: StructureDataPoint[] = [
  dp('mp.mp-1.wilson.costo_unitario', 'dp-wilson-c'),
  dp('mp.mp-1.wilson.demanda_anual', 'dp-wilson-r'),
  dp('mp.mp-1.existencia_inicial.cantidad', 'dp-ex-inicial'),
];

const montarMp = (movimientos: MpMovement[], insumos: StructureDataPoint[] = []) => {
  const Wrapper = conCache((qc) => {
    qc.setQueryData(['structures', 'est-1', 'mp-movements'], movimientos);
    qc.setQueryData(['structures', 'est-1', 'data-points'], insumos);
  });
  return render(
    <Wrapper>
      <MaterialDetailForm
        structureId="est-1"
        period="2026-08"
        index={0}
        material={materia}
        saving={false}
        onBack={() => {}}
        onSaveMaterial={async () => {}}
      />
    </Wrapper>,
  );
};

const montarListaMp = (insumos: StructureDataPoint[], onSelect = () => {}) => {
  const Wrapper = conCache((qc) => {
    qc.setQueryData(['structures', 'est-1', 'data-points'], insumos);
  });
  return render(
    <Wrapper>
      <RawMaterialsList
        structureId="est-1"
        materials={[materia]}
        saving={false}
        toDelete={null}
        setToDelete={() => {}}
        setSelected={onSelect}
        addMaterial={() => {}}
        onConfirmDelete={async () => {}}
      />
    </Wrapper>,
  );
};

describe('Materia Prima — el modo resalta lo que tiene origen', () => {
  it('en la LISTA, el costo unitario y la existencia inicial abren su ficha', () => {
    montarListaMp(insumosMp);

    const costo = screen.getByTitle(/Costo unitario \(C\) · Chapa BWG 18 — ver de dónde sale/);
    fireEvent.click(costo);
    expect(useTraceMode.getState().openDataPointId).toBe('dp-wilson-c');

    fireEvent.click(screen.getByTitle(/Existencia inicial · Chapa BWG 18 — ver de dónde sale/));
    expect(useTraceMode.getState().openDataPointId).toBe('dp-ex-inicial');
  });

  it('tocar un valor de la lista abre la ficha y NO entra a la materia prima', () => {
    const abierta = vi.fn();
    montarListaMp(insumosMp, abierta);

    fireEvent.click(screen.getByTitle(/Costo unitario \(C\) · Chapa BWG 18 — ver de dónde sale/));
    expect(abierta).not.toHaveBeenCalled();
  });

  it('sin dato cargado, los mismos números de la lista quedan SIN marcar', () => {
    montarListaMp([]);

    // Los valores siguen a la vista; lo que no hay es promesa de ficha.
    expect(screen.getByText('1.200')).toBeTruthy();
    expect(screen.getByText('400')).toBeTruthy();
    expect(marcados()).toHaveLength(0);
  });

  it('en la ficha, los insumos de Wilson y la existencia inicial abren su ficha', () => {
    montarMp([], insumosMp);

    fireEvent.click(screen.getByTitle(/Costo unitario \(C\) registrado — ver de dónde sale/));
    expect(useTraceMode.getState().openDataPointId).toBe('dp-wilson-c');
    fireEvent.click(screen.getByTitle(/Cantidad inicial registrada — ver de dónde sale/));
    expect(useTraceMode.getState().openDataPointId).toBe('dp-ex-inicial');

    // Los que no tienen dato guardado no se marcan, aunque el campo se vea:
    // el costo de pedido y la tasa no están en el índice.
    expect(screen.queryByTitle(/Costo de pedido \(S\) registrado —/)).toBeNull();
    expect(screen.queryByTitle(/Tasa de mantenimiento \(K\) registrada —/)).toBeNull();
  });

  it('un movimiento ya registrado marca su cantidad y su costo unitario', () => {
    montarMp([movimientoTrazable]);

    const cantidad = screen.getByTitle(/Cantidad registrada — Factura A-123 — ver de dónde sale/);
    const precio = screen.getByTitle(/Costo unitario registrado — Factura A-123 — ver de dónde sale/);

    fireEvent.click(cantidad);
    expect(useTraceMode.getState().openDataPointId).toBe('dp-cantidad');
    fireEvent.click(precio);
    expect(useTraceMode.getState().openDataPointId).toBe('dp-precio');
  });

  it('sin movimiento registrado no se marca nada: el campo todavía no es un dato', () => {
    montarMp([]);
    expect(marcados()).toHaveLength(0);
    // Y el formulario sigue siendo un formulario: el campo se puede escribir.
    expect(screen.getAllByDisplayValue('100').length).toBeGreaterThan(0);
  });
});

// ── Venta ────────────────────────────────────────────────────────────────────

/**
 * En Venta lo opcional es lo interesante: las unidades PRODUCIDAS solo generan
 * dato si alguien las cargó, así que la pantalla tiene garantizado un valor con
 * origen al lado de uno sin origen. Es el par exacto que prueba el guardia.
 */
const insumosVenta: StructureDataPoint[] = [
  { ...dp('venta.precio_unitario', 'dp-precio'), element: 'VENTA' },
  { ...dp('venta.cantidad_vendida', 'dp-vendidas'), element: 'VENTA' },
];

const montarVenta = (insumos: StructureDataPoint[], producidas?: number) => {
  const Wrapper = conCache((qc) => {
    qc.setQueryData(['structures', 'est-1', 'data-points'], insumos);
  });
  return render(
    <Wrapper>
      <SalesTab
        defaultPrice={25_000}
        defaultQty={800}
        defaultProducedQty={producidas}
        onSave={async () => {}}
        saving={false}
        allReady={false}
        onCalculate={() => {}}
        calculating={false}
      />
    </Wrapper>,
  );
};

describe('Venta — el modo resalta lo que tiene origen', () => {
  it('el precio y las unidades vendidas abren su ficha', () => {
    montarVenta(insumosVenta);

    fireEvent.click(screen.getByTitle(/Precio unitario registrado — ver de dónde sale/));
    expect(useTraceMode.getState().openDataPointId).toBe('dp-precio');
    fireEvent.click(screen.getByTitle(/Unidades vendidas registradas — ver de dónde sale/));
    expect(useTraceMode.getState().openDataPointId).toBe('dp-vendidas');

    // Y los campos siguen siendo campos: el formulario no se convirtió en botones.
    expect(screen.getByDisplayValue('25000')).toBeTruthy();
  });

  it('las unidades producidas sin cargar quedan SIN marcar', () => {
    montarVenta(insumosVenta);

    expect(screen.getByText('Unidades producidas (opcional)')).toBeTruthy();
    expect(screen.queryByTitle(/Unidades producidas registradas —/)).toBeNull();
    expect(conFicha()).toHaveLength(2);
  });

  it('sin datos cargados la pantalla no promete ninguna ficha', () => {
    montarVenta([], 1_000);
    expect(marcados()).toHaveLength(0);
  });
});

// ── Resultado ────────────────────────────────────────────────────────────────

const resultado = {
  rawMaterialConsumed: 1_200_000,
  directLaborTotal: 942_500,
  indirectCostsApplied: 450_000,
  productionCost: 2_592_500,
  costOfGoodsSold: 2_592_500,
  grossMargin: 407_500,
  grossMarginPct: 13.58,
  detail: {
    directLabor: calculoMod,
    rawMaterial: { optimalLot: 460, finalStockQty: 380, finalStockValue: 437_000 },
    indirectCosts: { perDepartment },
    unitCost: { unitsProduced: 1_000, unitProductionCost: 2_592.5, unitCostOfGoodsSold: 2_592.5 },
  },
} as unknown as CalculationResult;

describe('Resultado — el modo resalta lo que tiene origen', () => {
  const montar = () => {
    const Wrapper = conCache((qc) => {
      // T-09 — el cuadro de variaciones rotula los centros con su NOMBRE, que
      // sale de la configuración de la estructura, no del resultado.
      qc.setQueryData(['cost-structures', 'est-1'], { indirectCostConfig: configCip });
    });
    return render(<Wrapper><ResultTab result={resultado} structureId="est-1" /></Wrapper>);
  };

  it('el estado de costos y sus detalles abren su cuenta', () => {
    montar();

    expect(screen.getByTitle(/^Costo de producción — ver cómo se calculó/)).toBeTruthy();
    expect(screen.getByTitle(/^Margen bruto — ver cómo se calculó/)).toBeTruthy();
    expect(screen.getByTitle(/^Lote óptimo de Wilson — ver cómo se calculó/)).toBeTruthy();
    expect(screen.getByTitle(/CIP aplicado · Mecanizado — ver cómo se calculó/)).toBeTruthy();
    // Antes de T-05 esta pantalla tenía 4 valores marcados.
    expect(marcados().length).toBeGreaterThan(10);

    fireEvent.click(screen.getByTitle(/^Costo de producción — ver cómo se calculó/));
    expect(useTraceMode.getState().openDerivation?.children.map((c) => c.label)).toEqual([
      'Materia Prima consumida',
      'Mano de Obra Directa',
      'CIP aplicados',
    ]);
  });

  it('sin corrida trazada, los elementos del costo no prometen ficha', () => {
    montar();
    // Las tres filas del desglose salen del árbol de derivación; sin corrida no
    // hay árbol y quedan sin marcar, igual que antes de T-05.
    expect(screen.queryByTitle(/^Materia Prima consumida —/)).toBeNull();
    // El CIP real del cuadro de variaciones es un dato cargado sin ficha alcanzable.
    expect(conFicha()).toHaveLength(0);
  });
});
