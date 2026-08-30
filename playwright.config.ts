import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright del frontend — el repo que ve el cliente.
 *
 * Existe porque hasta el 30-08-2026 este era el único de los tres repos sin
 * ninguna verificación de pantalla: admin, que no ve nadie de afuera, tenía
 * Playwright, y el que ve el cliente no tenía nada.
 *
 * La Definition of Done ya no pide que una persona abra el navegador. Lo que
 * la reemplaza es esto, así que tiene que dejar evidencia mirable por un
 * agente: captura de cada caso, traza cuando falla, y el reporte subido como
 * artifact del workflow. Si un agente de Codex no puede ver qué pasó en la
 * pantalla leyendo la salida, esta suite no está haciendo su trabajo.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* 'list' para que la corrida se lea en la terminal del agente; 'html' para
   * la evidencia navegable que queda como artifact. */
  reporter: [['list'], ['html', { open: 'never' }]],

  /* 15 s, no los 5 s por defecto. `main.tsx` fuerza un splash minimo de 5 s
   * (MIN_SPLASH_MS) mas 300 ms de fade en CADA carga de pagina, y mientras
   * dura, `#root` no tiene caja de layout: Playwright lo ve oculto. Con el
   * timeout por defecto toda la suite fallaba justo en el limite. */
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    /* Captura SIEMPRE, no solo al fallar: el verde también es evidencia, y es
     * lo que un agente mira para saber si la pantalla quedó como se esperaba. */
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    /* Mobile va en serio: "layouts rotos en mobile" fue uno de los modos de
     * falla que nombró el equipo, y sin estos dos proyectos no hay un solo
     * test que lo pueda ver. */
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
