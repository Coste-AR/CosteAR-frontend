// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const { NotFoundPage } = await import('./NotFoundPage');
afterEach(cleanup);

describe('página no encontrada', () => {
  it('ofrece una salida al inicio y una vuelta al historial', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href')).toBe('/dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));
    expect(back).toHaveBeenCalledOnce();
    back.mockRestore();
  });
});
