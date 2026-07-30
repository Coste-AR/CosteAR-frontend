import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CompaniesPage } from '@/features/companies/CompaniesPage';
import { CompanyDetailPage } from '@/features/companies/CompanyDetailPage';
import { CompanyTargetSetup } from '@/features/companies/CompanyTargetSetup';
import { CostStructurePage } from '@/features/cost-structures/CostStructurePage';
import { AlertsPage } from '@/features/alerts/AlertsPage';
import { MacroPage } from '@/features/macro/MacroPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ValidacionesPage } from '@/features/validaciones/ValidacionesPage';
import { LibroCostosPage } from '@/features/libro/LibroCostosPage';
import { HistorialPage } from '@/features/validaciones/HistorialPage';
import { EmpresaPortalPage } from '@/features/empresa-portal/EmpresaPortalPage';
import { PropagacionPage } from '@/features/propagacion/PropagacionPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import { AutomatizacionPage } from '@/features/automatizacion/AutomatizacionPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { AcceptTermsPage } from '@/features/auth/AcceptTermsPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { TrazabilidadDatoPage, TrazabilidadCalculoPage } from '@/features/trazabilidad/TrazabilidadPages';


const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
});

/** Guardia: redirige a /login si no hay sesión activa. */
function requireAuth() {
  const { accessToken, initializing, user } = useAuthStore.getState();
  if (!accessToken && !initializing) {
    throw redirect({ to: '/login' });
  }
  // Primer login: operador debe cambiar su contraseña
  if (user?.mustChangePassword) {
    throw redirect({ to: '/change-password' });
  }
  // Términos y condiciones sin aceptar (nuevos o versión republicada) — nadie
  // navega a ningún lado hasta aceptar. Va después de mustChangePassword: si
  // hace falta las dos cosas, primero asegurar la cuenta, después el contrato.
  if (user?.needsTermsAcceptance) {
    throw redirect({ to: '/accept-terms' });
  }
  // Los operadores de empresa solo tienen acceso al portal
  if (user?.role === 'EMPRESA_OPERATOR') {
    throw redirect({ to: '/portal' });
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { accessToken, user } = useAuthStore.getState();
    if (accessToken) {
      if (user?.role === 'EMPRESA_OPERATOR') throw redirect({ to: '/portal' });
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LandingPage,
});


const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: RegisterPage });
const forgotRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordPage });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reset-password', component: ResetPasswordPage });

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', beforeLoad: requireAuth, component: DashboardPage });
const companiesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/companies', beforeLoad: requireAuth, component: CompaniesPage });
const companyDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/companies/$id', beforeLoad: requireAuth, component: CompanyDetailPage });
const companySetupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/companies/$id/setup', beforeLoad: requireAuth, component: CompanyTargetSetup });
const costStructureRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cost-structures/$id', beforeLoad: requireAuth, component: CostStructurePage });
const alertsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/alerts', beforeLoad: requireAuth, component: AlertsPage });
const macroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/macro', beforeLoad: requireAuth, component: MacroPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', beforeLoad: requireAuth, component: ProfilePage });
const validacionesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/validaciones', beforeLoad: requireAuth, component: ValidacionesPage });
const libroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/libro', beforeLoad: requireAuth, component: LibroCostosPage });
const historialRoute = createRoute({ getParentRoute: () => rootRoute, path: '/historial', beforeLoad: requireAuth, component: HistorialPage });
const propagacionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/propagacion', beforeLoad: requireAuth, component: PropagacionPage });
const automatizacionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/automatizacion', beforeLoad: requireAuth, component: AutomatizacionPage });
// Cambio de contraseña obligatorio en primer login (operadores invitados)
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  beforeLoad: () => {
    const { accessToken, initializing } = useAuthStore.getState();
    if (!accessToken && !initializing) throw redirect({ to: '/login' });
  },
  component: ChangePasswordPage,
});

// Aceptación obligatoria de Términos y Condiciones (nuevos o versión republicada).
const acceptTermsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-terms',
  beforeLoad: () => {
    const { accessToken, initializing } = useAuthStore.getState();
    if (!accessToken && !initializing) throw redirect({ to: '/login' });
  },
  component: AcceptTermsPage,
});

// Trazabilidad — páginas completas que se abren en pestaña nueva (mismo layout,
// mismo login). Formato comprobante, imprimibles (Parte 2.3).
const trazaDatoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trazabilidad/dato/$id',
  beforeLoad: requireAuth,
  validateSearch: (s: Record<string, unknown>): { period?: string } => ({
    period: typeof s.period === 'string' ? s.period : undefined,
  }),
  component: TrazabilidadDatoPage,
});
const trazaCalculoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trazabilidad/calculo/$runId',
  beforeLoad: requireAuth,
  validateSearch: (s: Record<string, unknown>): { structureId?: string; period?: string } => ({
    structureId: typeof s.structureId === 'string' ? s.structureId : undefined,
    period: typeof s.period === 'string' ? s.period : undefined,
  }),
  component: TrazabilidadCalculoPage,
});

// Portal de empresa — accesible solo con rol EMPRESA_OPERATOR
const empresaPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal',
  beforeLoad: () => {
    const { accessToken, initializing, user } = useAuthStore.getState();
    if (!accessToken && !initializing) throw redirect({ to: '/login' });
    // Los operarios de empresa TAMBIÉN tienen que aceptar los Términos — es
    // el mismo contrato que ya le pedimos al costista. Si llegan derecho acá
    // (bookmark, o después de cambiar la contraseña) sin pasar por
    // requireAuth(), este es el único lugar que los agarra.
    if (user?.needsTermsAcceptance) throw redirect({ to: '/accept-terms' });
    // No bloquear por rol: el costista que llega acá sería raro pero se lo redirige al dash
  },
  component: EmpresaPortalPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotRoute,
  resetRoute,
  dashboardRoute,
  companiesRoute,
  companyDetailRoute,
  companySetupRoute,
  costStructureRoute,
  alertsRoute,
  macroRoute,
  profileRoute,
  validacionesRoute,
  libroRoute,
  historialRoute,
  propagacionRoute,
  automatizacionRoute,
  changePasswordRoute,
  acceptTermsRoute,
  empresaPortalRoute,
  trazaDatoRoute,
  trazaCalculoRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
