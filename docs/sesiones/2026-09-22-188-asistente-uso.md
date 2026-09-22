---
issue: 188
repo: CosteAR-frontend
pr: 199
rama: feat/188-asistente-uso
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-22T01:01-03:00
fin: 2026-09-22T01:30-03:00
minutos: 29
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-22 — Ayuda operativa en las tres pantallas principales

## Recursos

El shim de `npm` apuntaba a una instalación inexistente; se usó el `npm-cli.js` instalado y `npm_config_prefix` para Playwright. Este worktree no tenía dependencias: `npm ci` instaló las versiones del lockfile. La primera ejecución focalizada de Vitest falló por dos errores del propio test (actualización de estado sin `act` y mayúscula en la expresión regular); corregidos, pasó. La primera ejecución focalizada de Playwright falló porque el filtro del test contaba un módulo que servía Vite como si fuera una llamada a la API; corregido, pasó en cuatro viewports. La suite E2E completa pasó a la primera con el árbol estable. Un intento de build dentro del sandbox no pudo leer `vite.config.ts`; el mismo build fuera del sandbox pasó. Los hooks del commit pasaron. No se estimaron tokens.

## Qué se hizo

El inicio dejó de montar el chat de texto libre. Un ícono fijo abre preguntas y respuestas locales de inicio, panel de campo o tablero del dueño. Una burbuja aparece luego de tres minutos sin actividad y se cierra al mover el mouse, tocar la pantalla o usar el teclado. El panel no tiene entrada de texto ni hace requests. El E2E adjunta capturas del ícono, panel y burbuja en escritorio y teléfono, y los recorridos existentes comprueban el contenido de campo y tablero.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** montar la ayuda en `AppShell` para inicio y tablero, y en `FieldPanelPage` para campo. **Qué otra opción había:** repetir el componente en cada página o mostrarlo en todas las rutas. **Por qué elegí esta:** cubre exactamente las tres pantallas pedidas sin extenderlo a flujos no definidos (Constitución §8 y §9).
- **Qué decidí:** escribir dos preguntas breves por pantalla con instrucciones genéricas, sin nombres ni valores de un rubro. **Qué otra opción había:** usar ejemplos avícolas o repetir el mismo contenido en todas las pantallas. **Por qué elegí esta:** el issue pide empezar por esas pantallas y aplicar a todos los rubros; no había contenido de paquete ni detalles para inferir más (Constitución §2 y §4).
- **Qué decidí:** reiniciar la inactividad con `mousemove`, `keydown` y `touchstart`; el ícono permanece disponible. **Qué otra opción había:** escuchar sólo el mouse y ocultar el ícono. **Por qué elegí esta:** el criterio de actividad también nombra teclado y exige captura en teléfono; la frase de desaparición se refiere a la burbuja (Constitución §1 y §9).
- **Qué decidí:** presentar las preguntas en un acordeón local. **Qué otra opción había:** texto plano largo o una consulta libre. **Por qué elegí esta:** conserva el panel pequeño y elimina la llamada al modelo (Constitución §1 y §10).

## Dónde el issue no alcanzaba

- No daba el texto exacto de preguntas y respuestas; se eligió contenido operativo mínimo a partir de controles visibles. No se presenta como dato del negocio.
- No definía la conducta táctil de la burbuja; se trató `touchstart` como actividad para que no tape el teléfono.
- No especificaba si el ícono debía aparecer en el resto de rutas; se limitó a las tres pantallas iniciales.
- No decía si el código legado del chat debía borrarse: se desmontó del inicio y se dejó sin uso para evitar una limpieza adicional dentro del issue.

## Qué quedó afuera

- El contenido completo del manual, búsqueda, chat e IA, como indica #188.
- No se logró ejecutar el test nuevo contra la versión previa de producción antes de implementar: faltaban dependencias en el worktree. Se escribió primero, pero la ejecución inicial falló por entorno. Se hizo luego una mutación deliberada que quitó el listener de teclado: el test de actividad continua falló y volvió a verde al restaurarlo. Esto prueba sensibilidad, pero no se presenta como un rojo anterior al cambio (Constitución §5).

## Con qué se verifica

```bash
npm run lint                    # 0 errores, 109 advertencias preexistentes
npm run typecheck               # verde
npm run test                    # 56 archivos, 256 tests pasados
npm run test:e2e -- --workers=2 # 138 pasados, 2 salteados; cuatro viewports
npm run build                   # verde; advertencia previa de bundle >500 kB
npm run check:feature-tests     # 20 cubiertas, 0 excepciones
git diff --check                # sin errores
```
