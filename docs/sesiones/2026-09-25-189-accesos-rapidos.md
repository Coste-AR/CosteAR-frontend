---
issue: 189
repo: CosteAR-frontend
pr: 229
rama: feat/189-settings-accesos
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-25T07:01-03:00
fin: 2026-09-25T07:53-03:00
minutos: 52
tokens: no-informado
clears: 0
intentos_hasta_verde: 12
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-25 — Cada persona ordena sus accesos rápidos

## Qué se hizo

- Se agregó en la pestaña Preferencias una tarjeta que lista únicamente el catálogo resuelto por
  el backend, permite elegir hasta seis accesos y muestra el contador de la selección.
- Los accesos elegidos se pueden ordenar por arrastre. También tienen botones de subir y bajar para
  teclado, teléfono y tecnologías de asistencia.
- Guardar envía `PUT /me/preferencias` con el orden visible y actualiza la caché que ya consume el
  home. Un 422 muestra el mensaje del backend —incluida la clave rechazada— sin borrar la selección.
- Una entrada del catálogo sin `destino` se omite y deja un `console.warn`; no aparece como acceso
  muerto.
- Se agregaron tres pruebas de componente y dos flujos Playwright. El flujo feliz captura Settings,
  arrastra un acceso, guarda y comprueba en el home que los tres accesos aparecen en el mismo orden.
  El camino de falla comprueba el 422 y la conservación de la selección.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** reutilizar los hooks de preferencias que ya consume el dashboard y agregar allí
  la mutación que actualiza `['user-preferences']`.
  **Qué otra opción había:** crear un segundo cliente de preferencias dentro de Profile.
  **Por qué elegí esta:** evita dos contratos y hace que el home vea el resultado del guardado sin
  una lectura extra. Aplica Constitución §4: el catálogo del paquete sigue siendo la única fuente.
- **Qué decidí:** implementar arrastre HTML y controles explícitos de subir/bajar.
  **Qué otra opción había:** agregar una dependencia de drag-and-drop o dejar sólo el arrastre.
  **Por qué elegí esta:** no agrega peso al producto y conserva una alternativa operable en teclado
  y pantallas táctiles, donde el arrastre HTML no es confiable.
- **Qué decidí:** filtrar defensivamente entradas sin `destino` y avisar con `console.warn`.
  **Qué otra opción había:** confiar en que backend nunca incumpla el contrato o mostrar la entrada
  deshabilitada.
  **Por qué elegí esta:** cumple el camino de falla agregado sin inventar rutas ni mostrar ruido
  (Constitución §2, §4 y §9).
- **Qué decidí:** no tocar la implementación del bloque del home.
  **Qué otra opción había:** reinterpretar los criterios originales y volver a modificarlo.
  **Por qué elegí esta:** la decisión escrita del 23-09 declara que #189 es sólo Settings y el PUT;
  el home pasó a #185 y ya está en `dev` (Constitución §8 y §9).

## Dónde el issue no alcanzaba

- «Ordena arrastrando» no definía alternativa para teclado o teléfono. Se conservaron ambos caminos:
  arrastre y botones de posición.
- «Registra el aviso» no definía canal. Se usó `console.warn`, visible para diagnóstico sin tratar
  un contrato degradado como un error fatal de página.
- El wrapper global de `npm` apunta a una instalación inexistente; todos los scripts se ejecutaron
  con `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` o con el binario local.
- La primera corrida Playwright reutilizó AgencyBrain en `localhost:5173`; se descartó porque no
  probaba este repo. Se levantó Vite aislado en `127.0.0.1:5174`.
- La primera corrida global paralela dejó un único fallo de arranque: `#root` vacío en un smoke de
  Mobile Chrome. El caso pasó aislado y la corrida global final en serie quedó completamente verde.

## Qué quedó afuera

- No se agregaron widgets ni rutas: se muestran únicamente entradas del catálogo backend.
- No se modificó el home ni su comportamiento ante errores de GET: ese alcance fue trasladado a
  #185 por la decisión escrita en el cuerpo de #189.
- No se tocaron preferencias ajenas a `home.accesosRapidos`.

## Con qué se verifica

```bash
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
# 0 errores; 109 advertencias preexistentes

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test
# 62 archivos; 274 tests pasados

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run check:feature-tests
# 20 features cubiertas; 0 excepciones

$env:E2E_BASE_URL='http://127.0.0.1:5174'
node .\node_modules\playwright\cli.js test --workers=1
# 174 pasados; 2 salteados; 17.1 min; cuatro proyectos
```
