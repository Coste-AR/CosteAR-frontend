# 2026-09-10 — Los trabajos de terceros ya se cargan fuera de los CIP

- **Issue:** #59
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-59-trabajos-terceros`
- **PR:** pendiente
- **Agente:** Codex · GPT-5
- **Tanda:** cola de frontend 58 → 59 → 149

## Recursos

| | |
| --- | --- |
| Inicio real | 2026-09-10 15:42 ART |
| Fin real | 2026-09-10 21:07 ART |
| Duración wall-clock | ~5 h 25 min, incluida la pausa de la sesión |
| Tokens consumidos | no informado |
| Intentos hasta el verde | E2E dirigida en Chromium: 2; E2E dirigida WebKit/Safari: 1; suite E2E completa: 1; repetición final del spec en los cuatro perfiles: 1 |
| Comandos de verificación corridos | `npm run lint`; `npm run typecheck`; `npm run test`; `npm run build`; `npm run check:feature-tests`; `npx playwright test tests/e2e/trabajos-terceros-periodo.spec.ts --project=chromium`; `npx playwright test tests/e2e/trabajos-terceros-periodo.spec.ts --project=webkit --project='Mobile Safari'`; `npx playwright test tests/e2e/trabajos-terceros-periodo.spec.ts`; `npm run test:e2e` |

## Qué se hizo

Se agregó **Trabajos de terceros** como pestaña propia del costeo por órdenes, ubicada al lado de
Costos Indirectos pero fuera de su formulario. La pantalla acepta un único importe no negativo del
período y lo guarda mediante el endpoint específico del backend. Un período cerrado conserva el
importe visible, pero elimina las acciones de escritura y explica que primero hay que reabrirlo.

La interfaz deja explícita la secuencia **costo normal → trabajos de terceros → costo real** y
aclara que el importe no se prorratea entre centros, no genera cuota y no es un CIP. Al guardar,
el resultado existente queda marcado como desactualizado hasta ejecutar el botón **Calcular**.

El resultado usa los renglones que entrega el motor (`productionCost`, `thirdPartyWork` y
`realProductionCost`) para mostrar costo normal, trabajo tercerizado y costo real sin rehacer la
cuenta monetaria en el navegador. Las corridas históricas que no contienen el desglose conservan
la presentación anterior, porque no hay evidencia suficiente para reconstruirlo.

La E2E usa `page.route()`, `testConSesion`, `laAppPinto()`, el detector de consola y capturas con
`testInfo.attach()`. Verifica que cero no cambie el costo, que cargar $1.000 eleve el costo real de
$6.000 a $7.000 y el COGS de $5.500 a $6.500, y que un período cerrado quede solo lectura. No se
levantó el backend, no se tocó el splash y se mantuvo el timeout global de 15 segundos.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** usar una pestaña propia, contigua a Costos Indirectos.
- **Qué otra opción había:** poner el campo dentro del formulario de CIP o en Venta.
- **Por qué elegí esta:** el ADR backend 0009 exige que el costista lo vea como un renglón separado
  que no se prorratea. Compartir el formulario de CIP contradecía el criterio central del issue.

- **Qué decidí:** mostrar el renglón de trabajos de terceros incluso cuando vale cero en una
  corrida nueva.
- **Qué otra opción había:** ocultarlo si no hay tercerización.
- **Por qué elegí esta:** el cero es un estado válido y permite comprobar que costo normal y real
  permanecen iguales; ocultarlo volvería ambiguo si el motor lo recibió o si la UI lo perdió.

- **Qué decidí:** no reconstruir el desglose en corridas históricas que no traen los campos nuevos.
- **Qué otra opción había:** inferir trabajos de terceros restando totales.
- **Por qué elegí esta:** esa diferencia también puede contener amortización y variación
  presupuesto. Inferirla atribuiría importes al renglón equivocado.

## Subespecificaciones encontradas

- El issue pide un campo claro, pero no fija su ubicación exacta. Se resolvió como pestaña propia
  para preservar la separación contable indicada por el ADR.
- No define si guardar debe recalcular automáticamente. Se mantuvo el patrón de #58: aviso de
  resultado viejo y cálculo explícito con el botón existente.
- El endpoint vive en la estructura y refleja el período abierto; el motor documentado que lo usa
  es el de Órdenes. No se mostró el campo en Procesos porque su cálculo e informe son distintos.

## Fuera de alcance

- Desglose por proveedor, comprobante o tipo de servicio: el contrato vigente acepta un solo
  importe del período.
- Integración con el motor de Costeo por Procesos: no hay evidencia de que ese informe consuma el
  campo.
- Cambios al diálogo compartido de confirmación, aunque la E2E constató que no expone
  `role="dialog"`; el test usa su título, mensaje y botones accesibles reales.

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
# 18 features verificadas: 3 cubiertas y 15 excepciones trazadas

npm run test:e2e
# 90 passed, 2 skipped, 0 failed — Chromium, WebKit, Mobile Chrome y Mobile Safari

npx playwright test tests/e2e/trabajos-terceros-periodo.spec.ts
# 8 passed — flujo abierto y cerrado en los cuatro perfiles
```
