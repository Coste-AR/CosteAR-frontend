import type { Page } from '@playwright/test';
import { expect, laAppPinto, test, testConSesion, vocabularioVisiblePermitido } from './fixtures';

test.setTimeout(60_000);
testConSesion.setTimeout(60_000);

const PERIOD_ID = '00000000-0000-4000-8000-000000000090';
const COMPANY_ID = '00000000-0000-4000-8000-000000000091';
const STRUCTURE_ID = '00000000-0000-4000-8000-000000000092';
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
    unidadGestion: { codigo: 'cajon', nombre: 'Cajón', factor: 360 },
    rubro: {
      clave: 'AVICOLA_POSTURA',
      nombreProducto: 'AVI',
      icons: { LoteProductivo: 'bird' },
    },
    pendientes: [],
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

const indicadorCapia = (
  indicatorCode: string,
  value: number,
  unit: 'cajon' | 'kg' | 'ton' | 'unidad',
  productId: number,
) => ({
  indicatorCode,
  value,
  unit,
  ivaPct: 21,
  priceIncludesIva: true,
  effectiveFrom: '2099-01-12T00:00:00.000Z',
  effectiveTo: '2099-01-18T00:00:00.000Z',
  source: 'CAPIA',
  sourceLabel: 'ENCUESTA SEMANAL 02/2099',
  productId,
  product: 'Referencia sectorial sintética',
  category: 'CATEGORÍA SINTÉTICA',
});

const CAPIA_VIGENTE = {
  data: {
    semana: {
      sourceLabel: 'ENCUESTA SEMANAL 02/2099',
      effectiveFrom: '2099-01-12T00:00:00.000Z',
      effectiveTo: '2099-01-18T00:00:00.000Z',
    },
    items: [
      indicadorCapia('CAPIA_HUEVO_BLANCO_CAJON', 41_000, 'cajon', 251),
      indicadorCapia('CAPIA_HUEVO_COLOR_CAJON', 42_000, 'cajon', 252),
      indicadorCapia('CAPIA_ALIMENTO_PONEDORA_KG', 510, 'kg', 268),
      indicadorCapia('CAPIA_MAPLE_UNIDAD', 220, 'unidad', 270),
      indicadorCapia('CAPIA_MAIZ_TON', 205_000, 'ton', 272),
      indicadorCapia('CAPIA_SOJA_TON', 315_000, 'ton', 273),
    ],
  },
};

const PUNTO_CIERRE = {
  data: {
    moneda: 'ARS',
    unidad: 'cajon',
    nominal: true,
    precioUnitario: 30,
    puntoEquilibrioEconomico: 40,
    actividad: 50,
    importeVersionIds: ['00000000-0000-4000-8000-000000000092'],
    horizontes: [
      {
        horizonteMeses: 1,
        valor: 25,
        costosFijosErogables: 275,
        costoVariableUnitarioErogable: 19,
        contribucionMarginalFinanciera: 11,
        situacion: null,
        advertencia: 'un resultado negativo no significa que haya que cerrar',
        basadoEn: [],
      },
      {
        horizonteMeses: 12,
        valor: 35,
        costosFijosErogables: 385,
        costoVariableUnitarioErogable: 19,
        contribucionMarginalFinanciera: 11,
        situacion: 'pierde económicamente y sostiene la caja',
        advertencia: 'un resultado negativo no significa que haya que cerrar',
        basadoEn: [],
      },
    ],
  },
};

const EQUILIBRIO_TRAMOS_AM_09 = {
  data: {
    tramos: [
      {
        tramoId: 'tramo-actual', tipo: 'REEMPLAZA', desde: 0, hasta: 475.7,
        techo: 475.7, qAritmetico: 598.52, q: null, resultadoMaximo: -365_268.2,
        motivoFueraDeTramo: 'El equilibrio aritmético supera el techo físico del tramo (475.7).',
      },
      {
        tramoId: 'tramo-siguiente', tipo: 'REEMPLAZA', desde: 475.7, hasta: 950.9,
        techo: 950.9, qAritmetico: 874.24, q: 874.24, resultadoMaximo: 227_976.6,
      },
    ],
    transiciones: [{
      desdeTramoId: 'tramo-actual', haciaTramoId: 'tramo-siguiente', qIndiferencia: 751.42,
      binding: 874.24, margenHastaTecho: 76.66, porcentajeMargen: 8.1,
      alertaPegadoAlTecho: true,
    }],
  },
};

