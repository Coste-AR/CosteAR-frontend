// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiGet = vi.fn();
const apiPut = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, put: apiPut },
  apiErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado',
}));

const { QuickAccessSettings } = await import('./QuickAccessSettings');

const catalog = [
  { clave: 'carga.produccion', etiqueta: 'Producción diaria', modulo: 'produccion', porDefecto: true, destino: '/panel-campo' },
  { clave: 'carga.bajas', etiqueta: 'Bajas del plantel', modulo: 'plantel', porDefecto: true, destino: '/panel-campo' },
  { clave: 'costos.indirectos', etiqueta: 'Costos indirectos', modulo: 'costos', porDefecto: false, destino: '/companies' },
  { clave: 'alertas.reglas', etiqueta: 'Alertas', modulo: 'alertas', porDefecto: false, destino: '/alerts' },
];

let queryClient: QueryClient;

function renderSettings() {
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickAccessSettings />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
  apiGet.mockImplementation((path: string) => {
    if (path === '/me/preferencias') {
      return Promise.resolve({ data: { data: { home: { accesosRapidos: ['carga.produccion'] } } } });
    }
    if (path === '/me/preferencias/catalogo') {
      return Promise.resolve({ data: { data: catalog } });
    }
    return Promise.reject(new Error(`GET inesperado: ${path}`));
  });
  apiPut.mockResolvedValue({ data: { data: { home: { accesosRapidos: [] } } } });
});

afterEach(cleanup);

describe('accesos rápidos configurables', () => {
  it('elige, reordena y guarda hasta seis accesos en el orden visible', async () => {
    apiPut.mockResolvedValueOnce({
      data: { data: { home: { accesosRapidos: ['costos.indirectos', 'carga.produccion', 'alertas.reglas'] } } },
    });
    renderSettings();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Costos indirectos' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Alertas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subir Costos indirectos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar accesos rápidos' }));

    await waitFor(() => expect(apiPut).toHaveBeenCalledWith('/me/preferencias', {
      home: { accesosRapidos: ['costos.indirectos', 'carga.produccion', 'alertas.reglas'] },
    }));
    expect(await screen.findByText('Accesos rápidos guardados.')).toBeTruthy();
  });

  it('muestra la clave rechazada por el 422 y conserva la selección local', async () => {
    apiPut.mockRejectedValueOnce(new Error('El acceso rápido "alertas.reglas" no existe en el catálogo.'));
    renderSettings();

    const alertas = await screen.findByRole('checkbox', { name: 'Alertas' });
    fireEvent.click(alertas);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar accesos rápidos' }));

    expect((await screen.findByRole('alert')).textContent).toContain('alertas.reglas');
    expect((alertas as HTMLInputElement).checked).toBe(true);
  });

  it('omite y registra un aviso si el catálogo trae una entrada sin destino', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    apiGet.mockImplementation((path: string) => {
      if (path === '/me/preferencias') {
        return Promise.resolve({ data: { data: { home: { accesosRapidos: [] } } } });
      }
      return Promise.resolve({ data: { data: [
        ...catalog,
        { clave: 'sin.destino', etiqueta: 'Acceso muerto', modulo: 'prueba', porDefecto: false },
      ] } });
    });

    renderSettings();

    expect(await screen.findByRole('checkbox', { name: 'Producción diaria' })).toBeTruthy();
    expect(screen.queryByText('Acceso muerto')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[preferencias] acceso rápido omitido por no tener destino:',
      'sin.destino',
    );
    warn.mockRestore();
  });
});
