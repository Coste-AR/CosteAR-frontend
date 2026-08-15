import { useState } from 'react';
import { LogIn, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onAccessClick: () => void;
}

export function Navbar({ onAccessClick }: NavbarProps) {
  const { accessToken } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <header className={cn(
      "fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl lg:max-w-7xl xl:max-w-[1360px] -translate-x-1/2 border border-line/80 bg-surface/80 px-4 py-2.5 md:px-6 md:py-3 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 ease-in-out",
      isOpen ? "rounded-2xl pb-5" : "rounded-2xl md:rounded-full"
    )}>

      {/* ── Mobile top bar: brand izquierda | hamburger derecha ── */}
      <div className="flex items-center justify-between md:hidden">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <CosteARLogo className="h-full w-full text-granate" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-ink font-outfit">CosteAR</span>
        </div>

        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-zinc-50/60 transition-all"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* ── Desktop top bar: flex normal ── */}
      <div className="hidden md:flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            <CosteARLogo className="h-full w-full text-granate" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-ink font-outfit">CosteAR</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-8 text-xs font-semibold text-ink-soft">
          <a href="#features" className="transition-colors hover:text-ink">Características</a>
          <a href="#como-funciona" className="transition-colors hover:text-ink">Cómo funciona</a>
          <a href="mailto:proyectocostear@gmail.com" className="transition-colors hover:text-ink">Contacto</a>
        </nav>

        {/* Acceso */}
        <button
          type="button"
          onClick={onAccessClick}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-surface px-4 py-1.5 text-[11px] font-semibold text-ink transition-all duration-200 hover:border-granate hover:text-granate"
        >
          {accessToken ? 'Ir al Panel' : 'Acceso Equipo'}
          <LogIn className="size-3.5" />
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-line/50 flex flex-col gap-4 animate-rise md:hidden">
          <nav className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft">
            <a
              href="#features"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-xl hover:bg-granate-tenue/60 hover:text-granate transition-all"
            >
              Características
            </a>
            <a
              href="#como-funciona"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-xl hover:bg-granate-tenue/60 hover:text-granate transition-all"
            >
              Cómo funciona
            </a>
            <a
              href="mailto:proyectocostear@gmail.com"
              onClick={handleLinkClick}
              className="px-3 py-2 rounded-xl hover:bg-granate-tenue/60 hover:text-granate transition-all"
            >
              Contacto
            </a>
          </nav>
          <div className="pt-2 border-t border-line/30">
            <button
              type="button"
              onClick={() => { onAccessClick(); handleLinkClick(); }}
              className="w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-4 py-2.5 text-xs font-bold text-ink transition-all duration-200 hover:border-granate hover:text-granate shadow-sm"
            >
              {accessToken ? 'Ir al Panel' : 'Acceso Equipo'}
              <LogIn className="size-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
