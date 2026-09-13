# 2026-09-10 — El desperdicio del mes ya se puede declarar y ver en el resultado

- **Issue:** #58
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-58-desperdicios`
- **PR:** #153
- **Agente:** Codex · GPT-5
- **Tanda:** cola de frontend 58 → 59 → 149

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | ~60 min hasta la primera suite completa en verde |
| Tokens consumidos | no informado |
| Intentos hasta el verde | lint: 2; E2E dirigida en Chromium: 5; E2E dirigida WebKit/Safari: 1; suite E2E completa: 3 |
| Comandos de verificación corridos | `npm run briefing`; `npm run lint`; `npm run typecheck`; `npm run test`; `npm run build`; `npm run check:feature-tests`; `npx playwright test tests/e2e/desperdicios-periodo.spec.ts --project=chromium`; `npx playwright test tests/e2e/desperdicios-periodo.spec.ts --project=webkit --project='Mobile Safari'`; `npm run test:e2e` |

## Qué se hizo

Se agregó la pestaña **Desperdicios** al costeo por órdenes. Para el período seleccionado permite
listar, cargar, corregir y dar de baja registros usando los cuatro endpoints que ya ofrecía el
backend. Los registros sin naturaleza quedan destacados como pendientes y la pantalla explica que
no entran al cálculo; los normales y extraordinarios muestran su consecuencia económica.

El formulario valida en el navegador y el backend que el recupero no supere el valor perdido. En
un período cerrado la lista queda disponible para consulta, pero no hay acciones de escritura y se
explica que primero hay que reabrir el período.

Guardar un cambio marca el resultado como desactualizado. La persona usa el botón **Calcular** ya
existente y la pestaña Resultado muestra los importes que devuelve el motor: merma normal absorbida,
recupero, merma extraordinaria y pendientes excluidos. El navegador no recalcula dinero.

La E2E nueva recorre el flujo completo con `page.route()`, `laAppPinto()`, el detector de consola y
capturas adjuntas por viewport. También se dio a dos specs preexistentes un presupuesto total de
90 segundos: WebKit agotaba sus 30 segundos durante el clic o la captura obligatoria bajo la carga
paralela de la suite. No se cambió el timeout de `expect` de 15 segundos ni el splash.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** mostrar la carga de desperdicios sólo en costeo por órdenes.
- **Qué otra opción había:** agregar la pestaña también al flujo de Procesos.
- **Por qué elegí esta:** el contrato y el ADR #0008 del backend conectan estos registros con
  `CalculationResult`, el motor de órdenes. El motor y el informe de Procesos son distintos; mostrar
  ahí una entrada sin efecto comprobado prometería una integración que no existe.

- **Qué decidí:** guardar no dispara un cálculo automático; deja una advertencia visible hasta que
  la persona usa **Calcular**.
- **Qué otra opción había:** recalcular inmediatamente después de cada alta, edición o baja.
- **Por qué elegí esta:** el cálculo puede fallar por otras secciones incompletas y ya tiene una
  acción explícita y trazable. La advertencia evita presentar el resultado anterior como vigente.

- **Qué decidí:** el tercer estado, sin declarar, es una opción visible y deliberada del formulario,
  con alerta y badge propio.
- **Qué otra opción había:** tratar la naturaleza como un select opcional sin explicación o asumir
  `normal` por defecto.
- **Por qué elegí esta:** el issue y el ADR dicen que sin declarar no equivale a normal y que ese
  registro debe quedar fuera del cálculo.

- **Qué decidí:** ampliar a 90 segundos el tiempo total de las E2E preexistentes de clasificación y
  parámetros, sin cambiar sus aserciones.
- **Qué otra opción había:** volver a ejecutar la suite hasta que pasara o entregar con el comando
  obligatorio en rojo.
- **Por qué elegí esta:** fallaron dos veces seguidas bajo WebKit/Safari, siempre al estabilizar un
  clic o producir la captura. El protocolo documenta que esa evidencia puede tardar más de 30
  segundos; después del cambio pasaron en aislamiento y en la suite completa.

## Dónde el issue no alcanzaba

- No decía dónde debía vivir la pantalla; se ubicó junto a Materia Prima dentro de las pestañas de
  una estructura por órdenes porque el desperdicio pertenece al período activo de esa estructura.
- No decía si guardar debía recalcular automáticamente ni cómo evitar mostrar un resultado viejo.
- No aclaraba si el alcance incluía Costeo por Procesos. El contrato disponible sólo demuestra la
  integración con Órdenes.
- El backend acepta cantidad física y unidad opcionales, pero el issue no define de qué catálogo se
  elige la unidad ni exige esa captura; se implementó el valor monetario y el recupero que sí forman
  parte de los criterios verificables.
- No definía el diseño de edición y baja. Se usó un modal para edición y el diálogo de confirmación
  existente para la baja lógica.

## Qué quedó afuera

- Cantidad física y unidad del desperdicio. Requieren definir el catálogo y la experiencia de carga;
  no se abrió un issue nuevo porque no bloquean ningún criterio del #58.
- Integración del desperdicio con el motor de Costeo por Procesos. No se simuló un contrato que el
  backend no expone para ese motor.

## Con qué se verifica

```bash
npm run lint
# 0 errores (109 advertencias preexistentes)

npm run typecheck
# verde

npm run test
# 29 archivos, 190 tests, todos verdes

npm run build
# verde

npm run check:feature-tests
# 18 features verificadas

npm run test:e2e
# 82 passed, 2 skipped, 0 failed — Chromium, WebKit, Mobile Chrome y Mobile Safari
```
