import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Bell,
  LogOut,
  ClipboardCheck,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/features/auth/auth-hooks";
import { usePendingCount } from "@/features/validaciones/validaciones-hooks";
import { CosteARLogo } from "@/components/layout/CosteARLogo";
import { TopBar } from "@/components/layout/TopBar";
import { TraceDrawer } from "@/components/layout/TraceDrawer";
import { TraceModeLegend } from "@/components/ui/TraceableValue";

const NAV = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  // Las estructuras de costos viven en /cost-structures/:id (ruta top-level,
  // no anidada bajo /companies) pero conceptualmente son parte del flujo de
  // Clientes — el nav debe seguir marcando "Clientes" ahí adentro.
  { to: "/companies", label: "Clientes", icon: Building2, matchAlso: ["/cost-structures"] },
  {
    to: "/validaciones",
    label: "Validaciones",
    icon: ClipboardCheck,
    badge: true,
  },
  { to: "/alerts", label: "Alertas", icon: Bell },
] as const;

function isNavActive(pathname: string, item: (typeof NAV)[number]): boolean {
  if ("exact" in item && item.exact) return pathname === item.to;
  if (pathname.startsWith(item.to)) return true;
  const matchAlso = "matchAlso" in item ? item.matchAlso : undefined;
  return matchAlso?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { location } = useRouterState();
  const { data: pendingCount = 0 } = usePendingCount();

  const activeNavItems = NAV.filter((navItem) => {
    const isAdminRoute = "adminOnly" in navItem && navItem.adminOnly;
    if (isAdminRoute && user?.role !== 'ADMIN') return false;
    
    // Si el usuario es ADMIN, ocultamos TODAS las rutas excepto las exclusivas de admin.
    if (user?.role === 'ADMIN' && !isAdminRoute) return false;
    
    return true;
  });

  const activeIndex = activeNavItems.findIndex((item) =>
    isNavActive(location.pathname, item),
  );
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (activeIndex !== -1 && prevIndex !== -1 && activeIndex !== prevIndex) {
      setIsMoving(true);
      setDirection(activeIndex > prevIndex ? "down" : "up");
      setDistance(Math.abs(activeIndex - prevIndex));
      setPrevIndex(activeIndex);
      const timer = setTimeout(() => {
        setIsMoving(false);
        setDirection(null);
        setDistance(0);
      }, 320);
      return () => clearTimeout(timer);
    } else if (activeIndex !== prevIndex) {
      setPrevIndex(activeIndex);
    }
  }, [activeIndex, prevIndex]);

  const stretchFactor = isMoving ? 1 + Math.min(distance * 0.15, 0.35) : 1;
  const transformOrigin =
    direction === "down"
      ? "top center"
      : direction === "up"
        ? "bottom center"
        : "center center";

  return (
    <div className="flex h-screen bg-surface-alt font-outfit relative overflow-hidden">
      {/* FLOATING VERTICAL SIDEBAR DOCK (Bordó Wine Red, Overflow Visible) */}
      <aside className="hidden lg:flex fixed top-4 bottom-4 left-4 w-20 bg-granate rounded-[30px] flex-col items-center py-6 justify-between z-30 overflow-visible">
        {/* Top: Logo in white container */}
        <div className="flex flex-col items-center overflow-visible">
          <div className="flex size-12 items-center justify-center rounded-[18px] bg-surface-alt text-granate shadow-md hover:scale-105 transition-transform duration-300">
            <CosteARLogo className="h-6.5 w-auto text-granate" />
          </div>
        </div>

        {/* Center: Main Nav Icons (With smooth liquid sliding indicator) */}
        <nav className="relative flex flex-col gap-4 w-full items-stretch overflow-visible py-5">
          {/* LIQUID SLIDING ACTIVE INDICATOR ASSEMBLY */}
          <div
            className="absolute left-0 right-0 h-12 pointer-events-none z-10 transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              top: "20px", // matches padding-top py-5 (20px)
              transform: `translateY(${activeIndex * (48 + 16)}px) scaleY(${stretchFactor})`, // active height (48px) + gap-4 (16px) + liquid stretch
              transformOrigin,
              opacity: activeIndex === -1 ? 0 : 1,
              viewTransitionName: "active-nav-tab",
            }}
          >
            {/* Background tab shape (inset from the left by 10px) */}
            <div
              className="absolute left-2.5 right-0 top-0 bottom-0 rounded-l-[20px]"
              style={{ backgroundColor: "var(--color-surface-alt)" }}
            />

            {/* Seamless extension to cover the sidebar-content gap */}
            <div
              className="absolute left-20 right-[-16px] top-0 bottom-0"
              style={{ backgroundColor: "var(--color-surface-alt)" }}
            />

            {/* Top curve (Concave assembly) */}
            <div
              className="absolute right-0 bottom-full w-4 h-4 pointer-events-none"
              style={{ backgroundColor: "var(--color-surface-alt)" }}
            />
            <div className="absolute right-0 bottom-full w-4 h-4 bg-granate rounded-br-[16px] pointer-events-none" />

            {/* Bottom curve (Concave assembly) */}
            <div
              className="absolute right-0 top-full w-4 h-4 pointer-events-none"
              style={{ backgroundColor: "var(--color-surface-alt)" }}
            />
            <div className="absolute right-0 top-full w-4 h-4 bg-granate rounded-tr-[16px] pointer-events-none" />
          </div>

          {activeNavItems.map((navItem) => {
            const { to, label, icon: Icon, ...rest } = navItem;

            const active = isNavActive(location.pathname, navItem);
            const showBadge = "badge" in rest && rest.badge && pendingCount > 0;
            return (
              <div
                key={to}
                className="relative w-full h-12 flex items-center justify-center overflow-visible"
              >
                <Link
                  to={to}
                  viewTransition
                  className={cn(
                    "w-full h-12 relative flex items-center justify-center rounded-l-[24px] z-25 group transition-colors duration-150",
                    active ? "text-granate" : "text-white/70 hover:text-white",
                  )}
                >
                  {/* Hover background helper matching the active tab bounds */}
                  {!active && (
                    <div className="absolute left-2.5 right-0 top-0 bottom-0 bg-transparent group-hover:bg-white/5 rounded-l-[20px] transition-colors duration-200 z-10 pointer-events-none" />
                  )}

                  <Icon className="size-[20px] shrink-0 z-20" />

                  {/* Hover tooltips */}
                  <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                    {label}
                  </span>

                  {showBadge && (
                    <span
                      className={cn(
                        "absolute top-1.5 right-3.5 flex size-4.5 items-center justify-center rounded-full bg-action text-[9px] font-extrabold text-white border z-30",
                        active ? "border-white" : "border-granate",
                      )}
                    >
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Bottom: Portal, Profile, Logout */}
        <div className="flex flex-col items-center gap-3.5 w-full overflow-visible">
          {/* Operator Portal Link - Oculto para admin */}
          {user?.role !== 'ADMIN' && (
            <Link
              to="/portal"
              viewTransition
              className="flex size-12 items-center justify-center rounded-[18px] text-granate-tenue hover:text-white hover:bg-white/10 transition-all duration-200 relative group"
            >
              <Zap className="size-[20px]" />
              <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                Portal de Operador
              </span>
            </Link>
          )}

          {/* Profile link (Static since it is separated at the bottom) */}
          <div className="relative w-full h-12 flex items-center justify-center overflow-visible">
            {location.pathname.startsWith("/profile") ? (
              <Link
                to="/profile"
                viewTransition
                className="w-full h-12 relative flex items-center justify-start text-granate z-20 overflow-visible"
              >
                <div
                  className="absolute left-2.5 right-0 top-0 bottom-0 rounded-l-[20px] z-10"
                  style={{ backgroundColor: "var(--color-surface-alt)" }}
                />
                <div
                  className="absolute left-20 right-[-16px] top-0 bottom-0 z-10"
                  style={{ backgroundColor: "var(--color-surface-alt)" }}
                />
                <div
                  className="absolute right-0 bottom-full w-4 h-4 z-10 pointer-events-none"
                  style={{ backgroundColor: "var(--color-surface-alt)" }}
                />
                <div className="absolute right-0 bottom-full w-4 h-4 bg-granate rounded-br-[16px] z-20 pointer-events-none" />
                <div
                  className="absolute right-0 top-full w-4 h-4 z-10 pointer-events-none"
                  style={{ backgroundColor: "var(--color-surface-alt)" }}
                />
                <div className="absolute right-0 top-full w-4 h-4 bg-granate rounded-tr-[16px] z-20 pointer-events-none" />

                {/* Centered avatar or initials */}
                <div className="absolute left-0 w-20 h-full flex items-center justify-center z-30 pointer-events-none">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="size-8 rounded-full object-cover border border-granate/10"
                    />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-granate-tenue text-xs font-bold text-granate border border-granate/10">
                      {user?.name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <Link
                to="/profile"
                viewTransition
                className="w-full h-12 relative flex items-center justify-center text-white/70 hover:text-white z-10 group transition-colors duration-150"
              >
                {/* Hover background helper matching the active tab bounds */}
                <div className="absolute left-2.5 right-0 top-0 bottom-0 bg-transparent group-hover:bg-white/5 rounded-l-[20px] transition-colors duration-200 z-10 pointer-events-none" />

                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-8 rounded-full object-cover border border-white/20 z-20"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white border border-white/20 z-20">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                )}
                <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                  Mi Perfil
                </span>
              </Link>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  window.location.href = "/login";
                },
              })
            }
            className="flex size-12 items-center justify-center rounded-[18px] text-white/70 hover:text-white hover:bg-red-900/40 transition-all duration-200 cursor-pointer relative group"
          >
            <LogOut className="size-[20px]" />
            <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* MOBILE FLOATING TAB BAR (same dock language as the desktop sidebar) */}
      <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-30 grid grid-cols-4 gap-1 rounded-[28px] bg-granate p-2 shadow-[0_16px_40px_rgba(74,21,27,0.18)] lg:hidden" style={{ gridTemplateColumns: `repeat(${activeNavItems.length}, minmax(0, 1fr))` }}>
        {activeNavItems.map((navItem) => {
          const { to, label, icon: Icon, ...rest } = navItem;
          const active = isNavActive(location.pathname, navItem);
          const showBadge = "badge" in rest && rest.badge && pendingCount > 0;
          return (
            <Link
              key={to}
              to={to}
              viewTransition
              className="relative flex flex-col items-center justify-end gap-1 overflow-visible py-1.5"
            >
              {active && (
                <span className="absolute -top-5 flex size-12 items-center justify-center rounded-2xl bg-surface-alt shadow-[0_10px_24px_rgba(74,21,27,0.28)]">
                  <Icon className="size-5 text-granate" />
                  {showBadge && (
                    <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full border border-surface-alt bg-action text-[8px] font-extrabold text-white">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </span>
              )}
              {!active && (
                <span className="relative">
                  <Icon className="size-[20px] text-white/60" />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-granate bg-action text-[8px] font-extrabold text-white">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </span>
              )}
              <span className={cn("text-[9.5px] font-bold", active ? "mt-6 text-white" : "text-white/60")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main Container (Shifted right by pl-28 to clear the floating sidebar) */}
      <div className="flex-1 flex flex-col pl-4 pr-4 pt-4 pb-24 lg:pl-28 lg:pr-5 lg:pt-5 lg:pb-0 relative z-10 overflow-y-auto scrollbar-hidden bg-surface-alt">
        <TopBar />

        {/* Content Area */}
        <main className="flex-1">
          <div
            className={cn(
              "mx-auto px-0 pt-6 pb-8 lg:px-8 lg:pt-10",
              wide ? "max-w-full" : "max-w-6xl",
            )}
          >
            <TraceModeLegend />
            {children}
          </div>
        </main>

        {/* Panel de trazabilidad (U10): vive en el armazón porque cualquier
            valor de cualquier pantalla lo abre. */}
        <TraceDrawer />

        {/* Cohesive Footer */}
        <footer className="hidden lg:block border-t border-line/40 py-6 bg-zinc-50/20">
          <div className="mx-auto max-w-6xl px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
            <div className="flex items-center gap-1.5 text-[10.5px] text-ink-soft/75">
              <ShieldCheck className="size-4 text-emerald-600 animate-pulse" />
              <span>
                Entorno cifrado y auditado académicamente por la Cátedra
              </span>
            </div>
            <p className="text-[10px] text-ink-soft/60 font-semibold">
              © {new Date().getFullYear()} CosteAR. Todos los derechos
              reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-line/40 pb-5">
      <div className="space-y-1">
        <h1 className="text-[26px] font-extrabold tracking-tight text-granate-deep">
          {title}
        </h1>
        {description && <p className="text-xs text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
