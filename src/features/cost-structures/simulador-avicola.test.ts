import { describe, expect, it } from 'vitest';
import {
  calcularCapacidadOciosa,
  calcularProyeccionAvicola,
  type CapacidadOciosaCompleta,
  type CapacidadOciosaResult,
  type ProyeccionAvicola,
  type ProyeccionAvicolaCompleta,
} from './components/ScenarioSimulator';
import type {
  ComportamientoVolumen,
  ComponenteContribucionMarginal,
  SimulationResult,
} from '@/lib/types';

const COMPONENTES_BASE: ComponenteContribucionMarginal[] = [
  {
    clave: 'comportamiento_materia_prima',
    etiqueta: 'Materia prima',
    importeAbsorcion: 2_500_000,
    comportamientoVolumen: 'VARIABLE',
    origen: 'empresa',
    parametroId: 'parametro-mp',
    clasificadoPorUserId: 'usuario-prueba',
    clasificadoEn: '2099-01-01T00:00:00.000Z',
  },
  {
    clave: 'comportamiento_mano_obra_directa',
    etiqueta: 'Mano de obra directa',
    importeAbsorcion: 800_000,
    comportamientoVolumen: 'FIJO',
    origen: 'empresa',
    parametroId: 'parametro-mod',
    clasificadoPorUserId: 'usuario-prueba',
    clasificadoEn: '2099-01-01T00:00:00.000Z',
  },
  {
    clave: 'comportamiento_costos_indirectos',
    etiqueta: 'Costos indirectos de producción',
    importeAbsorcion: 1_400_000,
    comportamientoVolumen: 'VARIABLE',
    origen: 'empresa',
    parametroId: 'parametro-cip',
    clasificadoPorUserId: 'usuario-prueba',
    clasificadoEn: '2099-01-01T00:00:00.000Z',
  },
];

const BASE_RESULT: SimulationResult = {
  rawMaterialConsumed: 2_500_000,
  directLaborTotal: 800_000,
  indirectCostsApplied: 1_400_000,
  productionCost: 4_700_000,
  costOfGoodsSold: 4_700_000,
  grossMargin: -452_000,
  grossMarginPct: -10.64,
  detail: {
    rawMaterial: { optimalLot: 0, finalStockQty: 0, finalStockValue: 0 },
    directLabor: { workingDays: 30, itcsPercent: 0, iapPercent: 0, hourlyRates: {} },
    indirectCosts: { perDepartment: {} },
    unitCost: {
      unitsProduced: 472,
      unitProductionCost: 9_958,
      unitCostOfGoodsSold: 9_958,
    },
  },
  incompletitud: { incompleto: false, motivos: [], datosPendientes: [] },
  contribucionMarginal: {
    incompleta: false,
    precioUnitario: 9_000,
    unidadesVendidas: 472,
    totalAbsorcion: 4_700_000,
    costoVariableTotal: 3_900_000,
    costoVariableUnitario: 8_262.71,
    contribucionMarginalUnitaria: 737.29,
    componentes: COMPONENTES_BASE,
  },
  puntoEquilibrio: {
    incompleta: false,
    unidadesEquilibrio: 321.25,
    fechaUltimoRecalculo: '2099-01-01T00:00:00.000Z',
  },
};

function proyeccionCompleta(result: ProyeccionAvicola | null): ProyeccionAvicolaCompleta {
  expect(result).not.toBeNull();
  expect(result?.incompleta).toBe(false);
  if (!result || result.incompleta) throw new Error('Se esperaba una proyección completa');
  return result;
}

function capacidadCompleta(result: CapacidadOciosaResult | null): CapacidadOciosaCompleta {
  expect(result).not.toBeNull();
  expect(result?.incompleta).toBe(false);
  if (!result || result.incompleta) throw new Error('Se esperaba un análisis completo');
  return result;
}

function conComportamientoCip(comportamiento: ComportamientoVolumen): SimulationResult {
  if (BASE_RESULT.contribucionMarginal.incompleta) {
    throw new Error('El fixture base debe tener contribución completa');
  }
  const componentes = COMPONENTES_BASE.map((component) =>
    component.clave === 'comportamiento_costos_indirectos'
      ? { ...component, comportamientoVolumen: comportamiento }
      : component,
  );
  return {
    ...BASE_RESULT,
    contribucionMarginal: {
      ...BASE_RESULT.contribucionMarginal,
      componentes,
    },
  };
}

