import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { router } from './router';
import { API_BASE, refreshAccessToken } from './lib/api';
import { useAuthStore, type AuthUser } from './stores/auth-store';
import { CosteARLoadingScreen } from './components/layout/CosteARLoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

// Tiempo mínimo que se ve el loader al entrar al sitio, aunque la sesión
// resuelva al instante — cubre al menos 2 ciclos completos del logo
// (CYCLE=2.4s en CosteARLogo.tsx) para que se note que "carga". No queda
// infinito: apenas se cumple, y ya terminó el auth check, se oculta.
//
// CONFIGURABLE A PROPÓSITO, y el motivo no es de producto sino de tiempo de CI.
//
// La suite E2E navega muchas veces, en cuatro viewports, y **cada navegación
// paga estos 5 segundos**: una corrida completa tardaba ~4 minutos, casi toda
// esperando este loader. Y va a empeorar, porque la cantidad de tests crece.
//
// Además fue lo primero que rompió la suite cuando se escribió: mientras el
// loader está montado, `#root` no tiene caja de layout, y con el timeout por
// defecto de Playwright —justo 5 s— todos los tests fallaban en el límite.
//
// Con `VITE_MIN_SPLASH_MS=0` la suite deja de pagarlo. El valor para gente de
// verdad no lo cambia esta variable: sigue siendo 5 s, y **si conviene bajarlo
// es una decisión de marca, no de CI.**
const MIN_SPLASH_MS = Number(import.meta.env.VITE_MIN_SPLASH_MS ?? 5000);

// Debe coincidir con la duración del fade de salida del loader
// (transition-opacity duration-300 en CosteARLoadingScreen).
const LOADER_EXIT_MS = 300;

/**
 * Bootstrap de sesión: al cargar la app intenta refrescar el access token
 * usando la cookie httpOnly. Si funciona, el usuario sigue logueado sin haber
 * guardado nada en localStorage.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setAuth, setInitialized, initializing } = useAuthStore();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const ready = !initializing && minSplashDone;

  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Cross-fade: el contenido ya empieza a aparecer (zoom-in) mientras el
  // loader se desvanece encima, en vez de un corte seco entre los dos.
  useEffect(() => {
    if (ready && loaderMounted) {
      const t = setTimeout(() => setLoaderMounted(false), LOADER_EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [ready, loaderMounted]);

  useEffect(() => {
    (async () => {
      try {
        // Pasa por el refresh deduplicado de api.ts: en StrictMode este efecto
        // corre dos veces seguidas, y sin este singleton cada corrida dispara
        // su propia llamada a /auth/refresh con el mismo refresh token, lo que
        // el backend interpreta como reuso (robo de sesión) e invalida toda la
        // familia de tokens — dejando a la usuaria deslogueada en loop.
        const token = await refreshAccessToken();
        if (!token) { setInitialized(); return; }
        const me = await axios.get<{ data: AuthUser }>(`${API_BASE}/api/v1/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setAuth(token, me.data.data);
      } catch {
        // Sin sesión válida: seguimos como anónimos.
      } finally {
        setInitialized();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {loaderMounted && <CosteARLoadingScreen exiting={ready} />}
      {ready && <div className="animate-zoom-in">{children}</div>}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Toaster 
          position="bottom-right" 
          toastOptions={{ 
            duration: 4000, 
            style: { 
              background: '#fff', 
              color: '#09090b', 
              fontSize: '13px', 
              fontWeight: 600,
              border: '1px solid #e4e4e7',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(74, 21, 27, 0.1)',
              padding: '12px 16px'
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' }
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' }
            }
          }} 
        />
        <AuthBootstrap>
          <RouterProvider router={router} />
        </AuthBootstrap>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
