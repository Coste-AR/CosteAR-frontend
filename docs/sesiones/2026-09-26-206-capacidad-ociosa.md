---
issue: 206
repo: CosteAR-frontend
pr: 0
rama: feat/206-capacidad-ociosa
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-26T07:02:09-03:00
fin: 2026-09-26T07:36:00-03:00
minutos: 34
tokens: no-informado
clears: 0
intentos_hasta_verde: 14
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-26 — La capacidad ociosa muestra primero lo que se dejó de ganar

## Qué se hizo

- Se agregó al tablero del negocio el análisis M7-01 consumiendo
  `GET /companies/{companyId}/analisis/capacidad-ociosa` mediante TanStack Query.
- R22 aparece como indicador principal y declara su motivo cuando el backend no puede calcularlo.
- La capacidad ociosa de mano de obra muestra horas, costo, desglose y la alerta redactada por el
  motor. Las variaciones de presupuesto y volumen de CIP viven en otro bloque con su control de
  dos vías; no existe un total que sume MOD y CIP.
- Las tres vías permanecen bloqueadas y reproducen el motivo del backend.
- Se cubrieron el contrato HTTP, AM-05, el camino de ausencia y la separación MOD/CIP con pruebas
  de componente y Playwright en cuatro viewports, incluida una captura de página completa.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** integrar M7-01 en el tablero del negocio, junto a los análisis de equilibrio.
  **Qué otra opción había:** crear una ruta nueva sin navegación definida por el issue.
  **Por qué elegí esta:** el repo ya concentra allí punto de cierre, equilibrio por tramos y
  equilibrio sectorial; una ruta nueva habría requerido inventar su acceso (Constitución §9).
- **Qué decidí:** renderizar los cuatro bloques recibidos y no derivar ningún total, porcentaje ni
  fórmula en React.
  **Qué otra opción había:** sumar MOD con la variación de volumen CIP o reconstruir el control de
  dos vías.
  **Por qué elegí esta:** esa suma duplica capacidad y el backend es la fuente de verdad de los
  números y sus controles (Constitución §3 y §4).
- **Qué decidí:** mostrar literalmente el motivo de ausencia de R22 y el motivo que bloquea tres
  vías.
  **Qué otra opción había:** reemplazar los valores nulos por cero o por un texto genérico.
  **Por qué elegí esta:** una ausencia se declara y nunca se inventa (Constitución §2).
- **Qué decidí:** convertir `unidades_por_periodo` en la etiqueta visible «unidades por período».
  **Qué otra opción había:** exponer la clave técnica o inferir una unidad desde el rubro.
  **Por qué elegí esta:** conserva la unidad explícita del contrato sin mostrar jerga técnica ni
  deducirla del tenant (Constitución §1 y §3).

## Dónde el issue no alcanzaba

- No definía una ruta ni la posición del análisis. Se ubicó en el tablero, después de los bloques
  de equilibrio y antes de las referencias externas.
- No definía el texto visible para la ausencia de `manoDeObra`, cuyo objeto nullable no trae un
  motivo propio. Se usó «Sin datos de capacidad de mano de obra» y no se mostró cero.
- El contrato trae datos opcionales de la corrida y de MOD que el criterio no pide mostrar. Se
  limitó la pantalla a R22, horas/costo/desglose/alerta, las dos vías de CIP y el bloqueo de tres
  vías para no ampliar el alcance.
- `node_modules` no existía y la primera ejecución no encontró Vitest. Después de `npm ci`, la
  sandbox restringida impidió que esbuild leyera la configuración; las verificaciones válidas se
  ejecutaron con el permiso de lectura necesario.

## Qué quedó afuera

- No se implementó la descomposición CIP en tres vías: backend la bloquea hasta O1-02.
- No se agregaron fórmulas, redondeos ni mutaciones de capacidad en frontend.
- No se creó una pantalla o entrada de navegación nueva.
- No se eliminó ni renombró ningún test.

## Con qué se verifica

```bash
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
# 0 errores; 109 advertencias preexistentes

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test
# 64 archivos; 282 tests pasados

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run check:feature-tests
# 20 features cubiertas; 0 excepciones

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test:e2e -- --workers=1
# 182 pasados; 2 salteados; 15,1 min; cuatro proyectos
```
