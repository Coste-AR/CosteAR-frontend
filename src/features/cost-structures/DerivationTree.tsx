import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, ChevronDown, Calculator, FileText, ExternalLink, ShieldAlert, Paperclip, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import { FinDeCadena, clasificarFinDeCadena } from '@/components/ui/FinDeCadena';
import {
  useCalculationTree,
  useDataPointTrace,
  usePedirRevision,
  useAdjuntarComprobante,
  MAX_ARCHIVO_BYTES,
  MSG_ARCHIVO_GRANDE,
} from './trazabilidad-hooks';
import { EVIDENCE_KIND_LABEL } from './trazabilidad-types';
import type { TreeNode, DataStatus, EvidenceKind, TraceEvidence, AiProvenance, ConfianzaIA } from './trazabilidad-types';

const traceDateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Tucuman',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  timeZoneName: 'short',
});

function fmtExactAt(iso: string): string {
  try { return traceDateFormatter.format(new Date(iso)); } catch { return iso; }
}

function fmtNodeValue(node: TreeNode): string {
  if (node.value === null || node.value === undefined) return '—';
  if (node.unit === '$') return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(node.value);
  if (node.unit === '%') return `${node.value.toFixed(2)}%`;
  return `${node.value.toLocaleString('es-AR', { maximumFractionDigits: 4 })}${node.unit ? ` ${node.unit}` : ''}`;
}

const STATUS_LABEL: Record<DataStatus, string> = {
  borrador: 'Borrador', validado: 'Validado', aplicado: 'Aplicado', anulado: 'Anulado',
};

function DataStatusPill({ status }: { status: DataStatus }) {
  const cls: Record<DataStatus, string> = {
    borrador: 'bg-idle/10 text-idle border-idle/20',
    validado: 'bg-ok/10 text-ok border-ok/20',
    aplicado: 'bg-granate text-white border-granate',
    anulado: 'bg-danger/10 text-danger border-danger/20',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', cls[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Árbol de derivación (D.1) ────────────────────────────────────────────────

export function DerivationTree({ runId, isMissingRun, missingRunMessage, structureId, period }: {
  runId: string | null;
  isMissingRun?: boolean;
  missingRunMessage?: string | null;
  structureId?: string;
  period?: string;
}) {
  const { data, isLoading } = useCalculationTree(runId);
  const [openDataPointId, setOpenDataPointId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title="Árbol de derivación"
        description={
          data
            ? `Corrida #${data.runN} · motor ${data.engineVersion} — click en un valor subrayado para ver su origen`
            : 'Trazabilidad total: de dónde sale cada número'
        }
        action={
          data && runId ? (
            <Link
              to="/trazabilidad/calculo/$runId"
              params={{ runId }}
              search={{ structureId, period }}
              target="_blank"
            >
              <Button type="button" size="sm" variant="secondary">
                <ExternalLink className="size-3.5" /> Abrir en pestaña nueva
              </Button>
            </Link>
          ) : undefined
        }
      />
      <CardBody className="p-0">
        {isMissingRun && missingRunMessage && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl bg-warn/10 px-4 py-2.5 text-[12.5px] text-ink">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>{missingRunMessage}</span>
          </div>
        )}
        {!runId && !isMissingRun && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Calculator className="size-8 text-idle" />
            <p className="text-sm text-ink-soft">Presioná <strong>Calcular</strong> para generar el árbol de derivación.</p>
          </div>
        )}
        {runId && isLoading && <p className="px-6 py-8 text-sm text-ink-soft">Cargando árbol…</p>}
        {data && data.tree.length > 0 && (
          <div className="divide-y divide-line">
            {data.tree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                period={period}
                openDataPointId={openDataPointId}
                setOpenDataPointId={setOpenDataPointId}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TreeRow({
  node, depth, period, openDataPointId, setOpenDataPointId,
}: {
  node: TreeNode;
  depth: number;
  period?: string;
  openDataPointId: string | null;
  setOpenDataPointId: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const dataPointId = node.sourceDpVersionIds[0];
  const clickable = !!dataPointId;
  const isOpen = clickable && openDataPointId === dataPointId;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-alt/40"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 text-ink-soft hover:text-granate"
            aria-label={expanded ? 'Contraer' : 'Expandir'}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="inline-block size-4 shrink-0" />
        )}

        <button
          type="button"
          disabled={!clickable}
          onClick={() => clickable && setOpenDataPointId(isOpen ? null : dataPointId!)}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-[13px]',
            clickable ? 'cursor-pointer text-ink underline decoration-dotted decoration-ink-soft/50 underline-offset-4 hover:text-granate' : 'text-ink',
          )}
          title={clickable ? 'Ver ficha del dato' : undefined}
        >
          {node.label}
        </button>

        {node.formula && (
          <span className="hidden shrink-0 truncate font-mono text-[11px] text-ink-soft/70 sm:block sm:max-w-[260px]">
            {node.formula}
          </span>
        )}

        <span className="w-32 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">
          {fmtNodeValue(node)}
        </span>
      </div>

      {/* T-03 — la hoja dice dónde termina la cadena. Antes, un nodo sin origen
          se renderizaba como un <button disabled> y nada más: en la corrida de
          Órdenes eso fueron 20 de 21 filas visibles, mudas. Sólo las hojas: un
          nodo que se descompone no termina acá. */}
      {!hasChildren && (
        <div style={{ paddingLeft: `${36 + depth * 20}px` }} className="pb-1.5 pr-4">
          <FinDeCadena
            estado={clasificarFinDeCadena({ dataPointId, formula: node.formula })}
            className="mt-0"
          />
        </div>
      )}

      {isOpen && (
        <div style={{ paddingLeft: `${16 + depth * 20}px` }} className="pb-2 pr-4">
          <TraceCard dataPointId={dataPointId!} period={period} onClose={() => setOpenDataPointId(null)} />
        </div>
      )}

      {hasChildren && expanded && node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          period={period}
          openDataPointId={openDataPointId}
          setOpenDataPointId={setOpenDataPointId}
        />
      ))}
    </div>
  );
}

