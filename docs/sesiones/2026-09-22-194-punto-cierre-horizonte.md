---
issue: 194
repo: CosteAR-frontend
pr: 202
rama: feat/194-punto-cierre
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-22T21:01-03:00
fin: 2026-09-22T21:46-03:00
minutos: 45
tokens: no-informado
clears: 0
intentos_hasta_verde: 3
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-22 — El tablero separa el punto de cierre de 1 y 12 meses

## Qué se hizo

- El tablero del negocio consume `GET /companies/:companyId/analisis/punto-cierre` con los
  horizontes 1 y 12 y con el precio, el equilibrio económico y la actividad que ya publica el
  tablero. El frontend no vuelve a calcular ninguna de esas cifras.
- La pantalla muestra los dos horizontes por separado, la unidad declarada por la API, el texto
  doctrinario obligatorio y la situación entre punto de cierre y equilibrio.
- Un horizonte con `valor: null` muestra `Sin dato` y el motivo que devolvió el backend; no cae a
  cero ni reutiliza el valor del otro horizonte.
- Se agregaron pruebas de componente, del hook HTTP y de Playwright con captura en escritorio y
  teléfono.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** integrar el bloque en el tablero del negocio y alimentar el GET con
  `precioPromedioVenta`, `puntoEquilibrioCajones` y `producidoCajones` ya resueltos por backend.
  **Qué otra opción había:** crear una pantalla nueva o reconstruir esos valores desde el
  resultado de costeo. **Por qué elegí esta:** el plan M3-03 pide el texto en pantalla y el
  tablero ya contiene las tres magnitudes; reutilizarlas respeta Constitución §2 y FE-07.
- **Qué decidí:** consultar el punto de cierre sólo cuando `GET /companies` identifica exactamente
  un negocio y las tres magnitudes están completas. **Qué otra opción había:** elegir la primera
  compañía o mandar valores incompletos. **Por qué elegí esta:** la decisión escrita para
  `EMPRESA_ADMIN` define un solo tenant; elegir una fila en silencio o inventar un dato
  contradiría Constitución §2 y §9.
- **Qué decidí:** mostrar la unidad de la respuesta del punto de cierre, no la del tablero por
  inferencia. **Qué otra opción había:** asumir que ambas siempre coinciden. **Por qué elegí
  esta:** Constitución §3 exige que la unidad viaje con el valor.

## Dónde el issue no alcanzaba

- No decía en qué pantalla ubicar el bloque. El plan canónico M3-03 y las magnitudes ya visibles
  llevaron a integrarlo en `/owner-dashboard`.
- El endpoint exige `companyId`, `precioUnitario`, `puntoEquilibrioEconomico` y `actividad`, pero el
  issue no indicaba su fuente. Se usó la única compañía de `EMPRESA_ADMIN` y los valores completos
  del mismo tablero, sin elegir ni recalcular cifras.
- La primera corrida de Playwright apuntó a otro producto que ya ocupaba el puerto 5173. Se
  levantó este repo en 5174 y se declaró `E2E_BASE_URL` para que la verificación probara CosteAR.
- El primer fixture del punto de cierre fijaba `cajon`; los casos de otro rubro y unidad ausente lo
  detectaron. Se corrigió para heredar la unidad declarada en cada respuesta del tablero.

## Qué quedó afuera

- La carga y versión de importes por concepto: pertenece al contrato backend #403.
- Moneda homogénea: la respuesta declara `nominal: true` y la pantalla lo informa.
- No se agregaron fórmulas ni valores de respaldo en frontend.

## Con qué se verifica

```bash
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
# 0 errores; 109 advertencias preexistentes

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" test -- --maxWorkers=1
# 58 archivos; 261 tests pasados

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run check:feature-tests
# 20/20 features cubiertas

$env:E2E_BASE_URL='http://localhost:5174'
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test:e2e
# 146 pasados; 2 salteados; cuatro viewports; 11,6 min
```

El rojo deliberado fue el test de componente antes de que existiera
`PuntoCierrePanel`: falló por módulo ausente y pasó después de implementar el contrato visual.
