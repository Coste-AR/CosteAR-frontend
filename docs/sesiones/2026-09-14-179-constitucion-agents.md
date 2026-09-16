---
issue: 179
repo: CosteAR-frontend
pr: 181
rama: chore/constitucion-agents
agente: codex
modelo: gpt-5
tanda: B2
inicio: 2026-09-14T20:05:25-03:00
fin: 2026-09-14T20:21:07-03:00
minutos: 16
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 0
rebotes_de_guarda: 0
---

# 2026-09-14 — La Constitución queda delante de cada issue

## Recursos — qué significa cada campo

La primera pasada de verificación dejó `lint` y `typecheck` sin errores, pero Vitest no llegó a
ejecutar casos porque el sandbox negó a esbuild la lectura necesaria para resolver
`vite.config.ts`. Se repitió Vitest con acceso ampliado y pasó. Playwright se ejecutó una vez y
terminó en verde.

## Qué se hizo

Se agregó en `AGENTS.md`, inmediatamente después de `npm run briefing`, la obligación de leer la
Constitución canónica antes del issue. El mismo párrafo indica que una contradicción invalida el
pedido y que las decisiones tomadas durante la ejecución deben citar el principio aplicado.

También se agregó la fila del 14-09-2026 al registro de cambios normativos de `AGENTS.md`.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** resolver las tres obligaciones en un único párrafo breve, enlazando directamente
  la versión de `dev` en `CosteAR-os`.
  **Qué otra opción había:** separarlas en una lista o reproducir los principios localmente.
  **Por qué elegí esta:** el issue pide un párrafo corto y prohíbe duplicar o resumir la fuente;
  conserva una sola autoridad, de acuerdo con Constitución §7.
- **Qué decidí:** verificar el rojo contra `origin/dev` y el verde contra el archivo de la rama con
  aserciones de contenido, sin agregar un test permanente.
  **Qué otra opción había:** sumar un script o test al repositorio.
  **Por qué elegí esta:** mantiene el PR limitado a `AGENTS.md` y esta bitácora, como exige el
  criterio de aceptación, mientras deja evidencia de rojo antes que verde (Constitución §5) y
  respeta un issue y un PR por corrida (Constitución §8).

## Dónde el issue no alcanzaba

El issue no fijaba la redacción exacta del párrafo ni cómo verificar automáticamente un cambio
documental. Se eligió una formulación que conserva literalmente las tres conductas pedidas y una
comprobación efímera de contenido. No se inventaron reglas adicionales (Constitución §9).

## Qué quedó afuera

- No se modificó el briefing.
- No se copió ni resumió la Constitución.
- No se tocó UI, código de aplicación ni tests.
- No se cambió ni eliminó ningún título de test.

## Con qué se verifica

```text
Comprobación de contenido contra origin/dev y la rama:
ROJO previo confirmado: origin/dev no contiene la instrucción constitucional
VERDE actual: enlace, contradicción, cita constitucional y registro presentes

npm run lint
0 errores; 109 warnings preexistentes

npm run typecheck
exit 0

npm run test
Test Files  52 passed (52)
Tests       242 passed (242)

npm run test:e2e
2 skipped
118 passed (9.4m)
```
