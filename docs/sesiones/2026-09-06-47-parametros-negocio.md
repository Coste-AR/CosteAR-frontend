# 2026-09-06 — Parámetros del negocio

- **Issue:** #47
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-47-parametros-negocio`
- **PR:** [#135](https://github.com/Coste-AR/CosteAR-frontend/pull/135)
- **Agente:** Codex · GPT-5
- **Dependencia:** CosteAR-backend#260, cerrada por backend PR #262

## Contrato verificado

Antes de implementar se leyó el diff que llegó a backend `dev`. El listado
`GET /companies/:companyId/parametros-costeo` entrega por parámetro `clave`, `valor`,
`descripcion`, `unidad`, `valorDefault`, `seguro`, `origen`, `confirmado` y, cuando corresponde,
`nota`. El `DELETE /companies/:companyId/parametros-costeo/:clave` borra el override del nivel
empresa y devuelve la cascada ya resuelta. No se copió el catálogo al frontend.

## Qué se hizo

Se agregó una pestaña Parámetros al detalle de empresa. La lista usa el orden y el contenido que
devuelve el backend y muestra la descripción antes que la clave técnica, la unidad junto al campo,
el valor sugerido y una identificación visual distinta para valores del sistema y valores de la
empresa.

Una estimación no segura de origen `default` muestra la `nota` del backend bajo “Falta verificar”.
Una convención segura sigue identificada como valor del sistema: que sea segura no significa que la
empresa la haya confirmado.

Guardar manda el número con `confirmado: true`. Volver al sugerido usa `DELETE`; no vuelve a guardar
el default como si lo hubiera elegido la empresa. Después de ambas operaciones se invalida el
listado para que `origen`, `confirmado` y `valor` vuelvan resueltos por el backend.

La pantalla aclara que los cambios aplican a cálculos nuevos y que un período cerrado conserva los
valores con los que cerró. No intenta recalcular ni modificar meses cerrados desde React.

## Tests y evidencia

Se agregaron seis tests focalizados: tres del componente y tres del contrato HTTP. Verifican origen,
nota, descripción, guardado explícito, `confirmado: true` y reset por `DELETE`.

El E2E autenticado abre la pestaña, confirma una estimación, restablece un override, comprueba la
petición y el estado re-resuelto, rechaza errores de consola, mide desborde horizontal y salida del
viewport, y adjunta la pantalla completa.

```text
npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd run typecheck
sin errores

npm.cmd test
28 archivos aprobados, 187 tests aprobados

npm.cmd run test:e2e -- tests/e2e/parametros-negocio.spec.ts
4 aprobados en Chromium, WebKit, Mobile Chrome y Mobile Safari

npm.cmd run test:e2e
70 aprobados, 2 omitidos, 2.4 min
```

Las capturas de Chromium y Mobile Chrome se revisaron visualmente. En la primera generación de la
captura mobile se expandió el contenedor flex sin acotarlo y el artifact quedó deformado, aunque la
medición de la UI real no mostraba desborde. Se corrigió sólo el montaje de evidencia, se agregó una
aserción contra el viewport y la captura final quedó legible, en una columna y sin cortes.

El primer E2E focalizado también detectó una respuesta ausente para `/benchmarks/General`: el detalle
consulta ese fallback antes de conocer el rubro. Se completó el fixture y la única repetición pasó.

### Prueba roja deliberada

Se cambió temporalmente el payload de guardado de `confirmado: true` a `confirmado: false`. Sin tocar
el test, la corrida falló con código 1 y mostró la diferencia exacta:

```text
expected "spy" to be called with arguments
- "confirmado": true,
+ "confirmado": false,

Test Files  1 failed (1)
Tests       1 failed | 2 passed (3)
```

Se restauró solamente `confirmado: true`. La misma corrida volvió a verde:

```text
Test Files  1 passed (1)
Tests       3 passed (3)
```

## Decisiones

- La pantalla es genérica: no conoce las seis claves avícolas ni contiene textos específicos de un
  cliente. El rubro y su catálogo siguen siendo responsabilidad del backend.
- Se acepta coma o punto decimal al escribir porque la interfaz está en español argentino; el borde
  HTTP siempre recibe un `number`.
- No se oculta la clave técnica, pero queda como dato secundario. La descripción contractual es el
  título que explica qué está editando la persona.
- No se agregó confirmación intermedia al reset: es reversible guardando otra vez y el backend audita
  la decisión. El botón dice explícitamente a qué estado vuelve.
- No se agregó ADR: se consume un contrato ya decidido en backend sin introducir arquitectura nueva.

## Fuera de alcance

- Configurar overrides por estructura o período: esta pantalla opera al nivel empresa definido por
  el issue.
- Recalcular períodos cerrados o reproducir la cascada en el frontend.
- Crear o modificar el catálogo y sus defaults.

## Privacidad

No se incorporaron datos de clientes. Los tests usan empresas, rubros, parámetros e identificadores
sintéticos.
