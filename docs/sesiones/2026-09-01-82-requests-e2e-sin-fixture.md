# 2026-09-01 — Las requests autenticadas sin fixture ya no pasan en silencio

- **Issue:** #82
- **Repo:** CosteAR-frontend
- **Rama:** `test/e2e-unmocked-requests`
- **PR:** #83
- **Agente:** Codex · GPT-5
- **Tanda:** B0

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | no informado por la herramienta |
| Tokens consumidos | no informado |
| Intentos hasta el verde | 3 corridas E2E completas: 2 con timeouts de evidencia y 1 verde después de corregir el timeout; además, corrida focalizada en Chromium |
| Comandos de verificación corridos | `npm run lint`, `npm run typecheck`, `npm run test`, `npx playwright test tests/e2e/smoke-autenticado.spec.ts --project=chromium`, `npm run test:e2e` |

## Qué se hizo

`testConSesion` ahora registra cada request que cae en la respuesta 501 por no tener un fixture
definido. El teardown falla si encontró alguna y enumera el método y el pathname, de modo que una
pantalla protegida no puede dar verde después de pedir datos que el test no preparó.

También se agregó un test de contrato que abre `/dashboard`, dispara deliberadamente una request
sin respuesta definida y exige que el teardown falle. Playwright la declara como falla esperada:
la suite queda verde cuando el guardarraíl funciona y se pone roja si la request vuelve a pasar en
silencio.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** conservar todas las requests no previstas, en orden y sin deduplicarlas.
  **Qué otra opción había:** guardar sólo valores únicos. **Por qué elegí esta:** las repeticiones
  también son evidencia útil y el criterio pide nombrar cada petición que cayó al 501.
- **Qué decidí:** informar método y pathname, sin query string. **Qué otra opción había:** guardar
  la URL completa. **Por qué elegí esta:** es exactamente el contrato escrito en el issue y evita
  que tokens o parámetros variables vuelvan inestable el mensaje.
- **Qué decidí:** demostrar la falla con `test.fail` de Playwright. **Qué otra opción había:**
  lanzar una segunda ejecución de Playwright desde la propia suite o probar sólo una función
  auxiliar. **Por qué elegí esta:** ejecuta el fixture real y hace que quitar el guardarraíl rompa
  la suite, sin dejar el comando principal permanentemente en rojo.
- **Qué decidí:** dar 60 s de timeout total a los specs públicos, conservando los 15 s de cada
  expectativa. **Qué otra opción había:** seguir reintentando hasta obtener un verde o quitar la
  captura full-page. **Por qué elegí esta:** la landing renderizó correctamente pero agotó dos
  corridas consecutivas durante la captura/cierre del contexto; el protocolo obliga a tratarlo
  como falla y la evidencia no se puede recortar.

## Dónde el issue no alcanzaba

- Exige que el mecanismo se demuestre y, al mismo tiempo, que `npm run test:e2e` quede en verde,
  pero no define cómo representar una falla deliberada. Se eligió la semántica nativa de
  Playwright para fallas esperadas: el caso se ejecuta y sólo cuenta como correcto si realmente
  falla.
- No define si requests repetidas deben aparecer una o varias veces. Se conservan todas porque
  cada caída al fallback es un hallazgo observable.
- La suite completa agotó dos veces seguidas los 30 s del smoke público de la landing, con la
  pantalla correctamente renderizada en la evidencia. El issue permite tocar un spec si hace
  falta para que la suite siga pasando, pero no definía si el timeout de evidencia entraba en ese
  permiso. Se aplicó el mismo margen de 60 s que ya usa el spec autenticado, sin relajar ninguna
  expectativa.

## Qué quedó afuera

- No se tocó `src/`, el splash, los fixtures públicos ni el filtro de
  `Failed to load resource`.
- No se agregaron respuestas nuevas a `RESPUESTAS_DASHBOARD`: el cambio detecta contratos
  faltantes, no amplía silenciosamente los mocks existentes.
- No se cambió ninguna dependencia ni configuración de Playwright.

## Con qué se verifica

```bash
npm run lint
# verde

npm run typecheck
# verde

npm run test
# verde

npx playwright test tests/e2e/smoke-autenticado.spec.ts --project=chromium
# verde: se ejecutaron el smoke del dashboard y la falla esperada del teardown

npm run test:e2e
# 30 passed, 2 skipped · chromium, webkit, Mobile Chrome y Mobile Safari · 3.9 min
```

Las dos primeras corridas completas no se ocultaron:

1. Chromium agotó el timeout al cerrar el contexto del dashboard y al capturar la landing:
   `28 passed`, `2 failed`, `2 skipped`.
2. Sin tocar código, el dashboard pasó pero la landing volvió a agotar 30 s con la pantalla bien
   renderizada: `29 passed`, `1 failed`, `2 skipped`.
3. Después de dar a los specs públicos 60 s para producir la captura/cerrar el contexto, sin
   cambiar los 15 s de las expectativas, la suite completa quedó verde.