const TRAMOS_AM_09 = {
  data: [
    {
      id: 'tramo-actual', conceptoId: 'concepto-sintetico', segmentoId: null,
      desde: 0, hasta: 475.7, tipo: 'REEMPLAZA', importeFijo: 1_780_000,
      cmUnitaria: 2_974, techoFisico: 475.7, techoFuente: 'Informe técnico sintético',
      techoDeclaradoEn: '2099-01-15T12:00:00.000Z', techoDeclaradoPorId: 'actor-sintetico',
      createdAt: '2099-01-15T12:00:00.000Z',
    },
    {
      id: 'tramo-siguiente', conceptoId: 'concepto-sintetico', segmentoId: null,
      desde: 475.7, hasta: 950.9, tipo: 'REEMPLAZA', importeFijo: 2_600_000,
      cmUnitaria: 2_974, techoFisico: 950.9, techoFuente: 'Proyecto de ampliación sintético',
      techoDeclaradoEn: '2099-01-15T12:00:00.000Z', techoDeclaradoPorId: 'actor-sintetico',
      createdAt: '2099-01-15T12:00:00.000Z',
    },
  ],
};

async function responderTablero(
  page: Page,
  body: unknown,
  capia: unknown = CAPIA_VIGENTE,
  puntoCierre?: unknown,
  equilibrioTramos: unknown = { data: { tramos: [], transiciones: [] } },
  tramos: unknown = { data: [] },
) {
  const unidadGestion = (body as { data?: { unidadGestion?: { codigo?: string } | null } }).data?.unidadGestion;
  const respuestaPuntoCierre = puntoCierre ?? {
    data: {
      ...PUNTO_CIERRE.data,
      unidad: unidadGestion?.codigo ?? null,
    },
  };
  await page.route('**/api/v1/companies', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: COMPANY_ID, name: 'Negocio sintético' }] }),
    });
  });
  await page.route(`**/api/v1/companies/${COMPANY_ID}/cost-structures`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: [{ id: STRUCTURE_ID, companyId: COMPANY_ID }] } });
  });
  await page.route(`**/api/v1/structures/${STRUCTURE_ID}/periods/open`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: { id: PERIOD_ID, structureId: STRUCTURE_ID, companyId: COMPANY_ID, code: '2099-01', label: 'Enero 2099', status: 'OPEN' } } });
  });
  await page.route(`**/api/v1/companies/${COMPANY_ID}/indicadores-macro`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: [] } });
  });
  await page.route('**/api/v1/me/preferencias', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: { home: { accesosRapidos: [] } } } });
  });
  await page.route('**/api/v1/me/preferencias/catalogo', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: [] } });
  });
  await page.route('**/api/v1/periods/*/tablero-dueno', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.route('**/api/v1/indicadores/capia/vigentes', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(capia),
    });
  });
  await page.route(`**/api/v1/companies/${COMPANY_ID}/analisis/punto-cierre**`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(respuestaPuntoCierre),
    });
  });
  await page.route(`**/api/v1/companies/${COMPANY_ID}/tramos-costo/equilibrio`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(equilibrioTramos) });
  });
  await page.route(`**/api/v1/companies/${COMPANY_ID}/tramos-costo`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tramos) });
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

