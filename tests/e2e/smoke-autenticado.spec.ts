import { testConSesion as test, expect, laAppPinto } from './fixtures';

// WebKit puede tardar mas de 30 s en capturar el dashboard completo en cuatro
// workers. El splash consume 5,3 s por si solo y la evidencia no se recorta.
test.setTimeout(60_000);

test('dashboard carga con la sesion iniciada', async ({ page, consola }, testInfo) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Clientes Activos', { exact: true })).toBeVisible();
  await expect(page.getByText('Por Validar', { exact: true })).toBeVisible();
  await expect(page.getByText('Alertas Activas', { exact: true })).toBeVisible();
  await expect(page.getByText('Estructuras Totales', { exact: true })).toBeVisible();

  await testInfo.attach(`dashboard-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en /dashboard').toEqual([]);
});

test.fail(
  'el fixture autenticado falla ante una request sin respuesta definida',
  async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await laAppPinto(page);

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/v1/e2e/sin-fixture');
      return response.status;
    });

    // El cuerpo del test termina bien. La falla esperada ocurre en el teardown
    // de testConSesion, que debe nombrar GET /api/v1/e2e/sin-fixture.
    expect(status).toBe(501);
  },
);
