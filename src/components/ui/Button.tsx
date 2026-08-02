import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/*
 * Botones según la guía: una sola acción primaria por vista. El primario usa
 * negro/casi-negro — el secundario, borde granate sobre blanco; el destructivo,
 * rojo de estado, reservado para acciones irreversibles. El primario dejó de
 * ser rojo a propósito: compartía familia de color con "danger" (ambos
 * #b3xxxx) y un "Guardar" quedaba a un tono de un "Eliminar". Negro no compite
 * con ningún otro token semántico de la app.
 * Radio rounded-xl (32px, ver --radius-xl en index.css) que en botones de
 * 36-44px de alto se comporta como pill — mismo efecto que los botones
 * "Ver Todos"/"Auditar" del dashboard, sin necesidad de override manual.
 */
const variants: Record<Variant, string> = {
  primary:
    'bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-950 shadow-sm hover:shadow-md',
  secondary:
    'bg-surface text-granate border border-granate hover:bg-granate-tenue shadow-sm',
  ghost: 'bg-transparent text-granate hover:bg-granate-tenue',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
