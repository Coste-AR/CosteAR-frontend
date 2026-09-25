import { testConSesion as test, expect, laAppPinto } from './fixtures';

const companyId = '11111111-1111-4111-8111-111111111111';
const alertas = [
  {
    id: 'alerta-activa', type: 'INDICADOR_FISICO', message: 'La humedad superó el umbral',
    threshold: '12', actualValue: '15', isRead: false,
    createdAt: '2026-09-22T12:00:00.000Z', severidad: 'CRITICA',
    indicador: 'humedad_ingreso', indicadorEtiqueta: 'Humedad al ingreso',
    unidadValor: '%', unidadUmbral: '%', motivoNoEvaluada: null,
  },
  {
    id: 'alerta-sin-dato', type: 'INDICADOR_FISICO', message: 'Falta la lectura de postura',
    threshold: '80', actualValue: null, isRead: false,
    createdAt: '2026-09-22T13:00:00.000Z', severidad: 'ADVERTENCIA',
    indicador: 'postura_media_movil', indicadorEtiqueta: 'Postura media',
    unidadValor: '%', unidadUmbral: '%', motivoNoEvaluada: 'Falta la lectura de postura',
  },
];

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  let savedRules: Record<string, unknown>[] = [];
  await page.route(/\/api\/v1\/alerts(?:\?.*)?$/, (route) => route.fulfill({ json: { data: alertas } }));
  await page.route('**/api/v1/companies', (route) => route.fulfill({ json: { data: [{
    id: companyId, name: 'Negocio de prueba', industry: 'AVICOLA', isActive: true,
    _count: { costStructures: 0 },
  }] } }));
  await page.route('**/api/v1/macro/history?**', (route) => route.fulfill({ json: { data: [] } }));
  await page.route(`**/api/v1/companies/${companyId}/alert-rules/catalog`, (route) => route.fulfill({ json: {
    data: [{ clave: 'humedad_ingreso', etiqueta: 'Humedad al ingreso', unidad: '%' }],
  } }));
  await page.route(`**/api/v1/companies/${companyId}/alert-rules`, (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: savedRules } });
    const input = route.request().postDataJSON();
    if (input.umbral === null) return route.fulfill({ status: 400, json: { error: { message: 'El umbral es obligatorio' } } });
    const rule = { ...input, id: 'regla-guardada', createdAt: '2026-09-23T05:00:00.000Z', updatedAt: '2026-09-23T05:00:00.000Z' };
    savedRules = [rule];
    return route.fulfill({ status: 201, json: { data: rule } });
  });
});

test('la lista cuenta alertas activas y explica lo que no pudo evaluarse', async ({ page, consola }, testInfo) => {
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await expect(page.getByTestId('alertas-activas')).toHaveText('1');
  await expect(page.getByTestId('alertas-sin-evaluar')).toHaveText('1');
  await expect(page.getByText('No se pudo evaluar: Falta la lectura de postura')).toBeVisible();
  await expect(page.getByText('Humedad al ingreso', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Valor: 15 % · Umbral: 12 %/)).toBeVisible();
  await testInfo.attach('lista-alertas', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  expect(consola.mensajes).toEqual([]);
});

test('formulario muestra el error de umbral y guarda la regla al corregirlo', async ({ page, consola }, testInfo) => {
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByLabel('Indicador', { exact: true }).selectOption('humedad_ingreso');
  await page.getByRole('button', { name: 'Guardar regla' }).click();
  await expect(page.getByText('El umbral es obligatorio')).toBeVisible();
  await expect(page.getByLabel('Umbral (%)')).toHaveAttribute('aria-invalid', 'true');
  await testInfo.attach('formulario-regla-error', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.getByLabel('Umbral (%)').fill('12');
  await page.getByRole('button', { name: 'Guardar regla' }).click();
  await expect(page.getByText('Mayor que 12')).toBeVisible();
  await testInfo.attach('regla-guardada', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  expect(consola.mensajes).toEqual([]);
});
