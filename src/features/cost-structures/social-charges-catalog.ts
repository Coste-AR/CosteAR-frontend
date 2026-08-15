/**
 * Catálogo de cargas sociales inciertas — el "conocimiento del sistema" (D-1).
 *
 * Fuente: cátedra de Costos (UNT), clase 8 — "Mano de obra: remuneración,
 * cargas sociales e índice de ausentismo".
 *
 * Regla de la cátedra: de las cargas INCIERTAS, solo las REMUNERATIVAS generan
 * cargas derivadas. Los conceptos que las generan son el IAP/YAP (ausentismo
 * pago — el sistema lo calcula solo, no se carga acá), el Premio por Asistencia
 * Perfecta (PAPA) y el Premio por Productividad (PPT). El resto de las inciertas
 * (uniformes, almuerzos, etc.) son NO remunerativas: se suman al índice pero no
 * generan nada encima.
 *
 * Regla general: para ser remunerativo, el concepto debe ser habitual y regular.
 *
 * Clasificar mal un concepto DESVÍA EL COSTO: una carga no remunerativa puesta
 * como remunerativa infla el índice con derivadas que no corresponden.
 */

export type SocialChargeKind = 'remunerative' | 'nonRemunerative';

export interface SocialChargeCatalogItem {
  /** Nombre canónico con el que se carga en el formulario. */
  name: string;
  kind: SocialChargeKind;
  /** Sinónimos para reconocer lo que tipea el costista (en minúsculas, sin acentos). */
  aliases: string[];
  hint?: string;
}

