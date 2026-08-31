# 2026-08-31 — El E2E ya puede entrar al dashboard sin backend

- **Issue:** #68
- **Repo:** CosteAR-frontend
- **Rama:** `test/e2e-auth-session`
- **PR:** pendiente al redactar; se completa al abrirlo
- **Agente:** Codex · GPT-5
- **Tanda:** B0

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | ~35 min hasta el primer verde completo |
| Tokens consumidos | no informado |
| Intentos hasta el verde | 4 corridas E2E: 1 línea base fallida, 2 del spec nuevo y 1 suite completa |
| Comandos de verificación corridos | `npm run lint`, `npm run typecheck`, `npm run test`, `npx playwright test tests/e2e/smoke-autenticado.spec.ts`, `npm run test:e2e` |

## Qué se hizo

Se agregó `testConSesion`, una variante reutilizable del fixture E2E existente. Simula el refresh
de sesión, el perfil del costista y las lecturas iniciales del dashboard con respuestas vacías
válidas. No usa credenciales, cookies reales ni un backend levantado.

También se agregó el primer smoke test autenticado. Abre `/dashboard`, espera a que la aplicación
pinte, verifica que la guarda no lo haya redirigido, controla que no haya errores de consola y
adjunta una captura de página completa por cada viewport.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** exportar un `testConSesion` desde el mismo archivo de fixtures.
  **Qué otra opción había:** exponer una función que cada spec tuviera que invocar o guardar estado
  de sesión en un archivo. **Por qué elegí esta:** conserva el patrón de Playwright, hereda el
  detector de errores existente y deja la preparación activa antes de que empiece cada test.
- **Qué decidí:** simular no sólo `auth/refresh` y `user/profile`, sino también todas las consultas
  que dispara el dashboard al montar. **Qué otra opción había:** dejar que esas consultas fallen
  contra el proxy local y confiar en los valores por defecto de React Query. **Por qué elegí esta:**
  eso habría dado una pantalla visible, pero el test seguiría dependiendo indirectamente de la
  ausencia o presencia de un backend y escondería requests no controladas.
- **Qué decidí:** usar un usuario ficticio con rol `COST_PROFESSIONAL` y con los dos bloqueos de
  onboarding apagados. **Qué otra opción había:** usar `ADMIN` u omitir las banderas. **Por qué
  elegí esta:** es el rol que puede permanecer en `/dashboard`; los otros estados redirigen a
  `/portal`, `/change-password` o `/accept-terms`.
- **Qué decidí:** esperar `domcontentloaded` al navegar y dar 60 s sólo al nuevo spec.
  **Qué otra opción había:** cambiar el timeout global o recortar la captura. **Por qué elegí esta:**
  WebKit mostró el dashboard completo pero agotó los 30 s durante la captura full-page; el issue
  exige esa evidencia y prohíbe tocar los tests públicos.

## Dónde el issue no alcanzaba

- No definía la forma mínima de la respuesta de perfil ni el rol/banderas necesarios para que
  `requireAuth` deje al usuario en `/dashboard`.
- No enumeraba las consultas propias del dashboard que también había que interceptar para cumplir
  de verdad con “sin backend”. Hubo que relevar `companies`, `alerts`, validaciones, macro y feed.
- No definía qué interfaz debía ofrecer el fixture reutilizable. Se eligió un `testConSesion`
  importable desde cualquier spec, en paralelo al `test` público.
- No contemplaba que la captura full-page del dashboard en WebKit puede superar el timeout total
  de 30 s aunque la pantalla ya esté correctamente renderizada.
- La primera línea base de `npm run test:e2e` tuvo 10 timeouts preexistentes con cuatro workers.
  Sin tocar esos tests, una corrida posterior completa pasó; el issue no decía cómo contabilizar
  esta inestabilidad de arranque en “intentos hasta el verde”.

## Qué quedó afuera

- No se tocó `src/`, el splash ni los tests públicos, como pedía el issue.
- No se corrigieron los warnings de proxy de `/api/v1/terms/current` de los tests públicos porque
  no hacen fallar la suite y están fuera del alcance de #68.
- No se ejecutó `npm audit fix`: `npm ci` informó 12 vulnerabilidades de dependencias, pero cambiar
  versiones no forma parte de este issue.

## Con qué se verifica

```bash
npm run lint
# 0 errores; 108 warnings preexistentes en src/

npm run typecheck
# verde

npm run test
# 19 archivos, 146 tests aprobados

npx playwright test tests/e2e/smoke-autenticado.spec.ts
# 4 passed (chromium, webkit, Mobile Chrome, Mobile Safari)

npm run test:e2e
# 26 passed, 2 skipped (los skips de scroll son sólo para viewports de escritorio)
```
