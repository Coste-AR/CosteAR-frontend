import { Hammer } from 'lucide-react';

/**
 * Marcador de una pestaña de Costeo por Procesos todavía no construida (U02).
 *
 * Existe para que la bifurcación de pestañas se pueda usar y revisar antes de
 * que estén las cinco pantallas (U04-U08). Dice qué va a ir ahí en vez de un
 * "próximamente" vacío: si alguien entra hoy, se lleva información útil sobre
 * qué se carga en esa pestaña.
 */
export function ProcessTabPlaceholder({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
          <Hammer className="size-5" aria-hidden />
        </div>
        <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{description}</p>
        <ul className="mt-4 space-y-1.5 text-left text-[13px] text-ink-soft">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-line-strong" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[12px] text-ink-soft/80">
          El cálculo por procesos ya funciona en el servidor; falta esta pantalla de carga.
        </p>
      </div>
    </div>
  );
}
