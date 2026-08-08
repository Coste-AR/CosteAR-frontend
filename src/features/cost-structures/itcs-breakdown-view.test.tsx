// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LaborDepartmentsView } from './LaborDepartmentsView';
import { DirectLaborForm } from './DirectLaborForm';
import type { DirectLaborConfig } from './cost-structure-types';
import type { CalculationResult } from '@/lib/types';

/**
 * LO QUE VE EL COSTISTA EN LA HOJA DE MANO DE OBRA.
 *
 * El caso real: carga $870.000 de remuneración básica, pone TODAS las cargas
 * sociales en cero esperando que el costo sea $870.000… y el sistema le devuelve
 * $942.500. Los $72.500 de diferencia son el SAC (aguinaldo), una carga cierta
 * que se devenga por ley. Sin desglose, eso se lee como un error del sistema.
 *
 * Estos tests montan la pantalla y verifican que el desglose esté ahí: el índice
 * aplicado, sus conceptos, y el aviso de por qué el aguinaldo aparece igual.
 * Los números del cálculo son los que devolvió el motor (no se recalcula nada).
 */

const configEnCero: DirectLaborConfig = {
  workingDays: {
    totalDaysPerYear: 365,
    unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
    paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 },
  },
  itcs: { derivationBase: 0, fixedArt: 0, uncertainRemunerative: [], uncertainNonRemunerative: [] },
  departments: [{ name: 'Armado', basicRemuneration: 870_000, hoursWorked: 1_000 }],
};

/** Salida real del motor para esa configuración. */
const calculoEnCero: CalculationResult['detail']['directLabor'] = {
  workingDays: 261,
  paidDays: 0,
  itcsPercent: 8.3333,
  iapPercent: 0,
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

const montar = () =>
  render(
    <LaborDepartmentsView config={configEnCero} directLabor={calculoEnCero} onEdit={() => {}} />,
  );

afterEach(cleanup);

describe('hoja de MOD — el costista puede ver de dónde sale la carga social', () => {
  it('desde la lista, un click abre el desglose del índice aplicado', () => {
    montar();

    const abrir = screen.getByRole('button', { name: /de dónde sale el 8,3333 %/i });
    // Antes de abrir, el desglose no ocupa la pantalla.
    expect(screen.queryByText(/sueldo anual complementario/i)).toBeNull();

    fireEvent.click(abrir);

    // El SAC aparece con su nombre completo y marcado como inevitable.
    expect(screen.getAllByText(/SAC — sueldo anual complementario \(aguinaldo\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Se aplica siempre/i).length).toBeGreaterThan(0);
    // Y el aviso de por qué hay índice con todo en cero.
    expect(screen.getByText(/no es un error de cálculo/i)).toBeTruthy();
  });

  it('el porcentaje que se muestra es el que aplicó el cálculo (8,3333 %)', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /de dónde sale el 8,3333 %/i }));

    // Aparece como total del índice y como renglón del SAC: es todo el índice.
    expect(screen.getAllByText('8,3333 %').length).toBeGreaterThanOrEqual(2);
    // El rótulo dice qué es ese porcentaje — nunca un número suelto.
    expect(screen.getAllByText(/Índice total de cargas sociales aplicado/i).length).toBeGreaterThan(0);
  });

  it('en la ficha del departamento, el índice se cierra contra los pesos', () => {
    montar();
    fireEvent.click(screen.getByText('Armado'));

    const composicion = screen.getByText(/Composición de la carga social/i).parentElement!;
    const ficha = within(composicion);

    expect(ficha.getAllByText(/SAC — sueldo anual complementario \(aguinaldo\)/i).length).toBeGreaterThan(0);
    expect(ficha.getByText(/Se aplica siempre/i)).toBeTruthy();
    // Remuneración básica → cargas → costo total, con los importes del cálculo.
    expect(ficha.getAllByText(/Remuneración básica/i).length).toBeGreaterThan(0);
    expect(ficha.getByText(/Cargas sociales — remuneración básica ×/i)).toBeTruthy();
    expect(ficha.getAllByText((t) => t.includes('942.500')).length).toBeGreaterThan(0);
    expect(ficha.getAllByText((t) => t.includes('72.500')).length).toBeGreaterThan(0);
  });

  it('al configurar las cargas en cero, el formulario ya avisa que el SAC va igual', () => {
    render(
      <DirectLaborForm
        defaultValues={configEnCero}
        onSave={async () => {}}
        saving={false}
      />,
    );

    // El costista está tipeando ceros: acá mismo ve que el aguinaldo se suma.
    expect(screen.getByText(/Cargas ciertas que resultan de estos dos valores/i)).toBeTruthy();
    expect(screen.getByText(/SAC — sueldo anual complementario \(aguinaldo\)/i)).toBeTruthy();
    // Con todo en cero, el SAC ES el subtotal de cargas ciertas: aparece dos veces.
    expect(screen.getAllByText('8,3333 %').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/se aplica siempre/i).length).toBeGreaterThan(0);
  });

  it('no muestra códigos internos de planilla en lugar de conceptos', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /de dónde sale el 8,3333 %/i }));

    expect(screen.queryByText(/B40|F40|B47|CSC/)).toBeNull();
    expect(screen.getAllByText(/Cargas sociales ciertas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cargas sociales derivadas/i).length).toBeGreaterThan(0);
  });
});
