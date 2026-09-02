import { testConSesion as test, expect, laAppPinto } from './fixtures';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

type Behavior = 'VARIABLE' | 'FIJO' | 'SEMIFIJO';

test('clasifica costos con confirmación explícita y conserva sin confirmar al salir', async ({
  page,
  consola,
}, testInfo) => {
  const saved: Array<{ key: string; behavior: Behavior; confirmed: boolean }> = [];
  const classifications: Record<string, { behavior: Behavior | null; confirmed: boolean; reason?: string }> = {
    comportamiento_materia_prima: {
      behavior: 'VARIABLE',
      confirmed: false,
      reason: 'Los insumos se consumen en función de la producción.',
    },
    comportamiento_mano_obra_directa: { behavior: null, confirmed: false },
    comportamiento_costos_indirectos: { behavior: null, confirmed: false },
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: COMPANY_ID,
            name: 'Empresa de prueba',
            industry: null,
            cuit: null,
            isActive: true,
            createdAt: '2099-01-01T00:00:00.000Z',
            periodicity: 'MONTHLY',
            condicionIva: 'EXENTO',
          },
        }),
      });
    }

    if (
      request.method() === 'GET' &&
      pathname === `/api/v1/companies/${COMPANY_ID}/cost-structures`
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              companyId: COMPANY_ID,
              productName: 'Producto de prueba',
              period: '2099-01',
              status: 'DRAFT',
              costingSystem: 'ORDERS',
              rawMaterialConfig: null,
              directLaborConfig: null,
              indirectCostConfig: null,
              salesUnitPrice: null,
              salesQuantity: null,
              productionQuantity: null,
              createdAt: '2099-01-01T00:00:00.000Z',
            },
          ],
        }),
      });
    }

    if (
      request.method() === 'GET' &&
      pathname === `/api/v1/companies/${COMPANY_ID}/deviations`
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    }

    if (request.method() === 'GET' && pathname === '/api/v1/benchmarks/General') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    }

    const prefix = `/api/v1/companies/${COMPANY_ID}/parametros-costeo/`;
    if (pathname.startsWith(prefix)) {
      const key = pathname.slice(prefix.length);
      const current = classifications[key];
      if (!current) return route.fallback();

      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              clave: key,
              comportamientoVolumen: current.behavior,
              origen: current.confirmed ? 'empresa' : 'default',
              confirmado: current.confirmed,
              clasificadoPorUserId: null,
              clasificadoEn: null,
              fundamento: current.reason,
            },
          }),
        });
      }

      if (request.method() === 'PUT') {
        const payload = request.postDataJSON() as {
          comportamientoVolumen: Behavior;
          confirmado: boolean;
        };
        current.behavior = payload.comportamientoVolumen;
        current.confirmed = payload.confirmado;
        saved.push({ key, behavior: payload.comportamientoVolumen, confirmed: payload.confirmado });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              clave: key,
              comportamientoVolumen: current.behavior,
              origen: 'empresa',
              confirmado: true,
              clasificadoPorUserId: 'usuario-e2e',
              clasificadoEn: '2099-01-01T00:00:00.000Z',
            },
          }),
        });
      }
    }

    return route.fallback();
  });

  await page.goto(`/companies/${COMPANY_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Fijo / variable' }).click();

  await expect(page.getByText('Clasificación de costos')).toBeVisible();
  await expect(page.getByText(/“Fijo” no significa que nunca cambie/i)).toBeVisible();
  await expect(page.getByText(/Propuesta del sistema:/i)).toContainText('Variable');

  const laborSelect = page.getByLabel('Clasificación para Mano de obra directa');
  await laborSelect.selectOption('FIJO');
  await page.getByRole('tab', { name: 'Estructuras de Costos' }).click();
  expect(saved, 'salir sin confirmar no debe escribir parámetros').toEqual([]);

  await page.getByRole('tab', { name: 'Fijo / variable' }).click();
  await expect(page.getByLabel('Clasificación para Mano de obra directa')).toHaveValue('');
  await page.getByLabel('Clasificación para Mano de obra directa').selectOption('FIJO');
  const laborRow = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Mano de obra directa', exact: true }),
  });
  await laborRow.getByRole('button', { name: 'Confirmar' }).click();

  await expect.poll(() => saved).toEqual([
    {
      key: 'comportamiento_mano_obra_directa',
      behavior: 'FIJO',
      confirmed: true,
    },
  ]);
  await expect(page.getByText('Clasificación confirmada.')).toBeVisible();

  // AppShell desplaza un contenedor interno. Se expande solo para que la
  // evidencia incluya los tres conceptos, sin modificar la UI de producción.
  await page.getByTestId('cost-behavior-classification').evaluate((classification) => {
    const scrollContainer = classification.closest('main')?.parentElement as HTMLElement | null;
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

  await testInfo.attach(`clasificacion-costos-${testInfo.project.name}`, {
    body: await page.getByTestId('cost-behavior-classification').screenshot(),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en la clasificación guiada').toEqual([]);
});
