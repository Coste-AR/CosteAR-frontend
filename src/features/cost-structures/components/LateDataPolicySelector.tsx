import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apiErrorMessage } from '@/lib/api';
import { useCostStructure, useUpdateLateDataPolicy } from '../cost-structure-hooks';
import type { LateDataPolicy } from '@/lib/types';

/**
 * QUÉ HACER, DE ACÁ EN ADELANTE, CON LOS DATOS QUE LLEGAN TARDE.
 *
 * La maquinaria que resuelve los tres casos existe desde que se construyó la
 * bandeja de atrasados. Lo que no existía era el interruptor: la política
 * quedaba siempre en "preguntar", así que un costista con veinte estructuras
 * resolvía veinte veces por mes la misma decisión, para siempre.
 *
 * Va acá, al lado de la bandeja, y no enterrado en una pantalla de
 * configuración: el momento en que a alguien le importa esto es justo cuando lo
 * están interrumpiendo por enésima vez.
 *
 * Cada opción dice su CONSECUENCIA antes de elegirla, mismo criterio que la
 * bandeja. Y no es irreversible: se puede volver a "preguntar" cuando sea.
 */
const OPCIONES: { value: LateDataPolicy; etiqueta: string; consecuencia: string }[] = [
  {
    value: 'ASK',
    etiqueta: 'Preguntarme cada vez',
    consecuencia:
      'Ningún dato atrasado entra a un cálculo hasta que lo decidas a mano. Es lo más seguro y lo que más interrumpe.',
  },
  {
    value: 'CURRENT_PERIOD',
    etiqueta: 'Imputarlo al período abierto',
    consecuencia:
      'El dato entra en el mes que esté abierto, no en el que le corresponde por fecha. Los meses ya cerrados no se tocan.',
  },
  {
    value: 'REOPEN',
    etiqueta: 'Reabrir el período que corresponde',
    consecuencia:
      'Se reabre el mes cerrado y se recalcula hacia adelante: cambian los números de ese mes y de todos los posteriores.',
  },
];

export function LateDataPolicySelector({ structureId }: { structureId: string }) {
  const { data: structure } = useCostStructure(structureId);
  const update = useUpdateLateDataPolicy(structureId);

  // Hasta que no sepamos qué política tiene, no se dibujan opciones: mostrar
  // "preguntar" marcado por defecto sería afirmar algo que todavía no leímos.
  if (!structure?.lateDataPolicy) return null;

  const actual = update.isPending ? update.variables : structure.lateDataPolicy;

  return (
    <Card>
      <CardHeader
        title="Datos que lleguen tarde"
        description="Qué hacer, de acá en adelante, cuando llegue un dato cuya fecha cae en un período ya cerrado. Lo podés cambiar cuando quieras."
      />
      <CardBody className="space-y-2">
        {OPCIONES.map((op) => (
          <label
            key={op.value}
            className={`flex cursor-pointer gap-2.5 rounded-md border p-2.5 ${
              actual === op.value ? 'border-granate bg-granate-tenue' : 'border-line'
            } ${update.isPending ? 'cursor-wait opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`late-data-policy-${structureId}`}
              className="mt-1"
              disabled={update.isPending}
              checked={actual === op.value}
              onChange={() => update.mutate(op.value)}
            />
            <span>
              <span className="block text-[12.5px] font-medium text-ink">{op.etiqueta}</span>
              <span className="block text-[11.5px] text-ink-soft">{op.consecuencia}</span>
            </span>
          </label>
        ))}

        <p className="text-[11.5px] text-ink-soft">
          Esto no cambia nada de lo ya decidido: cada caso queda registrado con la política que
          regía cuando se detectó, y el historial distingue lo que resolviste en el momento de lo
          que se resolvió solo.
        </p>

        {update.isError && (
          <p className="text-[12px] text-danger">{apiErrorMessage(update.error)}</p>
        )}
      </CardBody>
    </Card>
  );
}
