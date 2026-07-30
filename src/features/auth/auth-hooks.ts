import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

export interface TermsVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
}

/** Versión vigente de los Términos y Condiciones — pública, no requiere sesión. */
export function useCurrentTerms() {
  return useQuery({
    queryKey: ['terms', 'current'],
    queryFn: async () => {
      const res = await api.get<{ data: TermsVersion }>('/terms/current');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

/** ¿El usuario logueado tiene que (re)aceptar la versión vigente? */
export function useTermsStatus(enabled = true) {
  return useQuery({
    queryKey: ['terms', 'status'],
    queryFn: async () => {
      const res = await api.get<{ data: { needsAcceptance: boolean; currentVersion: TermsVersion | null } }>(
        '/terms/status',
      );
      return res.data.data;
    },
    enabled,
  });
}

export function useAcceptTerms() {
  const patchUser = useAuthStore((s) => s.patchUser);
  return useMutation({
    mutationFn: async (termsVersionId: string) => {
      await api.post('/terms/accept', { termsVersionId });
    },
    onSuccess: () => patchUser({ needsTermsAcceptance: false }),
  });
}

interface AuthResponse {
  data: { user: AuthUser; accessToken: string };
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: { identifier: string; password: string; twoFactorCode?: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', input);
      return res.data.data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export function useSetFirstPassword() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  return useMutation({
    mutationFn: async (newPassword: string) => {
      await api.post('/auth/set-first-password', { newPassword });
    },
    onSuccess: () => {
      // Limpiar flag mustChangePassword del store
      if (user && token) {
        setAuth(token, { ...user, mustChangePassword: false });
      }
    },
  });
}

export type ProfessionalType =
  | 'CONTADOR_PUBLICO'
  | 'LIC_ADMINISTRACION'
  | 'CONSULTOR_INDEPENDIENTE'
  | 'ANALISTA_INTERNO'
  | 'OTRO';

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  cuit: string;
  dni?: string;
  professionalType: ProfessionalType;
  licenseNumber?: string;
  province: string;
  initialClients?: { name: string; industry?: string; cuit?: string }[];
  marginThresholdPct: number;
  acceptedTerms: true;
  termsVersionId: string;
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: RegisterPayload) => {
      const res = await api.post<AuthResponse>('/auth/register', input);
      return res.data.data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      // Sin body: el refresh token viaja en la cookie httpOnly (withCredentials).
      await api.post('/auth/logout');
    },
    onSettled: () => clear(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<{ data: { message: string } }>('/auth/forgot-password', { email });
      return res.data.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      const res = await api.post<{ data: unknown }>('/auth/reset-password', input);
      return res.data.data;
    },
  });
}
