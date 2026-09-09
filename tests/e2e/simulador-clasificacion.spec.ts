import { testConSesion as test, expect, laAppPinto } from './fixtures';

const STRUCTURE_ID = '55555555-5555-4555-8555-555555555555';

const DETAIL = {
  rawMaterial: { optimalLot: 0, finalStockQty: 0, finalStockValue: 0 },
  directLabor: { workingDays: 30, itcsPercent: 0, iapPercent: 0, hourlyRates: {} },
  indirectCosts: { perDepartment: {} },
  unitCost: { unitsProduced: 120, unitProductionCost: 50, unitCostOfGoodsSold: 50 },
};

function simulationResult({
  comportamientoIndirectos,
  contribucion,
  equilibrio,
}: {
  comportamientoIndirectos: 'FIJO' | 'VARIABLE' | null;
  contribucion: number | null;
  equilibrio: number | null;
}) {
  const incompleta = comportamientoIndirectos === null;
  const motivo = 'Falta clasificar frente al volumen el rubro Costos indirectos de producción.';
  const componentes = [
    {
      clave: 'comportamiento_materia_prima',
      etiqueta: 'Materia prima',
      importeAbsorcion: 2_000,
      comportamientoVolumen: 'VARIABLE',
      origen: 'empresa',
      parametroId: 'parametro-mp',
      clasificadoPorUserId: 'usuario-e2e',
      clasificadoEn: '2099-01-01T00:00:00.000Z',
    },
    {
      clave: 'comportamiento_mano_obra_directa',
      etiqueta: 'Mano de obra directa',
      importeAbsorcion: 1_500,
      comportamientoVolumen: 'FIJO',
      origen: 'empresa',
      parametroId: 'parametro-mod',
      clasificadoPorUserId: 'usuario-e2e',
      clasificadoEn: '2099-01-01T00:00:00.000Z',
    },
    {
      clave: 'comportamiento_costos_indirectos',
      etiqueta: 'Costos indirectos de producción',
      importeAbsorcion: 2_500,
      comportamientoVolumen: comportamientoIndirectos,
      origen: comportamientoIndirectos ? 'empresa' : null,
      parametroId: comportamientoIndirectos ? 'parametro-cip' : null,
      clasificadoPorUserId: comportamientoIndirectos ? 'usuario-e2e' : null,
      clasificadoEn: comportamientoIndirectos ? '2099-01-01T00:00:00.000Z' : null,
    },
  ];

  return {
    rawMaterialConsumed: 2_000,
    directLaborTotal: 1_500,
    indirectCostsApplied: 2_500,
    productionCost: 6_000,
    costOfGoodsSold: 6_000,
    grossMargin: 3_000,
    grossMarginPct: 33.33,
    detail: DETAIL,
    incompletitud: { incompleto: false, motivos: [], datosPendientes: [] },
    contribucionMarginal: incompleta
      ? {
          incompleta: true,
          precioUnitario: 75,
          unidadesVendidas: 120,
          totalAbsorcion: 6_000,
          costoVariableTotal: null,
          costoVariableUnitario: null,
          contribucionMarginalUnitaria: null,
          componentes,
          motivos: [motivo],
        }
      : {
          incompleta: false,
          precioUnitario: 75,
          unidadesVendidas: 120,
          totalAbsorcion: 6_000,
          costoVariableTotal: comportamientoIndirectos === 'VARIABLE' ? 4_500 : 2_000,
          costoVariableUnitario: comportamientoIndirectos === 'VARIABLE' ? 37.5 : 16.67,
          contribucionMarginalUnitaria: contribucion,
          componentes,
        },
    puntoEquilibrio: incompleta
      ? {
          incompleta: true,
          unidadesEquilibrio: null,
          fechaUltimoRecalculo: '2099-01-01T00:00:00.000Z',
          motivos: [motivo],
        }
      : {
          incompleta: false,
          unidadesEquilibrio: equilibrio,
          fechaUltimoRecalculo: '2099-01-01T00:00:00.000Z',
        },
  };
}

test('el simulador marca el escenario cuando falta una clasificación del dominio', async ({
  page,
  consola,
}, testInfo) => {
  test.setTimeout(90_000);
  const response = simulationResult({
    comportamientoIndirectos: null,
    contribucion: null,
    equilibrio: null,
  });
  let simulationCalls = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname === `/api/v1/cost-structures/${STRUCTURE_ID}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: STRUCTURE_ID,
            companyId: '66666666-6666-4666-8666-666666666666',
            productName: 'Producto de prueba',
            period: '2099-01',
            status: 'ACTIVE',
            costingSystem: 'ORDERS',
            rawMaterialConfig: null,
            directLaborConfig: null,
            indirectCostConfig: null,
            salesUnitPrice: '75',
            salesQuantity: '120',
            productionQuantity: '120',
            createdAt: '2099-01-01T00:00:00.000Z',
          },
        }),
      });
    }

    if (
      request.method() === 'GET' &&
      pathname === `/api/v1/cost-structures/${STRUCTURE_ID}/calculations/latest`
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'calculo-e2e',
            costStructureId: STRUCTURE_ID,
            rawMaterialConsumed: '2000',
            directLaborTotal: '1500',
            indirectCostsApplied: '2500',
            productionCost: '6000',
            costOfGoodsSold: '6000',
            grossMargin: '3000',
            grossMarginPct: '33.33',
            detail: DETAIL,
            calculatedAt: '2099-01-01T00:00:00.000Z',
          },
        }),
      });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/runs`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/data-points`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }

    if (
      request.method() === 'GET' &&
      pathname === '/api/v1/companies/66666666-6666-4666-8666-666666666666/allocation-bases'
    ) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/periods`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }

    if (request.method() === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/process-setup`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { completado: true, departamentos: [] } }),
      });
    }

    if (
      request.method() === 'POST' &&
      pathname === `/api/v1/cost-structures/${STRUCTURE_ID}/simulate`
    ) {
      simulationCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { result: response, simulated: true } }),
      });
    }

    return route.fallback();
  });

  await page.goto(`/cost-structures/${STRUCTURE_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible({ timeout: 45_000 });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Simulador' }).click();

  const run = page.getByRole('button', { name: 'Ejecutar Simulación' });
  const contributionCard = page.getByRole('heading', { name: 'Contribución marginal' }).locator('..');
  const equilibriumCard = page.getByRole('heading', { name: 'Punto de equilibrio' }).locator('..');
  await expect(run).toBeEnabled();
  await Promise.all([
    page.waitForResponse((networkResponse) =>
      networkResponse.url().endsWith(`/api/v1/cost-structures/${STRUCTURE_ID}/simulate`),
    ),
    run.click(),
  ]);
  await expect(run).toBeEnabled();
  const incomplete = page.getByRole('alert').filter({ hasText: 'Escenario incompleto' });
  await expect(incomplete).toContainText('Falta clasificar frente al volumen');
  await expect(contributionCard).toContainText('Incompleta');
  await expect(equilibriumCard).toContainText('Incompleto');
  expect(simulationCalls).toBe(1);

  const simulator = page.getByTestId('scenario-simulator');
  await simulator.evaluate((section) => {
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

  await testInfo.attach(`simulador-clasificacion-${testInfo.project.name}`, {
    body: await simulator.screenshot(),
    contentType: 'image/png',
  });

  expect(consola.mensajes).toEqual([]);
});
