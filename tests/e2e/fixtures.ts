import { test as base, expect, type Page } from '@playwright/test';

/**
 * Errores de consola y excepciones no atrapadas.
 *
 * Un test que solo hace `goto` + `expect(title)` da verde con la pantalla en
 * blanco: React explota, el root queda vacio y Playwright no se entera porque
 * el `<title>` lo pone el index.html, no la app. Ese es exactamente el test
 * que habia en admin. Aca cualquier error de consola o excepcion de pagina
 * rompe el test, que es la unica forma de que "la pantalla anda" signifique algo.
 */
type ErroresDeConsola = { mensajes: string[] };

export const test = base.extend<{ consola: ErroresDeConsola }>({
  /**
   * El bootstrap de sesion pega a /auth/refresh en CADA carga de pagina. Sin
   * backend levantado eso da 500 y ensucia la consola con un error que no es
   * de la app: la suite entera fallaba por eso.
   *
   * Se responde 401 —"no hay sesion"— que es el estado honesto para una ruta
   * publica y no depende de que alguien tenga Docker corriendo. Es ademas lo
   * que hace la suite determinista en CI, donde no hay API.
   */
  page: async ({ page }, use) => {
    await page.route('**/api/*/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'no hay sesion' }),
      }),
    );
    await use(page);
  },

  consola: async ({ page }, use) => {
    const mensajes: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const texto = msg.text();
      // "Failed to load resource" lo emite el NAVEGADOR cuando una respuesta
      // HTTP no es 2xx, no el codigo de la app. Un 401 del refresh en una ruta
      // publica es el comportamiento correcto y aun asi aparece aca. Filtrarlo
      // es lo que hace que el resto de la lista signifique algo: lo que queda
      // son `console.error` que escribio alguien de nuestro lado.
      if (texto.startsWith('Failed to load resource')) return;
      mensajes.push(`console.error: ${texto}`);
    });
    page.on('pageerror', (err) => {
      mensajes.push(`pageerror: ${err.message}`);
    });

    await use({ mensajes });
  },
});

export { expect };

/**
 * Verifica que la app efectivamente pinto algo, no que el HTML cargo.
 * `#root` vacio es el modo de falla que buscamos: build en verde, pantalla en
 * blanco.
 */
export async function laAppPinto(page: Page) {
  const root = page.locator('#root');
  // Hay que esperar a que pase el splash: mientras el loader esta montado su
  // unico hijo es de posicion fija, asi que `#root` mide cero y cuenta como
  // oculto. El timeout largo esta en `playwright.config.ts` con el motivo.
  await expect(root).toBeVisible();
  await expect(root).not.toBeEmpty();
}
