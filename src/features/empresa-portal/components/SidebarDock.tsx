import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquare, FileText, Building2, ArrowLeft, LogOut, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { cn } from '@/lib/utils';

interface SidebarDockProps {
  activeTab: 'chat' | 'feed' | 'metrics' | 'invite';
  setActiveTab: (tab: 'chat' | 'feed' | 'metrics' | 'invite') => void;
}

export function SidebarDock({ activeTab, setActiveTab }: SidebarDockProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const activeIndex = ['chat', 'feed', 'metrics', 'invite'].indexOf(activeTab);
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (activeIndex !== -1 && prevIndex !== -1 && activeIndex !== prevIndex) {
      setIsMoving(true);
      setDirection(activeIndex > prevIndex ? 'down' : 'up');
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
    direction === 'down'
      ? 'top center'
      : direction === 'up'
        ? 'bottom center'
        : 'center center';

  return (
    <aside className="hidden lg:flex fixed top-4 bottom-4 left-4 w-20 bg-granate rounded-2xl flex-col items-center py-6 justify-between z-30 overflow-visible">
      {/* Top: Logo */}
      <div className="flex flex-col items-center overflow-visible">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-alt text-granate shadow-md">
          <CosteARLogo className="h-6.5 w-auto text-granate" />
        </div>
      </div>

      {/* Center: Tabs del Operador */}
      <nav className="relative flex flex-col gap-4 w-full items-stretch overflow-visible py-5">
        {/* LIQUID SLIDING ACTIVE INDICATOR ASSEMBLY */}
        <div
          className="absolute left-0 right-0 h-12 pointer-events-none z-10 transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            top: '20px', // matches padding-top py-5 (20px)
            transform: `translateY(${activeIndex * (48 + 16)}px) scaleY(${stretchFactor})`, // active height (48px) + gap-4 (16px) + liquid stretch
            transformOrigin,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        >
          {/* Background tab shape (inset from the left by 10px) */}
          <div
            className="absolute left-2.5 right-0 top-0 bottom-0 rounded-l-[20px]"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          />

          {/* Seamless extension to cover the sidebar-content gap */}
          <div
            className="absolute left-20 right-[-6px] top-0 bottom-0"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          />

          {/* Top curve (Concave assembly) */}
          <div
            className="absolute right-0 bottom-full w-4 h-4 pointer-events-none"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          />
          <div className="absolute right-0 bottom-full w-4 h-4 bg-granate rounded-br-[16px] pointer-events-none" />

          {/* Bottom curve (Concave assembly) */}
          <div
            className="absolute right-0 top-full w-4 h-4 pointer-events-none"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
          />
          <div className="absolute right-0 top-full w-4 h-4 bg-granate rounded-tr-[16px] pointer-events-none" />
        </div>

        {[
          { id: 'chat' as const, label: 'Charla IA', icon: MessageSquare },
          { id: 'feed' as const, label: 'Comprobantes', icon: FileText },
          { id: 'metrics' as const, label: 'Métricas', icon: BarChart3 },
          { id: 'invite' as const, label: 'Unirse', icon: Building2 },
        ].map((item, idx) => {
          const active = activeIndex === idx;
          const { label, icon: Icon } = item;
          return (
            <div
              key={item.id}
              className="relative w-full h-12 flex items-center justify-center overflow-visible"
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id);
                }}
                className={cn(
                  'w-full h-12 relative flex items-center justify-center pl-2.5 rounded-l-[24px] z-25 group transition-colors duration-155',
                  active ? 'text-granate' : 'text-white/70 hover:text-white'
                )}
              >
                {/* Hover background helper matching the active tab bounds */}
                {!active && (
                  <div className="absolute left-2.5 right-0 top-0 bottom-0 bg-transparent group-hover:bg-white/5 rounded-l-[20px] transition-colors duration-200 z-10 pointer-events-none" />
                )}

                <Icon className="size-[20px] shrink-0 z-20" />

                {/* Hover tooltip */}
                <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                  {label}
                </span>
              </a>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Perfil / Cerrar Sesión */}
      <div className="flex flex-col items-center gap-4">
        {user?.role === 'COSTISTA' && (
          <Link
            to="/dashboard"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors group relative"
          >
            <ArrowLeft className="size-4.5 z-20" />
            <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Volver a Costista
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors group relative"
        >
          <LogOut className="size-4.5 z-20" />
          <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
