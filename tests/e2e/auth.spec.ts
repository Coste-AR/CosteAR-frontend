import { test, testConSesion, expect, laAppPinto } from './fixtures';

test.setTimeout(60_000);
testConSesion.setTimeout(60_000);

test('una ruta protegida manda al login cuando no hay sesión', async ({ page, consola }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();

  expect(consola.mensajes, 'errores al redirigir una ruta protegida').toEqual([]);
});

testConSesion(
  'una sesión activa que vuelve al login regresa al dashboard',
  async ({ page, consola }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await laAppPinto(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Clientes Activos', { exact: true })).toBeVisible();

    expect(consola.mensajes, 'errores al salir del login con una sesión activa').toEqual([]);
  },
);