export const SOCIAL_CHARGES_CATALOG: SocialChargeCatalogItem[] = [
  // ── Inciertas REMUNERATIVAS (generan cargas derivadas) ───────────────────
  {
    name: 'PAP (Premio Asistencia Perfecta)',
    kind: 'remunerative',
    aliases: ['papa', 'premio asistencia', 'asistencia perfecta', 'presentismo'],
    hint: 'Genera cargas derivadas (clase 8).',
  },
  {
    name: 'PPP (Premio por Productividad)',
    kind: 'remunerative',
    aliases: ['premio productividad', 'premio por productividad', 'productividad'],
    hint: 'Genera cargas derivadas (clase 8).',
  },
  {
    name: 'Antigüedad',
    kind: 'remunerative',
    aliases: ['antiguedad'],
    hint: 'Adicional habitual y regular → remunerativo.',
  },
  {
    name: 'Gratificaciones habituales',
    kind: 'remunerative',
    aliases: ['gratificacion', 'gratificaciones'],
    hint: 'Habitual y regular → remunerativo. Si es excepcional, es NO remunerativo.',
  },
  {
    name: 'Comisiones',
    kind: 'remunerative',
    aliases: ['comision', 'comisiones'],
  },
  {
    name: 'Horas extras',
    kind: 'remunerative',
    aliases: ['horas extra', 'horas extras', 'suplementarias'],
  },
  {
    name: 'Propinas habituales',
    kind: 'remunerative',
    aliases: ['propina', 'propinas'],
    hint: 'Remunerativas si son habituales y regulares (art. 13 LCT).',
  },
  {
    name: 'Salarios en especie',
    kind: 'remunerative',
    aliases: ['en especie', 'remuneracion en especie', 'salario en especie'],
    hint: 'No pueden superar el 20% del total a pagar.',
  },

  // ── Inciertas NO REMUNERATIVAS (no generan derivadas) ────────────────────
  {
    name: 'Uniformes / ropa de trabajo',
    kind: 'nonRemunerative',
    aliases: ['uniforme', 'uniformes', 'ropa de trabajo', 'indumentaria'],
  },
  {
    name: 'Almuerzos / viandas',
    kind: 'nonRemunerative',
    aliases: ['almuerzo', 'almuerzos', 'vianda', 'viandas', 'comedor', 'vales de almuerzo'],
  },
  {
    name: 'Reintegro de guardería',
    kind: 'nonRemunerative',
    aliases: ['guarderia', 'jardin maternal'],
  },
  {
    name: 'Gastos de medicamentos',
    kind: 'nonRemunerative',
    aliases: ['medicamento', 'medicamentos', 'farmacia'],
  },
  {
    name: 'Útiles escolares',
    kind: 'nonRemunerative',
    aliases: ['utiles escolares', 'utiles'],
  },
  {
    name: 'Cursos y seminarios',
    kind: 'nonRemunerative',
    aliases: ['curso', 'cursos', 'seminario', 'seminarios', 'capacitacion'],
  },
  {
    name: 'Gastos de sepelio',
    kind: 'nonRemunerative',
    aliases: ['sepelio', 'sepelios'],
  },
  {
    name: 'Casa habitación',
    kind: 'nonRemunerative',
    aliases: ['casa habitacion', 'vivienda'],
  },
  {
    name: 'Viáticos con comprobante',
    kind: 'nonRemunerative',
    aliases: ['viatico', 'viaticos'],
    hint: 'CON comprobante → no remunerativo. SIN comprobante → remunerativo.',
  },
  {
    name: 'Asignaciones familiares',
    kind: 'nonRemunerative',
    aliases: ['asignacion familiar', 'asignaciones familiares'],
  },
  {
    name: 'Automóvil afectado al trabajo',
    kind: 'nonRemunerative',
    aliases: ['automovil', 'vehiculo afectado'],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Desglose del ITCS — de dónde sale el índice que se aplicó
// ───────────────────────────────────────────────────────────────────────────

/**
 * El costista que calcula a mano suele aplicar "un 45%" y listo. El sistema usa
 * el modelo de la cátedra (ciertas + inciertas + derivadas), que es más fino: por
 * eso el número puede no coincidir con la cuenta hecha a mano. Lo que sigue NO
 * calcula nada nuevo: arma la LECTURA del índice que ya calculó el motor, para
 * que se vea concepto por concepto de dónde sale cada punto porcentual.
 *
 * Los subtotales y el total SIEMPRE se muestran tal como los devolvió el cálculo.
 * Lo único que se abre acá son los renglones internos del bloque de cargas
 * ciertas y el detalle por concepto, que el cálculo no expone renglón por
 * renglón (clase 8 y clase 15 de la cátedra).
 */

/** Fracción del SAC (aguinaldo): un doceavo de la remuneración. */
export const SAC_FRACTION = 1 / 12;

const round4 = (n: number) => Math.round((Number(n) || 0) * 1e4) / 1e4;
/** Fracción (0,27) → porcentaje redondeado igual que el cálculo (27). */
const asPercent = (fraction: number | undefined) => round4((Number(fraction) || 0) * 100);

/** SAC expresado en porcentaje, con el mismo redondeo del cálculo: 8,3333 %. */
export const SAC_PERCENT = asPercent(SAC_FRACTION);

export type ItcsBlockKey = 'certain' | 'uncertainRemunerative' | 'derived' | 'uncertainNonRemunerative';

export interface ItcsLine {
  /** Nombre del concepto, como lo lee un costista. */
  label: string;
  /** Cuánto suma al índice, en porcentaje sobre la remuneración básica. */
  percent: number;
  /** De dónde sale ese porcentaje, en una frase. */
  detail?: string;
  /**
   * Se aplica siempre, aunque el costista deje todos los porcentajes en cero:
   * es una carga cierta que se devenga por ley.
   */
  alwaysApplies?: boolean;
}

export interface ItcsBlock {
  key: ItcsBlockKey;
  title: string;
  description: string;
  /** Subtotal del bloque, tal como lo devolvió el cálculo. */
  percent: number;
  lines: ItcsLine[];
}

export interface ItcsBreakdown {
  blocks: ItcsBlock[];
  /** ITCS efectivamente aplicado (%), tal como lo devolvió el cálculo. */
  totalPercent: number;
  /**
   * Piso del índice: lo que se suma aunque el costista configure todo en cero.
   * Hoy es el SAC (aguinaldo), que es una carga cierta.
   */
  unavoidablePercent: number;
  /** Conceptos que se aplican siempre, para nombrarlos en la explicación. */
  unavoidableLabels: string[];
  /**
   * true cuando el costista dejó todo lo configurable en cero y aun así queda
   * índice: es el caso que parece un error del sistema y no lo es.
   */
  onlyUnavoidableApplies: boolean;
}

/** Un concepto incierto tal como lo cargó el costista (coeficiente en fracción). */
export interface UncertainChargeInput {
  readonly name?: string;
  readonly coefficient?: number;
}

export interface ItcsConfigInput {
  readonly derivationBase?: number;
  readonly fixedArt?: number;
  readonly sacFraction?: number;
  readonly uncertainRemunerative?: readonly UncertainChargeInput[];
  readonly uncertainNonRemunerative?: readonly UncertainChargeInput[];
}

/** Lo que devolvió el cálculo para la hoja de MOD. Manda sobre cualquier lectura. */
export interface ItcsCalculatedInput {
  itcsPercent?: number;
  iapPercent?: number;
  itcsBreakdown?: {
    certain: number;
    uncertainRemunerative: number;
    derived: number;
    uncertainNonRemunerative: number;
  };
}

const IAP_LABEL = 'IAP — inasistencias pagas (ausentismo pago)';
const SAC_LABEL = 'SAC — sueldo anual complementario (aguinaldo)';
const SAC_CERTAIN_LABEL = 'Cargas ciertas sobre el SAC';

/** El motor ignora un "IAP" cargado a mano: ya lo calcula él. Misma regla acá. */
const isManualIap = (name?: string) => (name ?? '').trim().toLowerCase().startsWith('iap');

const labelOf = (name?: string) => (name ?? '').trim() || 'Concepto sin nombre';

/**
 * Arma el desglose del ITCS para mostrarlo en la hoja de Mano de Obra.
 *
 * @param itcs   Lo que configuró el costista (coeficientes como fracción).
 * @param calc   Lo que devolvió el cálculo. Si falta, se muestra la lectura de
 *               la configuración sola (todavía sin calcular).
 */
export function buildItcsBreakdown(
  itcs: ItcsConfigInput | undefined,
  calc?: ItcsCalculatedInput,
): ItcsBreakdown {
  const cfg = itcs ?? {};
  const basePct = asPercent(cfg.derivationBase);
  const artPct = asPercent(cfg.fixedArt);
  const sacFraction = cfg.sacFraction ?? SAC_FRACTION;
  const sacPct = asPercent(sacFraction);
  const certainOnSacPct = round4((Number(cfg.derivationBase) || 0) * sacPct);

  // ── Bloque 1 · Cargas sociales ciertas ────────────────────────────────────
  const certainLines: ItcsLine[] = [
    {
      label: 'Contribuciones patronales y ART variable (base a derivar)',
      percent: basePct,
      detail: 'Es la base de derivación que cargaste: sobre ella se calculan las cargas derivadas.',
    },
    {
      label: 'ART fija (según contrato con la aseguradora)',
      percent: artPct,
      detail: 'Alícuota fija de la ART. No genera derivadas.',
    },
    {
      label: SAC_LABEL,
      percent: sacPct,
      alwaysApplies: true,
      detail:
        'Un doceavo de la remuneración (1/12 = 8,3333 %). Es una carga cierta que se devenga por ley: ' +
        'el sistema la suma siempre, aunque dejes en cero todo lo demás.',
    },
    {
      label: SAC_CERTAIN_LABEL,
      percent: certainOnSacPct,
      detail: 'Las contribuciones también se pagan sobre el aguinaldo: base a derivar × SAC.',
    },
  ];
  const certainSum = round4(certainLines.reduce((acc, l) => acc + l.percent, 0));

  // ── Bloque 2 · Cargas inciertas remunerativas ─────────────────────────────
  const iapPct = round4(calc?.iapPercent ?? 0);
  const configuredRemunerative = (cfg.uncertainRemunerative ?? []).filter((r) => !isManualIap(r.name));
  const remunerativeLines: ItcsLine[] = [
    {
      label: IAP_LABEL,
      percent: iapPct,
      detail: 'Lo calcula el sistema: días de ausencia paga sobre días efectivos de trabajo.',
    },
    ...configuredRemunerative.map((r) => ({
      label: labelOf(r.name),
      percent: asPercent(r.coefficient),
    })),
  ];
  const remunerativeSum = round4(remunerativeLines.reduce((acc, l) => acc + l.percent, 0));

  // ── Bloque 3 · Cargas derivadas ───────────────────────────────────────────
  // Cada carga incierta remunerativa arrastra sus propias cargas ciertas, su SAC
  // y las cargas ciertas de ese SAC (clase 15). El factor es el mismo para todas.
  const derivationFactorPct = round4(basePct + sacPct + certainOnSacPct);
  const derivedLines: ItcsLine[] = remunerativeLines.map((l) => ({
    label: `Derivadas de ${l.label}`,
    percent: round4((l.percent * derivationFactorPct) / 100),
    detail: 'Cargas ciertas del concepto + SAC del concepto + cargas ciertas de ese SAC.',
  }));
  const derivedSum = round4(derivedLines.reduce((acc, l) => acc + l.percent, 0));

  // ── Bloque 4 · Cargas inciertas no remunerativas ──────────────────────────
  const nonRemunerativeLines: ItcsLine[] = (cfg.uncertainNonRemunerative ?? []).map((r) => ({
    label: labelOf(r.name),
    percent: asPercent(r.coefficient),
  }));
  const nonRemunerativeSum = round4(nonRemunerativeLines.reduce((acc, l) => acc + l.percent, 0));

  const bd = calc?.itcsBreakdown;
  const blocks: ItcsBlock[] = [
    {
      key: 'certain',
      title: 'Cargas sociales ciertas',
      description:
        'Las que fija la ley, el decreto o el convenio. Se pagan sí o sí, pase lo que pase en el mes.',
      percent: bd ? round4(bd.certain) : certainSum,
      lines: certainLines,
    },
    {
      key: 'uncertainRemunerative',
      title: 'Cargas sociales inciertas remunerativas',
      description:
        'Dependen de lo que pase en el período. Como son remunerativas, arrastran cargas derivadas.',
      percent: bd ? round4(bd.uncertainRemunerative) : remunerativeSum,
      lines: remunerativeLines,
    },
    {
      key: 'derived',
      title: 'Cargas sociales derivadas',
      description:
        'Las cargas ciertas que se pagan encima de cada carga incierta remunerativa.',
      percent: bd ? round4(bd.derived) : derivedSum,
      lines: derivedLines,
    },
    {
      key: 'uncertainNonRemunerative',
      title: 'Cargas sociales inciertas no remunerativas',
      description:
        'No integran la remuneración, por eso no arrastran cargas derivadas: suman al índice y nada más.',
      percent: bd ? round4(bd.uncertainNonRemunerative) : nonRemunerativeSum,
      lines: nonRemunerativeLines,
    },
  ];

  const totalPercent = calc?.itcsPercent != null
    ? round4(calc.itcsPercent)
    : round4(blocks.reduce((acc, b) => acc + b.percent, 0));

  const unavoidableLines = blocks
    .flatMap((b) => b.lines)
    .filter((l) => l.alwaysApplies && l.percent > 0);
  const unavoidablePercent = round4(unavoidableLines.reduce((acc, l) => acc + l.percent, 0));

  return {
    blocks,
    totalPercent,
    unavoidablePercent,
    unavoidableLabels: unavoidableLines.map((l) => l.label),
    onlyUnavoidableApplies: unavoidablePercent > 0 && round4(totalPercent - unavoidablePercent) === 0,
  };
}

/** Normaliza para comparar: sin acentos, en minúsculas. */
function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Clasifica un concepto con el conocimiento del sistema. Devuelve `null` si no
 * lo reconoce: en ese caso decide el costista (modo manual), sin molestarlo.
 */
export function classifySocialCharge(name: string): SocialChargeKind | null {
  const n = norm(name);
  if (!n) return null;
  for (const item of SOCIAL_CHARGES_CATALOG) {
    if (norm(item.name) === n) return item.kind;
    // Alias de 4+ caracteres para evitar falsos positivos.
    if (item.aliases.some((a) => a.length >= 4 && n.includes(norm(a)))) return item.kind;
  }
  return null;
}
