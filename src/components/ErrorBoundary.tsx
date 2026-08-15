import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { CosteARLogo } from './layout/CosteARLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Red de seguridad de última instancia: si algún componente tira una excepción
 * durante el render, React desmonta todo el árbol y la usuaria queda con una
 * pantalla en blanco. Esto la reemplaza por un mensaje entendible con forma de
 * salir (recargar), y deja rastro del error real en consola para debug.
 *
 * Tiene que ser clase: getDerivedStateFromError/componentDidCatch no tienen
 * equivalente en hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlado en la aplicación:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_10px_30px_rgba(74,21,27,0.06)]">
            <div className="mb-5 flex items-center justify-center gap-2.5">
              <CosteARLogo className="h-8 w-auto text-granate" />
              <span className="text-lg font-extrabold tracking-tight text-granate">CosteAR</span>
            </div>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="size-6 text-danger" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-ink">Algo salió mal</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Ocurrió un error inesperado y no pudimos continuar. Probá recargar la página; si el
              problema persiste, contactanos.
            </p>
            <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
