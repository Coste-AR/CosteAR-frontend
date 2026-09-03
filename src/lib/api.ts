import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cliente HTTP con refresh transparente. El access token vive en memoria
 * (Zustand, no localStorage) para reducir superficie de XSS; el refresh token
 * viaja en una cookie httpOnly que el navegador adjunta sola.
 */
/**
 * Base del backend.
 * - Si está seteada VITE_API_URL, se usa esa (config explícita del deploy).
 * - En local (localhost) queda vacía y Vite proxea /api → :3000.
 * - En cualquier otro dominio sin VITE_API_URL, se cae al backend por defecto
 *   de acá abajo, para no romper si falta la env var en Vercel.
 *
 * EL DEFAULT APUNTA A STAGING, Y ES UNA DECISIÓN CON FECHA.
 * ---------------------------------------------------------
 * Hasta el 03-09-2026 apuntaba a `costear-backend-production`. El problema no
 * era la dirección: era que un default silencioso manda TODOS los dominios que
 * no son localhost al mismo lugar. Una preview de staging y el sitio público
 * recibían el mismo trato, así que el frontend nuevo terminaba pidiéndole a la
 * API vieja un endpoint que no existe — `/periods/:id/tablero-dueno` devuelve
 * 404 en producción y 401 en staging, comprobado.
 *
 * Se invierte porque hoy NO hay ningún cliente usando producción, y lo que sí
 * hay es un producto que se muestra desde `staging`. Con ese dato, el default
 * seguro es el ambiente donde vive el código nuevo.
 *
 * CÓMO SE REVIERTE, el día que haya alguien del otro lado: se setea
 * `VITE_API_URL` en Vercel para el ambiente Production con la URL de
 * producción. La variable explícita siempre gana sobre este default, así que
 * no hace falta tocar este archivo.
 */
const ENV_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const RAILWAY_API_URL = 'https://costear-backend-staging-staging.up.railway.app';
const isLocalhost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

export const API_BASE = ENV_API_URL || (isLocalhost ? '' : RAILWAY_API_URL);

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true, // envía la cookie de refresh
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function doRefresh(): Promise<string | null> {
  try {
    // Sin body: el refresh token viaja SOLO en la cookie httpOnly, que el
    // navegador adjunta solo gracias a withCredentials. No hay fallback a
    // localStorage — ver la nota en stores/auth-store.ts.
    const res = await axios.post<{ data: { accessToken: string } }>(
      `${API_BASE}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const { accessToken } = res.data.data;
    useAuthStore.getState().setAuth(accessToken, useAuthStore.getState().user!);
    return accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

let refreshing: Promise<string | null> | null = null;

/**
 * Refresca el access token. Deduplicado a propósito: el refresh token es de
 * un solo uso (rotación), así que si dos llamadores piden refrescar al mismo
 * tiempo (ej. el interceptor 401 y el bootstrap de sesión en StrictMode, que
 * corre el efecto dos veces), la segunda llamada con el token ya consumido
 * hace que el backend invalide toda la familia de tokens y deja a la usuaria
 * deslogueada en loop. Por eso TODO llamador pasa por esta misma promesa.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !(original as { _retried?: boolean })._retried) {
      (original as { _retried?: boolean })._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de la respuesta del backend. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: { message?: string; details?: Array<{ message: string }> } }
      | undefined;
    if (Array.isArray(data?.error?.details) && data.error.details.length) {
      return data.error.details.map((d) => d.message).join(' · ');
    }
    return data?.error?.message ?? 'Ocurrió un error inesperado';
  }
  return 'Ocurrió un error inesperado';
}

/**
 * Detecta el 422 accionable que agregó F04 al cerrar un período: hay datos sin
 * decisión de imputación de período (`MISSING_INPUT` sobre `periodoImputado`).
 * El cierre es irreversible y no puede pasar sobre datos sin asignar a un mes.
 */
export function isUnimputedError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const err = (error.response?.data as { error?: { code?: string; details?: { field?: string } } } | undefined)?.error;
    return err?.code === 'MISSING_INPUT' && err?.details?.field === 'periodoImputado';
  }
  return false;
}

/**
 * Si el backend adjunta la lista estructurada de datos pendientes en el error
 * (contrato aditivo: `error.details.datosPendientes`), la devuelve para ofrecer
 * la resolución in-situ. Si no la trae, devuelve null y el llamador cae al
 * listado que ya tiene a mano (la última corrida). Nunca expone ids al usuario.
 */
export function unimputedDatosFromError(error: unknown): { id: string; nombre: string }[] | null {
  if (error instanceof AxiosError) {
    const details = (error.response?.data as { error?: { details?: { datosPendientes?: unknown } } } | undefined)
      ?.error?.details;
    const list = details?.datosPendientes;
    if (Array.isArray(list) && list.every((d) => d && typeof d.id === 'string' && typeof d.nombre === 'string')) {
      return list as { id: string; nombre: string }[];
    }
  }
  return null;
}
