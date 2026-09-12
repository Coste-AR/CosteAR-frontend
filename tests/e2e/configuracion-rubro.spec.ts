import { testConSesion as test, expect, laAppPinto } from './fixtures';
import type { Page } from '@playwright/test';

const COMPANY_ID = '55555555-5555-4555-8555-555555555555';

type ModuleState = {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: 'prendido' | 'apagado';
  porDefecto: boolean;
  dependeDe: string[];
  parametros: string[];
  alertas: string[];
};

type OptionQuestion = {
  clave: string;
  valor: string | null;
  descripcion: string;
  opciones: Array<{ valor: string; etiqueta: string }>;
  origen: 'empresa' | 'default';
  confirmado: boolean;
};

const BASE_MODULE: ModuleState = {
  clave: 'registro-base',
  nombre: 'Registro principal',
  descripcion: 'Habilita la carga principal de la operación.',
  estado: 'prendido',
  porDefecto: true,
  dependeDe: [],
  parametros: ['forma-registro', 'frecuencia-revision'],
  alertas: [],
};

const OPTIONAL_MODULE: ModuleState = {
  clave: 'detalle-opcional',
  nombre: 'Detalle adicional',
  descripcion: 'Agrega un detalle opcional a cada carga.',
  estado: 'prendido',
  porDefecto: false,
  dependeDe: [],
  parametros: ['tipo-detalle'],
  alertas: [],
};

const DEPENDENT_MODULE: ModuleState = {
  clave: 'resumen-dependiente',
  nombre: 'Resumen relacionado',
  descripcion: 'Muestra un resumen que necesita el registro principal.',
  estado: 'prendido',
  porDefecto: false,
  dependeDe: ['registro-base'],
  parametros: [],
  alertas: [],
};

const QUESTIONS: OptionQuestion[] = [
  {
    clave: 'forma-registro',
    valor: 'forma-a',
    descripcion: '¿Cómo hacés el registro principal?',
    opciones: [
      { valor: 'forma-a', etiqueta: 'Primera forma' },
      { valor: 'forma-b', etiqueta: 'Segunda forma' },
    ],
    origen: 'empresa',
    confirmado: true,
  },
  {
    clave: 'frecuencia-revision',
    valor: null,
    descripcion: '¿Cada cuánto revisás la carga?',
    opciones: [
      { valor: 'corta', etiqueta: 'En intervalos cortos' },
      { valor: 'larga', etiqueta: 'En intervalos largos' },
    ],
    origen: 'default',
    confirmado: false,
  },
  {
    clave: 'tipo-detalle',
    valor: null,
    descripcion: '¿Qué detalle adicional necesitás?',
    opciones: [
      { valor: 'simple', etiqueta: 'Detalle simple' },
      { valor: 'completo', etiqueta: 'Detalle completo' },
    ],
    origen: 'default',
    confirmado: false,
  },
];

async function prepareConfiguration(page: Page) {
  const modules = [structuredClone(BASE_MODULE), structuredClone(OPTIONAL_MODULE), structuredClone(DEPENDENT_MODULE)];
  const questions = structuredClone(QUESTIONS);
  const writes: Array<{ method: 'PUT' | 'DELETE'; key: string; value?: string | boolean }> = [];
  const dependencyReason = `No podés apagar "${BASE_MODULE.nombre}" porque "${DEPENDENT_MODULE.nombre}" depende de este módulo.`;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (method === 'POST' && pathname === '/api/v1/auth/refresh') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'token-e2e' } }) });
    }
    if (method === 'GET' && pathname === '/api/v1/user/profile') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'user-e2e', email: 'persona@ejemplo.com', name: 'Persona de Prueba', role: 'COST_PROFESSIONAL', mustChangePassword: false, needsTermsAcceptance: false } }) });
    }
    if (method === 'GET' && pathname === '/api/v1/companies') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: COMPANY_ID, name: 'Empresa de prueba', industry: 'Rubro sintético', cuit: null, isActive: true, createdAt: '2099-01-01T00:00:00.000Z', periodicity: 'MONTHLY', condicionIva: 'EXENTO' }] }) });
    }
    if (method === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: COMPANY_ID, name: 'Empresa de prueba', industry: 'Rubro sintético', cuit: null, isActive: true, createdAt: '2099-01-01T00:00:00.000Z', periodicity: 'MONTHLY', condicionIva: 'EXENTO' } }) });
    }
    if (method === 'GET' && pathname === `/api/v1/companies/${COMPANY_ID}/target-budget`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    }
    if (method === 'GET' && pathname.startsWith('/api/v1/benchmarks/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    }

    const modulesPath = `/api/v1/companies/${COMPANY_ID}/modulos-rubro`;
    if (method === 'GET' && pathname === modulesPath) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: modules }) });
    }
    if (method === 'PUT' && pathname.startsWith(`${modulesPath}/`)) {
      const key = pathname.slice(modulesPath.length + 1);
      const module = modules.find((item) => item.clave === key)!;
      const { activo } = request.postDataJSON() as { activo: boolean };
      if (!activo && key === BASE_MODULE.clave && modules.some((item) => item.clave === DEPENDENT_MODULE.clave && item.estado === 'prendido')) {
        return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: { message: dependencyReason } }) });
      }
      module.estado = activo ? 'prendido' : 'apagado';
      writes.push({ method: 'PUT', key, value: activo });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: module }) });
    }

    const parametersPath = `/api/v1/companies/${COMPANY_ID}/parametros-costeo`;
    if (method === 'GET' && pathname === parametersPath) {
      const activeKeys = new Set(modules.filter((item) => item.estado === 'prendido').flatMap((item) => item.parametros));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: questions.filter((item) => activeKeys.has(item.clave)) }) });
    }
    if (pathname.startsWith(`${parametersPath}/`)) {
      const key = pathname.slice(parametersPath.length + 1);
      const question = questions.find((item) => item.clave === key)!;
      if (method === 'PUT') {
        const { valorTexto } = request.postDataJSON() as { valorTexto: string; confirmado: boolean };
        question.valor = valorTexto;
        question.origen = 'empresa';
        question.confirmado = true;
        writes.push({ method: 'PUT', key, value: valorTexto });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: question }) });
      }
      if (method === 'DELETE') {
        question.valor = null;
        question.origen = 'default';
        question.confirmado = false;
        writes.push({ method: 'DELETE', key });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: question }) });
      }
    }

    return route.fallback();
  });

  return { modules, questions, writes, dependencyReason };
}

