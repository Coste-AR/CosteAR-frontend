import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apiErrorMessage } from '@/lib/api';
import {
  useQuickAccessCatalog,
  useSaveUserPreferences,
  useUserPreferences,
  type QuickAccessCatalogItem,
} from '@/features/dashboard/dashboard-hooks';

const MAX_QUICK_ACCESSES = 6;

function withDestination(catalog: QuickAccessCatalogItem[]): Array<QuickAccessCatalogItem & { destino: string }> {
  return catalog.filter((item): item is QuickAccessCatalogItem & { destino: string } => {
    const usable = typeof item.destino === 'string' && item.destino.trim().length > 0;
    if (!usable) {
      console.warn('[preferencias] acceso rápido omitido por no tener destino:', item.clave);
    }
    return usable;
  });
}

export function QuickAccessSettings() {
  const preferences = useUserPreferences(true);
  const catalog = useQuickAccessCatalog(true);
  const savePreferences = useSaveUserPreferences();
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const draggedKey = useRef<string | null>(null);

  const usableCatalog = useMemo(() => withDestination(catalog.data ?? []), [catalog.data]);
  const catalogByKey = useMemo(
    () => new Map(usableCatalog.map((item) => [item.clave, item])),
    [usableCatalog],
  );

  useEffect(() => {
    if (!preferences.data || catalog.isLoading) return;
    setSelected(preferences.data.home.accesosRapidos.filter((key) => catalogByKey.has(key)));
  }, [catalog.isLoading, catalogByKey, preferences.data]);

  const orderedCatalog = useMemo(() => {
    const selectedItems = selected.flatMap((key) => {
      const item = catalogByKey.get(key);
      return item ? [item] : [];
    });
    const selectedSet = new Set(selected);
    return [...selectedItems, ...usableCatalog.filter((item) => !selectedSet.has(item.clave))];
  }, [catalogByKey, selected, usableCatalog]);

  const updateSelection = (next: string[]) => {
    setSelected(next);
    setFeedback(null);
  };

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      updateSelection(selected.filter((selectedKey) => selectedKey !== key));
      return;
    }
    if (selected.length < MAX_QUICK_ACCESSES) updateSelection([...selected, key]);
  };

  const move = (key: string, offset: -1 | 1) => {
    const from = selected.indexOf(key);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= selected.length) return;
    const next = [...selected];
    const moving = next[from];
    const displaced = next[to];
    if (!moving || !displaced) return;
    next[from] = displaced;
    next[to] = moving;
    updateSelection(next);
  };

  const dropBefore = (event: DragEvent<HTMLLIElement>, targetKey: string) => {
    event.preventDefault();
    const sourceKey = draggedKey.current;
    draggedKey.current = null;
    if (!sourceKey || sourceKey === targetKey) return;
    const sourceIndex = selected.indexOf(sourceKey);
    const targetIndex = selected.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...selected];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, sourceKey);
    updateSelection(next);
  };

  const save = async () => {
    setFeedback(null);
    try {
      await savePreferences.mutateAsync({ home: { accesosRapidos: selected } });
      setFeedback({ kind: 'success', message: 'Accesos rápidos guardados.' });
    } catch (error) {
      setFeedback({ kind: 'error', message: apiErrorMessage(error) });
    }
  };

  const loading = preferences.isLoading || catalog.isLoading;
  const loadFailed = preferences.isError || catalog.isError;

  return (
    <Card>
      <CardHeader
        title="Accesos rápidos"
        description="Elegí hasta 6 accesos y ordenalos como querés verlos en el inicio."
        action={<span className="text-xs font-bold text-ink-soft">{selected.length}/{MAX_QUICK_ACCESSES}</span>}
      />
      <CardBody className="space-y-4">
        {loading ? (
          <p className="text-sm text-ink-soft">Cargando accesos disponibles…</p>
        ) : loadFailed ? (
          <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
            No pudimos cargar tus accesos rápidos. Probá de nuevo.
          </p>
        ) : orderedCatalog.length === 0 ? (
          <p className="text-sm text-ink-soft">No hay accesos disponibles para los módulos activos.</p>
        ) : (
          <ul className="space-y-2" aria-label="Catálogo de accesos rápidos">
            {orderedCatalog.map((item) => {
              const checked = selected.includes(item.clave);
              const position = selected.indexOf(item.clave);
              return (
                <li
                  key={item.clave}
                  data-testid={`quick-access-${item.clave}`}
                  draggable={checked}
                  onDragStart={(event) => {
                    draggedKey.current = item.clave;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', item.clave);
                  }}
                  onDragOver={(event) => {
                    if (checked) event.preventDefault();
                  }}
                  onDrop={(event) => dropBefore(event, item.clave)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${checked ? 'border-granate/30 bg-granate-tenue' : 'border-line bg-surface-alt'}`}
                >
                  <GripVertical className={`size-4 shrink-0 ${checked ? 'cursor-grab text-granate' : 'text-line-strong'}`} aria-hidden />
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={item.etiqueta}
                      checked={checked}
                      disabled={!checked && selected.length >= MAX_QUICK_ACCESSES}
                      onChange={() => toggle(item.clave)}
                      className="mt-0.5 size-4 accent-granate"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{item.etiqueta}</span>
                      <span className="block truncate text-xs text-ink-soft">{item.modulo}</span>
                    </span>
                  </label>
                  {checked && (
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`Subir ${item.etiqueta}`}
                        disabled={position === 0}
                        onClick={() => move(item.clave, -1)}
                        className="rounded-lg p-1.5 text-granate hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar ${item.etiqueta}`}
                        disabled={position === selected.length - 1}
                        onClick={() => move(item.clave, 1)}
                        className="rounded-lg p-1.5 text-granate hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" aria-hidden />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {feedback && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${feedback.kind === 'error' ? 'border-danger/20 bg-danger/5 text-danger' : 'border-ok/20 bg-ok/10 text-ok'}`}
          >
            {feedback.message}
          </p>
        )}

        <Button
          type="button"
          size="sm"
          loading={savePreferences.isPending}
          disabled={loading || loadFailed}
          onClick={save}
        >
          Guardar accesos rápidos
        </Button>
      </CardBody>
    </Card>
  );
}
