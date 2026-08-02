import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import { useLateDataDecisions, useResolveLateData } from '../trazabilidad-hooks';
import type { LateDataChoice, LateDataDecision } from '../trazabilidad-types';

/**
 * DATOS QUE LLEGARON TARDE.
 *
 * Una factura de julio que aparece el 5 de agosto, con julio ya cerrado.
 * Mientras esto no se decide, el dato NO entra en ningún cálculo — y eso se dice
 * en pantalla, porque si no el costista ve un costo que le falta plata y no sabe
 * por qué.
 *
 * Cada opción muestra su CONSECUENCIA antes de apretar. Reabrir un mes cerrado
 * cambia números que el costista ya dio por buenos, y eso tiene que saberlo
 * antes, no descubrirlo después.
 */
export function LateDataInbox() {
  const { data: decisiones, isLoading } = useLateDataDecisions();

  if (isLoading || !decisiones?.length) return null;

  return (
    <Card>
      <CardHeader
        title="Datos que llegaron tarde"
        description={`${decisiones.length} dato(s) corresponden a un período ya cerrado. Hasta que decidas, no entran en ningún cálculo.`}
      />
      <CardBody className="space-y-4">
        {decisiones.map((d) => (
          <DecisionCard key={d.id} decision={d} />
        ))}
      </CardBody>
    </Card>
  );
}

function DecisionCard({ decision }: { decision: LateDataDecision }) {
  const [choice, setChoice] = useState<LateDataChoice | null>(null);
  const [reason, setReason] = useState('');
  const resolve = useResolveLateData();

  const motivoCorto = reason.trim().length < 10;

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-ink">{decision.dato.nombre}</p>
        <p className="text-[12px] text-ink-soft">
          {decision.producto} · detectado el {formatDate(decision.detectadoEl)}
        </p>
      </div>

      <p className="mt-1 text-[12.5px] text-ink-soft">
        Corresponde a <strong>{decision.periodoCerrado}</strong>, que ya está cerrado.
        {decision.dato.fecha && ` Fecha del comprobante: ${formatDate(decision.dato.fecha)}.`}
      </p>

      <div className="mt-3 space-y-2">
        {decision.opciones.map((op) => (
          <label
            key={op.choice}
            className={`flex cursor-pointer gap-2.5 rounded-md border p-2.5 ${
              choice === op.choice ? 'border-granate bg-granate-tenue' : 'border-line'
            } ${!op.disponible ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name={`choice-${decision.id}`}
              className="mt-1"
              disabled={!op.disponible}
              checked={choice === op.choice}
              onChange={() => setChoice(op.choice)}
            />
            <span>
              <span className="block text-[12.5px] font-medium text-ink">{op.etiqueta}</span>
              {/* El "¿qué pasa si hago esto?" — antes de apretar, no después. */}
              <span className="block text-[11.5px] text-ink-soft">{op.consecuencia}</span>
            </span>
          </label>
        ))}
      </div>

      {choice && (
        <div className="mt-3 space-y-2">
          <label className="block text-[12px] font-medium text-ink">
            ¿Por qué tomás esta decisión? Queda registrado.
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-line px-3 py-2 text-[13px]"
            placeholder="Ej.: el proveedor facturó el flete de julio con dos semanas de atraso."
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={motivoCorto || resolve.isPending}
              onClick={() => resolve.mutate({ id: decision.id, choice, reason })}
              className="rounded-md bg-granate px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              {resolve.isPending ? 'Aplicando…' : 'Confirmar'}
            </button>
            {motivoCorto && (
              <span className="text-[11.5px] text-ink-soft">
                Escribí al menos 10 caracteres.
              </span>
            )}
          </div>
          {resolve.isError && (
            <p className="text-[12px] text-danger">{apiErrorMessage(resolve.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}
