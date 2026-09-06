import { describe, expect, it } from 'vitest';
import { authDestination } from './auth-destination';
import type { AuthUser } from '@/stores/auth-store';

const USER: AuthUser = {
  id: 'usuario-prueba',
  email: 'persona@ejemplo.com',
  name: 'Persona de Prueba',
  role: 'COST_PROFESSIONAL',
};

describe('destino de una sesión autenticada', () => {
  it('prioriza asegurar la cuenta antes de aceptar términos', () => {
    expect(
      authDestination({ ...USER, mustChangePassword: true, needsTermsAcceptance: true }),
    ).toBe('/change-password');
  });

  it('exige aceptar términos antes de entrar al área del rol', () => {
    expect(
      authDestination({ ...USER, role: 'EMPRESA_OPERATOR', needsTermsAcceptance: true }),
    ).toBe('/accept-terms');
  });

  it('envía operadores al portal y costistas al dashboard', () => {
    expect(authDestination({ ...USER, role: 'EMPRESA_OPERATOR' })).toBe('/portal');
    expect(authDestination(USER)).toBe('/dashboard');
  });
});
