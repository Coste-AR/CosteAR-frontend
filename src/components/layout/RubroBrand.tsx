import { Building2 } from 'lucide-react';
import { INDUSTRY_ICONS } from './rubro-icons';

export interface RubroPresentacion {
  clave: string;
  nombreProducto: string | null;
  icons: Record<string, string>;
}

export function RubroBrand({ rubro, expanded = true }: { rubro?: RubroPresentacion | null; expanded?: boolean }) {
  const iconName = rubro?.icons.LoteProductivo ?? Object.values(rubro?.icons ?? {})[0] ?? 'neutral';
  const Icon = INDUSTRY_ICONS[iconName] ?? Building2;
  const nombre = rubro?.nombreProducto?.trim();

  return (
    <div className="flex min-w-0 items-center gap-2 text-white">
      <Icon data-testid="sidebar-rubro-icon" data-icon={iconName} aria-hidden="true" className="size-5 shrink-0" />
      {expanded && <span className="truncate text-sm font-bold">{nombre ? `Costear ${nombre}` : 'Costear'}</span>}
    </div>
  );
}
