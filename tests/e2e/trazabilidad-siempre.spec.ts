import { testConSesion as test, expect, laAppPinto } from './fixtures';

test('la trazabilidad sigue visible con la preferencia vieja apagada', async ({ page, consola }) => {
  await page.addInitScript(() => localStorage.setItem('costear_trace_mode', '0'));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await expect(page.getByText(/Modo trazabilidad activo/)).toBeVisible();
  await expect(page.getByRole('switch', { name: /trazabilidad/i })).toHaveCount(0);
  expect(consola.mensajes).toEqual([]);
});
