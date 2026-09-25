import type { Page } from '@playwright/test';
import { testConSesion as test, expect, laAppPinto, vocabularioVisiblePermitido } from './fixtures';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const STRUCTURE_ID = '22222222-2222-4222-8222-222222222222';
const PERIOD_ID = '33333333-3333-4333-8333-333333333333';

test.setTimeout(60_000);

async function mockHome(page: Page) {
  await page.route('**/api/v1/**', (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const responses: Record<string, unknown> = {
      '/api/v1/companies': { data: [{
        id: COMPANY_ID,
        name: 'Negocio de prueba',
        industry: 'Avicultura',
        cuit: null,
        isActive: true,
        createdAt: '2099-01-01T00:00:00.000Z',
        periodicity: 'MONTHLY',
        condicionIva: 'RESPONSABLE_INSCRIPTO',
        _count: { costStructures: 1 },
      }] },
      [`/api/v1/companies/${COMPANY_ID}/cost-structures`]: { data: [{
        id: STRUCTURE_ID,
        companyId: COMPANY_ID,
        productName: 'Producto de prueba',
        period: '2099-09',
        status: 'ACTIVE',
        costingSystem: 'ORDERS',
      }] },
      [`/api/v1/structures/${STRUCTURE_ID}/periods/open`]: { data: {
        id: PERIOD_ID,
        structureId: STRUCTURE_ID,
        companyId: COMPANY_ID,
        code: '2099-09',
        label: 'Septiembre 2099',
        status: 'OPEN',
      } },
      [`/api/v1/periods/${PERIOD_ID}/tablero-dueno`]: { data: {
        periodo: { id: PERIOD_ID, codigo: '2099-09' },
        corrida: null,
        unidadGestion: { codigo: 'cajon', nombre: 'Cajón', factor: 1 },
        rubro: {
          clave: 'RUBRO_PRUEBA',
          nombreProducto: 'Producto',
          icons: {},
          kpisHome: [
            { clave: 'costo', etiqueta: 'Costo por cajón', unidad: 'ARS/cajón', valor: 840, completo: true },
            { clave: 'contribucion', etiqueta: 'Contribución marginal', unidad: 'ARS/cajón', valor: 260, completo: true },
            { clave: 'equilibrio', etiqueta: 'Punto de equilibrio', unidad: 'cajones', valor: 480, completo: true },
          ],
        },
        pendientes: [],
      } },
      [`/api/v1/companies/${COMPANY_ID}/indicadores-macro`]: { data: [
        { clave: 'USD_OFICIAL', etiqueta: 'Dólar oficial', valor: 1_250, unidad: 'ARS/USD', fecha: '2099-09-24T00:00:00.000Z', fuenteNombre: 'Banco Central', fuenteUrl: 'https://fuente.example/dolar' },
        { clave: 'IPC_NACIONAL', etiqueta: 'Inflación mensual', valor: 4.2, unidad: '%', fecha: '2099-09-24T00:00:00.000Z', fuenteNombre: 'Instituto estadístico', fuenteUrl: 'https://fuente.example/inflacion' },
        { clave: 'REFERENCIA_RUBRO', etiqueta: 'Referencia del rubro', valor: null, unidad: 'ARS/cajón', fecha: null, fuenteNombre: 'Fuente sectorial', fuenteUrl: 'https://fuente.example/sector', error: 'fuente no disponible' },
      ] },
      '/api/v1/me/preferencias': { data: { home: { accesosRapidos: ['config.preferencias', 'sin-destino'] } } },
      '/api/v1/me/preferencias/catalogo': { data: [
        { clave: 'config.preferencias', etiqueta: 'Abrir preferencias', modulo: 'configuracion', porDefecto: true, destino: '/profile' },
        { clave: 'sin-destino', etiqueta: 'Acceso roto', modulo: 'prueba', porDefecto: true },
      ] },
    };

    if (request.method() === 'GET' && pathname in responses) {
      return route.fulfill({ json: responses[pathname] });
    }
    return route.fallback();
  });
}

test('home muestra cuatro bloques accionables sin scroll a 1366 por 768', async ({ page, consola }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockHome(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await expect(page.getByRole('heading', { name: 'Indicadores macro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Indicadores del negocio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accesos rápidos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Acciones' })).toBeVisible();
  await expect(page.getByTestId('home-block')).toHaveCount(4);
  await expect(page.getByTestId(/^home-kpi-/)).toHaveCount(3);
  await expect(page.getByTestId('macro-REFERENCIA_RUBRO')).toContainText('Sin dato');
  const quickAccess = page.getByRole('link', { name: 'Abrir preferencias' });
  await expect(quickAccess).toHaveAttribute('href', '/profile');
  await expect(page.getByText('Acceso roto')).toHaveCount(0);
  const actions = page.getByTestId('home-block').filter({
    has: page.getByRole('heading', { name: 'Acciones' }),
  });
  await expect(actions.getByRole('link', { name: 'Proceso' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'Alertas' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await vocabularioVisiblePermitido(page);
  expect(consola.mensajes).toEqual([]);

  await quickAccess.click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('home en teléfono permite scroll vertical pero nunca horizontal', async ({ page, consola }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockHome(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await expect(page.getByTestId('home-block')).toHaveCount(4);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await vocabularioVisiblePermitido(page);
  expect(consola.mensajes).toEqual([]);
});
