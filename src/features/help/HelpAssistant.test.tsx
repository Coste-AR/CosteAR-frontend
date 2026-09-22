// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HelpAssistant } from './HelpAssistant';
import { ASISTENTE_INACTIVIDAD_MS } from './config';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('asistente de uso', () => {
  it('muestra la burbuja al quedar inactivo y la oculta al mover el mouse', () => {
    render(<HelpAssistant screen="home" />);
    expect(screen.queryByText('¿Necesitás ayuda con esta pantalla?')).toBeNull();
    act(() => vi.advanceTimersByTime(ASISTENTE_INACTIVIDAD_MS));
    expect(screen.getByText('¿Necesitás ayuda con esta pantalla?')).toBeTruthy();
    fireEvent.mouseMove(window);
    expect(screen.queryByText('¿Necesitás ayuda con esta pantalla?')).toBeNull();
  });

  it('nunca muestra la burbuja mientras hay actividad continua', () => {
    render(<HelpAssistant screen="home" />);
    for (let i = 0; i < 4; i += 1) {
      act(() => vi.advanceTimersByTime(ASISTENTE_INACTIVIDAD_MS - 1000));
      fireEvent.keyDown(window);
    }
    expect(screen.queryByText('¿Necesitás ayuda con esta pantalla?')).toBeNull();
  });

  it('cambia las preguntas según la pantalla y no consulta la red', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { rerender } = render(<HelpAssistant screen="home" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ayuda de esta pantalla' }));
    expect(screen.getByText('¿Dónde veo mis clientes?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde veo mis clientes?' }));
    expect(screen.getByText(/Abrí Clientes desde el menú/)).toBeTruthy();

    rerender(<HelpAssistant screen="field" />);
    expect(screen.getByText('¿Cómo registro una carga?')).toBeTruthy();
    expect(screen.queryByText('¿Dónde veo mis clientes?')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
