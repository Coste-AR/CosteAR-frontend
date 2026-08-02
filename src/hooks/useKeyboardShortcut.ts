import { useEffect } from 'react';

type KeyCombo = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

export function useKeyboardShortcut(combo: KeyCombo, callback: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Si el usuario está escribiendo en un input, textarea o select, ignorar atajos que no usen modificadores.
      // Si usan modificadores (Ctrl/Cmd), permitirlos (ej: Ctrl+S en un input) siempre y cuando prevengamos el comportamiento nativo.
      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      if (isInput && !hasModifier) {
        return;
      }

      const matchKey = event.key.toLowerCase() === combo.key.toLowerCase();
      const matchCtrl = combo.ctrlKey ? (event.ctrlKey || event.metaKey) : true; // Tratamos Ctrl y Cmd (Mac) como equivalentes para el atajo principal
      const matchShift = combo.shiftKey ? event.shiftKey : true;
      const matchAlt = combo.altKey ? event.altKey : true;

      if (matchKey && matchCtrl && matchShift && matchAlt) {
        // Solo prevenir por defecto si hay modificadores o si es una tecla de función especial
        if (hasModifier || combo.key.startsWith('F')) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [combo, callback]);
}
