import {
  Activity,
  BarChart2,
  Factory,
  GitCompare,
  History,
  Layers,
  Package,
  Scale,
  Split,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { CostingSystem } from '../shared/CostingSystemSelector';

/**
 * LAS PESTAÑAS DE LA ESTRUCTURA, SEGÚN EL SISTEMA DE COSTEO (U02).
 *
 * Órdenes y Procesos no cargan los mismos datos: en Órdenes el costo se acumula
 * por orden (materia prima, mano de obra, costos indirectos, venta), y en
 * Procesos se acumula por departamento y período (cuadro de movimiento,
 * producción equivalente, costos conjuntos). Por eso la página muestra un juego
 * de pestañas distinto, sobre el MISMO armazón: encabezado, barra de período y
 * confirmación en cada guardado no cambian.
 *
 * El set de Órdenes queda exactamente como estaba: una estructura por órdenes se
 * ve y se comporta igual que antes de existir Procesos.
 */

export type OrdersTab =
  | 'raw-material'
  | 'direct-labor'
  | 'indirect-costs'
  | 'sales'
  | 'simulate';

export type ProcessTab =
  | 'process-departments'
  | 'process-movement'
  | 'process-equivalent'
  | 'process-joint-costs';

/** Pestañas que existen en los dos sistemas. */
export type SharedTab = 'result' | 'comparison' | 'history';

export type SectionTab = OrdersTab | ProcessTab | SharedTab;

export interface TabDefinition {
  id: SectionTab;
  label: string;
  icon: typeof Package;
  /** Clave en el mapa de secciones completas; `undefined` = no lleva tilde. */
  configKey?: 'mp' | 'mod' | 'cip' | 'sales';
}

const ORDERS_TABS: TabDefinition[] = [
  { id: 'raw-material', label: 'Materia Prima', icon: Package, configKey: 'mp' },
  { id: 'direct-labor', label: 'Mano de Obra', icon: Users, configKey: 'mod' },
  { id: 'indirect-costs', label: 'Costos Indirectos', icon: Factory, configKey: 'cip' },
  { id: 'sales', label: 'Venta', icon: TrendingUp, configKey: 'sales' },
  { id: 'result', label: 'Resultado', icon: BarChart2 },
  { id: 'simulate', label: 'Simulador', icon: Activity },
  { id: 'comparison', label: 'Comparación', icon: GitCompare },
  { id: 'history', label: 'Historial', icon: History },
];

/**
 * Procesos sigue el orden en que se trabaja: primero se declaran los
 * departamentos, después se carga el movimiento de unidades de cada uno, de ahí
 * sale la producción equivalente, y recién al final el informe de costos.
 *
 * No lleva "Simulador": el simulador de escenarios está armado sobre el
 * resultado de Órdenes. Sí lleva Comparación e Historial, que son de período y
 * funcionan igual en los dos sistemas.
 */
const PROCESS_TABS: TabDefinition[] = [
  { id: 'process-departments', label: 'Departamentos', icon: Layers },
  { id: 'process-movement', label: 'Movimiento de unidades', icon: Scale },
  { id: 'process-equivalent', label: 'Producción equivalente', icon: Split },
  { id: 'process-joint-costs', label: 'Costos conjuntos', icon: Factory },
  { id: 'result', label: 'Resultado', icon: BarChart2 },
  { id: 'comparison', label: 'Comparación', icon: GitCompare },
  { id: 'history', label: 'Historial', icon: History },
];

export function tabsFor(costingSystem: CostingSystem | undefined): TabDefinition[] {
  return costingSystem === 'PROCESSES' ? PROCESS_TABS : ORDERS_TABS;
}

/** La pestaña en la que abre la estructura en cada sistema. */
export function defaultTabFor(costingSystem: CostingSystem | undefined): SectionTab {
  return costingSystem === 'PROCESSES' ? 'process-departments' : 'raw-material';
}
