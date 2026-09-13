---
issue: 57
repo: CosteAR-frontend
pr: 160
minutos: 22
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# Los dos costos unitarios quedaron visibles y rotulados

La pantalla de Resultado ahora presenta juntos el costo unitario de producción y el costo
unitario de productos terminados. El segundo se lee directamente de
`detail.unitCost.unitFinishedGoodsCost`: React no reproduce ninguna cuenta del motor. La
explicación visual distingue lo gastado en el período de lo que costó aquello que efectivamente
salió terminado, y aclara tanto la diferencia causada por el trabajo sin terminar como una
coincidencia válida.

El nombre de la unidad se obtiene de `result.unidadGestion.nombre`. Cuando la API devuelve
`unidadGestion: null`, ambas cifras dicen **Sin unidad declarada**; no se usa «unidad», «caja» ni
otra alternativa plausible. Las corridas históricas anteriores al contrato se mantienen
compatibles: si no traen unidad o costo de productos terminados, la pantalla declara qué dato no
fue informado en vez de completar uno.

La guarda roja deliberada fue
`npm run test -- src/features/cost-structures/components/tabs/result-unit-costs.test.tsx`.
Antes de implementar fallaron sus tres casos porque no existían el resumen, el segundo renglón,
la explicación de coincidencia ni el estado sin unidad. La segunda corrida pasó los tres.

La verificación final fue `npm run typecheck`, `npm run lint`, `npm run test` y
`npm run test:e2e`. TypeScript pasó; ESLint terminó con cero errores y 109 advertencias
preexistentes; Vitest pasó 216 tests en 45 archivos; Playwright pasó 90 casos y dejó 2 skips
esperados en Chromium, WebKit, Mobile Chrome y Mobile Safari, con captura completa adjunta por
caso. No desapareció ni cambió de nombre ningún test: se agregaron tres casos unitarios y se
amplió un E2E sin renombrarlo.

No se agregaron componentes, librerías de íconos, conversiones, claves de rubro ni datos de
clientes. Los nombres e importes de las pruebas son ficticios.
