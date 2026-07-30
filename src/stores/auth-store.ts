import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** true hasta que se resuelve el intento de refresh inicial. */
  initializing: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  setInitialized: () => void;
  clear: () => void;
}

/**
 * Access token: en memoria (no persiste, se pierde en F5).
 * Refresh token: SOLO en la cookie httpOnly que setea el backend — nunca en
 * localStorage. Guardarlo también en localStorage (como se hacía antes)
 * anulaba la protección de httpOnly contra XSS: cualquier script inyectado
 * podía leerlo directo. La cookie viaja sola en cada request gracias a
 * withCredentials (ver lib/api.ts); si por algún motivo no llega, la sesión
 * se pierde en el próximo refresh — preferible a exponer el token.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initializing: true,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
  setInitialized: () => set({ initializing: false }),
  clear: () => set({ accessToken: null, user: null }),
}));
