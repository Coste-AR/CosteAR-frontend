import type { Page, Route } from '@playwright/test';
import { testConSesion as test, expect, laAppPinto } from './fixtures';

const STRUCTURE_ID = '77777777-7777-4777-8777-777777777777';
const COMPANY_ID = '88888888-8888-4888-8888-888888888888';
const PERIOD_ID = '99999999-9999-4999-8999-999999999999';

const DETAIL = {
  rawMaterial: { optimalLot: 100, finalStockQty: 20, finalStockValue: 1_000 },
  directLabor: { workingDays: 240, itcsPercent: 30, iapPercent: 10, hourlyRates: {} },
  indirectCosts: { perDepartment: {} },
  unitCost: { unitsProduced: 100, unitProductionCost: 60, unitCostOfGoodsSold: 55 },
};

type Waste = {
  id: string;
  periodId: string;
  concepto: string;
  valor: number;
  cantidad: null;
  unidadId: null;
  naturaleza: 'NORMAL' | 'EXTRAORDINARIA' | null;
  valorRecupero: number;
  motivo: string | null;
  createdAt: string;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockCostingScreen(page: Page, periodStatus: 'OPEN' | 'CLOSED') {
  const wastes: Waste[] = [
    {
      id: 'waste-pending',
      periodId: PERIOD_ID,
      concepto: 'Rotura sin revisar',
      valor: 500,
      cantidad: null,
      unidadId: null,
      naturaleza: null,
      valorRecupero: 0,
      motivo: null,
      createdAt: '2099-01-03T00:00:00.000Z',
    },
    {
      id: 'waste-normal',
      periodId: PERIOD_ID,
      concepto: 'Recorte recuperable',
      valor: 200,
      cantidad: null,
      unidadId: null,
      naturaleza: 'NORMAL',
      valorRecupero: 50,
      motivo: 'Pérdida habitual del proceso',
      createdAt: '2099-01-02T00:00:00.000Z',
    },
    {
      id: 'waste-delete',
      periodId: PERIOD_ID,
      concepto: 'Registro duplicado',
      valor: 80,
      cantidad: null,
      unidadId: null,
      naturaleza: 'NORMAL',
      valorRecupero: 0,
      motivo: null,
      createdAt: '2099-01-01T00:00:00.000Z',
    },
  ];
  const writes: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method === 'GET' && pathname === `/api/v1/cost-structures/${STRUCTURE_ID}`) {
      return json(route, {
        data: {
          id: STRUCTURE_ID,
          companyId: COMPANY_ID,
          productName: 'Producto de prueba',
          period: '2099-01',
          status: 'ACTIVE',
          costingSystem: 'ORDERS',
          rawMaterialConfig: {
            materials: [{
              id: 'material-e2e',
              code: 'MP-E2E',
              name: 'Material de prueba',
              unit: 'kg',
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
            departments: [{ name: 'Producción', basicRemuneration: 1_500, hoursWorked: 160 }],
          },
          indirectCostConfig: {
            centers: [{ id: 'centro-e2e', name: 'Producción', type: 'productive' }],
            concepts: [],
            serviceDistributions: [],
            productiveSettings: [{ centerId: 'centro-e2e', budget: { fixed: 1_000, variable: 500 }, normalCapacity: 160, actualActivity: 150, actualCip: 1_400 }],
          },
          salesUnitPrice: '90',
          salesQuantity: '100',
          productionQuantity: '100',
          createdAt: '2099-01-01T00:00:00.000Z',
        },
      });
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
          code: '2099-01',
          label: 'Enero 2099',
          startDate: '2099-01-01T00:00:00.000Z',
          endDate: '2099-01-31T00:00:00.000Z',
          status: periodStatus,
          closedAt: periodStatus === 'CLOSED' ? '2099-02-01T00:00:00.000Z' : null,
          closedBy: null,
          closedRunId: null,
          reopenCount: 0,
          reopenedAt: null,
          reopenReason: null,
        }],
      });
    }

    const wasteCollection = `/api/v1/periods/${PERIOD_ID}/desperdicios`;
    if (method === 'GET' && pathname === wasteCollection) return json(route, { data: wastes });
    if (method === 'POST' && pathname === wasteCollection) {
      const body = request.postDataJSON() as {
        concepto: string;
        valor: number;
        valorRecupero: number;
        naturaleza: 'normal' | 'extraordinaria' | null;
        motivo: string | null;
      };
      writes.push(`POST ${body.concepto}`);
      const created: Waste = {
        id: `waste-${wastes.length + 1}`,
        periodId: PERIOD_ID,
        concepto: body.concepto,
        valor: body.valor,
        cantidad: null,
        unidadId: null,
        naturaleza: body.naturaleza === null ? null : body.naturaleza.toUpperCase() as Waste['naturaleza'],
        valorRecupero: body.valorRecupero,
        motivo: body.motivo,
        createdAt: '2099-01-04T00:00:00.000Z',
      };
      wastes.unshift(created);
      return json(route, { data: created }, 201);
    }

    const wasteId = pathname.startsWith('/api/v1/desperdicios/')
      ? pathname.slice('/api/v1/desperdicios/'.length)
      : null;
    if (wasteId && method === 'PATCH') {
      const item = wastes.find((waste) => waste.id === wasteId)!;
      const body = request.postDataJSON() as { naturaleza: 'normal' | 'extraordinaria' | null; motivo: string | null };
      item.naturaleza = body.naturaleza === null ? null : body.naturaleza.toUpperCase() as Waste['naturaleza'];
      item.motivo = body.motivo;
      writes.push(`PATCH ${wasteId}`);
      return json(route, { data: item });
    }
    if (wasteId && method === 'DELETE') {
      const index = wastes.findIndex((waste) => waste.id === wasteId);
      const [removed] = wastes.splice(index, 1);
      writes.push(`DELETE ${wasteId}`);
      return json(route, { data: removed });
    }

    if (method === 'POST' && pathname === `/api/v1/structures/${STRUCTURE_ID}/calculate`) {
      writes.push('POST calculate');
      return json(route, {
        data: {
          runId: 'run-waste-e2e',
          runN: 4,
          calculationId: 'calculation-waste-e2e',
          results: {
            rawMaterialConsumed: 2_000,
            directLaborTotal: 1_500,
            indirectCostsApplied: 2_500,
            productionCost: 6_000,
            costOfGoodsSold: 5_500,
            grossMargin: 3_500,
            grossMarginPct: 38.89,
            desperdicio: {
              alCosto: 180,
              alResultado: 500,
              recuperoAplicado: 70,
              pendientes: [],
            },
            detail: DETAIL,
          },
          tree: [],
          incompleto: { incompleto: false, motivos: [], datosPendientes: [] },
        },
      });
    }
    if (method === 'GET' && pathname === '/api/v1/calculation-runs/run-waste-e2e/tree') {
      return json(route, { data: { runId: 'run-waste-e2e', runN: 4, engineVersion: 'e2e', tree: [] } });
    }
    if (method === 'GET' && pathname === `/api/v1/structures/${STRUCTURE_ID}/resultado-vigente`) {
      return json(route, { data: { provisorio: false, motivo: null } });
    }
    if (method === 'GET' && pathname === '/api/v1/validaciones/ledger') {
      return json(route, { data: { entries: [], totalsBySection: {}, periods: [] } });
    }

    return route.fallback();
  });

  return { wastes, writes };
}

