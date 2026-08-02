import { forwardRef, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Encabezado de grupo (equivalente a <optgroup>). Agrupa por cambios consecutivos, así que las opciones del mismo grupo deben venir juntas en el array. */
  group?: string;
}

/**
 * Evento sintético con la misma forma que un onChange nativo de <select>
 * ({ target: { name, value } }), para que un handler existente como
 * `(e) => setX(e.target.value)` o el `onChange` que entrega
 * react-hook-form `register()` sigan funcionando sin cambios.
 */
export interface SelectChangeEvent {
  target: { name?: string; value: string };
}

interface SelectProps {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  /** Para cuando la etiqueta visible la arma el que llama (icono + texto propios) en vez del prop `label`. */
  ariaLabel?: string;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Modo controlado (mismo patrón que un <select> con value+onChange). */
  value?: string;
  /** Modo no controlado (mismo patrón que register() de react-hook-form). */
  defaultValue?: string;
  onChange?: (e: SelectChangeEvent) => void;
  onBlur?: (e: SelectChangeEvent) => void;
}

/**
 * Select propio, con menú desplegable con estilos de la app en vez del
 * popup nativo del sistema operativo.
 *
 * Por dentro mantiene un <select> nativo oculto (sr-only) como fuente de
 * verdad: ahí vive el value real, y es al que apunta el `ref` reenviado.
 * Es lo que permite conectarlo con `{...register("campo")}` de
 * react-hook-form exactamente igual que a un <select> nativo — RHF
 * lee/escribe contra ese elemento, no contra el menú visible — sin tener
 * que reescribir la validación ni el estado de cada formulario que lo usa.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, label, ariaLabel, error, hint, className, disabled, id, name, value, defaultValue, onChange, onBlur },
  forwardedRef,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const current = isControlled ? (value ?? '') : internalValue;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === 'function') forwardedRef(hiddenRef.current);
    else (forwardedRef as React.MutableRefObject<HTMLSelectElement | null>).current = hiddenRef.current;
    // register() de react-hook-form, en formularios con defaultValues (editar
    // algo que ya existe), fija el valor inicial escribiendo directo en el DOM
    // del elemento reenviado — no via props — porque asume un input no
    // controlado. Nuestro <select> oculto SÍ está controlado (value={current})
    // para poder mostrar el valor en el botón visible, así que ese valor
    // directo nunca lo íbamos a ver: leerlo acá una vez, después de que el ref se
    // conectó, es lo que hace que un select de edición arranque mostrando el
    // valor cargado en vez del placeholder.
    if (!isControlled && hiddenRef.current && hiddenRef.current.value) {
      setInternalValue(hiddenRef.current.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forwardedRef]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const commit = (val: string) => {
    if (!isControlled) setInternalValue(val);
    setOpen(false);
    // Sincroniza el <select> oculto y dispara un 'change' de verdad: es lo
    // que hace que el onChange de register() (o cualquier onChange nativo
    // pasado por props) vea el cambio como si viniera de un <select> real.
    const el = hiddenRef.current;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    onChange?.({ target: { name, value: val } });
  };

  const openAt = (index: number) => {
    setOpen(true);
    setActiveIndex(index);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        const currentIndex = options.findIndex((o) => o.value === current);
        openAt(currentIndex >= 0 ? currentIndex : 0);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (activeIndex >= 0 && !options[activeIndex]?.disabled) commit(options[activeIndex]!.value);
      }
    }
  };

  const handleListKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0 && !options[activeIndex]?.disabled) commit(options[activeIndex]!.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      {label && (
        <label htmlFor={selectId} className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Fuente de verdad para react-hook-form: value/ref/change reales,
            fuera de la vista y del tabindex (el botón de abajo es el único
            punto de entrada por teclado). */}
        <select
          ref={hiddenRef}
          id={selectId}
          name={name}
          tabIndex={-1}
          aria-hidden="true"
          value={current}
          onChange={() => {}}
          onBlur={() => onBlur?.({ target: { name, value: current } })}
          className="sr-only"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3 text-left text-sm transition-all duration-200',
            'focus:outline-none focus:ring-[3px]',
            error 
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-line focus:border-granate focus:ring-granate/15',
            disabled
              ? 'cursor-not-allowed bg-surface-alt text-ink-soft opacity-70'
              : 'cursor-pointer hover:border-line-strong',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-idle')}>
            {selected ? selected.label : (placeholder ?? 'Seleccioná una opción')}
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-ink-soft transition-transform duration-150', open && 'rotate-180')}
          />
        </button>

        {open && (
          // Envoltorio que SOLO recorta (overflow-hidden + el radio): el
          // scroll real vive en el <ul> de adentro. Si overflow-auto y el
          // radio quedan en el mismo elemento, el scrollbar nativo de
          // Windows/Chrome no siempre lo respeta y se sale del borde
          // redondeado — separarlos en dos capas lo evita en cualquier navegador.
          // Radio "tarjeta" (24px, --radius-lg) para el contenedor y "sub-
          // tarjeta" (12px, --radius-md) para cada opción — la pareja que ya
          // usa el resto de la app (ver comentario de radios en index.css) en
          // vez de rounded-xl (32px, pensado para Cards grandes): con solo
          // 6px de padding alrededor, ese radio era más grande que el hueco
          // disponible y la esquina de la opción quedaba "cortando" la curva
          // del contenedor en vez de seguirla.
          <div className="animate-rise absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(74,21,27,0.12)]">
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            className="max-h-64 overflow-auto p-1.5"
          >
            {options.map((o, i) => (
              <li key={o.value} role="presentation">
                {o.group && o.group !== options[i - 1]?.group && (
                  <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft/60 first:pt-0.5">
                    {o.group}
                  </div>
                )}
                <div
                  data-index={i}
                  role="option"
                  aria-selected={o.value === current}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => !o.disabled && commit(o.value)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    o.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer',
                    o.value === current
                      ? 'bg-granate-tenue font-semibold text-granate'
                      : i === activeIndex
                        ? 'bg-surface-alt text-ink'
                        : 'text-ink',
                  )}
                >
                  {o.label}
                </div>
              </li>
            ))}
          </ul>
          </div>
        )}
      </div>
      {error ? (
        <span className="text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-ink-soft">{hint}</span>
      ) : null}
    </div>
  );
});
Select.displayName = 'Select';
