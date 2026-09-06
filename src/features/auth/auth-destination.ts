import type { AuthUser } from '@/stores/auth-store';

export type AuthDestination =
  | '/change-password'
  | '/accept-terms'
  | '/portal'
  | '/dashboard';

/**
 * Una sesión autenticada tiene un único próximo destino dentro del frontend.
 * La prioridad importa: primero se asegura la cuenta, después se acepta el
 * contrato pendiente y recién entonces se entra al área que corresponde al rol.
 */
export function authDestination(user: AuthUser | null | undefined): AuthDestination {
  if (user?.mustChangePassword) return '/change-password';
  if (user?.needsTermsAcceptance) return '/accept-terms';
  if (user?.role === 'EMPRESA_OPERATOR') return '/portal';
  return '/dashboard';
}
