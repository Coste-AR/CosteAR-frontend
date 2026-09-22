---
issue: 184
repo: CosteAR-frontend
pr: 200
rama: feat/184-sidebar-rubro
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-22T05:02-03:00
fin: 2026-09-22T05:39-03:00
minutos: 37
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-22 — Sidebar desplegable con nombre del rubro

## Recursos

El shim global de `npm` apuntaba a una ruta inexistente. Se usó el `npm-cli.js` instalado; este worktree reutilizó las dependencias locales mediante una unión de directorios ignorada por Git. El primer test de componente se escribió antes del componente y falló por módulo ausente. La primera corrida E2E focalizada falló por esperar que la URL terminara en `/`, aunque el router redirige el enlace `/` a `/dashboard`; se corrigió la aserción y pasó. La suite completa pasó en su primera corrida. Una mutación temporal del texto de respaldo hizo fallar el test negativo y, restaurado el código, volvió a verde. No se estimaron tokens.

## Qué se hizo

El sidebar de escritorio se expande para mostrar secciones y el nombre publicado por `rubro.nombreProducto`; cerrado conserva los íconos. En teléfono, un botón abre el panel lateral. El logo enlaza al home. Se retiró la leyenda «Panel de Control» del encabezado. Los íconos del rubro se dibujan con `lucide-react`. Si falta el rubro o su nombre, se muestra «Costear» sin exponer la clave técnica.

La evidencia de Playwright quedó adjunta al test en los cuatro viewports. Estas son las capturas de escritorio y teléfono, cerrado y abierto:

| Vista | Cerrado | Abierto |
| --- | --- | --- |
| Escritorio | [Captura](evidencias-184/escritorio-cerrado.png) | [Captura](evidencias-184/escritorio-abierto.png) |
| Teléfono | [Captura](evidencias-184/telefono-cerrado.png) | [Captura](evidencias-184/telefono-abierto.png) |

## Decisiones que tomé sobre la marcha

- **Dato del producto:** pasé al componente base el `rubro` que ya entrega el tablero del dueño. La alternativa era derivar «AVI» de `AVICOLA_POSTURA` o conservarlo globalmente sin contexto de empresa; ambas inventan datos o pueden mostrar el rubro equivocado. Constitución §2 y §4.
- **Ícono:** extraje la tabla de nombres de íconos de Lucide que ya usaba el tablero, en vez de crear otra conversión. Así el mismo valor del contrato produce el mismo dibujo en el tablero y el sidebar. Constitución §4.
- **Teléfono:** abrí un panel lateral desde un botón y conservé la barra inferior existente. Reemplazar esa navegación habría cambiado otros flujos que el issue no pidió. Constitución §8.
- **Logo:** usé un enlace a `/`, tal como pide el issue, y comprobé la redirección existente del router a `/dashboard`. La alternativa era enlazar directamente a `/dashboard`, que no verifica el destino solicitado. Constitución §9.

## Dónde el issue no alcanzaba

- No define cómo conocer el rubro en pantallas sin período ni empresa seleccionados. Allí el shell muestra «Costear»; el nombre rúbrico aparece cuando el tablero del dueño entrega su `rubro`. No se reutiliza un rubro previo, porque podría pertenecer a otra empresa (Constitución §2).
- No precisa si el panel móvil reemplaza la barra inferior ni si abrirlo debe empujar o cubrir el contenido. Se mantuvo la barra y el panel cubre temporalmente la pantalla.
- La referencia visual enlazada en el comentario del issue no fue accesible desde esta sesión; se siguieron los criterios escritos y se revisaron las capturas reales.

## Qué quedó afuera

El contenido del home y la decisión pendiente sobre el botón «Inicio», excluidos por el issue. No se agregaron nombres de producto a otras respuestas de API. La mutación negativa fue posterior a implementar; el test inicial sí se escribió antes, pero su rojo fue por ausencia del módulo, no por una aserción ejecutada.

## Con qué se verifica

```text
npm run lint                 0 errores, 109 advertencias preexistentes
npm run typecheck            verde
npm run test                 258/258 pasados
npm run build                verde
node scripts/check-feature-tests.mjs    20/20 cubiertas
npm run test:e2e -- --workers=1
  2 skipped
  142 passed (13.8m)
npm run test:e2e -- --grep 'abre y cierra el sidebar' --workers=1
  4 passed (26.2s)
```
