// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AcademicCertification } from './components/AcademicCertification';

afterEach(cleanup);

describe('certificación académica de la landing', () => {
  it('explica qué se auditó sin presentar el aval como una promesa vaga', () => {
    render(<AcademicCertification />);

    expect(screen.getByText('AVAL PROFESIONAL')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Exactitud contable y rigurosidad matemática' })).toBeTruthy();
    expect(screen.getByText(/valuación de stock \(PPP y Wilson\)/)).toBeTruthy();
    expect(screen.getByText('Validación de Fórmulas y Prorrateos')).toBeTruthy();
  });
});
