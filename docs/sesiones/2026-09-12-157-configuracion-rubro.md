---
issue: 157
repo: CosteAR-frontend
pr: 162
rama: feat/issue-157-configuracion-rubro
agente: codex
modelo: gpt-5
tanda: B1
inicio: 2026-09-12T17:20-03:00
fin: 2026-09-12T17:55-03:00
minutos: 35
tokens: no-informado
clears: 0
intentos_hasta_verde: 6
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-12 — El cliente configura qué partes de su rubro usa

## Qué se hizo

Se agregó una sección Configuración dentro de Mi perfil. Desde ahí se elige la empresa —cuando la
cuenta administra más de una—, se ven todos los módulos que declaró su rubro y se los prende o
apaga después de leer la consecuencia. La confirmación de apagado aclara antes de actuar que el
contenido dejará de verse y que los datos guardados no se borran.

Las preguntas de opción se dibujan con el texto y las opciones que devuelve la API. Se pueden
responder o dejar como «No sé todavía». Una pregunta nueva que queda pendiente no genera ninguna
escritura; una que ya estaba respondida vuelve a pendiente con `DELETE`, nunca guardando un valor
sugerido ni enviando un `PUT` falso.

La misma sección se reutiliza como el primer tramo del alta: módulos, preguntas y resumen. Al
terminar continúa hacia la configuración de estructura objetivo que ya existía. La pestaña
Parámetros sigue dibujando y guardando sólo los valores numéricos, con el comportamiento previo.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** reutilizar `CompanyRubroConfiguration` tanto en Perfil como en el recorrido de
  alta.
  **Qué otra opción había:** construir una segunda pantalla específica para onboarding.
  **Por qué elegí esta:** el issue exige que el alta sea un modo de la sección editable, no otra
  implementación que pueda divergir.
- **Qué decidí:** en Perfil, seleccionar automáticamente la primera empresa y mostrar un selector
  sólo cuando hay más de una.
  **Qué otra opción había:** obligar siempre a elegir o agregar la configuración dentro de cada
  ficha de empresa.
  **Por qué elegí esta:** conserva el acceso pedido desde el ícono de perfil sin agregar un paso
  innecesario a quien administra una sola empresa.
- **Qué decidí:** «No sé todavía» no hace ninguna request si la pregunta ya estaba pendiente y usa
  `DELETE` si había una respuesta confirmada.
  **Qué otra opción había:** limitar «No sé» a preguntas nuevas o mandar un valor vacío por `PUT`.
  **Por qué elegí esta:** `DELETE` restaura la ausencia real y cumple el contrato sin inventar una
  respuesta.
- **Qué decidí:** después del resumen, continuar hacia el setup de estructura objetivo existente.
  **Qué otra opción había:** reemplazarlo o navegar directo a la ficha de empresa.
  **Por qué elegí esta:** el issue no autorizaba eliminar ese flujo y el alta ya llegaba a esa ruta.
- **Qué decidí:** antes de prender un módulo mostrar su descripción y la cantidad de datos que
  pedirá, sin nombrar las claves técnicas.
  **Qué otra opción había:** hardcodear etiquetas del rubro en el frontend.
  **Por qué elegí esta:** el contrato no entrega los textos de preguntas inactivas y el issue
  prohíbe expresamente escribirlos en este repo.

## Dónde el issue no alcanzaba

- No definía cómo elegir una empresa desde un perfil que puede administrar varias.
- No definía qué debía pasar con la configuración de estructura objetivo que ya ocupaba la ruta de
  alta; se preservó como paso posterior.
- No existe un estado persistente de «onboarding completado». Por eso el acceso normal posterior
  vive en Perfil y entrar de nuevo manualmente a `/companies/:id/setup` vuelve a mostrar el
  recorrido, precargado con lo que ya está guardado.
- El `GET` de módulos apagados trae las claves técnicas de sus parámetros, pero no las descripciones
  ni opciones. El `GET` de parámetros sólo devuelve los que pertenecen a módulos prendidos. Esto
  impide enumerar por nombre, antes de prender, qué datos se pedirán sin hardcodearlos. Se registró
  en `CosteAR-backend#332`:
  https://github.com/Coste-AR/CosteAR-backend/issues/332#issuecomment-5648630066
- El contrato no entrega un mapa de pantallas o botones existentes por módulo (`screens` está vacío
  en el paquete actual). En este alcance, lo único ya renderizado y atribuible a esos módulos son
  sus preguntas; el E2E verifica que el campo de un módulo apagado no exista en el DOM. Las
  pantallas y botones que usarán la configuración pertenecen a los issues posteriores que éste
  destraba.

## Qué quedó afuera

- No se tocaron `#96`, `#97`, `#98`, `#124` ni `#57`.
- No se abrió un issue nuevo. El único faltante de contrato se dejó como comentario en el issue de
  backend indicado por `#157`.
- No se modificaron el splash, el aviso sobre cálculos nuevos y períodos cerrados, ni el guardado
  de parámetros numéricos.

## Con qué se verifica

```bash
npm run lint
# verde: 0 errores; conserva 109 warnings preexistentes

npm run typecheck
# verde

npm run test
# verde: 47 archivos, 224 tests

npm run test:e2e
# verde: 98 passed, 2 skipped, 100 totales en cuatro viewports (6.0m)

npm run build
# verde

npm run check:feature-tests
# verde: 18 features cubiertas, 0 excepciones
```

El rojo deliberado cambió temporalmente la aserción del caso apagado para exigir que
`option-question-tipo-detalle` estuviera visible. Playwright falló con `element(s) not found`, que
es la evidencia de que el campo no estaba oculto con CSS: no existía en el DOM. Restaurada la
aserción `toHaveCount(0)`, los dos casos nuevos quedaron 8/8 en Chromium, WebKit, Pixel 5 e iPhone
12.