describe('calcularProyeccionAvicola', () => {
  const sinUnidades: SimulationResult = {
    ...BASE_RESULT,
    detail: { ...BASE_RESULT.detail, unitCost: undefined },
  };

  const casosSinUnidadesOEscala: Array<[string, ProyeccionAvicola | null]> = [
    [
      'devuelve null si no hay unitsProduced en el resultado base',
      calcularProyeccionAvicola(sinUnidades, 6300, 10000, 0.94, 0.94, []),
    ],
    [
      'devuelve null si avesBase es 0',
      calcularProyeccionAvicola(BASE_RESULT, 0, 10000, 0.94, 0.94, []),
    ],
    [
      'devuelve null si avesObjetivo es 0',
      calcularProyeccionAvicola(BASE_RESULT, 6300, 0, 0.94, 0.94, []),
    ],
  ];

  it.each(casosSinUnidadesOEscala)('%s', (_titulo, resultado) => {
    expect(resultado).toBeNull();
  });

  it('con la misma escala reproduce los importes del backend', () => {
    const proy = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 6300, 0.94, 0.94, []),
    );
    expect(proy.cajones).toBeCloseTo(472, 0);
    expect(proy.rawMaterial).toBeCloseTo(2_500_000, 0);
    expect(proy.directLabor).toBeCloseTo(800_000, 0);
    expect(proy.indirectCosts).toBeCloseTo(1_400_000, 0);
  });

  it('escala materia prima y cajones proporcionalmente y conserva la mano de obra fija', () => {
    const proy = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 12600, 0.94, 0.94, []),
    );
    expect(proy.cajones).toBeCloseTo(944, 0);
    expect(proy.rawMaterial).toBeCloseTo(5_000_000, 0);
    expect(proy.directLabor).toBeCloseTo(800_000, 0);
  });

  it('cambiar sólo la clasificación del dominio cambia la proyección', () => {
    const cipVariable = proyeccionCompleta(
      calcularProyeccionAvicola(conComportamientoCip('VARIABLE'), 6300, 12600, 0.94, 0.94, []),
    );
    const cipFijo = proyeccionCompleta(
      calcularProyeccionAvicola(conComportamientoCip('FIJO'), 6300, 12600, 0.94, 0.94, []),
    );

    expect(cipVariable.indirectCosts).toBeCloseTo(2_800_000, 0);
    expect(cipFijo.indirectCosts).toBeCloseTo(1_400_000, 0);
    expect(cipVariable.productionCost).not.toBe(cipFijo.productionCost);
  });

  it('no adopta un default cuando el dominio informa una clasificación faltante', () => {
    const incompleto: SimulationResult = {
      ...BASE_RESULT,
      contribucionMarginal: {
        incompleta: true,
        precioUnitario: 9_000,
        unidadesVendidas: 472,
        totalAbsorcion: 4_700_000,
        costoVariableTotal: null,
        costoVariableUnitario: null,
        contribucionMarginalUnitaria: null,
        componentes: COMPONENTES_BASE.map((component) =>
          component.clave === 'comportamiento_costos_indirectos'
            ? { ...component, comportamientoVolumen: null }
            : component,
        ),
        motivos: ['Falta clasificar frente al volumen el rubro Costos indirectos.'],
      },
      puntoEquilibrio: {
        incompleta: true,
        unidadesEquilibrio: null,
        fechaUltimoRecalculo: '2099-01-01T00:00:00.000Z',
        motivos: ['Falta clasificar frente al volumen el rubro Costos indirectos.'],
      },
    };

    const proy = calcularProyeccionAvicola(incompleto, 6300, 12600, 0.94, 0.94, []);
    expect(proy).toEqual({
      incompleta: true,
      motivos: ['Falta clasificar frente al volumen el rubro Costos indirectos.'],
    });
  });

  it('usa el punto de equilibrio del backend sin recalcularlo', () => {
    const proy = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 12600, 0.94, 0.94, []),
    );
    expect(proy.puntoEquilibrio).toBe(BASE_RESULT.puntoEquilibrio);
    expect(proy.puntoEquilibrio.unidadesEquilibrio).toBe(321.25);
  });

  it('la postura de plantel produce menos cajones que la de lote', () => {
    const posturaBase = 0.94;
    const lote = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, posturaBase, []),
    );
    const plantel = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.885, posturaBase, []),
    );
    expect(plantel.cajones).toBeLessThan(lote.cajones);
  });

  it('suma sólo los escalones declarados que están activos', () => {
    const escalones = [
      { id: 1, aves_desde: 7000, aves_hasta: 12000, costo_fijo: 500_000, inversion_requerida: 0, descripcion: 'Escalón activo' },
      { id: 2, aves_desde: 15000, aves_hasta: 20000, costo_fijo: 900_000, inversion_requerida: 0, descripcion: 'Escalón inactivo' },
    ];
    const proy = proyeccionCompleta(
      calcularProyeccionAvicola(BASE_RESULT, 6300, 10000, 0.94, 0.94, escalones),
    );
    const escala = 10000 / 6300;
    expect(proy.indirectCosts).toBeCloseTo(1_400_000 * escala + 500_000, 0);
  });

  it('acumula el costo de todos los escalones activos', () => {
    const escalones = [
      { id: 1, aves_desde: 5000, aves_hasta: 8000, costo_fijo: 300_000, inversion_requerida: 0, descripcion: 'Personal extra' },
      { id: 2, aves_desde: 8000, aves_hasta: 12000, costo_fijo: 700_000, inversion_requerida: 0, descripcion: 'Segundo galpón' },
    ];
    const proy = proyeccionCompleta(
      calcularProyeccionAvicola(
        conComportamientoCip('FIJO'),
        6300,
        10000,
        0.94,
        0.94,
        escalones,
      ),
    );
    expect(proy.indirectCosts).toBeCloseTo(1_400_000 + 300_000 + 700_000, 0);
  });
});

