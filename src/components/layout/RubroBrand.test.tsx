// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RubroBrand } from './RubroBrand';

afterEach(cleanup);

describe('RubroBrand', () => {
  it('muestra el nombre y el icono declarados por el rubro', () => {
    render(<RubroBrand rubro={{ clave: 'RUBRO_SINTETICO', nombreProducto: 'Prueba', icons: { UnidadProductiva: 'warehouse' } }} />);
    expect(screen.getByText('Costear Prueba')).toBeTruthy();
    expect(screen.getByTestId('sidebar-rubro-icon').getAttribute('data-icon')).toBe('warehouse');
    expect(screen.getByTestId('sidebar-rubro-icon').getAttribute('class')).toContain('lucide-warehouse');
  });

  it('muestra Costear cuando falta el rubro o su nombre', () => {
    const view = render(<RubroBrand rubro={null} />);
    expect(screen.getByText('Costear')).toBeTruthy();
    view.rerender(<RubroBrand rubro={{ clave: 'SIN_NOMBRE', nombreProducto: null, icons: {} }} />);
    expect(screen.getByText('Costear')).toBeTruthy();
    expect(screen.queryByText('SIN_NOMBRE')).toBeNull();
  });
});
