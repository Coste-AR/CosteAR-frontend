import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Saca el contenido del árbol de AppShell y lo cuelga directo de document.body.
 *
 * AppShell arma su propio stacking context (el wrapper de contenido usa
 * position:relative + z-index), así que cualquier overlay "fixed inset-0"
 * renderizado como descendiente normal de una página queda atrapado adentro
 * de ese contexto — y nunca puede superar al sidebar (que vive afuera, con
 * su propio z-index), sin importar qué tan alto sea el z-index del overlay.
 * Portalear a body es la única forma correcta de escapar ese contexto.
 * Mismo patrón que ya usa el lightbox de ValidacionesPage.
 */
export function PortalOverlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
