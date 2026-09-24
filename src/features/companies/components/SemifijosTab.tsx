import { useMemo, useState } from 'react';
import { CircleHelp, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import {
  EXIGENCIAS_POR_METODO,
  METODOS_SEMIFIJOS,
  type MetodoSemifijo,
  type SeparacionSemifija,
  type SepararSemifijoInput,
  useConceptosSemifijos,
  useGuardarSeparacion,
  usePrevisualizarSeparacion,
  useSeparacionGuardada,
} from '../tramo-semifijo-hooks';

/**
 * Los nombres técnicos de los métodos no se muestran solos: al lado va qué
 * hace cada uno en palabras. Quien mira esta pantalla es el dueño de la
 * empresa, no un contador (Constitución §1).
 */
const METODOS: Record<MetodoSemifijo, { label: string; ayuda: string }> = {
  PUNTOS_EXTREMOS: {
    label: 'Por los dos extremos',
    ayuda: 'Mira el período de menor volumen y el de mayor volumen, y deduce el resto.',
  },
  CORRELACION: {
    label: 'Por correlación',
    ayuda: 'Usa todos los períodos que cargues y busca la línea que mejor los acompaña.',
  },
  DISPERSION_GRAFICA: {
    label: 'Por gráfico de dispersión',
    ayuda: 'El gráfico lo leés vos: cargás los períodos y decís a cuánto da cada parte.',
  },
  DECLARADO: {
    label: 'Lo declaro yo',
    ayuda: 'Ya sabés cuánto es cada parte y sólo querés dejarlo registrado.',
  },
};

const coeficienteFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

interface ObservacionDraft {
  volumen: string;
  importe: string;
}

function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const convertido = Number(limpio);
  return Number.isFinite(convertido) ? convertido : null;
}

const OBSERVACION_VACIA: ObservacionDraft = { volumen: '', importe: '' };

/**
 * Fila de resultado. Cuando el método no produce el número, se dice con
 * palabras: ni cero ni guión (Constitución §2).
 */
function Dato({
  etiqueta,
  valor,
  ausente,
  destacado,
}: {
  etiqueta: string;
  valor: string | null;
  ausente: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-zinc-600">{etiqueta}</dt>
      {valor === null ? (
        <dd className="text-right text-xs italic text-zinc-500">{ausente}</dd>
      ) : (
        <dd
          className={
            destacado
              ? 'tabular text-right text-base font-semibold text-zinc-900'
              : 'tabular text-right text-sm text-zinc-900'
          }
        >
          {valor}
        </dd>
      )}
    </div>
  );
}

function Separacion({ separacion, titulo }: { separacion: SeparacionSemifija; titulo: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</p>
      <dl className="mt-1 divide-y divide-zinc-200">
        <Dato
          etiqueta="Parte que no cambia con el volumen"
          valor={formatMoney(separacion.porcionFija)}
          ausente=""
          destacado
        />
        <Dato
          etiqueta="Parte que sí cambia con el volumen"
          valor={formatMoney(separacion.porcionVariable)}
          ausente=""
          destacado
        />
        <Dato
          etiqueta="Costo variable por unidad"
          valor={
            separacion.costoVariableUnitario === null
              ? null
              : formatMoney(separacion.costoVariableUnitario)
          }
          ausente="Este método no lo calcula."
        />
        <Dato
          etiqueta="Qué tan bien los datos siguen una línea"
          valor={
            separacion.coeficienteCorrelacion === null
              ? null
              : coeficienteFormatter.format(separacion.coeficienteCorrelacion)
          }
          ausente="Este método no lo calcula."
        />
      </dl>
    </div>
  );
}

