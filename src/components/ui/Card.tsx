import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Tarjeta bento: fondo blanco, radio 16px, sombra granate suave con hover lift.
 * Contenedor por defecto de cualquier grupo de información — mismo lenguaje
 * visual que las tarjetas del dashboard (ver DashboardPage.tsx).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // 16px, no los 28px de antes.
        //
        // No es una preferencia estética: con 28 el arco se come el ancho útil de
        // las esquinas y recorta contenido — se nota sobre todo en las tarjetas
        // que envuelven TABLAS, donde la primera y la última celda quedan
        // mordidas, y en cualquier bloque con padding ajustado.
        //
        // 28 era además un valor suelto, fuera de la escala que usa el resto de
        // la app. Se barrieron también los `rounded-[28px]` y `rounded-3xl`
        // escritos a mano en 22 archivos, para que no quedaran dos radios
        // distintos conviviendo en la misma pantalla.
        'rounded-2xl border border-line bg-surface shadow-[0_10px_30px_rgba(74,21,27,0.015)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">{title}</h3>
        {description && <p className="mt-1 text-[11px] text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}