// ── Ficha del dato (D.2) ─────────────────────────────────────────────────────

/**
 * Ficha de trazabilidad de un dato. Se exporta para que el modo trazabilidad
 * global (U10) muestre EXACTAMENTE esta ficha desde cualquier pantalla, en vez
 * de mantener dos versiones que se desincronizan.
 */
export function TraceCard({ dataPointId, period, onClose }: { dataPointId: string; period?: string; onClose: () => void }) {
  const { data: trace, isLoading, error } = useDataPointTrace(dataPointId);
  const pedirRevision = usePedirRevision();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [revisionSent, setRevisionSent] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [adjuntarOpen, setAdjuntarOpen] = useState(false);

  return (
    <div
      className="animate-rise rounded-xl border border-line border-l-4 border-l-granate bg-surface-alt/40 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading && <p className="text-[13px] text-ink-soft">Cargando ficha del dato…</p>}
      {error && <p className="text-[13px] text-danger">{apiErrorMessage(error)}</p>}

      {trace && (
        <div className="space-y-3">
          {/* Header: estado + firma */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <DataStatusPill status={trace.status} />
              <span className="text-[13px] font-semibold text-ink">{trace.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {trace.signedBy ? (
                <span className="text-[11px] text-ink-soft">
                  Firmado por <strong className="text-ink">{trace.signedBy.name}</strong> ({trace.signedBy.role}) · {fmtExactAt(trace.signedBy.at)}
                </span>
              ) : (
                <span className="text-[11px] text-ink-soft">Sin firmar</span>
              )}
              <Link
                to="/trazabilidad/dato/$id"
                params={{ id: dataPointId }}
                search={{ period }}
                target="_blank"
                title="Abrir ficha completa en pestaña nueva"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-granate hover:text-action"
              >
                <ExternalLink className="size-3.5" /> Pestaña nueva
              </Link>
              <button type="button" onClick={onClose} className="text-ink-soft hover:text-danger">✕</button>
            </div>
          </div>

          {/* Procedencia IA (T-06). Va pegado al header porque contesta la misma
              pregunta que el estado y la firma: quién responde por este número.
              Si el dato lo cargó una persona, el backend no manda `aiProvenance`
              y acá no se dibuja nada — no existe el sello en negativo. */}
          {trace.aiProvenance && <SelloIA prov={trace.aiProvenance} />}

          <p className="font-mono text-[13px] text-ink">{trace.display}</p>

          {/* Autores por campo */}
          {trace.fields.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {trace.fields.map((f) => (
                <div key={f.key} className="rounded-lg border border-line bg-surface p-2.5 text-[11.5px]">
                  <p className="mb-1 font-semibold uppercase tracking-wide text-ink-soft">{f.key}</p>
                  <p className="text-ink">
                    {f.value != null ? (f.unit === '$' ? <Money value={f.value} /> : `${f.value} ${f.unit ?? ''}`) : '—'}
                  </p>
                  <p className="mt-1 text-ink-soft">
                    {f.by.name} · {f.by.role} · {f.by.area}
                  </p>
                  <p className="text-ink-soft">{fmtExactAt(f.at)}</p>
                  <p className="text-ink-soft">{f.method}{f.device ? ` · ${f.device}` : ''}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comprobante — dónde termina la cadena.
              T-03 fijó el texto de "sin comprobante" acá a mano; T-04 lo pasa
              al componente compartido, que es el que decide entre los dos
              finales legítimos. El estado `con-comprobante` de FinDeCadena
              existía desde T-03 pero era INALCANZABLE: nada en el sistema
              podía adjuntar un comprobante. Esta ficha es el primer lugar
              donde se llega a él. */}
          <div className="space-y-1">
            <FinDeCadena
              estado={clasificarFinDeCadena({ dataPointId, tieneComprobante: !!trace.evidence })}
              className="mt-0"
            />
            {trace.evidence && <ComprobanteDetalle evidence={trace.evidence} />}
          </div>

          {/* Períodos */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-soft">
            <span>Hecho: <strong className="text-ink">{trace.periods.hecho ?? '—'}</strong></span>
            <span>Captación: <strong className="text-ink">{fmtExactAt(trace.periods.captacion)}</strong></span>
            <span>Imputado: <strong className="text-ink">{trace.periods.imputado ?? 'pendiente'}</strong></span>
          </div>

          {/* Historial de versiones */}
          {trace.versions.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Historial de versiones</p>
              <ul className="space-y-1">
                {trace.versions.map((v) => (
                  <li key={v.n} className={cn('text-[11.5px]', v.current ? 'text-ink' : 'text-ink-soft')}>
                    <span className={cn('font-mono', !v.current && 'line-through')}>v{v.n} — {v.display}</span>
                    {v.reason && <span className="ml-1.5">· {v.reason}</span>}
                    <span className="ml-1.5">· {v.by} · {fmtExactAt(v.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impacta en */}
          {trace.impacts.length > 0 && (
            <p className="text-[11.5px] text-ink-soft">
              Impacta en: {trace.impacts.map((imp, i) => (
                <span key={imp}>
                  <strong className="text-ink">{imp}</strong>{i < trace.impacts.length - 1 ? ' → ' : ''}
                </span>
              ))}
            </p>
          )}

          {/* Adjuntar comprobante — sólo si al dato le falta.
              Va junto a "Pedir revisión" porque son las dos cosas que un
              costista quiere hacer parado frente a un dato flojo: pedir que
              alguien lo mire, o respaldarlo él mismo. */}
          {!trace.evidence && (
            <div className="border-t border-line pt-2">
              {adjuntarOpen ? (
                <AdjuntarComprobanteForm
                  dataPointId={dataPointId}
                  onCancel={() => setAdjuntarOpen(false)}
                  onDone={() => setAdjuntarOpen(false)}
                />
              ) : (
                <Button type="button" size="sm" variant="secondary" onClick={() => setAdjuntarOpen(true)}>
                  <Paperclip className="size-3.5" /> Adjuntar comprobante
                </Button>
              )}
            </div>
          )}

          {/* Pedir revisión */}
          <div className="border-t border-line pt-2">
            {revisionSent ? (
              <p className="text-[11.5px] font-medium text-ok">Revisión pedida — quedó registrada en Validaciones.</p>
            ) : revisionOpen ? (
              <div className="space-y-2">
                <textarea
                  className="w-full rounded border border-line bg-surface p-2 text-[12px] text-ink outline-none focus:border-granate"
                  rows={2}
                  placeholder="¿Qué hay que revisar de este dato?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                {revisionError && <p className="text-[11px] text-danger">{revisionError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button" size="sm"
                    loading={pedirRevision.isPending}
                    onClick={async () => {
                      if (!comment.trim()) { setRevisionError('Contá qué hay que revisar.'); return; }
                      setRevisionError(null);
                      try {
                        await pedirRevision.mutateAsync({ dataPointId, sourceArea: 'costista', comment });
                        setRevisionSent(true);
                      } catch (e) { setRevisionError(apiErrorMessage(e)); }
                    }}
                  >
                    Enviar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setRevisionOpen(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={() => setRevisionOpen(true)}>
                Pedir revisión
              </Button>
            )}
          </div>

          <p className="font-mono text-[10px] text-ink-soft/60">id: {trace.id}</p>
        </div>
      )}
    </div>
  );
}

// ── Procedencia IA (T-06) ────────────────────────────────────────────────────

/**
 * Cómo se pinta cada nivel de confianza. Nunca hay un número: "78%" se lee como
 * una probabilidad de acierto y no lo es. Tres palabras, tres colores.
 */
const CONFIANZA_ESTILO: Record<ConfianzaIA, string> = {
  alta: 'text-ok',
  media: 'text-ink-soft',
  baja: 'text-warn',
};

/**
 * EL SELLO: "este número lo sugirió la IA, y esta persona se hizo cargo".
 *
 * Los dos estados que importan están en la primera línea, sin abrir nada:
 * si alguien lo confirmó (y quién), y cuánta confianza tenía el sistema. El
 * resto —qué capa decidió, con qué señal, qué tan legible era el papel— vive
 * detrás de "ver detalle técnico", plegado: es material de auditoría del
 * clasificador, y arriba solo convertiría la ficha en un log.
 */
function SelloIA({ prov }: { prov: AiProvenance }) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  const doc = [prov.documento.tipo, prov.documento.seccion, prov.documento.archivo]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-[11.5px]">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <Sparkles className="size-3.5 shrink-0" /> Sugerido por IA
        </span>

        <span className="text-ink-soft">·</span>

        {prov.confirmado ? (
          <span className="text-ok">
            {prov.corregidoPorPersona ? 'corregido y confirmado' : 'confirmado'} por{' '}
            <strong>{prov.confirmadoPor ?? 'el costista'}</strong>
            {prov.confirmadoEl && <span className="text-ink-soft"> · {fmtExactAt(prov.confirmadoEl)}</span>}
          </span>
        ) : (
          // "Sin confirmar" no es un error: es un dato que todavía no miró
          // nadie, y esa es exactamente la información que hace falta.
          <span className="text-warn">sin confirmar</span>
        )}

        <span className="text-ink-soft">·</span>
        <span className={CONFIANZA_ESTILO[prov.confianza]}>confianza {prov.confianza}</span>

        {prov.requiereRevision && (
          <span className="inline-flex items-center gap-1 text-warn">
            <ShieldAlert className="size-3.5 shrink-0" /> el sistema pidió que alguien lo revise
          </span>
        )}
      </div>

      {doc && <p className="mt-1 text-ink-soft">Salió de: {doc}</p>}

      <button
        type="button"
        onClick={() => setDetalleOpen((v) => !v)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-granate hover:text-action"
      >
        {detalleOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Ver detalle técnico
      </button>

      {detalleOpen && (
        <dl className="mt-1.5 space-y-1 border-t border-line pt-1.5 text-ink-soft">
          <DetalleFila termino="Decidió" valor={prov.detalleTecnico.capa} />
          <DetalleFila termino="Señal determinante" valor={prov.detalleTecnico.senalDeterminante} />
          <DetalleFila
            termino="Señales corroborantes"
            valor={
              prov.detalleTecnico.senalesCorroborantes.length > 0
                ? prov.detalleTecnico.senalesCorroborantes.join(', ')
                : null
            }
          />
          <DetalleFila termino="Lectura del documento" valor={prov.detalleTecnico.calidadDeLectura} />
          <DetalleFila
            termino="Modelo de lenguaje"
            valor={prov.detalleTecnico.usoModeloDeLenguaje ? 'sí, se usó' : 'no hizo falta: alcanzó con las reglas'}
          />
          <DetalleFila termino="Explicación" valor={prov.detalleTecnico.explicacion} />
        </dl>
      )}
    </div>
  );
}

/** Fila del detalle técnico. Lo que no está registrado se dice, no se omite. */
function DetalleFila({ termino, valor }: { termino: string; valor: string | null }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt className="font-medium">{termino}:</dt>
      <dd className={valor ? 'text-ink' : 'text-ink-soft/70'}>{valor ?? 'no quedó registrada'}</dd>
    </div>
  );
}

// ── Comprobante (T-04) ───────────────────────────────────────────────────────

/**
 * El comprobante que respalda el dato: tipo, referencia y contraparte.
 *
 * La contraparte no es decorado: "Factura A 0001-00012345" sin decir de quién
 * no le sirve a nadie que esté auditando.
 */
function ComprobanteDetalle({ evidence }: { evidence: TraceEvidence }) {
  const tipo = EVIDENCE_KIND_LABEL[evidence.kind as EvidenceKind] ?? evidence.kind;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-5 text-[11.5px] text-ink-soft">
      <span className="inline-flex items-center gap-1">
        <FileText className="size-3.5 shrink-0" />
        <span className="text-ink">
          {tipo} {evidence.reference}
        </span>
        {evidence.counterparty && <span>· {evidence.counterparty}</span>}
      </span>

      {evidence.fileUrl ? (
        <a href={evidence.fileUrl} target="_blank" rel="noreferrer">
          <Button type="button" size="sm" variant="ghost">
            <ExternalLink className="size-3.5" /> Ver comprobante
          </Button>
        </a>
      ) : (
        // Se dice que no hay archivo en vez de mostrar un botón que no lleva a
        // ningún lado. El comprobante por referencia es válido: el manual lo
        // admite explícitamente.
        <span className="text-ink-soft/70">Registrado por su referencia — sin archivo adjunto.</span>
      )}
    </div>
  );
}

const OPCIONES_TIPO = (Object.keys(EVIDENCE_KIND_LABEL) as EvidenceKind[]).map((k) => ({
  value: k,
  label: EVIDENCE_KIND_LABEL[k],
}));

/**
 * Alta y vinculación de un comprobante, desde la ficha del dato.
 *
 * Mínimo a propósito: tipo, referencia, contraparte y —si lo tiene a mano— el
 * archivo. Pedir el archivo como obligatorio dejaría sin registrar el caso más
 * común de todos: el costista SABE de qué factura salió el número, pero el PDF
 * lo tiene el contador.
 */
function AdjuntarComprobanteForm({
  dataPointId,
  onCancel,
  onDone,
}: {
  dataPointId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const adjuntar = useAdjuntarComprobante();
  const [kind, setKind] = useState<EvidenceKind>('factura');
  const [reference, setReference] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Si el archivo no se pudo guardar, el comprobante YA quedó vinculado: la
  // ficha de atrás se refrescó sola. Lo único que falta es que el costista se
  // entere de que "Ver comprobante" no va a estar.
  if (aviso) {
    return (
      <div className="space-y-2">
        <p className="text-[11.5px] text-warn">{aviso}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Entendido
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        Adjuntar comprobante
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          label="Tipo"
          options={OPCIONES_TIPO}
          value={kind}
          onChange={(e) => setKind(e.target.value as EvidenceKind)}
        />
        <Input
          label="Referencia"
          placeholder="Ej: A 0001-00012345"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input
          label="Contraparte"
          placeholder="Ej: Energía del Norte SA"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="comprobante-archivo"
            className="text-[12px] font-medium uppercase tracking-wide text-ink-soft"
          >
            Archivo (opcional)
          </label>
          <input
            id="comprobante-archivo"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[12px] text-ink-soft file:mr-2 file:rounded-lg file:border file:border-line file:bg-surface file:px-2.5 file:py-1.5 file:text-[12px] file:text-ink hover:file:border-line-strong"
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={adjuntar.isPending}
          onClick={async () => {
            if (!reference.trim()) {
              setError('Poné la referencia del comprobante (número de factura, de contrato, de acta…).');
              return;
            }
            if (file && file.size > MAX_ARCHIVO_BYTES) {
              setError(MSG_ARCHIVO_GRANDE);
              return;
            }
            setError(null);
            try {
              const comprobante = await adjuntar.mutateAsync({
                dataPointId,
                kind,
                reference: reference.trim(),
                counterparty: counterparty.trim() || undefined,
                file,
              });
              if (comprobante.aviso) setAviso(comprobante.aviso);
              else onDone();
            } catch (e) {
              setError(apiErrorMessage(e));
            }
          }}
        >
          Adjuntar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
