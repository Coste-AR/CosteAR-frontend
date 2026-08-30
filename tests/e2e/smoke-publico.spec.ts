import { test, expect, laAppPinto } from './fixtures';

/**
 * Rutas públicas: las únicas que se pueden verificar sin sesión.
 *
 * Los flujos con `requireAuth` (dashboard, empresas, estructuras) necesitan un
 * fixture de sesión que todavía no existe. Está anotado como pendiente en el
 * documento de orquestación (issue B0) en vez de dejarlo como un test comentado
 * que finge cobertura.
 */
const RUTAS_PUBLICAS = [
  { path: '/', nombre: 'landing' },
  { path: '/login', nombre: 'login' },
  { path: '/register', nombre: 'registro' },
  { path: '/forgot-password', nombre: 'recuperar-password' },
] as const;

for (const ruta of RUTAS_PUBLICAS) {
  test(`${ruta.nombre} carga sin errores de consola`, async ({ page, consola }, testInfo) => {
    await page.goto(ruta.path);
    await laAppPinto(page);

    // La evidencia que mira el agente: captura completa, adjunta al reporte.
    await testInfo.attach(`${ruta.nombre}-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    expect(consola.mensajes, `errores en ${ruta.path}`).toEqual([]);
  });
}

test('el login no deja enviar el formulario vacio', async ({ page, consola }) => {
  await page.goto('/login');
  await laAppPinto(page);

  // El boton arranca deshabilitado y se habilita al completar los dos campos.
  // La primera version de este test intentaba clickearlo vacio esperando ver
  // un mensaje de error: se comio el timeout entero porque el formulario ya
  // estaba haciendo lo correcto.
  const submit = page.getByRole('button', { name: /ingresar|iniciar|entrar/i }).first();
  await expect(submit).toBeDisabled();

  await page.getByRole('textbox').first().fill('alguien@ejemplo.com');
  await page.locator('input[type="password"]').first().fill('unaClaveCualquiera');
  await expect(submit).toBeEnabled();

  expect(consola.mensajes).toEqual([]);
});

test('no hay scroll horizontal en mobile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('Mobile'), 'solo aplica a viewports mobile');

  await page.goto('/');
  await laAppPinto(page);

  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde, 'la landing desborda a lo ancho en mobile').toBeLessThanOrEqual(1);
});
