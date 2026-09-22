import { testConSesion as test, expect, laAppPinto } from './fixtures';

test.setTimeout(60_000);

test('muestra ícono, panel y burbuja de ayuda sin enviar consultas', async ({ page, consola }, testInfo) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/') && /costista-chat|advisor/i.test(pathname)) requests.push(pathname);
  });
  await page.clock.install();
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  const icon = page.getByRole('button', { name: 'Abrir ayuda de esta pantalla' });
  await expect(icon).toBeVisible();
  await testInfo.attach('asistente-icono', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await icon.click();
  await expect(page.getByRole('region', { name: 'Ayuda del inicio' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /consulta/i })).toHaveCount(0);
  await testInfo.attach('asistente-panel', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await page.getByRole('button', { name: 'Cerrar ayuda' }).click();
  await page.clock.fastForward(3 * 60 * 1000);
  await expect(page.getByText('¿Necesitás ayuda con esta pantalla?')).toBeVisible();
  await testInfo.attach('asistente-burbuja', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove')));
  await expect(page.getByText('¿Necesitás ayuda con esta pantalla?')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(consola.mensajes).toEqual([]);
});
