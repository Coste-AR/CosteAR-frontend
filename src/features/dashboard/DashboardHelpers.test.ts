import { afterEach, describe, expect, it, vi } from 'vitest';
import { companyHealth, greet, industryChip } from './components/DashboardHelpers';

afterEach(() => vi.useRealTimers());

describe('ayudas del dashboard', () => {
  it('clasifica la madurez según la cantidad de estructuras', () => {
    expect(companyHealth(0).label).toBe('Sin datos');
    expect(companyHealth(1).label).toBe('Inicial');
    expect(companyHealth(3).label).toBe('En progreso');
    expect(companyHealth(4).label).toBe('Activo');
  });

  it('reconoce industrias dentro de descripciones más largas', () => {
    expect(industryChip('Manufactura textil')).toContain('bg-granate-tenue');
    expect(industryChip(null)).toContain('text-zinc-400');
    expect(industryChip('Actividad desconocida')).toContain('text-zinc-700');
  });

  it('saluda con el nombre de pila y la franja horaria correcta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 20, 0));
    expect(greet('Ana Pérez')).toBe('Buenas noches, Ana');
    expect(greet()).toBe('Buenas noches, costista');
  });
});