testConSesion('abre y cierra el sidebar del rubro y el logo vuelve al inicio', async ({ page, consola }, testInfo) => {
  await responderTablero(page, TABLERO_COMPLETO);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  const mobile = testInfo.project.name.startsWith('Mobile');
  const sidebar = page.getByTestId(mobile ? 'mobile-sidebar' : 'desktop-sidebar');
  await testInfo.attach('sidebar-cerrado', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.getByRole('button', { name: mobile ? 'Abrir menú lateral' : 'Abrir sidebar' }).click();
  await expect(sidebar.getByText('Costear AVI')).toBeVisible();
  await expect(sidebar.getByTestId('sidebar-rubro-icon')).toHaveAttribute('data-icon', 'bird');
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate((element) => element.clientWidth));
  await testInfo.attach('sidebar-abierto', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await sidebar.getByRole('button', { name: 'Cerrar sidebar' }).click();
  if (mobile) await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  else await expect(sidebar.getByText('Costear AVI')).toHaveCount(0);
  await page.getByRole('button', { name: mobile ? 'Abrir menú lateral' : 'Abrir sidebar' }).click();
  const logo = sidebar.getByRole('link', { name: 'Costear: ir al inicio' });
  await expect(logo).toHaveAttribute('href', '/');
  await logo.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(consola.mensajes, 'errores en el sidebar').toEqual([]);
});

testConSesion('muestra los seis números reales del período en el orden definido', async ({ page, consola }) => {
  await responderTablero(page, TABLERO_COMPLETO);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await page.getByRole('button', { name: 'Abrir ayuda de esta pantalla' }).click();
  await expect(page.getByRole('region', { name: 'Ayuda del tablero del negocio' })).toBeVisible();
  await expect(page.getByRole('button', { name: '¿Qué período estoy viendo?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ayuda' }).click();
  await expect(page).toHaveURL(new RegExp(`/owner-dashboard\\?periodId=${PERIOD_ID}$`));
  await expect(page.getByRole('heading', { name: 'Tablero del negocio' })).toBeVisible();
  await vocabularioVisiblePermitido(page);
  await expect(page.getByText('Período 2099-01, expresado en cajones.')).toBeVisible();
  await expect(page.getByTestId('industry-icon')).toHaveAttribute('data-icon', 'bird');

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

  // MX-01: el divisor es la contribución marginal (19), no el precio (30). Un
  // costo fijo se cubre con lo que deja cada unidad, no con lo que factura:
  // 75 / 19 = 3,95 cajones. Dividir por el precio daba 2,5 — y vender 2,5
  // cajones deja 47,50 de contribución, no los 75 que la pantalla prometía.
  const conversor = page.getByTestId('money-to-crates-converter');
  await conversor.getByLabel('Importe en pesos').fill('75');
  await expect(conversor.getByText('3,95 cajones')).toBeVisible();
  await expect(conversor.getByText(/Contribución marginal usada:.*19,00 por cajón/)).toBeVisible();
  await expect(conversor.getByText(/Período.*2099-01/)).toBeVisible();
  await expect(conversor.getByText('2,5 cajones')).toHaveCount(0);

  const pendientes = page.getByTestId('closing-pending');
  await expect(pendientes.getByText('No falta nada para cerrar este período')).toBeVisible();
  await expect(pendientes.getByTestId('closing-pending-item')).toHaveCount(0);

  const referencias = page.getByTestId('capia-references');
  await expect(referencias.getByRole('heading', { name: 'Referencias del sector' })).toBeVisible();
  await expect(referencias.getByText('Semana 02 · 12–18/01')).toBeVisible();
  await expect(referencias.locator('[data-testid^="capia-CAPIA_"]')).toHaveCount(6);
  await expect(referencias.getByText('Huevo blanco')).toBeVisible();
  await expect(referencias.getByText('Alimento ponedora')).toBeVisible();
  await expect(referencias.getByText('por tonelada').first()).toBeVisible();
  await expect(referencias.getByText('con IVA').first()).toBeVisible();

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores en /owner-dashboard').toEqual([]);
});

testConSesion('muestra el punto de cierre de 1 y 12 meses sin colapsar horizontes', async ({ page, consola }, testInfo) => {
  await responderTablero(page, TABLERO_COMPLETO);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  const panel = page.getByTestId('punto-cierre-panel');
  await expect(panel.getByRole('heading', { name: 'Punto de cierre' })).toBeVisible();
  await expect(panel.getByTestId('punto-cierre-1').getByText('25 cajones')).toBeVisible();
  await expect(panel.getByTestId('punto-cierre-12').getByText('35 cajones')).toBeVisible();
  await expect(panel.getByText('pierde económicamente y sostiene la caja')).toBeVisible();
  await expect(panel.getByText('un resultado negativo no significa que haya que cerrar')).toBeVisible();

  await expandirParaCaptura(page);
  await testInfo.attach('punto-cierre-por-horizonte', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consola.mensajes, 'errores al mostrar el punto de cierre').toEqual([]);
});

testConSesion('muestra AM-09 por tramos y nunca publica el equilibrio aritmético fuera de rango', async ({ page, consola }, testInfo) => {
  await responderTablero(
    page,
    TABLERO_COMPLETO,
    CAPIA_VIGENTE,
    undefined,
    EQUILIBRIO_TRAMOS_AM_09,
    TRAMOS_AM_09,
  );
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  const panel = page.getByTestId('equilibrio-tramos-panel');
  await expect(panel.getByText('No existe un equilibrio operativo en este tramo')).toBeVisible();
  await expect(panel.getByText('Siguiente equilibrio operativo: 874,24 cajones')).toBeVisible();
  await expect(panel.getByText('Punto de resultado indiferente: 751,42 cajones')).toBeVisible();
  await expect(panel.getByRole('alert')).toContainText('8,1%');
  await expect(panel.getByText(/598,52/)).toHaveCount(0);
  await expect(page.getByTestId('owner-metric').nth(3).getByText('40')).toHaveCount(0);

  await expandirParaCaptura(page);
  await testInfo.attach('equilibrio-por-tramos-am-09', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consola.mensajes, 'errores al mostrar equilibrio por tramos').toEqual([]);
});

testConSesion('toma la unidad y el icono del rubro de la respuesta', async ({ page, consola }) => {
  const tableroDeOtroRubro = {
    data: {
      ...TABLERO_COMPLETO.data,
      unidadGestion: { codigo: 'bulto', nombre: 'Bulto', factor: 12 },
      rubro: {
        clave: 'RUBRO_SINTETICO',
        icons: { UnidadProductiva: 'warehouse' },
      },
    },
  };

  await responderTablero(page, tableroDeOtroRubro);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page.getByText('Período 2099-01, expresado en bultos.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Costo por bulto' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Punto de equilibrio en bultos' })).toBeVisible();
  await expect(page.getByTestId('industry-icon')).toHaveAttribute('data-icon', 'warehouse');
  await expect(page.getByText(/caj[oó]n/i)).toHaveCount(0);

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores al mostrar otro rubro').toEqual([]);
});

testConSesion('declara cuando falta la unidad y usa un icono neutro sin inventar rubro', async ({ page, consola }) => {
  const tableroSinContexto = {
    data: {
      ...TABLERO_COMPLETO.data,
      unidadGestion: null,
      rubro: null,
    },
  };

  await responderTablero(page, tableroSinContexto);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page.getByText('Sin unidad declarada', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('industry-icon')).toHaveAttribute('data-icon', 'neutral');
  await expect(page.getByText(/caj[oó]n/i)).toHaveCount(0);

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores cuando falta el contexto del negocio').toEqual([]);
});

testConSesion('agrupa por área qué falta cargar y muestra el período de cada pendiente', async ({ page, consola }) => {
  const tableroConPendientes = {
    data: {
      ...TABLERO_COMPLETO.data,
      pendientes: [
        {
          area: 'produccion',
          dato: 'cantidad producida mayor a cero',
          periodo: { id: PERIOD_ID, codigo: '2099-01' },
        },
        {
          area: 'ventas',
          dato: 'ventas del período',
          periodo: { id: PERIOD_ID, codigo: '2099-01' },
        },
        {
          area: 'produccion',
          dato: 'producción diaria de la variante de prueba',
          periodo: { id: PERIOD_ID, codigo: '2099-01' },
        },
        {
          area: 'configuracion',
          dato: 'unidad de venta con factor de conversión',
          periodo: { id: PERIOD_ID, codigo: '2099-01' },
        },
      ],
    },
  };

  await responderTablero(page, tableroConPendientes);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  const pendientes = page.getByTestId('closing-pending');
  const produccion = pendientes.getByTestId('closing-pending-group-produccion');
  const ventas = pendientes.getByTestId('closing-pending-group-ventas');
  const configuracion = pendientes.getByTestId('closing-pending-group-configuracion');

  await expect(produccion.getByRole('heading', { name: 'Producción' })).toBeVisible();
  await expect(produccion.getByTestId('closing-pending-item')).toHaveCount(2);
  await expect(produccion.getByText('cantidad producida mayor a cero')).toBeVisible();
  await expect(produccion.getByText('producción diaria de la variante de prueba')).toBeVisible();
  await expect(ventas.getByRole('heading', { name: 'Ventas' })).toBeVisible();
  await expect(ventas.getByText('ventas del período')).toBeVisible();
  await expect(configuracion.getByRole('heading', { name: 'Configuración' })).toBeVisible();
  await expect(configuracion.getByText('unidad de venta con factor de conversión')).toBeVisible();
  await expect(pendientes.getByText('Período 2099-01')).toHaveCount(4);
  await expect(pendientes.getByText('No falta nada para cerrar este período')).toHaveCount(0);

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores al mostrar los pendientes de cierre').toEqual([]);
});

testConSesion('no presenta como válido un número que el backend marca incompleto', async ({ page, consola }) => {
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
      contribucionMarginalPorCajon: {
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
  await expect(conversor.getByText('Falta la contribución marginal del período')).toBeVisible();
  await expect(conversor.getByText('No se puede calcular cuántos cajones cubren el importe hasta tener la contribución marginal del período.')).toBeVisible();
  await expect(conversor.getByText(/999[.\s]?999/)).toHaveCount(0);

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores en el caso incompleto').toEqual([]);
});

/**
 * MX-01. Con contribución marginal <= 0 ningún volumen cubre el costo: cada
 * unidad vendida agranda la pérdida. Antes esto ni se planteaba porque el
 * divisor era el precio, que siempre es positivo. El conversor tiene que
 * negarse con el motivo — nunca un infinito, un negativo ni un guion pelado.
 */
testConSesion('el conversor se niega cuando la contribución marginal no es positiva', async ({ page, consola }) => {
  const tableroSinContribucion = {
    data: {
      ...TABLERO_COMPLETO.data,
      contribucionMarginalPorCajon: {
        valor: -4,
        completo: true,
        parametrosSinConfirmar: false,
        parametrosSinConfirmarDetalle: [],
        motivos: [],
      },
    },
  };

  await responderTablero(page, tableroSinContribucion);
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);

  const conversor = page.getByTestId('money-to-crates-converter');
  await expect(conversor.getByLabel('Importe en pesos')).toBeDisabled();
  await expect(conversor.getByText('La contribución marginal no es positiva')).toBeVisible();
  await expect(conversor.getByText(/ningún volumen alcanza/)).toBeVisible();
  await expect(conversor.getByText(/Infinity|∞|NaN/)).toHaveCount(0);

  await expandirParaCaptura(page);
  expect(consola.mensajes, 'errores con contribución no positiva').toEqual([]);
});

testConSesion('marca los números apoyados en supuestos y nombra el parámetro sin marcar baseUnidades', async ({ page, consola }) => {
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
  expect(consola.mensajes, 'errores al marcar supuestos').toEqual([]);
});

test('el tablero de la empresa no se abre sin sesión', async ({ page, consola }) => {
  await page.goto(`/owner-dashboard?periodId=${PERIOD_ID}`, { waitUntil: 'domcontentloaded' });

  await laAppPinto(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(consola.mensajes, 'errores al proteger /owner-dashboard').toEqual([]);
});
