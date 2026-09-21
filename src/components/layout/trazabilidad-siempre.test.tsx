// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';
import { TraceableValue, TraceModeLegend } from '@/components/ui/TraceableValue';
import { useTraceMode } from '@/stores/trace-mode-store';

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/features/alerts/alert-hooks', () => ({ useAlerts: () => ({ data: [] }) }));
vi.mock('@/features/auth/auth-hooks', () => ({ useLogout: () => ({ mutate: vi.fn() }) }));

afterEach(cleanup);

describe('trazabilidad siempre activa', () => {
  it('muestra el indicador sin ofrecer un interruptor', () => {
    render(<TopBar />);
    expect(screen.getByText('Trazabilidad')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: /trazabilidad/i })).toBeNull();
  });

  it('mantiene visible la leyenda y el acceso a la ficha', () => {
    render(<><TraceModeLegend /><TraceableValue dataPointId="dato-1" title="Cantidad">42</TraceableValue></>);
    expect(screen.getByText(/Modo trazabilidad activo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /42/ }));
    expect(useTraceMode.getState().openDataPointId).toBe('dato-1');
  });
});
