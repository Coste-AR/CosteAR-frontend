import { expect, laAppPinto, test, testConSesion } from './fixtures';

test.setTimeout(60_000);
testConSesion.setTimeout(60_000);

const METRICAS = [
  'Costo por cajón',
  'Precio promedio de venta del período',
  'Contribución marginal por cajón',
  'Punto de equilibrio en cajones',
  'Producido contra equilibrio',
  'Resultado del período',
] as const;

testConSesion('el tablero de la empresa renderiza el esqueleto completo', async ({ page, consola }, testInfo) => {
  await page.goto('/owner-dashboard', { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/owner-dashboard$/);
  await expect(page.getByRole('heading', { name: 'Tablero de la empresa' })).toBeVisible();

  const metricas = page.getByTestId('owner-metric');
  await expect(metricas).toHaveCount(6);

  for (const [index, nombre] of METRICAS.entries()) {
    const metrica = metricas.nth(index);
    await expect(metrica.getByRole('heading', { name: nombre })).toBeVisible();
    await expect(metrica.getByText('Sin datos', { exact: true }).first()).toBeVisible();
  }

  await expect(page.getByText('Último recálculo:').getByText('Sin datos')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Producido contra equilibrio' })).toHaveAttribute(
    'aria-valuetext',
    'Sin datos',
  );
  await expect(page.getByRole('heading', { name: 'Alertas activas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Qué falta cargar para cerrar el período' })).toBeVisible();

  // AppShell desplaza un contenedor interno. Para la evidencia se expande ese
  // contenedor después de verificar el comportamiento, sin cambiar la UI de
  // producción, y así fullPage incluye también los dos bloques inferiores.
  await page.getByTestId('owner-dashboard').evaluate((dashboard) => {
    const scrollContainer = dashboard.closest('main')?.parentElement as HTMLElement | null;
    const shell = scrollContainer?.parentElement as HTMLElement | null;

    if (scrollContainer) {
      scrollContainer.style.overflow = 'visible';
      scrollContainer.style.height = 'auto';
    }
    if (shell) {
      shell.style.overflow = 'visible';
      shell.style.height = 'auto';
      shell.style.minHeight = '100vh';
    }
    document.documentElement.style.overflowY = 'visible';
  });

  await testInfo.attach(`tablero-empresa-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en /owner-dashboard').toEqual([]);
});

test('el tablero de la empresa no se abre sin sesión', async ({ page, consola }) => {
  await page.goto('/owner-dashboard', { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(consola.mensajes, 'errores al proteger /owner-dashboard').toEqual([]);
});
