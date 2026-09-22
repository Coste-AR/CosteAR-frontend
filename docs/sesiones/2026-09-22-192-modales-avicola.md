---
issue: 192
repo: CosteAR-frontend
pr: 201
rama: feat/192-modales-avicola
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-22T17:01-03:00
fin: 2026-09-22T17:28-03:00
minutos: 27
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-22 — El panel avícola ya era inline; quedó la guarda

## Qué se hizo

Se inventarió el flujo que el paquete avícola prende y apaga en `/panel-campo` y se comprobó que
no quedan modales productivos. La selección de carga, los formularios y la confirmación viven en
la propia página desde el commit `1b099d3` (#165), ampliado luego por #170. Ese commit está en
`origin/dev`: `merge-base`, `branch --contains` y `git grep` dieron positivo.

El inventario es:

| Ruta | Disparador | Contenido | Decisión |
| --- | --- | --- | --- |
| `/panel-campo` | Botón «Huevos» cuando el módulo `produccion` está prendido | Lote, fecha, cantidad y guardado | Conservar inline: la carga no bloquea ni tapa la pantalla. |
| `/panel-campo` | «Volver a las cargas» durante producción | Vuelve al selector y registra abandono | Conservar inline: no requiere confirmación. |
| `/panel-campo` | Guardado de producción | Confirmación «Listo» y opciones de continuar o volver | Conservar como estado de página: repite sólo el dato recién guardado. |
| `/panel-campo` | Botón «Gallinas» cuando el módulo `plantel` está prendido | Lote, fecha, cantidad, motivo y guardado | Conservar inline: la carga no bloquea ni tapa la pantalla. |
| `/panel-campo` | Guardado de una baja | Confirmación «Listo» y opciones de continuar o volver | Conservar como estado de página. |

No hay confirmaciones destructivas en esta ruta. El asistente contextual pertenece a #188 y usa
una región lateral, no `role="dialog"`; no se rediseñó. Los diálogos encontrados en estructuras de
costo, libro, perfil y configuración son base compartida entre rubros, no superficies declaradas
por los módulos avícolas. Tocarlos habría ampliado el alcance.

Se agregó una aserción Playwright en cada transición anterior: si aparece un `role="dialog"`, el
fallo nombra `/panel-campo`. La captura de página completa que adjunta el fixture documenta cada
viewport. No hay capturas antes/después porque no hubo ningún modal que rediseñar.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** limitar el inventario a la superficie realmente condicionada por
  `PaqueteRubro.modulos`, `/panel-campo`.
  **Qué otra opción había:** incluir todos los diálogos de la aplicación cuando el negocio fuera
  avícola.
  **Por qué elegí esta:** esos componentes también se usan en otros rubros; modificarlos habría
  contradicho el alcance «aplica sólo al rubro avícola» y Constitución §4.
- **Qué decidí:** no reescribir una UI que ya cumplía; agregar la guarda faltante.
  **Qué otra opción había:** cambiar formularios inline sólo para producir un diff visual.
  **Por qué elegí esta:** el commit `1b099d3` ya resolvió la interacción y Constitución §8 limita la
  corrida a lo pedido. La evidencia faltante era verificable con un test, no con otro diseño.

## Dónde el issue no alcanzaba

El issue asumía que existían «modales actuales» avícolas, pero no nombraba rutas, componentes ni
disparadores. El inventario del código mostró que el flujo rúbrico ya era inline y que los overlays
restantes pertenecen a pantallas base compartidas. También pedía capturas antes/después sin definir
qué hacer cuando el inventario no encuentra ningún modal para rediseñar; se conservaron las
capturas automáticas de Playwright y se declaró honestamente que no existe un par antes/después.

## Qué quedó afuera

- Diálogos de `cost-structures`, libro, perfil, configuración y validaciones: no están
  condicionados por módulos avícolas.
- Confirmaciones destructivas: el propio issue las exceptúa.
- No se renombró ni eliminó ningún test.

## Con qué se verifica

```bash
npm run lint
# 0 errores; 109 advertencias preexistentes

npm run typecheck
# verde

npm run test
# 57 archivos; 258 tests pasados

npm run build
# verde

npm run check:feature-tests
# 20/20 features cubiertas

npm run test:e2e -- tests/e2e/panel-campo.spec.ts --project=chromium --grep "carga producción y bajas"
# rojo deliberado con role="dialog": apareció un modal bloqueante en /panel-campo
# restaurado: 1 pasado

npm run test:e2e
# 142 pasados, 2 salteados; cuatro viewports; 8,5 min
```