test('carga, declara, corrige y da de baja desperdicios; el resultado muestra su impacto', async ({
  page,
  consola,
}) => {
  test.setTimeout(180_000);
  const apiState = await mockCostingScreen(page, 'OPEN');

  await page.goto(`/cost-structures/${STRUCTURE_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Desperdicios' }).click();

  await expect(page.getByText('1 desperdicio pendiente de declarar')).toBeVisible();
  await expect(page.getByText('Rotura sin revisar')).toBeVisible();
  await expect(page.getByText('Pendiente de declarar', { exact: true })).toBeVisible();
  await expect(page.getByText('Normal', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Cargar desperdicio' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cargar desperdicio' });
  await dialog.getByLabel('Qué se perdió').fill('Sobrante vendido');
  await dialog.getByLabel('Valor de lo perdido').fill('100');
  await dialog.getByLabel('Recupero').fill('120');
  await dialog.getByRole('button', { name: 'Guardar desperdicio' }).click();
  await expect(dialog.getByText(/recupero no puede ser mayor/i)).toBeVisible();
  expect(apiState.writes).not.toContain('POST Sobrante vendido');

  await dialog.getByLabel('Recupero').fill('20');
  await dialog.getByRole('button', { name: 'Naturaleza' }).click();
  await page.getByRole('option', { name: /Normal —/ }).click();
  await dialog.getByRole('button', { name: 'Guardar desperdicio' }).click();
  await expect(page.getByText('Sobrante vendido')).toBeVisible();
  expect(apiState.writes).toContain('POST Sobrante vendido');

  await page.getByRole('button', { name: 'Editar Rotura sin revisar' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Corregir desperdicio' });
  await editDialog.getByRole('button', { name: 'Naturaleza' }).click();
  await page.getByRole('option', { name: /Extraordinaria —/ }).click();
  await editDialog.getByLabel('Motivo de la clasificación (opcional)').fill('Rotura fuera de lo habitual');
  await editDialog.getByRole('button', { name: 'Guardar desperdicio' }).click();
  await expect(
    page.getByLabel('Desperdicios cargados').getByText('Extraordinario', { exact: true }),
  ).toBeVisible();
  expect(apiState.writes).toContain('PATCH waste-pending');

  const deleteTrigger = page.getByRole('button', { name: 'Dar de baja Registro duplicado' });
  // En mobile la navegación inferior es fija. Centrar la acción evita que el
  // navegador la deje justo detrás de esa barra al intentar llevarla a vista.
  await deleteTrigger.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(deleteTrigger).toBeInViewport();
  await deleteTrigger.click();
  await expect(page.getByRole('heading', { name: 'Dar de baja el desperdicio' })).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === 'DELETE' &&
      response.url().endsWith('/api/v1/desperdicios/waste-delete'),
    ),
    page.getByRole('button', { name: 'Dar de baja', exact: true }).click(),
  ]);
  await expect(page.getByLabel('Desperdicios cargados').getByText('Registro duplicado')).toHaveCount(0);
  expect(apiState.writes).toContain('DELETE waste-delete');

  await page.getByRole('tab', { name: 'Resultado' }).click();
  await expect(page.getByText(/resultado todavía no incluye el último cambio/i)).toBeVisible();
  await page.getByRole('button', { name: 'Calcular' }).click();
  await expect(page.getByText(/resultado todavía no incluye/i)).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Merma extraordinaria' })).toContainText('500');
  await expect(page.getByRole('row').filter({ hasText: 'Recupero de desperdicio' })).toContainText('70');
  await expect(page.getByRole('row').filter({ hasText: 'Costo de productos vendidos' })).toContainText('5.500');
  expect(apiState.writes).toContain('POST calculate');

  expect(consola.mensajes).toEqual([]);
});

test('un período cerrado deja los desperdicios en consulta y explica cómo modificarlos', async ({
  page,
  consola,
}) => {
  test.setTimeout(90_000);
  await mockCostingScreen(page, 'CLOSED');

  await page.goto(`/cost-structures/${STRUCTURE_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Desperdicios' }).click();

  await expect(page.getByText(/para cargar, corregir o dar de baja uno primero tenés que reabrirlo/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cargar desperdicio' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Editar / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Dar de baja / })).toHaveCount(0);
  await expect(page.getByText('Rotura sin revisar')).toBeVisible();

  expect(consola.mensajes).toEqual([]);
});
