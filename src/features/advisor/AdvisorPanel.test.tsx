// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const apiPost = vi.fn();
vi.mock('@/lib/api', () => ({ api: { post: apiPost } }));
const { AdvisorPanel } = await import('./AdvisorPanel');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('consejero de IA', () => {
  it('envía el contexto elegido y etiqueta la respuesta como sugerencia', async () => {
    apiPost.mockResolvedValue({
      data: { data: { headline: 'Revisá el margen', points: ['Subió la materia prima'] } },
    });
    render(<AdvisorPanel kind="cost_result" context={{ margen: 12 }} label="Analizar margen" />);

    fireEvent.click(screen.getByRole('button', { name: 'Analizar margen' }));

    await waitFor(() => expect(screen.getByText('Revisá el margen')).toBeTruthy());
    expect(apiPost).toHaveBeenCalledWith('/advisor', {
      kind: 'cost_result',
      context: { margen: 12 },
    });
    expect(screen.getByText('Sugerencia')).toBeTruthy();
    expect(screen.getByText(/vos decidís/)).toBeTruthy();
  });

  it('muestra un error accionable si el servicio no está disponible', async () => {
    apiPost.mockRejectedValue(new Error('sin servicio'));
    render(<AdvisorPanel kind="alerts" context={{ alertas: 2 }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));

    await waitFor(() => expect(screen.getByText(/Reintentá en un momento/)).toBeTruthy());
  });
});
