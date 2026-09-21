---
issue: 186
repo: CosteAR-frontend
pr: pendiente
rama: feat/186-trazabilidad-siempre
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-21T13:04-03:00
fin: 2026-09-21T13:39-03:00
minutos: 35
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-21 — Trazabilidad visible y siempre activa

## Recursos

Se escribió primero un test de componente con dos criterios. Ambos fallaron antes del cambio: el
interruptor seguía en la barra y el estado apagado ocultaba la leyenda. La instalación del worktree
se hizo con `npm ci --ignore-scripts`. La primera corrida completa de Vitest dio 250 pasados y dos
timeouts en tests ajenos al cambio; corría a la vez que Playwright y build. La primera de Playwright
dio 130 pasados, dos salteados y cuatro timeouts, tres de ellos al entrar a una página. Repetidas
en serie, ambas suites dieron verde sin modificar esos tests. Por eso hubo dos intentos hasta verde.

## Qué se hizo

Se reemplazó el interruptor global por un indicador no interactivo. Los valores trazables conservan
su resalte y acceso a la ficha de origen o derivación. La leyenda se muestra siempre. El store sólo
guarda qué ficha está abierta; no lee ni escribe la preferencia vieja `costear_trace_mode`.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** mantener el indicador compacto en la barra y la leyenda existente. **Qué otra
  opción había:** quitar el elemento de la barra y dejar sólo la leyenda. **Por qué elegí esta:** el
  issue exige que el estado quede visible donde ya se mostraba, sin ocupar más lugar
  (Constitución §1 y §8).
- **Qué decidí:** ignorar la clave vieja en `localStorage` sin migrarla ni borrarla. **Qué otra opción
  había:** eliminarla al cargar la app. **Por qué elegí esta:** no hace falta tocar almacenamiento
  para garantizar el estado; no leer la clave evita que un valor viejo `false` cambie la UI
  (Constitución §5).
- **Qué decidí:** conservar el store para la ficha abierta y quitar sólo el estado `on` y `toggle`.
  **Qué otra opción había:** reemplazar todo el store. **Por qué elegí esta:** abrir y cerrar el
  panel sigue siendo estado de UI válido y no forma parte del interruptor retirado
  (Constitución §8).

## Dónde el issue no alcanzaba

- No definía si la preferencia vieja debía borrarse. Se dejó inerte y se probó que `false` no altera
  la pantalla.
- No especificaba el aspecto del indicador fijo. Se conservaron tamaño, posición y colores del
  estado activo anterior, quitando la apariencia de interruptor.

## Qué quedó afuera

- No se cambió el contenido de las fichas de trazabilidad ni el backend, como pide el issue.

## Con qué se verifica

```bash
npm run lint                 # 0 errores, 109 warnings previos
npm run typecheck            # verde
npm run test                 # 54 archivos, 252 tests pasados en segunda corrida
npm run test:e2e -- --workers=2  # 134 pasados, 2 salteados; cuatro viewports, 8.5 min
npm run build                # verde; advertencia previa por chunk mayor a 500 kB
npm run check:feature-tests  # 19 features cubiertas, 0 excepciones
```

La suite E2E usa `testInfo.attach()` del fixture compartido para dejar captura de página completa
de cada caso. La salida final de `npm run test:e2e -- --workers=2` fue:

```text
  2 skipped
  134 passed (8.5m)
```
