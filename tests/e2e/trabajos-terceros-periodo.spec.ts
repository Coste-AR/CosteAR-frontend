import type { Page, Route } from '@playwright/test';
import { testConSesion as test, expect, laAppPinto } from './fixtures';

const STRUCTURE_ID = '59595959-5959-4959-8959-595959595959';
const COMPANY_ID = '59595959-aaaa-4aaa-8aaa-595959595959';
const PERIOD_ID = '59595959-bbbb-4bbb-8bbb-595959595959';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockCostingScreen(page: Page, periodStatus: 'OPEN' | 'CLOSED') {
  let thirdPartyWork = periodStatus === 'CLOSED' ? 1_200 : 0;
  const writes: Array<{ method: string; amount?: number }> = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method === 'GET' && pathname === `/api/v1/cost-structures/${STRUCTURE_ID}`) {
      return json(route, {
        data: {
          id: STRUCTURE_ID,
          companyId: COMPANY_ID,
          productName: 'Campera tercerizada',
          period: '2099-02',
          status: 'ACTIVE',
          costingSystem: 'ORDERS',
          rawMaterialConfig: {
            materials: [{
              id: 'material-e2e',
              code: 'TELA',
              name: 'Tela',
              unit: 'm',
              wilson: { annualDemand: 1_200, orderCost: 10, holdingRate: 0.2, unitCost: 5 },
              stockPolicy: { minConsumption: 1, maxConsumption: 2, minLeadTime: 1, maxLeadTime: 2, safetyStock: 1 },
              initialStock: { quantity: 100, unitCost: 5 },
              movements: [],
            }],
          },
          directLaborConfig: {
            workingDays: {
              totalDaysPerYear: 365,
              unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
              paidAbsence: { holidays: 12, vacations: 10, sickness: 0, specialLeaves: 0, workAccidents: 0 },
            },
            itcs: { derivationBase: 100, fixedArt: 3, uncertainRemunerative: [], uncertainNonRemunerative: [] },
            departments: [{ name: 'Confección', basicRemuneration: 1_500, hoursWorked: 160 }],
          },
          indirectCostConfig: {
            centers: [{ id: 'confeccion', name: 'Confección', type: 'productive' }],
            concepts: [],
            serviceDistributions: [],
            productiveSettings: [{ centerId: 'confeccion', budget: { fixed: 1_000, variable: 500 }, normalCapacity: 160, actualActivity: 150, actualCip: 1_400 }],
          },
          salesUnitPrice: '90',
          salesQuantity: '100',
          productionQuantity: '100',
          thirdPartyWork: String(thirdPartyWork),
          createdAt: '2099-02-01T00:00:00.000Z',
        },
      });
    }

    if (method === 'PUT' && pathname === `/api/v1/cost-structures/${STRUCTURE_ID}/third-party-work`) {
      const body = request.postDataJSON() as { thirdPartyWork: number };
      thirdPartyWork = body.thirdPartyWork;
      writes.push({ method: 'PUT', amount: thirdPartyWork });
      return json(route, { data: { id: STRUCTURE_ID, thirdPartyWork: String(thirdPartyWork) } });
    }

    if (method === 'GET' && pathname === `/api/v1/cost-structures/${STRUCTURE_ID}/calculations/latest`) {
      return json(route, { data: null });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/runs`) {
      return json(route, { data: [] });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/data-points`) {
      return json(route, { data: [] });
    }
    if (method === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/allocation-bases`) {
      return json(route, { data: [] });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/allocation-values`) {
      return json(route, { data: [] });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/process-setup`) {
      return json(route, { data: { completado: true, departamentos: [] } });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/periods`) {
      return json(route, {
        data: [{
          id: PERIOD_ID,
          structureId: STRUCTURE_ID,
          companyId: COMPANY_ID,
          code: '2099-02',
          label: 'Febrero 2099',
          startDate: '2099-02-01T00:00:00.000Z',
          endDate: '2099-02-28T00:00:00.000Z',
          status: periodStatus,
          closedAt: periodStatus === 'CLOSED' ? '2099-03-01T00:00:00.000Z' : null,
          closedBy: null,
          closedRunId: null,
          reopenCount: 0,
          reopenedAt: null,
          reopenReason: null,
        }],
      });
    }

    if (method === 'POST' && pathname === `/api/v1/structures/${STRUCTURE_ID}/calculate`) {
      writes.push({ method: 'CALCULATE' });
      const normal = 6_000;
      const real = normal + thirdPartyWork;
      return json(route, {
        data: {
          runId: `run-third-party-${thirdPartyWork}`,
          runN: writes.filter((write) => write.method === 'CALCULATE').length,
          calculationId: `calculation-third-party-${thirdPartyWork}`,
          results: {
            unidadGestion: { codigo: 'caja-prueba', nombre: 'Caja de prueba', factor: 10 },
            rawMaterialConsumed: 2_000,
            directLaborTotal: 1_500,
            indirectCostsApplied: 2_500,
            productionCost: normal,
            thirdPartyWork,
            assetDepreciation: 0,
            budgetVariance: 0,
            realProductionCost: real,
            costOfGoodsSold: real - 500,
            grossMargin: 9_000 - (real - 500),
            grossMarginPct: ((9_000 - (real - 500)) / 9_000) * 100,
            detail: {
              rawMaterial: { optimalLot: 100, finalStockQty: 20, finalStockValue: 1_000 },
              directLabor: { workingDays: 240, itcsPercent: 30, iapPercent: 10, hourlyRates: {} },
              indirectCosts: { perDepartment: {} },
              unitCost: {
                unitsProduced: 100,
                unitProductionCost: real / 100,
                unitFinishedGoodsCost: real / 100 + 7,
                unitCostOfGoodsSold: (real - 500) / 100,
                basadoEn: 'producidas',
              },
            },
          },
          tree: [],
          incompleto: { incompleto: false, motivos: [], datosPendientes: [] },
        },
      });
    }
    if (method === 'GET' && pathname.startsWith('/api/v1/calculation-runs/run-third-party-') && pathname.endsWith('/tree')) {
      return json(route, { data: { runId: pathname.split('/')[4], runN: 1, engineVersion: 'e2e', tree: [] } });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/resultado-vigente`) {
      return json(route, { data: { provisorio: false, motivo: null } });
    }
    if (method === 'GET' && pathname === '/api/v1/validaciones/ledger') {
      return json(route, { data: { entries: [], totalsBySection: {}, periods: [] } });
    }

    return route.fallback();
  });

  return { writes };
}

test('carga trabajos de terceros por separado y muestra su impacto exacto en el costo real', async ({
  page,
  consola,
}) => {
  test.setTimeout(180_000);
  const apiState = await mockCostingScreen(page, 'OPEN');

  await page.goto(`/cost-structures/${STRUCTURE_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Trabajos de terceros' }).click();

  const section = page.getByTestId('third-party-work-period');
  await expect(section.getByText('No es un costo indirecto.')).toBeVisible();
  await expect(section.getByText(/Registrado actualmente:/)).toContainText('0');

  // El default cero deja costo normal y real iguales.
  await section.getByRole('button', { name: 'Calcular ahora' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Trabajos de terceros' })).toContainText('0');
  await expect(page.getByRole('row').filter({ hasText: 'Costo normal de producción' })).toContainText('6.000');
  await expect(page.getByRole('row').filter({ hasText: 'Costo real de producción' })).toContainText('6.000');

  await page.getByRole('tab', { name: 'Trabajos de terceros' }).click();
  await section.getByLabel('Importe total del período $').fill('1000');
  await section.getByRole('button', { name: 'Guardar importe' }).click();
  await expect(page.getByRole('heading', { name: 'Actualizar trabajos de terceros' })).toBeVisible();
  await expect(page.getByText(/Se guardarán.*1\.000.*como trabajos de terceros/)).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/v1/cost-structures/${STRUCTURE_ID}/third-party-work`),
    ),
    page.getByRole('button', { name: 'Guardar', exact: true }).click(),
  ]);
  expect(apiState.writes).toContainEqual({ method: 'PUT', amount: 1_000 });
  await expect(section.getByText(/Registrado actualmente:/)).toContainText('1.000');

  await page.getByRole('tab', { name: 'Resultado' }).click();
  await expect(page.getByText(/todavía no incluye el último importe de trabajos de terceros/i)).toBeVisible();
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.getByText(/todavía no incluye el último importe/i)).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Trabajos de terceros' })).toContainText('1.000');
  await expect(page.getByRole('row').filter({ hasText: 'Trabajos de terceros' })).toContainText('fuera de CIP');
  await expect(page.getByRole('row').filter({ hasText: 'Costo normal de producción' })).toContainText('6.000');
  await expect(page.getByRole('row').filter({ hasText: 'Costo real de producción' })).toContainText('7.000');
  await expect(page.getByRole('row').filter({ hasText: 'Costo de productos vendidos' })).toContainText('6.500');

  const unitarios = page.getByTestId('unit-cost-summary');
  await expect(unitarios.getByText('Costo unitario de producción')).toBeVisible();
  await expect(unitarios.getByText('Costo unitario de productos terminados')).toBeVisible();
  await expect(unitarios.getByText('por Caja de prueba')).toHaveCount(2);
  await expect(unitarios.getByText(/trabajo que quedó sin terminar/i)).toBeVisible();

  expect(consola.mensajes).toEqual([]);
});

test('un período cerrado permite consultar trabajos de terceros pero no modificarlos', async ({
  page,
  consola,
}) => {
  test.setTimeout(90_000);
  const apiState = await mockCostingScreen(page, 'CLOSED');

  await page.goto(`/cost-structures/${STRUCTURE_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Trabajos de terceros' }).click();

  const section = page.getByTestId('third-party-work-period');
  await expect(section.getByText(/para modificarlo primero tenés que reabrir el período/i)).toBeVisible();
  await expect(section.getByLabel('Importe total del período $')).toBeDisabled();
  await expect(section.getByText(/Registrado actualmente:/)).toContainText('1.200');
  await expect(section.getByRole('button', { name: 'Guardar importe' })).toHaveCount(0);
  expect(apiState.writes).toEqual([]);

  expect(consola.mensajes).toEqual([]);
});
