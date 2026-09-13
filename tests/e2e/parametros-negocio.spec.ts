import { testConSesion as test, expect, laAppPinto } from './fixtures';

const COMPANY_ID = '33333333-3333-4333-8333-333333333333';

type Parameter = {
  clave: string;
  valor: number;
  descripcion: string;
  unidad: string | null;
  valorDefault: number;
  seguro: boolean;
  origen: 'empresa' | 'default';
  confirmado: boolean;
  nota?: string;
};

test('confirma parametros del negocio y permite volver al valor sugerido', async ({
  page,
  consola,
}, testInfo) => {
  // WebKit puede tardar más de 30 s en estabilizar y capturar la pantalla
  // completa bajo la carga paralela de la suite. El flujo tiene esperas
  // específicas propias; este margen evita que el timeout total lo corte
  // mientras está generando la evidencia obligatoria.
  test.setTimeout(90_000);
  const writes: Array<{ method: 'PUT' | 'DELETE'; key: string; value?: number; confirmed?: boolean }> = [];
  const parameters: Parameter[] = [
    {
      clave: 'vida_util_lote_meses',
      valor: 24,
      descripcion: 'Meses durante los que el lote conserva su vida útil.',
      unidad: 'mes',
      valorDefault: 24,
      seguro: false,
      origen: 'default',
      confirmado: false,
      nota: 'Confirmar la vida útil real con la empresa.',
    },
    {
      clave: 'unidades_por_envase',
      valor: 360,
      descripcion: 'Unidades que entran en el envase de gestión.',
      unidad: 'unidad',
      valorDefault: 360,
      seguro: true,
      origen: 'default',
      confirmado: false,
    },
    {
      clave: 'costo_envase',
      valor: 150,
      descripcion: 'Costo del envase usado para entregar el producto.',
      unidad: 'ARS',
      valorDefault: 100,
      seguro: false,
      origen: 'empresa',
      confirmado: true,
      nota: 'Confirmar el precio vigente.',
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: COMPANY_ID,
            name: 'Empresa de prueba',
            industry: 'Rubro de prueba',
            cuit: null,
            isActive: true,
            createdAt: '2099-01-01T00:00:00.000Z',
            periodicity: 'MONTHLY',
            condicionIva: 'EXENTO',
          },
        }),
      });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/cost-structures`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: '44444444-4444-4444-8444-444444444444',
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
          }],
        }),
      });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/deviations`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    }

    if (
      request.method() === 'GET' &&
      (pathname === '/api/v1/benchmarks/General' || pathname === '/api/v1/benchmarks/Rubro%20de%20prueba')
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    }

    const collection = `/api/v1/companies/${COMPANY_ID}/parametros-costeo`;
    if (request.method() === 'GET' && pathname === collection) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: parameters }),
      });
    }

    if (pathname.startsWith(`${collection}/`)) {
      const key = pathname.slice(collection.length + 1);
      const parameter = parameters.find((item) => item.clave === key);
      if (!parameter) return route.fallback();

      if (request.method() === 'PUT') {
        const payload = request.postDataJSON() as { valor: number; confirmado: boolean };
        parameter.valor = payload.valor;
        parameter.origen = 'empresa';
        parameter.confirmado = payload.confirmado;
        writes.push({ method: 'PUT', key, value: payload.valor, confirmed: payload.confirmado });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: parameter }),
        });
      }

      if (request.method() === 'DELETE') {
        parameter.valor = parameter.valorDefault;
        parameter.origen = 'default';
        parameter.confirmado = false;
        writes.push({ method: 'DELETE', key });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: parameter }),
        });
      }
    }

    return route.fallback();
  });

  await page.goto(`/companies/${COMPANY_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Parámetros' }).click();

  await expect(page.getByText('Parámetros del negocio')).toBeVisible();
  await expect(page.getByText('Estimación del sistema')).toBeVisible();
  await expect(page.getByText('Confirmado por la empresa')).toBeVisible();
  await expect(page.getByText(/Confirmar la vida útil real con la empresa/i)).toBeVisible();
  await expect(page.getByText(/Los períodos cerrados conservan los valores/i)).toBeVisible();

  const lifeRow = page.getByRole('listitem').filter({ hasText: parameters[0]!.descripcion });
  await lifeRow.getByLabel('Valor del negocio').fill('30');
  await lifeRow.getByRole('button', { name: 'Guardar y confirmar' }).click();
  await expect.poll(() => writes).toContainEqual({
    method: 'PUT',
    key: 'vida_util_lote_meses',
    value: 30,
    confirmed: true,
  });
  await expect(lifeRow.getByText('Confirmado por la empresa')).toBeVisible();

  const packageRow = page.getByRole('listitem').filter({ hasText: parameters[2]!.descripcion });
  await packageRow.getByRole('button', { name: 'Volver al sugerido' }).click();
  await expect.poll(() => writes).toContainEqual({ method: 'DELETE', key: 'costo_envase' });
  await expect(packageRow.getByText('Estimación del sistema')).toBeVisible();
  await expect(packageRow.getByLabel('Valor del negocio')).toHaveValue('100');

  const horizontalOverflow = await page.getByTestId('company-cost-parameters').evaluate(
    (section) => section.scrollWidth - section.clientWidth,
  );
  expect(horizontalOverflow, 'la pantalla de parámetros desborda en horizontal').toBeLessThanOrEqual(1);
  const viewportOverflow = await page.getByTestId('company-cost-parameters').evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return Math.max(0, rect.right - window.innerWidth) + Math.max(0, -rect.left);
  });
  expect(viewportOverflow, 'la pantalla de parámetros queda fuera del viewport').toBeLessThanOrEqual(1);

  // AppShell usa un contenedor con scroll propio. Para que el artifact muestre
  // la pantalla completa se expande sólo dentro del navegador de prueba.
  await page.getByTestId('company-cost-parameters').evaluate((section) => {
    const scrollContainer = section.closest('main')?.parentElement as HTMLElement | null;
    const shell = scrollContainer?.parentElement as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.style.overflow = 'visible';
      scrollContainer.style.height = 'auto';
      scrollContainer.style.minWidth = '0';
      scrollContainer.style.width = '100%';
      scrollContainer.style.maxWidth = '100vw';
    }
    if (shell) {
      shell.style.overflow = 'visible';
      shell.style.height = 'auto';
      shell.style.minHeight = '100vh';
      shell.style.width = '100%';
      shell.style.maxWidth = '100vw';
    }
    document.documentElement.style.overflowY = 'visible';
  });

  await testInfo.attach(`parametros-negocio-${testInfo.project.name}`, {
    body: await page.getByTestId('company-cost-parameters').screenshot(),
    contentType: 'image/png',
  });

  expect(consola.mensajes).toEqual([]);
});
