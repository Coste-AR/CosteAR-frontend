import { testConSesion as test, expect, laAppPinto } from './fixtures';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const CONCEPTO_ID = '33333333-3333-4333-8333-333333333333';

/**
 * El mensaje sale del dominio del backend, textual. Se copia acá a propósito:
 * si el backend lo cambia, este test se cae y alguien mira si la pantalla
 * sigue diciendo algo que se entiende, en vez de mostrar un cartel genérico.
 */
const MENSAJE_NO_SUMAN =
  'La porción fija (54000.00) más la variable (35000.00) tiene que ser igual al importe (90000.00); no se ajusta en silencio.';

interface Separacion {
  importe: number;
  porcionFija: number;
  porcionVariable: number;
  metodo: string;
  observacionesBase: Array<{ volumen: number; importe: number }>;
  costoVariableUnitario: number | null;
  coeficienteCorrelacion: number | null;
}

test('separa un costo semifijo: rechaza lo que no suma, guarda lo que la persona vio', async ({
  page,
  consola,
}, testInfo) => {
  // Mismo margen que la suite de clasificación: WebKit tarda en estabilizar la
  // captura de página completa bajo la carga paralela.
  test.setTimeout(90_000);

  let guardada: Separacion | null = null;
  const guardados: Separacion[] = [];

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  /** Reproduce la cuenta del dominio para los dos métodos que usa el flujo. */
  const separar = (entrada: {
    importe: number;
    metodo: string;
    observacionesBase?: Array<{ volumen: number; importe: number }>;
    porcionFija?: number;
    porcionVariable?: number;
  }): { ok: true; data: Separacion } | { ok: false; mensaje: string } => {
    if (entrada.metodo === 'PUNTOS_EXTREMOS') {
      const ordenadas = [...(entrada.observacionesBase ?? [])].sort((a, b) => a.volumen - b.volumen);
      const baja = ordenadas[0]!;
      const alta = ordenadas[ordenadas.length - 1]!;
      const pendiente = (alta.importe - baja.importe) / (alta.volumen - baja.volumen);
      const fija = baja.importe - pendiente * baja.volumen;
      return {
        ok: true,
        data: {
          importe: entrada.importe,
          porcionFija: fija,
          porcionVariable: entrada.importe - fija,
          metodo: entrada.metodo,
          observacionesBase: entrada.observacionesBase ?? [],
          costoVariableUnitario: pendiente,
          coeficienteCorrelacion: null,
        },
      };
    }

    const fija = entrada.porcionFija ?? 0;
    const variable = entrada.porcionVariable ?? 0;
    if (Math.abs(fija + variable - entrada.importe) >= 0.01) {
      return {
        ok: false,
        mensaje:
          `La porción fija (${fija.toFixed(2)}) más la variable (${variable.toFixed(2)}) ` +
          `tiene que ser igual al importe (${entrada.importe.toFixed(2)}); no se ajusta en silencio.`,
      };
    }
    return {
      ok: true,
      data: {
        importe: entrada.importe,
        porcionFija: fija,
        porcionVariable: variable,
        metodo: entrada.metodo,
        observacionesBase: entrada.observacionesBase ?? [],
        costoVariableUnitario: null,
        coeficienteCorrelacion: null,
      },
    };
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const base = `/api/v1/companies/${COMPANY_ID}`;

    if (request.method() === 'GET' && pathname === base) {
      return route.fulfill(
        json({
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
      );
    }

    if (
      request.method() === 'GET' &&
      (pathname === `${base}/cost-structures` ||
        pathname === `${base}/modulos-rubro` ||
        pathname === `${base}/parametros-costeo`)
    ) {
      return route.fulfill(json({ data: [] }));
    }

    if (
      request.method() === 'GET' &&
      (pathname === `${base}/deviations` || pathname === '/api/v1/benchmarks/General')
    ) {
      return route.fulfill(json({ data: null }));
    }

    if (request.method() === 'GET' && pathname === `${base}/conceptos-costeo`) {
      return route.fulfill(
        json({
          data: [
            {
              id: CONCEPTO_ID,
              clave: 'energia_planta',
              descripcion: 'Luz de la planta',
              elemento: 'CIP',
              comportamientoVolumen: 'SEMIFIJO',
              confirmado: true,
            },
            {
              id: '44444444-4444-4444-8444-444444444444',
              clave: 'alquiler_galpon',
              descripcion: 'Alquiler del galpón',
              elemento: 'CIP',
              comportamientoVolumen: 'FIJO',
              confirmado: true,
            },
          ],
        }),
      );
    }

    const tramo = `${base}/conceptos-costeo/${CONCEPTO_ID}/tramo-semifijo`;

    if (request.method() === 'GET' && pathname === tramo) {
      // 404 mientras no haya nada guardado: es «todavía no se separó», no un error.
      if (!guardada) {
        return route.fulfill(
          json(
            { error: { code: 'NOT_FOUND', message: 'El concepto todavía no tiene una separación semifija guardada' } },
            404,
          ),
        );
      }
      // La fila persistida manda los importes como string (Decimal de Prisma)
      // y no trae `importe`. La pantalla tiene que soportar esa forma.
      return route.fulfill(
        json({
          data: {
            id: '55555555-5555-4555-8555-555555555555',
            porcionFija: guardada.porcionFija.toFixed(6),
            porcionVariable: guardada.porcionVariable.toFixed(6),
            metodo: guardada.metodo,
            observacionesBase: guardada.observacionesBase,
            costoVariableUnitario:
              guardada.costoVariableUnitario === null
                ? null
                : guardada.costoVariableUnitario.toFixed(6),
            coeficienteCorrelacion: null,
          },
        }),
      );
    }

    if (request.method() === 'POST' && pathname === `${tramo}/calcular`) {
      const resultado = separar(request.postDataJSON());
      return resultado.ok
        ? route.fulfill(json({ data: resultado.data }))
        : route.fulfill(
            json(
              {
                error: {
                  code: 'UNPROCESSABLE_ENTITY',
                  message: resultado.mensaje,
                  details: { field: 'porcionVariable' },
                },
              },
              422,
            ),
          );
    }

    if (request.method() === 'PUT' && pathname === tramo) {
      const resultado = separar(request.postDataJSON());
      if (!resultado.ok) {
        return route.fulfill(
          json({ error: { code: 'UNPROCESSABLE_ENTITY', message: resultado.mensaje } }, 422),
        );
      }
      guardada = resultado.data;
      guardados.push(resultado.data);
      return route.fulfill(
        json({
          data: {
            id: '55555555-5555-4555-8555-555555555555',
            porcionFija: resultado.data.porcionFija.toFixed(6),
            porcionVariable: resultado.data.porcionVariable.toFixed(6),
            metodo: resultado.data.metodo,
            observacionesBase: resultado.data.observacionesBase,
            costoVariableUnitario: null,
            coeficienteCorrelacion: null,
          },
        }),
      );
    }

    return route.fallback();
  });

  await page.goto(`/companies/${COMPANY_ID}`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Semifijos' }).click();

  await expect(page.getByText('Separar un costo semifijo')).toBeVisible();

  // Sólo se ofrecen los conceptos clasificados semifijos: el fijo no aparece.
  const selectorConcepto = page.getByLabel('Concepto semifijo');
  await expect(selectorConcepto.locator('option')).toHaveText([
    'Elegí un concepto',
    'energia_planta — Luz de la planta',
  ]);

  await selectorConcepto.selectOption(CONCEPTO_ID);
  await expect(
    page.getByText('Este concepto todavía no tiene una separación guardada.'),
  ).toBeVisible();

  // CASO NEGATIVO: 54.000 + 35.000 no dan 90.000.
  await page.getByLabel('Cómo separarlo').selectOption('DECLARADO');
  await page.getByLabel('Importe a separar').fill('90000');
  await page.getByLabel('Parte fija declarada').fill('54000');
  await page.getByLabel('Parte variable declarada').fill('35000');
  await page.getByRole('button', { name: 'Ver la separación' }).click();

  await expect(page.getByRole('alert')).toHaveText(MENSAJE_NO_SUMAN);
  await expect(page.getByRole('button', { name: 'Guardar la separación' })).toBeDisabled();
  expect(guardados, 'un importe que no cierra no puede escribirse').toEqual([]);

  // CASO BUENO: 54.000 + 36.000 = 90.000.
  await page.getByLabel('Parte variable declarada').fill('36000');
  await page.getByRole('button', { name: 'Ver la separación' }).click();
  await expect(page.getByText('Así queda la separación')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar la separación' })).toBeEnabled();
  await page.getByRole('button', { name: 'Guardar la separación' }).click();
  await expect(page.getByRole('status')).toHaveText('Separación guardada.');
  await expect.poll(() => guardados.length).toBe(1);
  await expect(page.getByText('Separación guardada hoy')).toBeVisible();

  // PUNTOS EXTREMOS: (100, 60.000) y (200, 90.000) → 30.000 fijo, 60.000
  // variable, 300 por unidad.
  await page.getByLabel('Cómo separarlo').selectOption('PUNTOS_EXTREMOS');
  await page.getByLabel('Volumen 1').fill('100');
  await page.getByLabel('Importe 1').fill('60000');
  await page.getByLabel('Volumen 2').fill('200');
  await page.getByLabel('Importe 2').fill('90000');
  await page.getByRole('button', { name: 'Ver la separación' }).click();

  const previa = page.locator('div').filter({ hasText: /^Así queda la separación/ }).last();
  await expect(previa).toContainText('30.000,00');
  await expect(previa).toContainText('60.000,00');
  await expect(previa).toContainText('300,00');
  // El coeficiente no lo da este método, y se dice con palabras.
  await expect(previa).toContainText('Este método no lo calcula.');

  await testInfo.attach(`desagregacion-semifijos-${testInfo.project.name}`, {
    body: await page.getByTestId('desagregacion-semifijos').screenshot(),
    contentType: 'image/png',
  });

  expect(consola.mensajes, 'errores en la desagregación de semifijos').toEqual([]);
});
