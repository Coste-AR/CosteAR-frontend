import type { Page, Route } from '@playwright/test';
import { testConSesion as test, expect, laAppPinto } from './fixtures';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const STRUCTURE_ID = '22222222-2222-4222-8222-222222222222';
const PERIOD_ID = '33333333-3333-4333-8333-333333333333';

test.setTimeout(60_000);

const catalog = [
  { clave: 'carga.produccion', etiqueta: 'Producción diaria', modulo: 'produccion', porDefecto: true, destino: '/panel-campo' },
  { clave: 'carga.bajas', etiqueta: 'Bajas del plantel', modulo: 'plantel', porDefecto: true, destino: '/panel-campo' },
  { clave: 'costos.indirectos', etiqueta: 'Costos indirectos', modulo: 'costos', porDefecto: false, destino: '/companies' },
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockQuickAccesses(page: Page, rejectPut = false) {
  let selected = ['carga.produccion'];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'GET' && pathname === '/api/v1/companies') {
      return json(route, { data: [{
        id: COMPANY_ID,
        name: 'Negocio de prueba',
        industry: 'Avicultura',
        cuit: null,
        isActive: true,
        createdAt: '2099-01-01T00:00:00.000Z',
        periodicity: 'MONTHLY',
        condicionIva: 'RESPONSABLE_INSCRIPTO',
        _count: { costStructures: 1 },
      }] });
    }
    if (request.method() === 'GET' && pathname === '/api/v1/me/preferencias') {
      return json(route, { data: { home: { accesosRapidos: selected } } });
    }
    if (request.method() === 'GET' && pathname === '/api/v1/me/preferencias/catalogo') {
      return json(route, { data: catalog });
    }
    if (request.method() === 'PUT' && pathname === '/api/v1/me/preferencias') {
      if (rejectPut) {
        return json(route, { error: { message: 'El acceso rápido "costos.indirectos" no existe en el catálogo.' } }, 422);
      }
      const body = request.postDataJSON() as { home: { accesosRapidos: string[] } };
      selected = body.home.accesosRapidos;
      return json(route, { data: body });
    }
    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/cost-structures`) {
      return json(route, { data: [{
        id: STRUCTURE_ID,
        companyId: COMPANY_ID,
        productName: 'Producto de prueba',
        period: '2099-09',
        status: 'ACTIVE',
        costingSystem: 'ORDERS',
      }] });
    }
    if (request.method() === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/periods/open`) {
      return json(route, { data: {
        id: PERIOD_ID,
        structureId: STRUCTURE_ID,
        companyId: COMPANY_ID,
        code: '2099-09',
        label: 'Septiembre 2099',
        status: 'OPEN',
      } });
    }
    if (request.method() === 'GET' && pathname === `/api/v1/periods/${PERIOD_ID}/tablero-dueno`) {
      return json(route, { data: {
        periodo: { id: PERIOD_ID, codigo: '2099-09' },
        corrida: null,
        unidadGestion: { codigo: 'unidad', nombre: 'Unidad', factor: 1 },
        rubro: { clave: 'RUBRO_PRUEBA', nombreProducto: 'Producto', icons: {}, kpisHome: [] },
        pendientes: [],
      } });
    }
    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/indicadores-macro`) {
      return json(route, { data: [] });
    }
    return route.fallback();
  });
}

async function waitForAppReady(page: Page) {
  await laAppPinto(page);
  await expect(page.locator('.fixed.inset-0.z-50')).toHaveCount(0);
}

test('configura tres accesos, conserva el orden y el home los muestra', async ({ page, consola }, testInfo) => {
  await mockQuickAccesses(page);
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await page.getByRole('tab', { name: 'Preferencias' }).click();

  await page.getByRole('checkbox', { name: 'Bajas del plantel' }).check();
  await page.getByRole('checkbox', { name: 'Costos indirectos' }).check();
  await page.getByTestId('quick-access-costos.indirectos').dragTo(
    page.getByTestId('quick-access-carga.produccion'),
  );
  await testInfo.attach('settings-accesos-rapidos', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Guardar accesos rápidos' }).click();
  await expect(page.getByText('Accesos rápidos guardados.')).toBeVisible();

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  const block = page.getByTestId('home-block').filter({
    has: page.getByRole('heading', { name: 'Accesos rápidos' }),
  });
  await expect(block.getByRole('link')).toHaveCount(3);
  await expect(block.getByRole('link').allTextContents()).resolves.toEqual([
    'Costos indirectos',
    'Producción diaria',
    'Bajas del plantel',
  ]);
  await testInfo.attach('home-accesos-rapidos', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consola.mensajes).toEqual([]);
});

test('un 422 nombra la clave inválida y no pierde la selección', async ({ page, consola }) => {
  await mockQuickAccesses(page, true);
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await page.getByRole('tab', { name: 'Preferencias' }).click();

  const checkbox = page.getByRole('checkbox', { name: 'Costos indirectos' });
  await checkbox.check();
  await page.getByRole('button', { name: 'Guardar accesos rápidos' }).click();

  await expect(page.getByRole('alert')).toContainText('costos.indirectos');
  await expect(checkbox).toBeChecked();
  expect(consola.mensajes).toEqual([]);
});
