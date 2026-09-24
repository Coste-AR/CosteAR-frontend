---
issue: 197
repo: CosteAR-frontend
pr: 203
rama: feat/197-equilibrio-tramos
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-23T01:01:00-03:00
fin: 2026-09-23T01:42:00-03:00
minutos: 41
tokens: no-informado
clears: 0
intentos_hasta_verde: 4
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-23 — El equilibrio deja de prometer un volumen imposible

## Qué se hizo

- El tablero consulta la función de equilibrio por tramos y el listado que conserva la fuente de cada techo físico.
- Cuando hay tramos, la tarjeta deja de publicar un único punto de equilibrio y deriva a una vista con rango, techo, fuente, equilibrio operativo o ausencia declarada.
- La transición muestra el punto de resultado indiferente, el volumen vinculante y la alerta cuando queda menos de 15% hasta el techo siguiente.
- El valor `qAritmetico` fuera de rango nunca se renderiza. El caso AM-09 comprueba que el tramo actual declara la ausencia y que el siguiente muestra 874,24 con margen de 8,1%.
- Si la API confirma que no hay tramos, se conserva exactamente la presentación anterior.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** consultar juntos `GET /tramos-costo/equilibrio` y `GET /tramos-costo`.
  **Qué otra opción había:** mostrar sólo el cálculo y omitir la fuente del techo.
  **Por qué elegí esta:** el issue nombra ambos contratos y la fuente es la evidencia del límite físico; Constitución §3 exige que el contexto del valor viaje con él.
- **Qué decidí:** tratar el primer tramo ordenado por el backend como actual y los siguientes como alternativas sucesivas.
  **Qué otra opción había:** recalcular el tramo a partir de la actividad del tablero.
  **Por qué elegí esta:** el dominio backend ordena por `desde` y su caso AM-09 llama `actual` al primero; recalcular o reinterpretar la función en frontend violaría FE-07 y Constitución §9.
- **Qué decidí:** ocultar el número legacy mientras la comprobación carga o falla, y restaurarlo sólo ante una respuesta válida con cero tramos.
  **Qué otra opción había:** mostrarlo mientras tanto con una advertencia.
  **Por qué elegí esta:** un valor potencialmente imposible no puede presentarse como operativo; Constitución §2 exige declarar la ausencia antes que inventar validez.
- **Qué decidí:** mostrar `q`, `qIndiferencia`, `binding` y `porcentajeMargen` tal como llegan.
  **Qué otra opción había:** derivar en frontend el siguiente equilibrio o el porcentaje.
  **Por qué elegí esta:** el backend ya resuelve R29–R31 y FE-07 prohíbe recalcular números de negocio.

## Dónde el issue no alcanzaba

- El cuerpo usa los nombres conceptuales `siguienteEquilibrio` y `puntoIndiferente`, pero OpenAPI publica una lista ordenada con `q` y transiciones con `qIndiferencia`. Se verificaron OpenAPI, la función de dominio, su test AM-09 y el ADR backend 0028 antes de mapearlos.
- No decía qué hacer durante un error de red. Se eligió no mostrar el número único hasta poder comprobar el rango físico.
- No especificaba dónde ubicar el detalle. Se mantuvo la grilla de seis métricas y se agregó un panel inmediatamente después del resumen para no romper el orden existente.
- Playwright reutilizó inicialmente otro producto que ocupaba el puerto 5173. La verificación válida se ejecutó contra Vite de este repo en 5174 mediante `E2E_BASE_URL`.

## Qué quedó afuera

- La creación y edición de tramos y la persistencia de la foto auditable por `POST` no forman parte de #197.
- No se agregó un selector para múltiples empresas: el tablero conserva su contrato actual de identificar una única empresa.
- No se eliminó ni renombró ningún test.

## Con qué se verifica

```bash
npm run lint
# 0 errores; 109 advertencias preexistentes

npm run typecheck
# verde

npm run test -- --maxWorkers=1
# 59 archivos; 264 tests pasados

npm run build
# verde; 2.840 módulos transformados

npm run check:feature-tests
# 20 features cubiertas; 0 excepciones

E2E_BASE_URL=http://localhost:5174 npm run test:e2e
# 150 pasados; 2 salteados; 9,2 min; cuatro viewports
```

El primer Vitest completo con 59 workers agotó el timeout de 5 segundos en dos pruebas sin fallas de aserción; la repetición en serie pasó completa. El primer Playwright focalizado reutilizó AgencyBrain en 5173 y no contó como validación del producto. El rojo deliberado se obtuvo antes de implementar: faltaban el componente y el hook nuevos.
