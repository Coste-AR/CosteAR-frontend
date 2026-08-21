/**
 * Sistema de notificaciones de CosteAR.
 *
 * Punto de entrada único para toasts en toda la app. El Toaster está montado
 * en main.tsx con el estilo del design system (bottom-right, colores granate).
 *
 * Uso:
 *   import { toast } from '@/components/ui/toast';
 *   toast.success('Guardado');
 *   toast.error('Algo falló');
 */
export { default as toast } from 'react-hot-toast';
