import { expect, laAppPinto, testConSesion } from './fixtures';

testConSesion.setTimeout(60_000);

const COMPANY_ID = '00000000-0000-4000-8000-000000000096';
const LOT_ID = '00000000-0000-4000-8000-000000000097';

async function noHayDinero(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('field-panel')).not.toContainText(/\$|precio|costo|margen|importe/i);
}

testConSesion('carga producción y bajas desde botones táctiles sin mostrar dinero', async ({ page, consola }) => {
  const requests: Array<{ pathname: string; body: unknown }> = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname === '/api/v1/companies') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: COMPANY_ID,
            name: 'Empresa de prueba',
            industry: 'AVICULTURA',
            cuit: null,
            isActive: true,
            createdAt: '2099-01-01T00:00:00.000Z',
            periodicity: 'MONTHLY',
            condicionIva: 'RESPONSABLE_INSCRIPTO',
          }],
        }),
      });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/modulos-rubro`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { clave: 'produccion', nombre: 'Producción diaria', descripcion: '', estado: 'prendido', porDefecto: true, dependeDe: [], parametros: [], alertas: [] },
            { clave: 'plantel', nombre: 'Plantel', descripcion: '', estado: 'prendido', porDefecto: true, dependeDe: [], parametros: [], alertas: [] },
            { clave: 'alimento', nombre: 'Alimento propio', descripcion: '', estado: 'apagado', porDefecto: false, dependeDe: [], parametros: [], alertas: [] },
            { clave: 'peso', nombre: 'Muestreo de peso', descripcion: '', estado: 'apagado', porDefecto: false, dependeDe: ['plantel'], parametros: [], alertas: [] },
          ],
        }),
      });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/lotes-productivos`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: LOT_ID,
            companyId: COMPANY_ID,
            referencia: 'Lote de prueba',
            activo: true,
            unidadProductivaId: '00000000-0000-4000-8000-000000000098',
            unidadProductiva: { id: '00000000-0000-4000-8000-000000000098', referencia: 'Galpón de prueba', activa: true },
          }],
        }),
      });
    }

    if (
      request.method() === 'POST'
      && (
        pathname === `/api/v1/lotes/${LOT_ID}/producciones`
        || pathname === `/api/v1/lotes/${LOT_ID}/eventos`
      )
    ) {
      requests.push({ pathname, body: request.postDataJSON() });
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'registro-e2e' } }),
      });
    }

    return route.fallback();
  });

  await page.goto('/panel-campo', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await expect(page.getByRole('heading', { name: '¿Qué querés cargar?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Huevos/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Gallinas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Alimento/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Peso/ })).toHaveCount(0);
  await noHayDinero(page);

  for (const button of await page.getByTestId('field-action').all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(120);
  }

  await page.getByRole('button', { name: /Huevos/ }).click();
  await expect(page.getByText('Lote de prueba · Galpón de prueba')).toBeVisible();
  await noHayDinero(page);
  await page.getByLabel('Huevos').fill('999999999');
  await page.getByRole('button', { name: 'Guardar huevos' }).click();

  await expect(page.getByRole('heading', { name: 'Listo' })).toBeVisible();
  await expect(page.getByText('Listo: 999999999 huevos, Lote de prueba, hoy')).toBeVisible();
  await expect(page.getByText('El dato quedó guardado y disponible para revisión.')).toBeVisible();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    pathname: `/api/v1/lotes/${LOT_ID}/producciones`,
    body: expect.objectContaining({
      variante: 'total_diario',
      unidadesProducidas: 999999999,
      roturas: 0,
      descartes: 0,
    }),
  });

  await page.getByRole('button', { name: 'Cargar otro dato' }).click();
  await page.getByRole('button', { name: /Gallinas/ }).click();
  await noHayDinero(page);
  await page.getByLabel('Gallinas').fill('3');
  await page.getByRole('radio', { name: 'Mortalidad' }).check();
  await page.getByRole('button', { name: 'Guardar gallinas' }).click();

  await expect(page.getByText('Listo: 3 gallinas, Lote de prueba, hoy')).toBeVisible();

  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual({
    pathname: `/api/v1/lotes/${LOT_ID}/eventos`,
    body: expect.objectContaining({ tipo: 'baja', cantidad: 3, motivo: 'mortalidad' }),
  });

  await noHayDinero(page);
  expect(consola.mensajes, 'errores en el panel de campo').toEqual([]);
});

testConSesion('no elige en silencio cuando hay más de un lote activo', async ({ page, consola }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'GET' && pathname === '/api/v1/companies') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: COMPANY_ID, name: 'Empresa de prueba', industry: 'AVICULTURA', isActive: true }] }) });
    }
    if (request.method() === 'GET' && pathname.endsWith('/modulos-rubro')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ clave: 'produccion', nombre: 'Producción', descripcion: '', estado: 'prendido', porDefecto: true, dependeDe: [], parametros: [], alertas: [] }] }) });
    }
    if (request.method() === 'GET' && pathname.endsWith('/lotes-productivos')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [
        { id: LOT_ID, referencia: 'Lote uno', activo: true, unidadProductiva: { id: 'unidad-1', referencia: 'Galpón uno', activa: true } },
        { id: '00000000-0000-4000-8000-000000000099', referencia: 'Lote dos', activo: true, unidadProductiva: { id: 'unidad-2', referencia: 'Galpón dos', activa: true } },
      ] }) });
    }
    return route.fallback();
  });

  await page.goto('/panel-campo', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await expect(page.getByLabel('Lote activo')).toHaveValue('');
  await expect(page.getByRole('button', { name: /Huevos/ })).toBeDisabled();
  await page.getByLabel('Lote activo').selectOption(LOT_ID);
  await expect(page.getByRole('button', { name: /Huevos/ })).toBeEnabled();
  expect(consola.mensajes, 'errores al elegir lote').toEqual([]);
});
