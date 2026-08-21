import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de tabs unificado (issue #52, F-09).
 *
 * Reemplaza 7 implementaciones a mano con distinta animación, estado y
 * accesibilidad. El componente es fully-controlled: el padre mantiene el
 * estado y pasa `active` + `onClick`.
 *
 * Uso básico:
 *   <TabList>
 *     <Tab active={tab === 'a'} onClick={() => setTab('a')}>Sección A</Tab>
 *     <Tab active={tab === 'b'} onClick={() => setTab('b')}>Sección B</Tab>
 *   </TabList>
 *   {tab === 'a' && <PanelA />}
 *
 * Con TabPanel:
 *   <TabPanel>{tab === 'a' && <PanelA />}</TabPanel>
 *
 * Con ícono y badge de completado:
 *   <Tab active={...} onClick={...} done={configured.mp}>
 *     <Wheat className="size-4" /> Materia Prima
 *   </Tab>
 */

export function TabList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex overflow-x-auto scrollbar-hidden border-b border-zinc-200',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({
  active,
  onClick,
  children,
  done,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  done?: boolean;
  className?: string;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'text-granate' : 'text-zinc-500 hover:text-zinc-800',
        className,
      )}
    >
      {children}
      {done && <CheckCircle2 className="size-3.5 text-ok" aria-hidden />}
      {active && (
        <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-granate" aria-hidden />
      )}
    </button>
  );
}

export function TabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="tabpanel" className={cn('mt-4', className)}>
      {children}
    </div>
  );
}
