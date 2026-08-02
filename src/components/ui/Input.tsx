import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Texto explicativo: se muestra en un tooltip al pasar el mouse por el ícono ℹ️. */
  info?: string;
  /** Sufijo fijo dentro del campo (ej: "%"). Visible siempre, no editable. */
  suffix?: string;
  /** Para montos: aplica tipografía monoespaciada alineada a la derecha. */
  numeric?: boolean;
  /** Estado de éxito: marca el campo en verde indicando que el valor es válido. */
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, info, suffix, numeric, success, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    let value = props.value;
    let placeholder = props.placeholder;
    if (props.type === 'number') {
      if (value === 0 || value === '0') {
        value = '';
      }
      placeholder = placeholder ?? '0';
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 text-[12px] font-medium uppercase tracking-wide text-ink-soft"
          >
            {label}
            {info && (
              <span className="group relative inline-flex">
                <Info className="size-3 cursor-help text-idle hover:text-action" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-52 -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-white shadow-lg group-hover:block">
                  {info}
                </span>
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-11 w-full rounded-xl border bg-surface px-3 text-sm text-ink transition-all duration-200',
              'placeholder:text-idle focus:outline-none focus:ring-[3px]',
              numeric && 'tabular text-right',
              suffix && 'pr-8',
              error 
                ? 'border-danger focus:border-danger focus:ring-danger/15' 
                : success 
                  ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/15'
                  : 'border-line focus:border-granate focus:ring-granate/15',
              className,
            )}
            aria-invalid={!!error}
            onFocus={(e) => {
              e.target.select();
              if (props.onFocus) props.onFocus(e);
            }}
            {...props}
            value={value}
            placeholder={placeholder}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-ink-soft">
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <span className="text-[12px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-ink-soft">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
