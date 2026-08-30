# AGENTS.md — cómo se trabaja en este repo

Esto es `Coste-AR/CosteAR-frontend`: **el frontend React que ve el cliente**.

**Leelo entero antes de tocar nada.** Es el contrato de trabajo del repo, y está acá porque un
agente arranca frío: si no está escrito, lo inventa.

Las convenciones de fondo están en [`CLAUDE.md`](CLAUDE.md), [`CONTRIBUTING.md`](CONTRIBUTING.md)
y las reglas de UI en `.claude/rules/frontend-ui.md`. Aplican igual. Este archivo es lo mínimo que
no podés no saber.

## Lo primero, antes de leer el issue

```bash
npm run briefing
```

Te imprime en qué estado está el proyecto **ahora**: en qué rama estás, si tu copia quedó atrás
de `origin/dev`, qué PRs tuyos hay abiertos, qué issues tenés asignados, y el `ESTADO.md` con lo
que está pasando esta semana — incluidos los tests flaky conocidos, para que no pierdas media hora
re-corriendo una suite que ya sabemos que falla.

Existe porque la trazabilidad escrita en documentos depende de que alguien se acuerde de leerlos,
y además envejece: un documento dice qué pasaba el 22 de agosto, no qué pasa hoy. Esto sale de
git y de `gh` en el momento.

## El ciclo

1. **Ramificá desde `dev`.** Nunca desde `main`: es producción, con un cliente real usándola.
   Nombre de rama: `feat/…`, `fix/…`, `test/…`, `chore/…`.
2. **Commits convencionales** (`feat:`, `fix:`, `test:`, `chore:`). Hay commitlint: un mensaje mal
   formado te rebota el commit. Escribí el **por qué** en el cuerpo, no sólo el qué.
3. **Abrí PR contra `dev`.**
4. **Antes de marcar el PR listo, poné tu rama al día con `dev`:**

   ```bash
   gh pr update-branch <numero-de-tu-pr>
   ```

   No es un trámite. El verde que tenías se calculó contra la versión de `dev` de cuando abriste
   la rama; si `dev` avanzó, ese verde ya no dice nada sobre cómo queda tu cambio integrado con lo
   que hay ahora. Dos PR verdes contra el mismo `dev` viejo entran los dos, y el segundo puede
   romperlo.

   Si no lo hacés, el auto-merge te lo va a pedir por comentario y el PR se queda esperando.

5. **No mergees.** Ni el tuyo. Cuando alguien lo revise le pone la etiqueta `auto-merge` y entra
   solo apenas el CI esté verde.

## Con qué se verifica

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest — unitarios en src/
npm run test:e2e    # Playwright — la verificación de pantalla
```

Los cuatro en verde antes de abrir el PR. La primera vez: `npx playwright install --with-deps`.

**Sobre `test:e2e`:** desde el 30-08-2026 la Definition of Done **ya no pide** que una persona
abra el navegador. Esta suite es lo que la reemplaza, así que tiene que dejar evidencia mirable:
cada test adjunta captura de página completa con `testInfo.attach()`. **Si tocaste UI o un flujo y
no hay test que lo recorra, el trabajo no está terminado.**

## Lo que te va a morder si no lo sabés

- **`main.tsx` fuerza un splash mínimo de 5 segundos** en cada carga (`MIN_SPLASH_MS`). Mientras
  dura, `#root` no tiene caja de layout y Playwright lo ve oculto. Por eso el timeout de `expect`
  está en 15 s en `playwright.config.ts`. **No lo bajes y no toques el splash.**
- **La suite E2E no depende de que haya backend levantado.** `tests/e2e/fixtures.ts` intercepta
  `/auth/refresh` con `page.route()` y devuelve 401. Si tu test necesita otra respuesta de la API,
  interceptala igual — no levantes el backend.
- **`tests/e2e/fixtures.ts` ya tiene** el detector de errores de consola y `laAppPinto()`.
  Reusalos, no los dupliques.
- **Vitest corre sólo `src/**/*.test.{ts,tsx}`.** Los specs de Playwright viven en `tests/e2e/` y
  si Vitest los levanta, falla. No amplíes ese `include`.
- **Nada de colores en hex crudo ni spacing arbitrario** donde hay token de Tailwind. La identidad
  es el granate de "Identidad Visual v1.0".

## Tu bitácora de sesión — obligatoria, va en el mismo PR

Escribí `docs/sesiones/AAAA-MM-DD-<issue>-<slug>.md`. No lo escribe otro después: lo que se anota
a mano al final es una promesa que se incumple sola.

- **Recursos:** tiempo, tokens, intentos hasta el verde, comandos corridos. Si la herramienta no
  te informa los tokens, poné **"no informado"** — no estimes. Un número inventado es peor que un
  hueco, porque alguien lo va a sumar.
- **Decisiones que tomaste sobre la marcha:** qué decidiste, qué otra opción había, por qué esa.
- **Dónde el issue no alcanzaba:** lo que tuviste que suponer porque no estaba escrito, **aunque
  hayas acertado**. No es una queja: es con lo que mejoramos cómo pedimos el trabajo.
- **Qué quedó afuera.**

Formato completo: `CosteAR-os/plantillas/bitacora-sesion-agente.md`.

## Lo que no hacés nunca

- **No mergeás.**
- **No borrás ni saltás tests para poner el CI en verde.**
- **No amplías el alcance del issue.** Lo de paso va a un issue nuevo, y lo decís en el PR.
- **No dejás tests con el cuerpo comentado.** Este proyecto ya tuvo cobertura falsa: tres tests
  que pasaban sin ejecutar una sola aserción, durante meses. Si algo no se puede cubrir, se dice;
  no se finge.

## Qué tiene que decir tu PR

Qué hiciste, por qué, cómo probarlo, y **qué quedó afuera**. Pegá la salida de
`npm run test:e2e`.

---

El protocolo completo del equipo está en [`Coste-AR/CosteAR-os`](https://github.com/Coste-AR/CosteAR-os).
