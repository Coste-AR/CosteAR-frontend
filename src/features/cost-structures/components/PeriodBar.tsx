import { useState } from 'react';
import { AlertTriangle, CalendarDays, Lock, LockOpen, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { apiErrorMessage, isUnimputedError, unimputedDatosFromError } from '@/lib/api';
import { cn, formatMoney } from '@/lib/utils';
import { IncompleteNotice } from '../ImputacionResolver';
import {
  usePeriods,
  usePeriodPreview,
  useOpenNextPeriod,
  useClosePeriod,
  useReopenPeriod,
  type CostPeriod,
  type PeriodPreview,
} from '../period-hooks';

interface PeriodBarProps {
  structureId: string;
  /** El período histórico tipeado a mano. Solo se muestra si no hay períodos reales todavía. */
  legacyPeriod?: string;
  /** Período que se está mirando. `null` = todavía no hay ninguno. */
  selectedId: string | null;
  onSelect: (periodId: string) => void;
  /** Cálculo que queda congelado con el cierre, si hay uno a mano. */
  runIdToFreeze?: string | null;
  /** Período de costo de la estructura ('YYYY-MM'): base de la imputación (F05). */
  periodoCosto?: string;
  /** Datos sin imputar de la última corrida, para resolverlos in-situ si el cierre los bloquea. */
  pendingDatos?: { id: string; nombre: string }[];
  /** Fallback: si no hay lista a mano, llevar a la pestaña Resultado a resolverlos. */
  onGoToResolve?: () => void;
}

/**
 * Barra de período (problema C — Fase 2).
 *
 * Reemplaza el campo "período" tipeado a mano por el período REAL: cuál se está
 * mirando, si está abierto o cerrado, y las tres operaciones (abrir el siguiente,
 * cerrar, reabrir). Un período cerrado es solo-lectura; reabrirlo exige motivo.
 */
export function PeriodBar({
  structureId,
  legacyPeriod,
  selectedId,
  onSelect,
  runIdToFreeze,
  periodoCosto,
  pendingDatos,
  onGoToResolve,
}: PeriodBarProps) {
  const { data: periods, isLoading } = usePeriods(structureId);
  const openNext = useOpenNextPeriod(structureId);
  const closePeriod = useClosePeriod(structureId);
  const reopenPeriod = useReopenPeriod(structureId);

  const [dialog, setDialog] = useState<'open' | 'close' | 'reopen' | null>(null);
  const [carryAmounts, setCarryAmounts] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  // F05 — cuando el cierre lo bloquea el 422 de datos sin imputar, guardamos la
  // lista para ofrecer la resolución acá mismo, sin que el costista tenga que ir
  // a buscar los datos. Preferimos la lista estructurada del error (si el
  // backend la adjunta) y caemos a la de la última corrida (`pendingDatos`).
  const [blockDatos, setBlockDatos] = useState<{ id: string; nombre: string }[] | null>(null);

  const selected = periods?.find((p) => p.id === selectedId) ?? null;
  const hasOpen = periods?.some((p) => p.status === 'OPEN') ?? false;

  const run = async (action: () => Promise<CostPeriod>) => {
    setError(null);
    try {
      const period = await action();
      onSelect(period.id);
      setDialog(null);
      setReason('');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  /** Cierre con su propio manejo: el 422 de datos sin imputar no es un error
   *  muerto — abre la resolución in-situ en vez de dejar al costista trabado. */
  const runClose = async () => {
    setError(null);
    setBlockDatos(null);
    try {
      const period = await closePeriod.mutateAsync({ periodId: selected!.id, runId: runIdToFreeze ?? null });
      onSelect(period.id);
      setDialog(null);
    } catch (e) {
      setError(apiErrorMessage(e)); // siempre mostramos el texto en español del backend
      if (isUnimputedError(e)) {
        setDialog(null); // cerramos el confirm para que se vea la resolución en la barra
        setBlockDatos(unimputedDatosFromError(e) ?? pendingDatos ?? []);
      }
    }
  };

  if (isLoading) {
    return <div className="h-7 w-56 animate-pulse rounded-full bg-surface-alt" />;
  }

  // Todavía no se abrió ningún período: mostramos el histórico tipeado y ofrecemos
  // arrancar el primero. Es el estado de toda estructura anterior a los períodos.
  const empty = !periods || periods.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarDays className="size-3.5 text-ink-soft" />

        {empty ? (
          <span className="inline-flex items-center rounded-full border border-granate/20 bg-granate-tenue px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-granate-deep">
            Período de costo: {legacyPeriod ?? '—'}
          </span>
        ) : (
          <Select
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="h-7 w-auto rounded-full border-granate/20 bg-granate-tenue px-2.5 text-[11px] font-bold uppercase tracking-wide text-granate-deep"
            options={periods.map((p) => ({
              value: p.id,
              label: `${p.label}${p.status === 'CLOSED' ? ' (cerrado)' : ''}`,
            }))}
          />
        )}

        {selected && <PeriodStatusPill status={selected.status} />}

        {/* Cerrar / reabrir el período que se está mirando. */}
        {selected?.status === 'OPEN' && (
          <button
            type="button"
            onClick={() => setDialog('close')}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft hover:border-granate hover:text-granate"
          >
            <Lock className="size-3" /> Cerrar
          </button>
        )}
        {selected?.status === 'CLOSED' && (
          <button
            type="button"
            onClick={() => setDialog('reopen')}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft hover:border-granate hover:text-granate"
          >
            <LockOpen className="size-3" /> Reabrir
          </button>
        )}

        {/* Un solo período abierto por vez: si ya hay uno, no se puede abrir otro. */}
        {!hasOpen && (
          <button
            type="button"
            onClick={() => setDialog('open')}
            className="inline-flex items-center gap-1 rounded-full border border-action/30 bg-action/5 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-action hover:bg-action/10"
          >
            <Plus className="size-3" /> {empty ? 'Abrir período' : 'Abrir período siguiente'}
          </button>
        )}
      </div>

      {selected?.status === 'CLOSED' && (
        <p className="text-[11px] text-ink-soft">
          Mes cerrado: los números están congelados y no se puede editar. Para corregir algo, reabrilo.
          {selected.reopenCount > 0 && ` · Reabierto ${selected.reopenCount} vez(ces).`}
        </p>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-danger/60 hover:text-danger">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* F05 — el cierre lo bloqueó el 422 de datos sin imputar: acá mismo se
          resuelven, sin salir a buscarlos. Si no tenemos la lista a mano
          (nunca se calculó en esta sesión), llevamos a Resultado a resolverlos. */}
      {blockDatos && selected && (
        blockDatos.length > 0 ? (
          <div className="max-w-xl">
            <IncompleteNotice
              datos={blockDatos}
              periodoCosto={periodoCosto}
              structureId={structureId}
              doneTitle={`Ya podés cerrar ${selected.label}.`}
              doneLabel={`Cerrar ${selected.label}`}
              onDone={() => { setBlockDatos(null); setError(null); setDialog('close'); }}
              busy={closePeriod.isPending}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setBlockDatos(null); onGoToResolve?.(); }}
            className="self-start rounded-lg bg-granate px-3 py-1.5 text-[12px] font-bold text-white hover:bg-granate-deep"
          >
            Resolver los datos pendientes
          </button>
        )
      )}

      {/* Abrir (apertura inteligente): antes de tocar nada, se muestra con qué
          existencia arranca cada MP y qué importes hay para traer. */}
      {dialog === 'open' && (
        <OpenPeriodDialog
          structureId={structureId}
          carryAmounts={carryAmounts}
          onCarryAmounts={setCarryAmounts}
          loading={openNext.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() => void run(() => openNext.mutateAsync(carryAmounts))}
        />
      )}

      {/* Cerrar: el backend exige actividad real y CIP real en todos los centros. */}
      <ConfirmDialog
        open={dialog === 'close'}
        title={`Cerrar ${selected?.label ?? 'el período'}`}
        confirmLabel="Cerrar período"
        loading={closePeriod.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void runClose()}
        message={
          <p>
            Los números quedan <strong>congelados</strong> y el mes pasa a solo lectura. Si a algún
            centro productivo le falta la <strong>actividad real</strong> o el <strong>CIP real</strong>,
            el sistema no va a dejar cerrar y te va a decir cuál falta.
          </p>
        }
      />

      {/* Reabrir: exige motivo (mínimo 10 caracteres) y queda registrado. */}
      {dialog === 'reopen' && selected && (
        <ReopenDialog
          label={selected.label}
          reason={reason}
          onReason={setReason}
          loading={reopenPeriod.isPending}
          onCancel={() => {
            setDialog(null);
            setReason('');
          }}
          onConfirm={() =>
            void run(() => reopenPeriod.mutateAsync({ periodId: selected.id, reason }))
          }
        />
      )}
    </div>
  );
}

/**
 * APERTURA INTELIGENTE (problema C — Fase 3).
 *
 * Abrir un mes no es crear una carpeta vacía: es decidir con qué arranca. El
 * diálogo lo muestra ANTES de tocar nada —
 *
 *   · la existencia con la que quedó cada materia prima al cerrar el mes
 *     anterior, valuada al PPP de cierre (se arrastra sola: es la que abre);
 *   · qué importes hay para traer, si el costista los quiere revisar;
 *   · y qué NO se copia: las compras, los consumos y el cierre del mes viejo.
 */
function OpenPeriodDialog({
  structureId,
  carryAmounts,
  onCarryAmounts,
  loading,
  onCancel,
  onConfirm,
}: {
  structureId: string;
  carryAmounts: boolean;
  onCarryAmounts: (v: boolean) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { data: preview, isLoading } = usePeriodPreview(structureId, true);
  // Si la ficha de stock del mes que cierra no cuadra, no hay existencia que
  // arrastrar: abrir ahora sería arrancar el mes con un número inventado.
  const blocked = !!preview?.openingStockError;

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <Plus className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-ink">
              {isLoading || !preview
                ? 'Abrir período'
                : preview.isFirst
                  ? `Abrir el primer período (${preview.next.label})`
                  : `Abrir ${preview.next.label}`}
            </h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-soft hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        {isLoading || !preview ? (
          <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
        ) : (
          <OpenPeriodBody
            preview={preview}
            carryAmounts={carryAmounts}
            onCarryAmounts={onCarryAmounts}
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} loading={loading} disabled={isLoading || blocked}>
            {preview && !preview.isFirst ? `Abrir ${preview.next.label}` : 'Abrir período'}
          </Button>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}

function OpenPeriodBody({
  preview,
  carryAmounts,
  onCarryAmounts,
}: {
  preview: PeriodPreview;
  carryAmounts: boolean;
  onCarryAmounts: (v: boolean) => void;
}) {
  // El primero no arrastra de ningún lado: fotografía lo que ya está cargado.
  if (preview.isFirst) {
    return (
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Es el primer período de esta estructura: se guarda como <strong>{preview.next.label}</strong>{' '}
        lo que ya tenés cargado. No se borra ni se cambia nada de la pantalla. A partir de acá, cada
        mes queda guardado por separado.
      </p>
    );
  }

  const hasStock = preview.openingStock.some((m) => m.quantity > 0);

  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-ink-soft">
      {/* La existencia arrastrada: el dato que antes se copiaba a mano. */}
      {preview.openingStockError ? (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">No se puede arrastrar la existencia</p>
            <p className="mt-0.5 text-[12px]">{preview.openingStockError}</p>
          </div>
        </div>
      ) : (
        <div>
          <p>
            Lo que quedó en depósito al cerrar <strong>{preview.from?.label}</strong> arranca{' '}
            {preview.next.label} como <strong>existencia inicial</strong>, al precio promedio
            ponderado con el que cerró:
          </p>
          {hasStock ? (
            <div className="mt-2 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-[12px]">
                <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-bold">Materia prima</th>
                    <th className="px-3 py-1.5 text-right font-bold">Existencia</th>
                    <th className="px-3 py-1.5 text-right font-bold">PPP</th>
                    <th className="px-3 py-1.5 text-right font-bold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.openingStock.map((m) => (
                    <tr key={m.name}>
                      <td className="px-3 py-1.5 text-ink">{m.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {m.quantity.toLocaleString('es-AR')}
                        {m.unit ? ` ${m.unit}` : ''}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {formatMoney(m.unitCost)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-ink">
                        {formatMoney(m.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-[12px]">
              {preview.from?.label} cerró sin existencia en depósito: {preview.next.label} arranca en
              cero.
            </p>
          )}
        </div>
      )}

      {/* Lo que viene siempre y lo que nunca viene. */}
      <p>
        Viene también la <strong>receta</strong>: centros, bases de distribución, departamentos y
        capacidad normal. <strong>No</strong> se copian las compras, los consumos, ni la actividad y
        el CIP reales de {preview.from?.label} — son datos de ese mes, que queda guardado y se puede
        seguir consultando.
      </p>

      {/* Los importes: el costista elige. */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={carryAmounts}
          onChange={(e) => onCarryAmounts(e.target.checked)}
          className="mt-0.5 size-4 accent-granate"
        />
        <span>
          Traer también los <strong>importes</strong> de {preview.from?.label} para revisarlos y
          corregirlos
          {preview.amounts && (
            <>
              {' '}
              — sueldos {formatMoney(preview.amounts.wages)} · CIF{' '}
              {formatMoney(preview.amounts.indirect)}
            </>
          )}
          . Si no, arrancan en cero.
        </span>
      </label>
    </div>
  );
}

function PeriodStatusPill({ status }: { status: CostPeriod['status'] }) {
  const open = status === 'OPEN';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
        open ? 'bg-ok/10 text-ok' : 'bg-ink-soft/10 text-ink-soft',
      )}
    >
      {open ? <LockOpen className="size-3" /> : <Lock className="size-3" />}
      {open ? 'Abierto' : 'Cerrado'}
    </span>
  );
}

/**
 * Reabrir pide un motivo escrito. No usamos ConfirmDialog porque necesita un
 * campo de texto y validar el largo mínimo que exige el backend.
 */
function ReopenDialog({
  label,
  reason,
  onReason,
  loading,
  onCancel,
  onConfirm,
}: {
  label: string;
  reason: string;
  onReason: (v: string) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tooShort = reason.trim().length < 10;

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <LockOpen className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-ink">Reabrir {label}</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-soft hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4 space-y-2 text-[13px] leading-relaxed text-ink-soft">
          <p>
            Reabrir un mes cerrado es la excepción, no la regla. Queda registrado{' '}
            <strong>quién, cuándo y por qué</strong>.
          </p>
          <textarea
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Ej.: llegó tarde la factura de energía de junio"
            className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-granate"
          />
          {tooShort && (
            <p className="text-[11px] text-ink-soft">
              Escribí el motivo (al menos 10 caracteres).
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} loading={loading} disabled={tooShort}>
            Reabrir
          </Button>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
