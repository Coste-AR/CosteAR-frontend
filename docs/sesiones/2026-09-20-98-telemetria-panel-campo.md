---
issue: 98
repo: CosteAR-frontend
pr: 193
rama: feat/98-telemetria-panel-campo
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-20T09:02:48-03:00
fin: 2026-09-20T09:29:10-03:00
minutos: 26
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-20 — Medir dónde se abandona una carga sin guardar datos del cliente

## Recursos

El rojo deliberado fue el test unitario del nuevo hook antes de implementarlo: fallaron los dos
casos nuevos porque `useRecordPanelTelemetry` todavía no existía. El primer E2E focalizado dejó
11 de 12 casos verdes y falló una vez en WebKit esperando que apareciera `#root` después del splash;
se reejecutó una sola vez, sin cambiar código, y pasó 12 de 12. Por eso
`intentos_hasta_verde: 2`.

## Qué se hizo

El panel de campo ahora envía telemetría al endpoint que agregó backend #354:
`POST /api/v1/companies/:companyId/telemetria-panel`. Los eventos quedan persistidos en el backend,
no en el navegador ni en un proveedor inventado.

Al tocar Huevos o Gallinas se registran `ACCION_TOCADA` y `CARGA_INICIADA`. Si la persona vuelve a
la lista o sale de la pantalla antes de guardar, se registra `CARGA_ABANDONADA`; si la carga
operativa se guarda, se registra `CARGA_COMPLETADA`. Abandono y finalización llevan el tiempo
transcurrido en milisegundos. El backend agrega el momento exacto con su reloj al persistir cada
evento.

La telemetría viaja por una mutación separada y no se espera para confirmar la carga. Si ese POST
responde 503, la producción o la baja se guardan igual y la pantalla muestra «Listo».

## Decisiones que tomé sobre la marcha

- **Qué decidí:** medir la duración desde que se toca el botón de una carga hasta que se guarda,
  se vuelve a la lista o se abandona la pantalla. **Qué otra opción había:** empezar a medir recién
  al escribir el primer valor. **Por qué elegí esta:** el contrato sólo define una clave técnica de
  acción y no permite inspeccionar valores del formulario; el primer toque es el comienzo observable
  y no inventa datos (Constitución §2).
- **Qué decidí:** considerar abandono tanto el botón «Volver a las cargas» como desmontar la
  pantalla con una carga abierta. **Qué otra opción había:** medir únicamente el botón interno.
  **Por qué elegí esta:** salir por la flecha, el navegador o un cambio de ruta también es abandonar
  una carga; ignorarlo escondería justamente dónde se traba la persona.
- **Qué decidí:** cerrar las acciones posibles en TypeScript a `produccion`, `plantel`, `alimento`
  y `peso`, y enviar únicamente esa clave y la duración. **Qué otra opción había:** aceptar cualquier
  string y confiar sólo en el rechazo del backend. **Por qué elegí esta:** una lista cerrada reduce
  la posibilidad de que termine viajando texto libre o identificatorio y mantiene la telemetría
  separada de los datos del cliente (Constitución §2 y §4).
- **Qué decidí:** emitir la telemetría sin bloquear ni mostrar su error en la interfaz.
  **Qué otra opción había:** esperar el POST antes de confirmar la carga. **Por qué elegí esta:** la
  medición es secundaria; perder una carga operativa por medirla contradice el criterio del issue.
- **Qué decidí:** escribir primero los casos de contrato y falla, verlos rojos y recién después
  implementar el hook. **Qué otra opción había:** probar sólo al final. **Por qué elegí esta:** es
  la secuencia exigida por Constitución §5.

## Dónde el issue no alcanzaba

- No definía cuándo empieza el cronómetro. Se tomó el toque que abre el formulario.
- No definía qué navegación cuenta como abandono. Se cubrieron el regreso explícito y la salida de
  la pantalla, sin marcar como abandono una carga ya completada.
- Pedía registrar «cuándo», pero el contrato backend no acepta un timestamp del cliente: la hora la
  asigna el servidor al persistir. El frontend no duplicó ni inventó ese campo.
- El endpoint limita la duración a 24 horas. El frontend aplica el mismo máximo para que una pestaña
  olvidada no produzca un evento inválido.

## Qué quedó afuera

- Consulta, retención y panel de análisis de la telemetría, explícitamente fuera del issue.
- `alimento` y `peso` no generan eventos todavía porque sus botones no están disponibles en el
  panel actual. La lista técnica ya los contempla para cuando esas cargas existan.
- No se agregó reintento ni cola offline: el criterio prioriza la carga operativa y no define una
  política de recuperación de telemetría.

## Con qué se verifica

```bash
npm run lint        # 0 errores; 109 warnings preexistentes
npm run typecheck   # verde, sin salida
npm run test        # 53 archivos, 250 tests pasados
npm run test:e2e    # 130 pasados, 2 salteados, 0 fallados; cuatro viewports, 8.6 min
npm run build       # verde; sólo advertencia preexistente por chunks mayores a 500 kB
npm run check:feature-tests  # 19 features cubiertas, 0 excepciones
```

El E2E del panel adjunta captura de página completa en cada caso. Además verifica una carga
parcial abandonada, que los eventos no incluyen el valor escrito ni campos de negocio, y que una
respuesta 503 de telemetría no impide guardar la producción.