export function SemifijosTab({ companyId }: { companyId: string }) {
  const conceptos = useConceptosSemifijos(companyId);
  const [conceptoId, setConceptoId] = useState<string | null>(null);
  const [importe, setImporte] = useState('');
  const [metodo, setMetodo] = useState<MetodoSemifijo>('PUNTOS_EXTREMOS');
  const [observaciones, setObservaciones] = useState<ObservacionDraft[]>([
    { ...OBSERVACION_VACIA },
    { ...OBSERVACION_VACIA },
  ]);
  const [porcionFija, setPorcionFija] = useState('');
  const [porcionVariable, setPorcionVariable] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState<SeparacionSemifija | null>(null);
  const [previaDe, setPreviaDe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);

  const guardada = useSeparacionGuardada(companyId, conceptoId);
  const previsualizar = usePrevisualizarSeparacion(companyId, conceptoId);
  const guardar = useGuardarSeparacion(companyId, conceptoId);

  const exigencias = EXIGENCIAS_POR_METODO[metodo];

  const payload = useMemo<SepararSemifijoInput | null>(() => {
    const importeNumero = aNumero(importe);
    if (importeNumero === null) return null;

    const base: SepararSemifijoInput = { importe: importeNumero, metodo };

    if (exigencias.observaciones) {
      const cargadas = observaciones.flatMap((fila) => {
        const volumen = aNumero(fila.volumen);
        const importeFila = aNumero(fila.importe);
        return volumen === null || importeFila === null ? [] : [{ volumen, importe: importeFila }];
      });
      if (cargadas.length < 2) return null;
      base.observacionesBase = cargadas;
    }

    if (exigencias.porciones) {
      const fija = aNumero(porcionFija);
      const variable = aNumero(porcionVariable);
      if (fija === null || variable === null) return null;
      base.porcionFija = fija;
      base.porcionVariable = variable;
    }

    return base;
  }, [importe, metodo, exigencias, observaciones, porcionFija, porcionVariable]);

  /**
   * Lo que se guarda tiene que ser exactamente lo que la persona vio. Si toca
   * cualquier campo después de la vista previa, la huella cambia y el botón de
   * guardar se apaga solo: no hay forma de previsualizar una cosa y persistir
   * otra.
   */
  const huella = payload ? JSON.stringify({ conceptoId, ...payload }) : null;
  const previaVigente = vistaPrevia !== null && huella !== null && huella === previaDe;

  const limpiarPrevia = () => {
    setVistaPrevia(null);
    setPreviaDe(null);
    setError(null);
    setGuardado(null);
  };

  const verSeparacion = async () => {
    if (!payload || !huella) return;
    setError(null);
    setGuardado(null);
    try {
      const resultado = await previsualizar.mutateAsync(payload);
      setVistaPrevia(resultado);
      setPreviaDe(huella);
    } catch (problema) {
      // Si la cuenta no cierra, no queda una vista previa vieja en pantalla que
      // habilite el guardado.
      setVistaPrevia(null);
      setPreviaDe(null);
      setError(apiErrorMessage(problema));
    }
  };

  const guardarSeparacion = async () => {
    if (!payload || !previaVigente) return;
    setError(null);
    try {
      await guardar.mutateAsync(payload);
      setGuardado('Separación guardada.');
      await guardada.refetch();
    } catch (problema) {
      setError(apiErrorMessage(problema));
    }
  };

  const conceptoElegido = conceptos.data?.find((concepto) => concepto.id === conceptoId) ?? null;

  return (
    <div className="space-y-5" data-testid="desagregacion-semifijos">
      <Card>
        <CardHeader
          title="Separar un costo semifijo"
          description="Un costo semifijo tiene una parte que no se mueve aunque produzcas más o menos, y otra que sí. Acá se separan las dos."
        />
        <CardBody className="space-y-3 pt-0">
          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <CircleHelp className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
            <div>
              <p className="font-semibold">Un ejemplo: la luz de la planta.</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-900">
                Pagás un abono todos los meses aunque la planta esté parada, y encima de eso pagás
                lo que consumen las máquinas. El abono es la parte que no cambia; el consumo es la
                que sí.
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Primero mirás la separación, después decidís si la guardás. Nada se guarda por el solo
            hecho de completar los campos.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-5">
          {conceptos.isLoading && (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando conceptos…
            </p>
          )}

          {!conceptos.isLoading && conceptos.isError && (
            <p className="py-8 text-center text-sm text-red-600" role="alert">
              No pudimos cargar los conceptos. {apiErrorMessage(conceptos.error)}
            </p>
          )}

          {!conceptos.isLoading && !conceptos.isError && conceptos.data?.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-600">
              Este negocio todavía no tiene ningún concepto clasificado como semifijo. Clasificá uno
              en la pestaña <strong>Fijo / variable</strong> y volvé.
            </p>
          )}

          {!conceptos.isLoading && !conceptos.isError && !!conceptos.data?.length && (
            <>
              <label className="block text-xs font-medium text-zinc-700">
                Concepto semifijo
                <select
                  value={conceptoId ?? ''}
                  onChange={(event) => {
                    setConceptoId(event.target.value || null);
                    limpiarPrevia();
                  }}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                >
                  <option value="">Elegí un concepto</option>
                  {conceptos.data.map((concepto) => (
                    <option key={concepto.id} value={concepto.id}>
                      {concepto.clave}
                      {concepto.descripcion ? ` — ${concepto.descripcion}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {conceptoElegido && !conceptoElegido.confirmado && (
                <p className="text-xs text-amber-700">
                  Este concepto todavía no está confirmado con el cliente. Podés separarlo igual,
                  pero la clasificación puede cambiar.
                </p>
              )}

              {conceptoId && (
                <>
                  {guardada.isLoading && (
                    <p className="text-xs text-zinc-500">Buscando si ya tiene una separación…</p>
                  )}
                  {!guardada.isLoading && guardada.data === null && (
                    <p className="text-xs text-zinc-600">
                      Este concepto todavía no tiene una separación guardada.
                    </p>
                  )}
                  {!guardada.isLoading && guardada.data && (
                    <Separacion separacion={guardada.data} titulo="Separación guardada hoy" />
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-zinc-700">
                      Importe a separar
                      <input
                        type="number"
                        inputMode="decimal"
                        value={importe}
                        onChange={(event) => {
                          setImporte(event.target.value);
                          setGuardado(null);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                      />
                    </label>

                    <label className="block text-xs font-medium text-zinc-700">
                      Cómo separarlo
                      <select
                        value={metodo}
                        onChange={(event) => {
                          setMetodo(event.target.value as MetodoSemifijo);
                          limpiarPrevia();
                        }}
                        className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                      >
                        {METODOS_SEMIFIJOS.map((opcion) => (
                          <option key={opcion} value={opcion}>
                            {METODOS[opcion].label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-500">{METODOS[metodo].ayuda}</p>

                  {exigencias.observaciones && (
                    <fieldset className="space-y-2">
                      <legend className="text-xs font-medium text-zinc-700">
                        Períodos observados (hacen falta al menos dos, con volúmenes distintos)
                      </legend>
                      {observaciones.map((fila, indice) => (
                        <div key={indice} className="flex items-end gap-2">
                          <label className="block flex-1 text-[11px] text-zinc-600">
                            {`Volumen ${indice + 1}`}
                            <input
                              type="number"
                              inputMode="decimal"
                              value={fila.volumen}
                              onChange={(event) => {
                                const valor = event.target.value;
                                setObservaciones((filas) =>
                                  filas.map((item, posicion) =>
                                    posicion === indice ? { ...item, volumen: valor } : item,
                                  ),
                                );
                                setGuardado(null);
                              }}
                              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                            />
                          </label>
                          <label className="block flex-1 text-[11px] text-zinc-600">
                            {`Importe ${indice + 1}`}
                            <input
                              type="number"
                              inputMode="decimal"
                              value={fila.importe}
                              onChange={(event) => {
                                const valor = event.target.value;
                                setObservaciones((filas) =>
                                  filas.map((item, posicion) =>
                                    posicion === indice ? { ...item, importe: valor } : item,
                                  ),
                                );
                                setGuardado(null);
                              }}
                              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`Quitar el período ${indice + 1}`}
                            disabled={observaciones.length <= 2}
                            onClick={() => {
                              setObservaciones((filas) =>
                                filas.filter((_, posicion) => posicion !== indice),
                              );
                              setGuardado(null);
                            }}
                            className="mb-1 rounded-lg border border-zinc-300 p-2 text-zinc-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setObservaciones((filas) => [...filas, { ...OBSERVACION_VACIA }]);
                          setGuardado(null);
                        }}
                      >
                        <Plus className="size-4" aria-hidden /> Agregar período
                      </Button>
                    </fieldset>
                  )}

                  {exigencias.porciones && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-zinc-700">
                        Parte fija declarada
                        <input
                          type="number"
                          inputMode="decimal"
                          value={porcionFija}
                          onChange={(event) => {
                            setPorcionFija(event.target.value);
                            setGuardado(null);
                          }}
                          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                        />
                      </label>
                      <label className="block text-xs font-medium text-zinc-700">
                        Parte variable declarada
                        <input
                          type="number"
                          inputMode="decimal"
                          value={porcionVariable}
                          onChange={(event) => {
                            setPorcionVariable(event.target.value);
                            setGuardado(null);
                          }}
                          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-action focus:ring-2 focus:ring-action/15"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void verSeparacion()}
                      loading={previsualizar.isPending}
                      disabled={!payload}
                    >
                      Ver la separación
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void guardarSeparacion()}
                      loading={guardar.isPending}
                      disabled={!previaVigente}
                    >
                      Guardar la separación
                    </Button>
                  </div>

                  {!payload && (
                    <p className="text-xs text-zinc-500">
                      Completá el importe
                      {exigencias.observaciones ? ', al menos dos períodos observados' : ''}
                      {exigencias.porciones ? ' y las dos partes declaradas' : ''} para poder ver la
                      separación.
                    </p>
                  )}

                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}

                  {guardado && (
                    <p className="text-sm text-green-700" role="status">
                      {guardado}
                    </p>
                  )}

                  {vistaPrevia && (
                    <>
                      <Separacion separacion={vistaPrevia} titulo="Así queda la separación" />
                      {!previaVigente && (
                        <p className="text-xs text-amber-700">
                          Cambiaste un dato después de calcular. Volvé a tocar{' '}
                          <strong>Ver la separación</strong> para guardar lo que estás mirando.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
