import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bell, Menu, User, Zap, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { useLogout } from '@/features/auth/auth-hooks';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { useTraceMode } from '@/stores/trace-mode-store';
import { cn } from '@/lib/utils';

/**
 * MODO TRAZABILIDAD (U10) — un interruptor para toda la app.
 *
 * Vive en la barra superior, no dentro de una pantalla, porque afecta a todas:
 * es el gesto de "mostrame qué está respaldado y qué no". Es el diferencial del
 * producto, así que se pone donde se ve, no escondido en un menú.
 */
function TraceModeToggle() {
  const on = useTraceMode((s) => s.on);
  const toggle = useTraceMode((s) => s.toggle);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      title={
        on
          ? 'Apagar el modo trazabilidad'
          : 'Resaltar todos los datos con origen rastreable'
      }
      className={cn(
        'flex select-none items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
        on
          ? 'border-granate/20 bg-granate-tenue text-granate'
          : 'border-line bg-surface-alt/40 text-ink-soft hover:text-ink',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative h-[18px] w-[32px] rounded-full transition-colors',
          on ? 'bg-action' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] size-[14px] rounded-full bg-white transition-all',
            on ? 'left-[16px]' : 'left-[2px]',
          )}
        />
      </span>
      <span className="hidden sm:inline">Trazabilidad</span>
    </button>
  );
}

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { data: alerts = [] } = useAlerts();
  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line/40 px-1 py-4 lg:px-8 lg:py-5">
      {/* Left side: Logo (mobile) + Context badge (desktop) */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-granate text-white lg:hidden">
          <CosteARLogo className="h-5 w-auto text-white" />
        </div>
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-granate-deep/70 bg-granate-tenue/60 px-3 py-1 rounded-full border border-granate/10 lg:inline-block">
          Panel de Control
        </span>
      </div>

      {/* Right side: Alerts and User details */}
      <div className="flex items-center gap-3 lg:gap-4">
        <TraceModeToggle />

        {/* Alerts Indicator - Hidden for Admin */}
        {user?.role !== 'ADMIN' && (
          <Link
            to="/alerts"
            className="relative p-2 rounded-full border border-line bg-surface-alt/40 text-ink-soft hover:text-granate hover:bg-surface-alt/70 transition-all shadow-sm"
            title="Alertas"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-action animate-pulse" />
            )}
          </Link>
        )}

        {/* Profile Detail Card — desktop only */}
        <div className="hidden items-center gap-2.5 rounded-full border border-line bg-surface-alt/80 px-3.5 py-1.5 shadow-sm lg:flex">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-6.5 shrink-0 rounded-full object-cover border border-line" />
          ) : (
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-granate-tenue text-[10.5px] font-extrabold text-granate border border-granate/10">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          )}
          <div className="text-left leading-none pr-1">
            <p className="text-[11.5px] font-bold text-ink">{user?.name ?? 'Usuario'}</p>
            <p className="text-[8.5px] text-ink-soft mt-0.5 font-bold uppercase tracking-wider">{user?.role === 'ADMIN' ? 'Administrador' : 'Costista'}</p>
          </div>
        </div>

        {/* Avatar + menu trigger — mobile only (Portal/Perfil/Logout viven en el sidebar en desktop) */}
        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface-alt/80 p-1 pr-2 shadow-sm"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-7 shrink-0 rounded-full object-cover border border-line" />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-granate-tenue text-[11px] font-extrabold text-granate border border-granate/10">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
            <Menu className="size-3.5 text-ink-soft" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_50px_rgba(74,21,27,0.12)]">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink hover:bg-granate-tenue"
                >
                  <User className="size-4 text-granate" /> Mi Perfil
                </Link>
                {user?.role !== 'ADMIN' && (
                  <Link
                    to="/portal"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink hover:bg-granate-tenue"
                  >
                    <Zap className="size-4 text-granate" /> Portal de Operador
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-danger hover:bg-danger/10"
                >
                  <LogOut className="size-4" /> Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