describe('calcularCapacidadOciosa', () => {
  const casosCapacidadInvalida: Array<[string, CapacidadOciosaResult | null]> = [
    [
      'devuelve null si capacidadNormal es 0',
      calcularCapacidadOciosa(BASE_RESULT, 0, 6300),
    ],
    ['devuelve null si avesActuales es 0', calcularCapacidadOciosa(BASE_RESULT, 10000, 0)],
    [
      'devuelve null si avesActuales supera la capacidad normal',
      calcularCapacidadOciosa(BASE_RESULT, 5000, 8000),
    ],
  ];

  it.each(casosCapacidadInvalida)('%s', (_titulo, resultado) => {
    expect(resultado).toBeNull();
  });

  it('a plena capacidad la utilización es 100% y el costo ocioso es 0', () => {
    const oc = capacidadCompleta(calcularCapacidadOciosa(BASE_RESULT, 6300, 6300));
    expect(oc.utilizacionPct).toBeCloseTo(100, 1);
    expect(oc.costoOcioso).toBeCloseTo(0, 0);
    expect(oc.avesOciosas).toBe(0);
  });

  it('calcula el costo ocioso con los rubros que el dominio marcó fijos', () => {
    const cipVariable = capacidadCompleta(
      calcularCapacidadOciosa(conComportamientoCip('VARIABLE'), 10000, 5000),
    );
    const cipFijo = capacidadCompleta(
      calcularCapacidadOciosa(conComportamientoCip('FIJO'), 10000, 5000),
    );

    expect(cipVariable.costoFijoTotal).toBe(800_000);
    expect(cipFijo.costoFijoTotal).toBe(2_200_000);
    expect(cipVariable.costoOcioso).toBe(400_000);
    expect(cipFijo.costoOcioso).toBe(1_100_000);
  });

  it('a plena capacidad baja el unitario y conserva fijo = cubierto + ocioso', () => {
    const oc = capacidadCompleta(calcularCapacidadOciosa(BASE_RESULT, 10000, 5000));
    expect(oc.costoUnitarioPlenaCapacidad).toBeLessThan(oc.costoUnitarioReal);
    expect(oc.costoCubierto + oc.costoOcioso).toBeCloseTo(oc.costoFijoTotal, 0);
  });
});
