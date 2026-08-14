import { useState, useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from '@tanstack/react-router';
import { Calculator } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TraceableValue } from '@/components/ui/TraceableValue';
import { useDataPointIdByFieldKey } from '../../trazabilidad-hooks';

/**
 * EL VALOR REGISTRADO DE UN DATO DE VENTA (T-05).
 *
 * Venta es una pantalla de CARGA: sus tres números viven dentro de `<input>` y
 * un input no puede ir adentro de un botón (el click se lo comería el botón y el
 * campo dejaría de escribirse). Lo que se marca, entonces, no es el campo
 * editable sino el valor tal como QUEDÓ REGISTRADO en el servidor, debajo de él
 * — exactamente el mismo criterio que ya usa la ficha PPP de Materia Prima.
 *
 * Sin dato guardado no se dibuja nada: un precio que todavía no se guardó no
 * tiene ficha que abrir, y prometerla sería el único defecto que esta pantalla
 * no puede tener.
 */
function ValorRegistrado({
  dataPointId,
  title,
  children,
}: {
  dataPointId?: string;
  title: string;
  children: ReactNode;
}) {
  if (!dataPointId) return null;
  return (
    <div className="mt-1">
      <TraceableValue dataPointId={dataPointId} title={title} className="!px-1.5 !py-0.5 text-[10.5px] text-ink-soft">
        {children}
      </TraceableValue>
    </div>
  );
}

/** Cantidad tal como la lee el costista; '—' si no hay dato guardado. */
const num = (v: number | undefined): string => (v == null ? '—' : v.toLocaleString('es-AR'));

export function SalesTab({
  defaultPrice, defaultQty, defaultProducedQty, onSave, saving, allReady, onCalculate, calculating,
}: {
  defaultPrice?: number;
  defaultQty?: number;
  defaultProducedQty?: number;
  onSave: (p: number, q: number, produced: number | null) => Promise<void>;
  saving: boolean;
  allReady: boolean;
  onCalculate: () => void;
  calculating: boolean;
}) {
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<{ unitPrice: any; quantity: any; producedQuantity: any }>({
    defaultValues: {
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
      producedQuantity: defaultProducedQty === 0 ? '' : (defaultProducedQty ?? ''),
    },
  });

  useEffect(() => {
    reset({
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
      producedQuantity: defaultProducedQty === 0 ? '' : (defaultProducedQty ?? ''),
    });
  }, [defaultPrice, defaultQty, defaultProducedQty, reset]);

  const [pending, setPending] = useState<{ p: number; q: number; prod: number | null } | null>(null);

  // T-05 — la estructura sale de la ruta y no de una prop: esta pestaña se monta
  // siempre bajo /cost-structures/$id y así el vínculo con la ficha no obliga a
  // tocar la pantalla que la contiene.
  const { id: structureId } = useParams({ strict: false }) as { id?: string };
  const dpByKey = useDataPointIdByFieldKey(structureId);

  const onSubmit = (v: any) => {
    const fallbackNum = (val: any) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
      return Number(val);
    };
    const producedRaw = v.producedQuantity;
    const produced =
      producedRaw === '' || producedRaw === null || producedRaw === undefined || isNaN(Number(producedRaw))
        ? null
        : Number(producedRaw);

    setPending({ p: fallbackNum(v.unitPrice), q: fallbackNum(v.quantity), prod: produced });
  };

  return (
    <Card>
      <CardHeader
        title="Datos de venta"
        description="Precio, unidades vendidas (para el margen) y unidades producidas (para el costo unitario)"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
          <div>
            <Input label="Precio de venta unitario $" type="number" step="0.01" numeric
              placeholder="Ej: 25000" info="Precio al que vendés una unidad del producto. En pesos."
              {...register('unitPrice', { required: true })} />
            <ValorRegistrado dataPointId={dpByKey.get('venta.precio_unitario')} title="Precio unitario registrado">
              $ {num(defaultPrice)} registrado
            </ValorRegistrado>
          </div>
          <div>
            <Input label="Unidades vendidas" type="number" step="1" numeric
              placeholder="Ej: 800"
              info="Lo que VENDISTE en el período. Con esto se calcula la facturación y el margen bruto."
              {...register('quantity', { required: true })} />
            <ValorRegistrado dataPointId={dpByKey.get('venta.cantidad_vendida')} title="Unidades vendidas registradas">
              {num(defaultQty)} registradas
            </ValorRegistrado>
          </div>
          <div>
            <Input label="Unidades producidas (opcional)" type="number" step="1" numeric
              placeholder="Ej: 1000"
              info="Lo que FABRICASTE en el período. Con esto se saca el costo por unidad. Si producís y vendés lo mismo, dejalo vacío."
              {...register('producedQuantity')} />
            {/* Es OPCIONAL: si no se cargó, el backend no crea el dato y acá no
                se marca nada. Un campo vacío no tiene origen que mostrar. */}
            <ValorRegistrado dataPointId={dpByKey.get('venta.cantidad_producida')} title="Unidades producidas registradas">
              {num(defaultProducedQty)} registradas
            </ValorRegistrado>
          </div>
          <p className="rounded-xl border border-line bg-surface-alt px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
            No son lo mismo: si fabricaste 1.000 y vendiste 800, el costo del mes se reparte entre las
            <strong className="text-ink"> 1.000 producidas</strong>, no entre las 800 vendidas. Dividir por lo
            vendido infla el costo unitario.
          </p>
          {isDirty && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="submit" variant="secondary" loading={saving}>Guardar precio</Button>
            {allReady && (
              <Button type="button" onClick={onCalculate} loading={calculating}>
                <Calculator className="size-4" /> Calcular ahora
              </Button>
            )}
          </div>
        </form>
      </CardBody>

      <ConfirmDialog
        open={!!pending}
        title="Actualizar Venta"
        message="¿Querés actualizar los datos de Venta?"
        confirmLabel="Guardar"
        loading={saving}
        onConfirm={async () => {
          if (!pending) return;
          await onSave(pending.p, pending.q, pending.prod);
          reset({ unitPrice: pending.p, quantity: pending.q, producedQuantity: pending.prod ?? '' });
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
