import type { Page } from '@playwright/test';
import { expect, laAppPinto, test, testConSesion } from './fixtures';

test.setTimeout(60_000);
testConSesion.setTimeout(60_000);

const PERIOD_ID = '00000000-0000-4000-8000-000000000090';
const METRICAS = [
  'Costo por cajón',
  'Precio promedio de venta del período',
  'Contribución marginal por cajón',
  'Punto de equilibrio en cajones',
  'Producido contra equilibrio',
  'Resultado del período',
] as const;

const numero = (valor: number) => ({
  valor,
  completo: true,
  parametrosSinConfirmar: false,
  parametrosSinConfirmarDetalle: [],
  motivos: [],
});

// Período futuro y valores sintéticos: sirven únicamente para verificar la UI.
const TABLERO_COMPLETO = {
  data: {
    periodo: { id: PERIOD_ID, codigo: '2099-01' },
    corrida: {
      id: 'corrida-sintetica',
      validada: true,
      ejecutadaEn: '2099-01-15T12:00:00.000Z',
    },
    costoPorCajon: {
      variable: numero(11),
      fijo: numero(7),
      total: numero(18),
    },
    precioPromedioVenta: numero(30),
    contribucionMarginalPorCajon: numero(19),
    puntoEquilibrioCajones: {
      ...numero(40),
      fechaUltimoRecalculo: '2099-01-15T12:00:00.000Z',
    },
    producidoCajones: numero(50),
    resultadoPeriodo: numero(100),
  },
};

async function responderTablero(page: Page, body: unknown) {
  await page.route('**/api/v1/periods/*/tablero-dueno', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function expandirParaCaptura(page: Page) {
  // AppShell desplaza un contenedor interno. Para la evidencia se expande ese
  // contenedor después de verificar el comportamiento, sin cambiar producción.
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
}

testConSesion('muestra los seis números reales del período en el orden definido', async ({ page, consola }, testInfo) => {
  await responderTablero(page, TABLERO_COMPLETO);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(new RegExp(`/owner-dashboard\\?periodId=${PERIOD_ID}$`));
  await expect(page.getByRole('heading', { name: 'Tablero de la empresa' })).toBeVisible();
  await expect(page.getByText('Período 2099-01, expresado en cajones.')).toBeVisible();

  const metricas = page.getByTestId('owner-metric');
  await expect(metricas).toHaveCount(6);

  for (const [index, nombre] of METRICAS.entries()) {
    await expect(metricas.nth(index).getByRole('heading', { name: nombre })).toBeVisible();
  }

  await expect(metricas.nth(0).getByText('Variable')).toBeVisible();
  await expect(metricas.nth(0).getByText('Fijo')).toBeVisible();
  await expect(metricas.nth(0).getByText('Total')).toBeVisible();
  await expect(metricas.nth(3).getByText('Último recálculo:').getByText('15/01/2099')).toBeVisible();

  const barra = page.getByRole('progressbar', { name: 'Producido contra equilibrio' });
  await expect(barra).toHaveAttribute('aria-valuenow', '100');
  await expect(barra).toHaveAttribute('aria-valuetext', /50 de 40 cajones/);
  await expect(page.getByTestId('incomplete-metric')).toHaveCount(0);

  const conversor = page.getByTestId('money-to-crates-converter');
  await conversor.getByLabel('Importe en pesos').fill('75');
  await expect(conversor.getByText('2,5 cajones')).toBeVisible();
  await expect(conversor.getByText(/Precio usado:.*30,00 por cajón/)).toBeVisible();
  await expect(conversor.getByText(/Período.*2099-01/)).toBeVisible();

  await expandirParaCaptura(page);
  await testInfo.attach(`tablero-empresa-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en /owner-dashboard').toEqual([]);
});

testConSesion('no presenta como válido un número que el backend marca incompleto', async ({ page, consola }, testInfo) => {
  const tableroIncompleto = {
    data: {
      ...TABLERO_COMPLETO.data,
      precioPromedioVenta: {
        valor: 999_999,
        completo: false,
        parametrosSinConfirmar: false,
        parametrosSinConfirmarDetalle: [],
        motivos: ['Falta cargar ventas del período para obtener este indicador.'],
      },
    },
  };

  await responderTablero(page, tableroIncompleto);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  const precio = page.getByTestId('owner-metric').nth(1);
  await expect(precio.getByText('Incompleto', { exact: true })).toBeVisible();
  await expect(precio.getByText('Falta cargar ventas del período para obtener este indicador.')).toBeVisible();
  await expect(precio.getByText(/999[.\s]?999/)).toHaveCount(0);

  const conversor = page.getByTestId('money-to-crates-converter');
  await expect(conversor.getByLabel('Importe en pesos')).toBeDisabled();
  await expect(conversor.getByText('Falta el precio promedio del período')).toBeVisible();
  await expect(conversor.getByText('No se puede convertir el importe a cajones hasta que haya ventas para calcularlo.')).toBeVisible();
  await expect(conversor.getByText(/999[.\s]?999/)).toHaveCount(0);

  await expandirParaCaptura(page);
  await testInfo.attach(`conversor-sin-precio-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en el caso incompleto').toEqual([]);
});

testConSesion('marca los números apoyados en supuestos y nombra el parámetro sin marcar baseUnidades', async ({ page, consola }, testInfo) => {
  const tableroConSupuesto = {
    data: {
      ...TABLERO_COMPLETO.data,
      costoPorCajon: {
        ...TABLERO_COMPLETO.data.costoPorCajon,
        variable: {
          ...TABLERO_COMPLETO.data.costoPorCajon.variable,
          parametrosSinConfirmar: true,
          parametrosSinConfirmarDetalle: [{ id: 'parametro-sintetico', nombre: 'Rendimiento operativo' }],
        },
      },
    },
  };

  await responderTablero(page, tableroConSupuesto);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  const costoVariable = page.getByTestId('owner-metric').nth(0).getByText('Variable').locator('..');
  const marca = costoVariable.getByRole('button', { name: /Supuesto: 1 parámetro sin confirmar/ });
  await expect(marca).toBeVisible();
  await marca.click();
  await expect(page.getByRole('tooltip')).toContainText('Rendimiento operativo');

  const producido = page.getByTestId('owner-metric').nth(4);
  await expect(producido.getByRole('button', { name: /Supuesto/ })).toHaveCount(0);

  await expandirParaCaptura(page);
  await testInfo.attach(`tablero-supuesto-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores al marcar supuestos').toEqual([]);
});

test('el tablero de la empresa no se abre sin sesión', async ({ page, consola }) => {
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(consola.mensajes, 'errores al proteger /owner-dashboard').toEqual([]);
});
