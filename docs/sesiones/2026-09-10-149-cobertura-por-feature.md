# 2026-09-10 — La deuda inicial de cobertura por feature quedó saldada

- **Issue:** #149
- **Repo:** CosteAR-frontend
- **Rama:** `test/issue-149-feature-coverage`
- **PR:** #155
- **Agente:** Codex · GPT-5
- **Tanda:** cola de frontend 58 → 59 → 149

## Recursos

| | |
| --- | --- |
| Inicio real | 2026-09-10 21:18 ART |
| Fin real | 2026-09-10 21:38 ART |
| Duración wall-clock | ~20 min |
| Tokens consumidos | no informado |
| Intentos hasta el verde | tests dirigidos de hooks: 2; resto de tests dirigidos: 1; suite unitaria completa: 1; suite E2E completa: 1 |
| Comandos de verificación corridos | `npm run lint`; `npm run typecheck`; `npm run test`; `npm run build`; `npm run check:feature-tests`; `npm run test:e2e` |

## Qué se hizo

Se agregaron pruebas localizadas a las quince features que integraban la excepción inicial del
control de cobertura: `advisor`, `alerts`, `automatizacion`, `dashboard`, `empresa`,
`empresa-portal`, `landing`, `libro`, `macro`, `not-found`, `owner-dashboard`, `profile`,
`propagacion`, `trazabilidad` y `validaciones`. Con ellas, las dieciocho features detectadas por el
repositorio tienen al menos una prueba propia y la lista `EXCEPCIONES_INICIALES` quedó vacía.

La cobertura no se resolvió con pruebas de humo idénticas. Los tests ejercitan el contrato más
relevante de cada módulo: endpoints y habilitación de queries en hooks, límites y etiquetas en
helpers, estados vacío/error/datos en pantallas, navegación, cálculo del recorte de imagen y carga
de presets con su vista previa. No se modificó comportamiento productivo; el único cambio fuera
de tests elimina las excepciones ya pagadas del guard de features.

También se corrió la E2E completa con el backend apagado y las intercepciones existentes de
`page.route()`. La matriz pasó en Chromium, WebKit, Mobile Chrome y Mobile Safari, incluido el
detector de consola y de requests sin mock. No se tocó el splash de cinco segundos ni el timeout
global de quince segundos.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** probar un comportamiento significativo y estable dentro de cada feature.
- **Qué otra opción había:** agregar renders mínimos que solo demostraran que el archivo se puede
  importar.
- **Por qué elegí esta:** el guard exige presencia, pero el objetivo del issue es pagar deuda de
  cobertura; una prueba que no observa contratos, estados o resultados no reduce ese riesgo.

- **Qué decidí:** mantener cada prueba dentro de su propia carpeta de feature.
- **Qué otra opción había:** concentrar varias features en un único test transversal.
- **Por qué elegí esta:** el script descubre cobertura por ubicación. La cercanía también deja
  explícito qué contrato protege cada suite y facilita su mantenimiento.

- **Qué decidí:** resolver las quince excepciones en este único PR de tests.
- **Qué otra opción había:** abrir quince PR parciales y mantener temporalmente excepciones.
- **Por qué elegí esta:** #149 llegó como una sola unidad explícita de la cola y su condición de
  cierre exige que la lista quede vacía. Los archivos siguen siendo independientes y el cambio no
  mezcla implementación productiva.

## Subespecificaciones encontradas

- El issue habla de PRs enfocados por feature, mientras que la cola asignó #149 como un único
  trabajo y la DoD pide cero excepciones. Se preservó el foco mediante quince archivos de prueba
  localizados dentro de un PR exclusivamente de cobertura.
- No fija una métrica porcentual ni un umbral de líneas o ramas. Se aplicó literalmente el guard
  versionado por el repositorio: una prueba calificante por feature y ninguna excepción inicial.
- `empresa-portal` acepta un puesto de dos o más caracteres. El primer intento del test expuso que
  `act` debía importarse desde Testing Library; se corrigió el arnés sin tocar código productivo.

## Fuera de alcance

- Imponer un porcentaje global de cobertura, porque el issue y el guard no definen uno.
- Reescribir suites existentes o cambiar contratos de producción.
- Agregar recorridos E2E nuevos: #149 no cambia UI; la regresión integral se verificó con la matriz
  E2E ya vigente.

## Con qué se verifica

```bash
npm run lint
# 0 errores (109 advertencias preexistentes)

npm run typecheck
# verde

npm run test
# 44 archivos, 213 tests, todos verdes

npm run build
# verde (solo la advertencia preexistente por tamaño de chunk)

npm run check:feature-tests
# 18 features verificadas: 18 cubiertas y 0 excepciones trazadas

npm run test:e2e
# 90 passed, 2 skipped, 0 failed — Chromium, WebKit, Mobile Chrome y Mobile Safari
```
