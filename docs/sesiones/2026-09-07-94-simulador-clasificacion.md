# 2026-09-07 — El simulador consume la clasificación real del dominio

- **Issue:** #94
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-94-simulador-clasificacion`
- **PR:** [#148](https://github.com/Coste-AR/CosteAR-frontend/pull/148)
- **Agente:** Codex · GPT-5
- **Tanda:** B1 · L-07

## Dependencias y contrato verificados

- Backend #185, #190 y #237 están cerrados y sus PR #208, #217 y #261 llegaron a `dev`.
- Se leyó el contrato vigente en backend `dev` de `POST /cost-structures/:id/simulate`.
- La simulación entrega `contribucionMarginal.componentes[]` con la clasificación efectiva de cada
  rubro, `contribucionMarginal.incompleta` cuando falta una clasificación y `puntoEquilibrio`
  calculado por el dominio.
- Las claves declaradas por backend son `comportamiento_materia_prima`,
  `comportamiento_mano_obra_directa` y `comportamiento_costos_indirectos`.

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | no informado por la herramienta |
| Tokens consumidos | no informado |
| Intentos hasta el verde | unidad focalizada: una mutación roja deliberada y restauración verde; E2E nuevo: cuatro ajustes de fixture/espera hasta cubrir las cuatro matrices |
| Comandos de verificación | `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run test:e2e -- tests/e2e/simulador-clasificacion.spec.ts` |

## Qué se hizo

Se declaró en el frontend el contrato aditivo de simulación que ya expone backend. El hook de
simulación conserva ahora `incompletitud`, `contribucionMarginal` y `puntoEquilibrio` en lugar de
recortar la respuesta al resultado histórico.

El simulador de escala dejó de decidir que materia prima es variable y mano de obra y costos
indirectos son fijos. Cada rubro se escala según `comportamientoVolumen`; si falta la clasificación
o llega `SEMIFIJO` sin un tramo variable separado, la proyección se marca incompleta y explica el
motivo. El análisis de capacidad ociosa usa la misma clasificación efectiva.

Antes de proyectar aves se ejecuta una simulación vacía para obtener el contrato vigente del
dominio. Esto evita usar el último cálculo histórico, que puede haber sido persistido antes de que
existiera esta información aditiva.

El punto de equilibrio mostrado proviene directamente de `puntoEquilibrio` en la respuesta del
backend. Se eliminó la fórmula local. Si el usuario activa un escalón local, el punto de equilibrio
se oculta con una explicación porque ese escalón no forma parte del contrato enviado al backend.

En la pestaña de shocks se muestran la contribución marginal, el punto de equilibrio y el estado
incompleto. Los avisos usan `AlertTriangle` de `lucide-react` y tokens del tema existentes.

## Decisiones que tomé sobre la marcha

- **Clasificación fresca:** se consulta el endpoint de simulación al proyectar en lugar de ampliar
  artificialmente el contrato del último cálculo guardado.
- **Semifijos:** no se inventa una proporción. Sin el desglose de sus tramos, el escenario queda
  incompleto.
- **Escalones locales:** no se recalcula el punto de equilibrio en React ni se presenta como válido
  uno que no contempla esos escalones.
- **Unidad visible:** el punto de equilibrio se presenta en cajones, la unidad de negocio de la
  estructura avícola, no como “unidades”.
- **Sin ADR:** se consume un contrato ya aprobado; no se incorpora una decisión arquitectónica
  transversal.

## Dónde el issue no alcanzaba

- El plan de interfaz enlazado ya no está disponible en la ruta indicada de `CosteAR-os/main`. Los
  criterios observables del issue y el contrato de backend sí alcanzan para implementar sin
  inventar reglas.
- El backend clasifica `SEMIFIJO`, pero no entrega todavía el desglose necesario para proyectarlo.
  Se conserva el estado incompleto en vez de adivinar una fórmula.

## Qué quedó afuera

- Rediseñar el simulador.
- Persistir escenarios o escalones.
- Inferir clasificaciones ausentes.
- Recalcular contribución marginal o punto de equilibrio en el frontend.

## Con qué se verifica

```text
npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd run typecheck
sin errores

npm.cmd test
28 archivos aprobados, 181 tests aprobados

npm.cmd run test:e2e -- tests/e2e/simulador-clasificacion.spec.ts
4 tests aprobados en Chromium, WebKit, Mobile Chrome y Mobile Safari (1.4 min)
```

La primera corrida completa de E2E saturó cuatro workers y agotó el timeout en specs no
relacionados. Una corrida serial aisló el único fallo repetido en el spec preexistente de
clasificación: su límite global de 30 s vencía antes de que apareciera la propuesta. Sin cambiar
código, la repetición serial con 90 s pasó en las cuatro matrices:

```text
npm.cmd run test:e2e -- tests/e2e/clasificacion-costos.spec.ts --workers=1 --timeout=90000
4 passed (2.7m)
```

Las capturas adjuntas por Playwright en escritorio y móvil se revisaron visualmente. El aviso de
incompletitud y las tarjetas de contribución y punto de equilibrio quedan visibles sin desborde.

### Prueba roja deliberada

Se alteró temporalmente `escalarPorComportamiento` para que un componente `VARIABLE` no escalara.
Sin cambiar el test, la suite focalizada falló en las dos comprobaciones sensibles a esa regla:

```text
expected 2,800,000; received 1,400,000
expected approximately 2,722,222; received 1,900,000
2 failed, 9 passed
```

Se restauró la implementación y el mismo comando volvió a verde:

```text
npm.cmd test -- src/features/cost-structures/simulador-avicola.test.ts
1 archivo aprobado, 11 tests aprobados
```

## Privacidad

No se incorporaron datos de clientes. Los fixtures, identificadores y montos del E2E son
sintéticos.
