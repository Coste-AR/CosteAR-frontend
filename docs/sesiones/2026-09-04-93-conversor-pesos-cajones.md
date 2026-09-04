# 2026-09-04 — Conversor de pesos a cajones

- **Issue:** #93
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-93-conversor-cajones`
- **PR:** [#119](https://github.com/Coste-AR/CosteAR-frontend/pull/119)
- **Agente:** Codex · GPT-5
- **Tanda:** B1

## Dependencias verificadas antes de empezar

- `CosteAR-frontend#89` estaba cerrado por el PR #106.
- `CosteAR-backend#199` estaba cerrado por el PR #232.
- Se inspeccionó `origin/dev` del backend: `OwnerDashboardService` ya transforma el precio
  promedio mediante el factor de la `UnidadMedida` configurada como `cajon` y lo expone en
  `precioPromedioVenta` dentro de `GET /periods/:id/tablero-dueno`.

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | no informado por la herramienta |
| Tokens consumidos | no informado |
| Intentos hasta el verde | Las corridas efectivas pasaron en el primer intento. Hubo intentos previos que no iniciaron porque el sandbox de Windows impidió a esbuild leer la configuración de Vite. |
| Comandos de preparación | `git checkout dev`, `git pull`, `npm.cmd ci`, `npx.cmd playwright install --with-deps`, `npm.cmd run briefing` |
| Comandos de verificación | `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npx.cmd playwright test tests/e2e/tablero-dueno.spec.ts`, `npm.cmd run test:e2e` |

## Qué se hizo

Se agregó al tablero de la empresa una calculadora que recibe un importe en pesos y muestra a
cuántos cajones equivale según el precio promedio de venta del período. También deja visibles el
precio aplicado y el código del período, para que la equivalencia no parezca un número permanente.

La calculadora no guarda el importe ni el resultado. Cuando el backend marca el precio promedio
como incompleto —por ejemplo, porque no hubo ventas— el campo queda deshabilitado, no se calcula
nada y se muestran el motivo y la acción que falta.

El E2E existente del tablero ahora comprueba una conversión con valores sintéticos, la trazabilidad
del precio/período y el caso negativo. Ese segundo caso también adjunta una captura de página
completa en cada viewport. No se eliminó ni se renombró ningún test.

## Decisiones y supuestos

- **Fuente del precio:** no se agregó una consulta ni una conversión de unidades en React. El
  endpoint del tablero ya entrega el precio promedio por cajón después de aplicar `UnidadMedida`;
  por eso el único cálculo de la herramienta es `importe / precioPorCajon`.
- **Importes admitidos:** el issue no define importes negativos. Se aceptan cero y valores
  positivos con centavos; un valor negativo no produce equivalencia.
- **Redondeo:** el resultado se muestra con hasta dos decimales mediante el mismo formato de
  cajones que ya usa el tablero. No se altera el valor del precio entregado por el backend.
- **Sin carga todavía:** antes de que llegue la respuesta del tablero, la calculadora permanece
  inactiva igual que el resto de los indicadores de la pantalla.
- **Sin ADR:** no se tomó una decisión arquitectónica nueva; se aplicó el contrato ya definido por
  backend #199 y por el endpoint del tablero.

## Evidencia y verificación

```text
npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd run typecheck
sin errores

npm.cmd test
20 archivos, 149 tests aprobados

npx.cmd playwright test tests/e2e/tablero-dueno.spec.ts
12 tests aprobados en Chromium, WebKit, Mobile Chrome y Mobile Safari

npm.cmd run test:e2e
46 tests aprobados, 2 omitidos, 2.1 min
```

Las capturas de escritorio, Mobile Chrome y el caso sin precio se revisaron visualmente. El
conversor conserva el orden del único scroll, no desborda horizontalmente y el mensaje negativo
queda legible en móvil.

Los primeros intentos de Vitest y Playwright no llegaron a iniciar: esbuild recibió `Access is
denied` al resolver `vite.config.ts` dentro del sandbox. Se repitieron con el permiso de lectura
necesario y las suites efectivas pasaron sin reintentos ni cambios de código.

## Qué quedó afuera

- Guardar importes o resultados.
- Agregar un selector de período o una navegación nueva.
- Completar alertas y cargas pendientes del tablero.
- Tomar los otros issues de frontend que esperan contratos de backend.
