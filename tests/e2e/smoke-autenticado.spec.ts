import { testConSesion as test, expect, laAppPinto } from './fixtures';

// WebKit puede tardar mas de 30 s en capturar el dashboard completo en cuatro
// workers. El splash consume 5,3 s por si solo y la evidencia no se recorta.
test.setTimeout(60_000);

test('dashboard carga con la sesion iniciada', async ({ page, consola }, testInfo) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  await testInfo.attach(`dashboard-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en /dashboard').toEqual([]);
});
