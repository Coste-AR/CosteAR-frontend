// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Alert } from '@/lib/types';

const mocked = vi.hoisted(() => ({ alerts: [] as Alert[] }));

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/features/advisor/AdvisorPanel', () => ({ AdvisorPanel: () => null }));
vi.mock('./AlertRulesPanel', () => ({ AlertRulesPanel: () => null }));
vi.mock('./MacroRiskPanel', () => ({ MacroRiskPanel: () => null }));
vi.mock('./alert-hooks', () => ({
  useAlerts: () => ({ data: mocked.alerts, isLoading: false, isError: false }),
  useMarkAlertRead: () => ({ mutate: vi.fn() }),
}));

const { AlertsPage } = await import('./AlertsPage');

afterEach(() => { cleanup(); mocked.alerts = []; });

function alert(overrides: Partial<Alert>): Alert {
  return {
    id: 'alerta-1', type: 'INDICADOR_FISICO', message: 'Valor fuera de rango',
    threshold: '50', actualValue: '60', isRead: false,
    createdAt: '2026-09-22T12:00:00.000Z', severidad: 'CRITICA',
    indicador: 'humedad_ingreso', indicadorEtiqueta: 'Humedad al ingreso',
    unidadValor: '%', unidadUmbral: '%', motivoNoEvaluada: null,
    ...overrides,
  };
}

describe('lista de alertas', () => {
  it('muestra el motivo de una regla sin datos y no la presenta como alerta activa', () => {
    mocked.alerts = [alert({
      actualValue: null, motivoNoEvaluada: 'Falta la lectura de humedad',
      message: 'Falta la lectura de humedad',
    })];
    render(<AlertsPage />);

    expect(screen.getByText('No se pudo evaluar: Falta la lectura de humedad')).toBeTruthy();
    expect(screen.getByTestId('alertas-activas').textContent).toBe('0');
    expect(screen.getByTestId('alertas-sin-evaluar').textContent).toBe('1');
    expect(screen.queryByText('Sin alertas registradas.')).toBeNull();
  });

  it('muestra severidad, indicador, valor y umbral de una alerta evaluada', () => {
    mocked.alerts = [alert({})];
    render(<AlertsPage />);

    expect(screen.getByText('Crítica')).toBeTruthy();
    expect(screen.getByText('Humedad al ingreso')).toBeTruthy();
    expect(screen.getByText(/Valor: 60 % · Umbral: 50 %/)).toBeTruthy();
    expect(screen.getByTestId('alertas-activas').textContent).toBe('1');
  });
});