async function expandAppShellForEvidence(page: Page) {
  await page.getByTestId('rubro-configuration').evaluate((section) => {
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
}

test('con el módulo prendido su pregunta está en el DOM', async ({ page, consola }) => {
  test.setTimeout(60_000);
  await prepareConfiguration(page);

  await page.goto(`/companies/${COMPANY_ID}/setup`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('button', { name: 'Seguir con las preguntas' }).click();

  await expect(page.getByTestId('option-question-tipo-detalle')).toBeVisible();
  await expandAppShellForEvidence(page);
  expect(consola.mensajes).toEqual([]);
});

test('recorre la configuración y un módulo apagado no deja campos en el DOM', async ({ page, consola }) => {
  test.setTimeout(90_000);
  const { writes, dependencyReason } = await prepareConfiguration(page);

  await page.goto(`/companies/${COMPANY_ID}/setup`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);

  await page.getByRole('switch', { name: `Apagar ${BASE_MODULE.nombre}` }).click();
  await page.getByRole('button', { name: 'Sí, apagar' }).click();
  await expect(page.getByRole('alert')).toHaveText(dependencyReason);
  await expect(page.getByRole('switch', { name: `Apagar ${BASE_MODULE.nombre}` })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('switch', { name: `Apagar ${OPTIONAL_MODULE.nombre}` }).click();
  await expect(page.getByText(/^Los datos que ya cargaste no se borran/i)).toBeVisible();
  await page.getByRole('button', { name: 'Sí, apagar' }).click();
  await expect(page.getByRole('switch', { name: `Prender ${OPTIONAL_MODULE.nombre}` })).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('button', { name: 'Seguir con las preguntas' }).click();
  await expect(page.getByTestId('option-question-forma-registro')).toBeVisible();
  await expect(page.getByTestId('option-question-tipo-detalle')).toHaveCount(0);

  // Una respuesta ya confirmada vuelve precargada al salir y entrar otra vez.
  await expect(page.getByLabel('Primera forma')).toBeChecked();
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await expect(page.getByText('Clientes Activos', { exact: true })).toBeVisible();
  await page.goto(`/companies/${COMPANY_ID}/setup`, { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('button', { name: 'Seguir con las preguntas' }).click();
  await expect(page.getByLabel('Primera forma')).toBeChecked();

  await page.getByLabel('Segunda forma').click();
  await page.getByTestId('option-question-frecuencia-revision').getByLabel('No sé todavía').click();
  await page.getByRole('button', { name: 'Ver resumen' }).click();

  await expect(page.getByText('Configuración lista para empezar')).toBeVisible();
  await expect.poll(() => writes).toContainEqual({ method: 'PUT', key: 'forma-registro', value: 'forma-b' });
  expect(writes.filter((write) => write.key === 'frecuencia-revision')).toEqual([]);
  expect(writes.filter((write) => write.key === 'tipo-detalle')).toEqual([]);

  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await laAppPinto(page);
  await page.getByRole('tab', { name: 'Configuración' }).click();
  await expect(page.getByText('Configuración del rubro')).toBeVisible();
  await expect(page.getByRole('heading', { name: BASE_MODULE.nombre, exact: true })).toBeVisible();
  await expandAppShellForEvidence(page);
  expect(consola.mensajes).toEqual([]);
});
