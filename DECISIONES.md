# Decisiones — Trazabilidad Total v1 (frontend)

Registro de decisiones tomadas de forma autónoma al portar la sección D de la
spec "Trazabilidad Total v1" al frontend real, branch `feature/trazabilidad`.
Regla general: ante ambigüedad, default más simple que cumpla la spec sin
romper pantallas existentes ni arriesgar pérdida de datos. Contraparte
backend: `Git back/DECISIONES.md` (ahí está todo lo de F1-F5 del lado del
servidor, ya implementado antes de esta sesión).

## Alcance y qué NO se tocó

- **No se reemplazó ningún flujo existente.** Los 4 formularios de carga
  (Materia Prima, Mano de Obra, Costos Indirectos, Venta), el cálculo legado
  (`POST /cost-structures/:id/calculate`) y el panel de resultados
  (`ResultPanel`) siguen funcionando exactamente igual. Todo lo nuevo se
  agregó al lado, nunca en reemplazo.
- La pestaña **Historial** no se tocó — la spec (sección D que me pasaron)
  no la menciona entre los 5 puntos a implementar; solo el manual completo
  (que no fue el prompt de esta sesión) sugiere alimentarla desde `/runs`.
  Se puede hacer en una iteración futura sin fricción (el hook
  `useStructureRuns` ya existe).

## Gap de backend encontrado y corregido

Al conectar el árbol real (`GET /calculation-runs/:id/tree`) descubrí que
ningún nodo traía nunca `sourceDpVersionIds` poblado — el campo estaba en el
schema pero el motor nunca lo completaba. Consecuencia: "toda hoja con
sources es clickeable" (D.2) no se podía cumplir con NINGÚN dato real, ni
siquiera con la estructura de ejemplo del seed. Como es un fix acotado,
aditivo y que no toca ni un número del motor (verificado: 193 tests del
backend siguen en verde, incluido el fixture de regresión R5), lo hice en
`Git back` (branch `AlanSandbox`, commit local, sin push) en vez de trabajar
con una demo que nunca se pudiera probar de punta a punta. Detalle técnico en
`Git back/DECISIONES.md`, sección "Addendum — integración con el frontend
real".

**Interpretación pragmática de "hoja con sources":** el enriquecimiento
adjunta el id del DataPoint tanto a las 4 raíces (MP/MOD/CIP/VENTA, si existe
el DataPoint de bloque migrado) como a cualquier nodo interno cuyo `label`
coincida con un DataPoint real (cubre los movimientos de MP creados desde el
frontend, ver más abajo). Esto es un superconjunto de "toda hoja" — las
raíces técnicamente no son hojas (tienen hijos) pero también quedan
clickeables, porque es la única forma de mostrar trazabilidad real en una
estructura recién migrada donde todavía no se cargó ningún movimiento nuevo
campo por campo. No hay downside: simplemente da más puntos de entrada a la
ficha del dato, nunca menos.

## Árbol de derivación (D.1) — `DerivationTree.tsx`

- Se agregó como tarjeta nueva en la pestaña **Resultado**, ARRIBA de la
  tabla de desglose existente (que sigue igual). Si no hay `run` (ni de esta
  sesión ni uno previo cacheado vía `GET /structures/:id/runs`), muestra
  "Presioná Calcular" — nunca números sin run, tal como pide la spec.
- **Calcular ahora dispara dos llamadas**: la legada
  (`POST /cost-structures/:id/calculate`, sin cambios, sigue llenando
  `ResultPanel`) y la nueva de trazabilidad
  (`POST /structures/:id/calculate`). Son independientes a propósito: la
  nueva tiene una validación extra (bloquea si hay datos sin imputar, D.3) y
  si falla, el resultado de siempre se sigue viendo igual — el aviso de error
  queda contenido adentro de la caja del árbol, nunca tapa la pantalla.
- Filas clickeables: subrayado punteado + cursor pointer, exactamente en los
  nodos que el backend marcó con `sourceDpVersionIds` no vacío. Un único
  acordeón abierto a la vez (estado por `dataPointId`, no por nodo — si dos
  nodos apuntan al mismo dato, comparten estado, que es lo esperable).

## Ficha del dato (D.2) — `TraceCard`, dentro del mismo archivo

Implementada 1:1 contra el contrato de `GET /data-points/:id/trace`: estado +
firma, grilla de autores por campo (rol, área, hora exacta con segundos y
zona horaria `America/Argentina/Tucuman`), método + dispositivo, comprobante
(con link "Ver comprobante" si `evidence.fileUrl` existe), períodos (hecho /
captación / imputado), historial de versiones con las anteriores tachadas,
"Impacta en" como cadena, botón "Pedir revisión" (con comentario obligatorio,
llama `POST /data-points/:id/pedir-revision`), id inmutable al pie. Borde
izquierdo granate usando el token existente de la app (`border-granate`, la
paleta real de CosteAR) en vez del hex literal `#6E1423` del mockup original
— mantiene consistencia con el resto de la UI, que ya usa su propio granate.

**Pill de estado (D.4)**: se muestra en el header de la TraceCard (que ya
trae `status` en la respuesta) y también junto a cada fila clickeable del
árbol — ahí no hay un endpoint de "listar data points de la estructura", así
que el estado de las filas se resuelve reusando el mismo fetch de `/trace`
que dispara el click (React Query cachea por `dataPointId`; no hay llamadas
extra). No inventé un endpoint nuevo para esto.

## Doble período (D.3)

- Badge "Período de costo: YYYY-MM" + "Captación: continua" en el header de
  `CostStructurePage`, siempre visible.
- El modal de imputación (`ImputacionModal.tsx`) y la función
  `proposeImputation` (`imputacion.ts`, calco de la del manual) viven en el
  frontend porque el backend **no decide esto solo** — `POST
  /structures/:id/data-points` deja `periodoImputado` en `NULL` siempre; la
  propuesta automática vs. modal es responsabilidad de quien llama.
- **Punto de enganche elegido: movimientos nuevos de Materia Prima.** Es el
  único lugar de la UI actual donde ya existe una fecha por ítem
  (`StockMovement.date`) y el propio manual usa exactamente ese ejemplo
  ("Compra — Proveedor Central"). Al guardar la sección de MP, cualquier
  movimiento agregado en esa sesión de edición (detectado comparando contra
  la cantidad de movimientos que ya traía la estructura al abrir el form, no
  por id) se registra como DataPoint(s) reales: dos hermanos
  (`mp.compra.cantidad` por Depósito + `mp.compra.precio` por Contaduría,
  unidos por `valueJson.movementId`) para compras, uno solo
  (`mp.consumo.cantidad`, área Planta) para consumos — tal como especifica
  el manual §1.1. Si la fecha cae en el período de la estructura, se imputa
  solo (sin modal); si no, se encola el modal (uno por movimiento, en serie).
- **No se extendió este flujo a Mano de Obra ni a Costos Indirectos**: esas
  secciones son configuración agregada (un blob por estructura, sin fecha
  por ítem) — no hay con qué disparar la regla de imputación sin inventar un
  campo de fecha que la spec no pide. Se puede sumar en una iteración futura
  si se necesita.
- **Mismo usuario como autor de cantidad y precio**: la UI actual no tiene
  selector de "quién soy en este movimiento" (área/persona), así que ambos
  campos quedan firmados por el usuario logueado, con las áreas correctas
  (`deposito`/`contaduria`) igual — así se ve en la ficha "autores distintos
  por campo" en el sentido de rol/área, aunque el nombre de persona coincida
  en este demo de un solo usuario.

## F5 — Pulido

- **(a) IAP de solo lectura** y **(c) keys estables por id de centro**: ya
  estaban bien en este repo (verificado leyendo el código, no solo
  asumido) — `DirectLaborForm` ya filtra cualquier "IAP" manual y lo muestra
  derivado en el Resultado; `IndirectCostsForm` ya usa `center.id` (no
  `name`) como clave de `distribution`/`productiveSettings`. No hubo que
  tocar nada.
- **(b) Flag "cambios sin guardar"**: el patrón existente (`react-hook-form`
  `isDirty` + `reset()` al recargar `defaultValues`) ya se limpiaba solo en
  la mayoría de los casos, pero dependía del timing del refetch tras
  invalidar la query. Se hizo explícito e inmediato: los 4 formularios
  (`RawMaterialForm`, `DirectLaborForm`, `IndirectCostsForm`, `SalesTab`)
  ahora llaman `reset()` con los datos recién guardados apenas el `onSave`
  resuelve, sin esperar al refetch.
- **(d) MOD: placeholders + "Cargar ejemplo"**: `catedra-example.ts` ya
  existía en el repo con los valores exactos de la cátedra pero no estaba
  conectado a ninguna pantalla. Se agregó el botón "Cargar ejemplo de la
  cátedra" en `DirectLaborForm` (arriba del todo), que hace `reset()` con
  ese fixture. Los defaults de un formulario vacío (`emptyDirectLabor()`)
  no se tocaron porque ya eran neutros (0 en todo salvo días calendario
  reales — 52 domingos/sábados — que no son "datos de demo", son
  aritmética del año).

## Verificación

- `npm run typecheck` (frontend) y `npm run typecheck` + `npm run test`
  (backend, 193 tests) en verde después de todos los cambios.
- Verificación manual en Chrome contra el backend local real: ver el resumen
  final de la sesión para el paso a paso.

---

## Sesión 2026-07-11 — Correcciones puntuales (F6, Parte 5)

- **(a) Horas presupuestadas**: en `DirectLaborForm` el campo de horas era
  "Horas trabajadas"; se renombró a "Horas presupuestadas" (encabezado + celda)
  y se agregó una nota: son la capacidad normal para la tarifa, no las horas
  reales (esas son el dato de fin de mes). En `ValidacionesPage` el dato viene
  del portal del operador y SÍ es real, así que se etiquetó "Horas trabajadas
  (real)" en vez de renombrar mal (criterio C: real y presupuestado siempre
  etiquetados).
- **(b) Real vs presupuestado en CIF**: la tabla de centros productivos ahora
  tiene un encabezado agrupador ("Presupuestado (calculado)" | "Datos reales
  (fin de mes)") y un separador vertical entre ambos grupos, para no mezclarlos.
- **(d) Período de costo**: ya se mostraba como badge dentro de la estructura
  ("Período de costo: YYYY-MM" + "Captación: continua"); se deja como está.
- **(e) Líneas bordó sobrantes**: los `focus:border-granate` y los headers
  `text-granate-deep` son tema de marca (correctos). Se quitó el único artefacto
  claro: un `border-t` huérfano que dibujaba una línea parcial bajo los
  subheaders "Fijo %/Var %" del prorrateo secundario. El artefacto exacto que
  vio el equipo conviene confirmarlo con un screenshot; el resto del granate es
  intencional.
- **(5.4) IAP**: en el Resultado se muestra "IAP — Inasistencias pagas" con la
  fórmula derivada ("= N días pagos / M efectivos = X%") y la aclaración
  "derivado, solo lectura". El numerador viene del backend (`paidDays`), no se
  inventa en el front.

---

## Sesión 2026-07-11 (cont.) — Trazabilidad visible + escalonado en la UI

- **Pestaña nueva de trazabilidad (F5, Parte 2.3)**: dos rutas internas nuevas
  (`/trazabilidad/dato/$id` y `/trazabilidad/calculo/$runId`) que abren una
  página COMPLETA dentro de la app (mismo layout, mismo login), formato
  comprobante e imprimible (botón Imprimir → window.print). Nunca un dominio
  externo ni un modal del navegador. Se agregaron botones "Abrir en pestaña
  nueva" (target _blank) en el árbol de derivación (encabezado → Ver cálculo)
  y en la ficha in-place del dato (→ Ver dato). La página de cálculo trae un
  selector de corrida (cada recálculo es un snapshot) para abrir varias
  pestañas y comparar; el período de la estructura viaja por query param y se
  muestra como badge.
  - Decisión: el "selector de período" se implementó como selector de CORRIDAS
    reales (las que devuelve `/structures/:id/runs`), que es el eje temporal
    que existe hoy en los datos. El período de costo (atributo de la estructura)
    se muestra como badge. Comparar dos PERÍODOS distintos = abrir dos
    estructuras distintas en dos pestañas (cada una con su período en la URL).
- **Escalonado usable en la UI (Parte 4.4)**: la tabla del prorrateo secundario
  ahora permite repartir a productivos Y a otros servicios (un servicio puede
  entregar a otro que aún no cerró); la columna del propio servicio queda
  bloqueada. El **orden de las filas es el orden de cierre** (con número y
  flechas ▲▼ para reordenar). Al guardar, `closureOrder` se deriva de ese orden
  y activa el motor escalonado. Retrocompatible: con un solo servicio o
  servicios que solo reparten a productivos, el resultado es idéntico al
  directo (no cambia FX1/FX3).

---

## Sesión 2026-07-11 (cont.) — Navegación lista→detalle MP (F4, Parte 3.1)

- **RawMaterialForm** pasó a ser un wrapper LISTA→FICHA: la lista muestra todas
  las materias primas de la estructura (código, nombre, unidad, proveedor,
  costo unitario, existencia inicial, estado) con "Agregar materia prima";
  al hacer click en una se entra a su ficha exclusiva (el form de siempre:
  Wilson propio, política de stock, ficha PPP de movimientos con trazabilidad),
  precedida por la sección "Identificación" (codificación real de mercado) y un
  breadcrumb "Volver a la lista".
- Retrocompat: `toMaterialsList` normaliza la MP única legada a una fila; el
  onSave persiste la sección `{ materials: [...] }` que el backend acepta.
- La lógica de trazabilidad de movimientos nuevos (DataPoints + imputación) se
  conserva por materia prima dentro de la ficha.

---

## Sesión 2026-07-11 (cont.) — CIF lista→ficha por centro (F4, Parte 3.3)

- **CostCentersView**: el tab Costos Indirectos ahora abre en la LISTA de
  centros de costo (tipo productivo/servicio, presupuesto F/V derivado, cuota,
  estado) con la sobreaplicación neta global visible; "Editar configuración"
  alterna al formulario de siempre (que sigue teniendo el escalonado, etc.).
- **Ficha por centro**: conceptos del primario que lo tocan (con su peso),
  presupuesto derivado (fijo/variable/total), cuota predeterminada con su
  fórmula (presupuesto ÷ capacidad normal), datos reales (cap. normal /
  actividad real / CIP real), CIP aplicado y variaciones ETIQUETADAS con su
  lectura contable (favorable/desfavorable, ahorro/exceso, sobre/subaplicación,
  capacidad ociosa). Para servicios: qué reparte y su posición en el orden de
  cierre. Todo LEÍDO del cálculo persistido — el front no recalcula.

---

## Sesión 2026-07-11 (cont.) — MOD lista→ficha por departamento (F4, Parte 3.2)

- **LaborDepartmentsView**: el tab Mano de Obra abre en la LISTA de
  departamentos (remuneración, horas presupuestadas, tarifa, estado) con los
  datos compartidos de la estructura arriba (días efectivos, IAP, ITCS); toggle
  "Editar configuración" al formulario. Ficha por departamento: días efectivos,
  ITCS con su árbol (CSC/B40/F40/B47), tarifa horaria integral con su fórmula,
  y HORAS presupuestadas vs reales separadas y etiquetadas. Detalle por operario
  solo si el modelo los tiene.
- **DirectLaborForm**: columna nueva "Horas reales (fin de mes)" separada de las
  presupuestadas, opcional. Con esto Parte 3 queda completa (MP, MOD, CIF).

---

## Sesión 2026-07-11 (cont.) — UI del historial de config (R1)

- **ConfigHistoryPanel**: panel colapsable "Historial de cambios · APPEND-ONLY"
  al pie de cada sección (MP/MOD/CIF), que lee `GET
  /cost-structures/:id/config-history?section=`. Lista las versiones (más nueva
  primero) con un resumen legible por sección (N materias primas / N
  departamentos / N centros·conceptos / precio×cantidad), timestamp en zona
  America/Argentina/Tucuman, marca "VIGENTE" en la última y JSON expandible del
  snapshot. Hace visible que la fuente de verdad se versiona y nunca se pisa (R1).

---

## Sesión 2026-07-20 — T00: sync AlanSandbox ↔ staging (VERIFICADO, sin merge necesario)

- **Hallazgo (contradice la premisa de la tarea):** al mapear la divergencia en
  vivo el 2026-07-20, `AlanSandbox` y `origin/staging` **NO están divergidos**.
  `origin/staging` está **totalmente contenido** en `AlanSandbox`:
  - `git log --oneline AlanSandbox..origin/staging` → **vacío** (staging no tiene
    ningún commit que AlanSandbox no tenga).
  - `git merge-base AlanSandbox origin/staging` == `origin/staging` tip ==
    `c95a503` (el mismo "fix(ui): etiqueta de prorrateo engañosa..." que la tarea
    citaba como exclusivo de staging → ya está en AlanSandbox).
  - `git merge-base --is-ancestor origin/staging AlanSandbox` → **YES**.
  - `git merge origin/staging` → **"Already up to date."**
- **Causa:** el sync ya se hizo en un merge previo (`43e6863 Merge
  remote-tracking branch 'origin/staging' into AlanSandbox`), y encima de eso
  AlanSandbox agregó `641925c feat(ui): render GASTO cost sections...`. La ruta
  `merge/lautaro-a-dev` / `b3225ab` ya había llevado la trazabilidad + import
  Excel a staging, tal como anticipaba la tarea.
- **Ambos feature sets confirmados presentes en AlanSandbox** (rule #9, default
  simple): Excel import (`759d91c`, `5ad8423 popup de revisión`, `b3225ab`),
  trazabilidad periodos+comparación (`b3225ab`), F4 lista→ficha (MP/MOD/CIF),
  historial config append-only (`dc9e4c8`), y el fix del panel de resultado
  (`8824ba0 mapear latest + costo unitario`).
- **Decisión:** NO se crea ningún merge commit (sería un commit vacío/stray,
  viola rule #3). El `package-lock.json` es idéntico a staging; `npm install`
  reporta "up to date". Verificación de salud del branch (base limpia para el
  trabajo nuevo): `npm run typecheck` ✅, `npm run build` ✅ (solo avisos
  preexistentes de tamaño de chunk / import estático+dinámico de auth-store, no
  errores), `vitest run` ✅ 5/5. El único artefacto de T00 es esta entrada.

## Sesión 2026-07-21 — F01-B: prorrateo secundario, el frontend habla PARES EXPLÍCITOS

**Contexto.** F01-A (backend) reemplazó el array posicional del prorrateo secundario por
pares explícitos con el id del centro destino. Esta tarea hace que el frontend hable ese
mismo contrato. Antes de escribir nada se leyó el contrato real del backend
(`src/shared/schemas/cost.schema.ts`) y su `DECISIONES.md` (estrategia de retrocompatibilidad).

**Contrato espejado exacto.** Cada entrada del reparto secundario ahora lleva
`distributions: { centroDestinoId: string, fijo: number, variable: number }[]` (mismos nombres
de campo que el backend). Se sacaron del tipo los Records posicionales `toProductive` /
`toProductiveFixed` / `toProductiveVariable`.

**Decisión de diseño — traducir en el BORDE, no reescribir la UI.** El estado interno del
formulario sigue editando por CENTRO (Records keyed by id): así la tabla, el salteo de la
columna del propio centro y los `register` por `c.id` no cambian (eran correctos: ya eran por
id, no por posición). Lo único que cambia es qué viaja en el payload:
- Al **guardar** (`cleanIndirectCostsForSubmit`): los Records por id se convierten a
  `distributions` con `centroDestinoId`. Se descarta por seguridad el propio centro (auto-reparto)
  y los pares en cero. En modo 'base' se mandan las unidades como `fijo = variable` con su id.
- Al **cargar** (`cleanIndirectCostsForForm`): se leen los `distributions` que entrega el backend
  (que ya normaliza en `GET`, aun para estructuras guardadas antes del cambio) y se vuelcan a los
  Records por id. Leer por id —no por posición— es lo que evita mostrar los % contra el centro
  equivocado al abrir una estructura vieja.
- Se introdujo un tipo de estado de formulario propio (`IndirectCostsFormValues`) separado del
  tipo de cable (`IndirectCostConfig`), para que el `useForm` y los `register` sigan tipando los
  Records mientras el contrato externo queda en pares.

**Retrocompatibilidad (parámetro #4).** El backend eligió un adaptador de LECTURA: su `GET`
devuelve SIEMPRE `distributions`, así que el frontend nunca ve la forma vieja y no necesita su
propio adaptador. Si una config legada es ambigua (el propio centro como destino, o un centro
inexistente), el backend responde 422 al calcular; el frontend ya surfacea ese mensaje tal cual
(`apiErrorMessage` → `setError`), en español y con el NOMBRE humano del centro, sin exponer ids
ni endpoints (parámetros #5 y #6). No hubo que tocar el manejo de errores.

**Fuera de alcance (F02/F03, se respetó).** No se tocó el reordenar/borrar filas ni el bloqueo
de la columna de un servicio ya cerrado en el escalonado. Solo cambió lo que viaja en el payload.

**Vista de centro (`CostCentersView`).** El detalle de un centro de servicio ahora lista
`distributions` mostrando el nombre humano del destino (fallback al id solo si faltara el nombre).

**Verificación.** `npm run typecheck` ✅, `npm run build` ✅ (solo avisos preexistentes de tamaño
de chunk / import de auth-store), `vitest run` ✅ 11/11 (6 nuevos en
`prorrateo-secundario-pares.test.ts`: el submit manda `centroDestinoId`/`fijo`/`variable`, nunca
el propio centro ni pares vacíos; el orden de las claves no cambia a qué centro va cada valor;
modo base manda unidades como fijo=variable; load lee por id; round-trip estable). El seam de
integración está cubierto por construcción: la forma que produce el submit del frontend es
EXACTAMENTE la que el test de regresión de F01-A valida contra el schema Zod y el motor reales
del backend (2 productivos + 2 servicios cierran en 0, reordenar da idéntico, un solo servicio
anda). No se corrió un click-through en el navegador porque exige levantar Docker+DB+auth+seed
(el daemon de Docker está apagado) y staging todavía no tiene F01-A; los pasos para la
confirmación visual quedan en el resumen para Alan.

## Sesión 2026-07-21 — F05: pantalla de imputación (resolver datos sin imputar)

**Contexto.** F04 (backend, ya en `dev`) marca un cálculo como incompleto cuando corrió con
datos sin decisión de imputación de período, y bloquea el CIERRE del mes con un 422 accionable —
pero no había ninguna pantalla para RESOLVER una imputación, así que el costista chocaba una
pared sin acción posible. Esta tarea construye ese camino. Contrato del backend verificado antes
de escribir (`src/application/cost-structures/calculation-run-service.ts`, `cost-period-service.ts`,
`domain/errors/*`): `data.incompleto` = `{ incompleto, motivos, datosPendientes:[{id,nombre}] }`
(mismo objeto en `results.incompletitud`); el cierre lanza `MissingInputError('periodoImputado', …)`
→ 422 `{ error:{ code:'MISSING_INPUT', message:<español>, details:{ field:'periodoImputado' } } }`.

**Reuso, no reconstrucción (parámetro del prompt).** Se reusaron sin tocar `ImputacionModal`,
`proposeImputation` (imputacion.ts) y `useImputar` (trazabilidad-hooks). Lo nuevo se concentró en
un solo componente, `ImputacionResolver.tsx` (`IncompleteNotice` + `DatoImputacionModal`).

**Las dos opciones del modal salen del manual, no del parafraseo del prompt.** El prompt describió
las opciones como "Imputar a &lt;período del hecho&gt; (devengado)" vs "Mover a &lt;período
actual&gt;", que está invertido respecto del `Manual-Trazabilidad-DEVS-v1.md §3` (fuente de dominio
autorizada, hallada en `C:\Users\Alan\Desktop\` — ver nota de vault abajo). El manual define
textualmente `Imputar a ${periodoCosto} (devengado)` (recomendada) vs `Mover a la estructura ${p}`,
que es EXACTAMENTE lo que ya implementa y testea `proposeImputation`. Regla #4 (no inventar reglas
de dominio) → se siguió el manual y el código existente; no se reescribieron los labels. Queda
anotado por si la cátedra confirma que el parafraseo era el correcto.

**De dónde sale la fecha del hecho.** `datosPendientes` solo trae `{id, nombre}`. Para armar las
dos opciones (que dependen del mes del hecho vs el período de costo) se pide la ficha del dato con
`useDataPointTrace(id)` y se usa `periods.hecho` (`fecha_hecho` en 'YYYY-MM-DD', o null). Si un
dato no tuviera `fecha_hecho`, se ofrece igual "Imputar a &lt;período de costo&gt;" — nunca se deja
al costista sin acción (parámetro NO DEAD ENDS).

**`periodoCosto` = `structure.period`.** Se pasa el período de costo de la estructura (igual que
`RawMaterialForm` y `DerivationTree`), no el `code` del período seleccionado en la barra. Es lo
consistente con el resto del módulo y con la regla del manual; documentado por si en multi-período
se quisiera afinar.

**El aviso va ARRIBA de los números.** En la pestaña Resultado, `IncompleteNotice` se renderiza
antes de `DerivationTree` y `ResultPanel` cuando `incompletitud.incompleto` es true (rojo, con
`role="alert"`, lista los datos por NOMBRE). Cada dato es un botón que abre el modal; al resolver,
se saca de la lista (optimista) y, cuando no queda ninguno, aparece "Volver a calcular" que corre
el cálculo limpio y hace desaparecer el aviso.

**La marca vive en estado de página, no en query.** `incompletitud` se guarda desde la respuesta de
`useCalculateTraced` (se extendió su tipo con `incompleto`). Consecuencia asumida: el aviso aparece
DESPUÉS de calcular en esta sesión; abrir Resultado con un resultado cacheado (sin recalcular) no lo
muestra hasta recalcular, porque no hay endpoint que devuelva `results.incompletitud` de una corrida
vieja sin volver a correr el motor (correr el motor en cada vista de pestaña spamearía corridas y
audit logs). No es un dead end: el CIERRE del período sigue bloqueando y ofreciendo la resolución.

**Cierre del período (mismo camino de resolución).** `PeriodBar` ahora cierra con `runClose`: si el
backend responde el 422 de `periodoImputado`, muestra el mensaje en español del backend TAL CUAL y,
debajo, la misma resolución in-situ (`IncompleteNotice`) con las opciones — al terminar ofrece
"Cerrar &lt;mes&gt;" que reintenta el cierre. La lista de datos se toma, en orden de preferencia, de
`error.details.datosPendientes` (si el backend algún día la adjunta — hoy no la manda) y si no, de
la última corrida (`pendingDatos`, que baja de la página). Si tampoco hay lista a mano (nunca se
calculó en la sesión), un botón "Resolver los datos pendientes" lleva a la pestaña Resultado y
recalcula para poblar el aviso. Nunca se muestra el 422 crudo ni ids (parámetros #5/#6).

**Nota de vault (parámetro #4).** El vault NO está en la ruta documentada del prompt
(`001 - Costear/001.3 - …`). Sí se encontraron en disco `C:\Users\Alan\Desktop\Manual-Trazabilidad-DEVS-v1.md`
y una copia de `Test-Temporalidad-2-Periodos.md` en un output de AppData; el §3 del manual fue la
fuente para las opciones de imputación (arriba). No se consultó Graphify.

**Verificación.** `npm run typecheck` ✅, `npm run build` ✅ (mismos avisos preexistentes de tamaño
de chunk), `vitest run` ✅ 14/14 (3 nuevos en `imputacion-error.test.ts`: reconocer el 422 de
`periodoImputado` por `code`+`field` sin parsear texto; no confundirlo con otros `MISSING_INPUT` ni
otros códigos; extraer `datosPendientes` del error si viniera, o null si no). NO se corrió el
click-through en el navegador: exige Docker+Postgres(:5433)+backend+seed y el daemon de Docker está
apagado / el puerto 5433 no escucha; mutar el backend de `dev` compartido (crear/cerrar períodos)
sería una acción sobre datos compartidos que no corresponde hacer sin pedirlo. Los pasos para la
confirmación visual local quedan en el resumen para Alan.

---

## F04-FIX (2026-07-22) — El dato sin imputar nunca se creaba (bug de timing al guardar)

**Síntoma (verificado en navegador, esta vez con Docker+Postgres+seed levantados).** Agregar una
compra de Materia Prima con fecha de OTRO mes y guardar NO abría el modal de imputación, NO creaba
ningún data point y el movimiento entraba silencioso al cálculo. Consecuencia: la marca de
"resultado incompleto" (F04) y el bloqueo de cierre (F05) nunca se disparaban — no había datos sin
imputar que detectar. El backend estaba OK; el eslabón roto era el alta desde la UI.

**Causa raíz (frontend, `RawMaterialForm.tsx`).** `registerTrazableMovements` calculaba los
movimientos nuevos con `movimientos.slice(baseMovementsCountRef.current)`, pero ese contador lo
pisa el `useEffect` de la prop `material` DURANTE el `await onSaveMaterial`: al guardar, el estado
local sube el conteo al total nuevo y, cuando la registración corría (después del await), el slice
daba vacío y nunca se llamaba a `createDataPoint`. Race determinista (el await de red da tiempo a
React a re-renderizar y correr el efecto).

**Fix.** Capturar los movimientos nuevos ANTES de guardar. Se extrajo `newTrazableMovements(all,
baseCount)` (función pura, en `imputacion.ts`) y en el `onConfirm` se lee `baseMovementsCountRef`
antes del `await`, pasándole la lista explícita a `registerTrazableMovements`. Cambio mínimo, sin
tocar el contrato de datos ni el backend. Los movimientos del mismo mes siguen auto-imputándose
(prop `period` = `structure.period`), sin regresión.

**Test que faltaba (el hueco que dejó pasar el bug).** Nuevo `imputacion-registro.test.ts`:
`newTrazableMovements` selecciona solo los movimientos nuevos de la sesión (incluida la primera
compra de una MP, que el bug también perdía) y descarta los sin fecha; `proposeImputation` deja
"pendiente" (NULL) un movimiento de otro mes y auto-imputa el del mismo mes. (La contraparte
backend agrega el `create → NULL` y el `datosPendientes` del cierre — ver DECISIONES del back.)

**Verificación en navegador (flujo completo, extremo a extremo).** Compra de otro mes → modal con
las 2 opciones → "Decidir más tarde" → 2 POST `/data-points` 201 (cantidad+precio, `periodoImputado`
NULL) → Calcular muestra el aviso rojo "Este resultado está incompleto y no es confiable" nombrando
el dato → "Resolver" abre el modal → imputar borra el dato de la lista sin recargar → resueltos
todos, el aviso pasa a verde → se crea otro pendiente → "Cerrar período" se bloquea con el mensaje
en español (sin ids/endpoints) y ofrece resolver ahí mismo → resueltos, el período CIERRA. Suites:
`vitest run` 20✅ (6 nuevos), `typecheck` ✅, `build` ✅ (mismos avisos preexistentes de chunk).

---

## Sesión 2026-07-22 — F02 + F03: identidad de fila, borrado de centro y escalonado en el prorrateo secundario

Tres defectos relacionados del prorrateo secundario, hallados en pruebas de caja negra el 20/07.
Se arreglan juntos, sin tocar el contrato F01-B (pares explícitos con `centroDestinoId`). El
refactor reciente ya había partido la pantalla: la lógica vive en
`components/indirect-costs/SecondaryAllocationSection.tsx` (tabla del reparto) y en
`IndirectCostsForm.tsx` (estado del formulario); el borde de guardar/cargar en
`components/indirect-costs/helpers.ts`. Se trabajó sobre el código como está HOY.

### F02 — Reordenar/eliminar una fila secundaria perdía su centro

**Causa raíz.** Las flechas ▲▼ (`serviceDists.move`) y el borrado (`serviceDists.remove`) mueven
la fila entera del DOM con su `key={f.id}` estable (los `<input>` de % viajan bien, por eso el
síntoma era "los números sí se mueven"). El que se rompía era el `<select>` de "Centro de
servicio": su lista de `<option>` está **filtrada** para no ofrecer un centro ya usado en otra fila.
Durante el reordenamiento hay un tick donde el valor observado (`watchedServiceDists`) va atrasado
respecto de las filas ya movidas, y el centro propio aparece momentáneamente como "usado en otra
fila" → se quita de las opciones de AMBAS filas → un `<select>` nativo que no encuentra su valor
entre sus `<option>` se resetea solo a "Elegir…". Esa es la corrupción silenciosa (familia N4).

**Fix (decisión).** En vez de cambiar la `key` (ya era estable, no el índice), se garantiza que **el
centro ya elegido en la fila esté SIEMPRE entre las opciones**: `if (c.id === selfId) return true`
antes del filtro de "usado en otras filas". `selfId` se lee con `getValues(...)` (valor VIVO y
síncrono del formulario), no del `watch` atrasado, para que la opción presente coincida exactamente
con el valor que react-hook-form va a fijar en el DOM tras el `move/remove`. Cierra la ventana de
carrera. No se tocó el mecanismo de reordenamiento: sigue siendo puro reordenamiento.

### F02 (defecto #2) — Borrar un CENTRO dejaba una referencia colgada

**Causa raíz.** Al eliminar un centro (`centers.remove`) que se usaba como DESTINO, los `Record`
del reparto (`toProductive*`) de las demás filas seguían con su clave → `centroDestinoId` colgado
que se enviaba al backend (par a un centro inexistente).

**Fix (doble red, decisión).**
1. **En el formulario** (`IndirectCostsForm.tsx`): efecto nuevo, disparado por el cambio del
   conjunto de centros destino, que purga de TODAS las filas cualquier clave que ya no corresponda a
   un centro existente. Idempotente y auto-sanador (también limpia datos viejos corruptos al cargar).
   Así no queda columna fantasma ni referencia colgada en la UI. Las columnas se dibujan desde la
   lista viva de centros, con lo que un centro borrado no genera columna (no hay "columna fantasma").
2. **En el borde del payload** (`helpers.ts`): al guardar, se descarta todo `centroDestinoId` que no
   esté en `centers`. Garantía en el punto que ve el backend, aunque el estado del formulario
   quedara con una clave vieja. Es la red testeable de forma determinista.

### F03 — La regla del escalonado se explicaba pero no se aplicaba

El texto ya decía que un servicio no puede repartir a uno que ya cerró, pero sólo se bloqueaba la
columna propia de cada fila (`isSelf`).

**Fix (decisión).** Para la fila *n* se bloquean las columnas de **todos los servicios de las filas
0..n (incluida ella misma)** — los que ya cerraron según el orden de las flechas. Se calcula por
fila `closedServiceIds` a partir del orden vivo de filas, así que **se recalcula tras cualquier
reordenamiento**. Las columnas bloqueadas se renderizan como "—" (no un input editable en 0), tanto
en modo Manual como en modo Automático (por base). Además, red de seguridad en el guardado
(`helpers.ts`): se descarta todo destino a un servicio ya cerrado, de modo que un valor viejo que
quedara en una columna recién bloqueada tras un reordenamiento **jamás llega al motor** (protege el
"mismos números tras reordenar" del contrato F01).

### Verificación

- **Tests deterministas** (`prorrateo-secundario-pares.test.ts`, 8 casos, todo verde): se agregaron
  2 casos nuevos — (F03) descarta el reparto a un servicio ya cerrado pero conserva el reparto hacia
  adelante y mantiene `closureOrder`; (F02) un destino a un centro eliminado no llega al payload.
  Los 6 casos previos del contrato F01-B siguen verdes (sin regresión de "mismos números").
- **No se agregó infraestructura de test de DOM** (RTL/jsdom/user-event no están instalados y no hay
  entorno jsdom configurado; instalarlos era un cambio pesado y fuera de alcance) **ni se levantó el
  stack completo** (backend + login + datos) para un click-through extremo a extremo, porque esta es
  una tarea sólo-frontend y hubiera sido un pozo. En su lugar se blindó y se testeó el BORDE del
  contrato (el payload que ve el backend), que es donde importa la corrección. El comportamiento de
  UI de F02-#1 (el `<select>` nativo) se fundamenta en el mecanismo conocido de react-hook-form +
  `<select>` filtrado; queda la verificación manual en navegador para el usuario (pasos en el
  resumen). Suites: `vitest run` 22✅, `typecheck` ✅, `build` ✅ (mismos avisos preexistentes de chunk).

---

## F06 — La ficha PPP muestra los movimientos pendientes de imputar y los hace accionables

**Diagnóstico (STEP 1).** La tabla "Movimientos (ficha PPP)" (hoy en el sub-componente
`MaterialDetailForm.tsx`, extraído en el refactor reciente) se dibujaba SÓLO con el JSON de la sección
(`material.movements`), que no tiene noción de imputación ni vínculo con los `data_points`. El estado
"pendiente" (`periodoImputado = null`) vive en el store de trazabilidad — el mismo que cuenta el motor
(F04). **No había filtro por período en el componente ni un endpoint que filtrara: el dato nunca se
cruzaba con su estado de imputación.** Capa culpable: el flujo de datos del frontend.

**Fix (STEP 2).** Nuevo hook `useMpMovements(structureId)` (GET `/structures/:id/mp-movements`, backend)
que trae los movimientos de MP con su `pending` y sus `dataPointIds`. En `MaterialDetailForm`:
- Cada fila cuyo movimiento GUARDADO casa con un pendiente muestra el pill **"Pendiente de imputar"**
  (`PendingBadge`). El pill ES el botón que abre el modal.
- Al tocarlo se encola en el `imputacionQueue` ya existente → se reusa el mismo `ImputacionModal` +
  `useImputar` + `proposeImputation` (NO se creó un segundo modal, criterio de la tarea).
- Al resolver, `useImputar` invalida `['structures', id]` (prefijo de `['structures', id, 'mp-movements']`)
  → la lista se refresca y el pill se limpia. Las filas ya imputadas no cambian.

**Decisiones.**
- **Clave natural** `(tipo · detalle · fecha)` para casar fila↔data points (la sección no guarda
  `movementId`); detalle vacío → `'(sin detalle)'`. Se usa el movimiento GUARDADO (`material.movements[i]`),
  no la fila en edición, para que el pill no parpadee mientras se tipea sin guardar.
- **Huérfanos:** un pendiente que el motor cuenta pero sin fila en esta sección se muestra igual como
  fila extra (sólo lectura, con pill accionable), para que ningún dato sin imputar quede invisible.
- **Cache-key bajo `['structures', id, ...]`** a propósito, para colgar de la invalidación de `useImputar`
  sin tocar la query de la config (`['cost-structures', id]`) → no resetea el formulario en edición.
- Regla #6/#7: al usuario sólo se le muestra el detalle humano + una acción en pantalla; los
  `dataPointIds` son internos y nunca se ven.

**Verificación (navegador contra dev + DB real).** Ver DECISIONES.md del backend (`Costear.api`) — flujo
end-to-end: alta de compra fuera de período → pill "Pendiente de imputar" → click → modal → imputar →
pill limpio y fila normal, con el conteo del motor casando en todo momento. `typecheck` ✅, `build` ✅,
`vitest` 22✅.

## F07 — Doble fecha (fecha_hecho / fecha_captación) en la ficha PPP y en "Agregar"

**Qué se separó.** La tabla de Movimientos (ficha PPP, dentro de `MaterialDetailForm`) tenía UNA sola
columna "Fecha". Se partió en dos:
- **"Fecha del hecho"** — editable, la pone el usuario (es el `movements.[i].date` de siempre; ya se
  mandaba al backend como `fechaHecho`). Es la que dispara la imputación (§3 / F04-F05-F06).
- **"Fecha de captación"** — sólo lectura, valor del servidor. Para un movimiento ya guardado se lee de
  `MpMovement.fechaCaptacion` (nuevo campo del endpoint) y se muestra con `formatDate`. Para una fila
  nueva sin guardar todavía se muestra "Al guardar" (la fija el servidor al registrar el dato — nunca
  el reloj del cliente, regla #6).

**"Agregar Manual" = la misma tabla.** En la ficha de MP, "Agregar" appendea una fila a esta tabla; no
hay un modal aparte. Partir la fecha en la tabla cubre alta y edición. (El botón "Agregar Manual" de
`companies/LedgerTabSection` es el **Libro de costos** de la empresa —`LedgerEntryModal`, con su propio
`docDate` y sin flujo de imputación—, superficie distinta y fuera del alcance de F07.)

**Imputación: se reusa, no se reimplementa.** Cargar una "Fecha del hecho" fuera del período de la
estructura sigue disparando exactamente el flujo existente: `proposeImputation` → `ImputacionModal` →
`useImputar`. F07 no crea lógica de imputación nueva.

**Formato DD/MM/AAAA (regla #4 / anticipo de F09) — decisión.**
- Los renders de sólo lectura usan formato AR: captación con `formatDate` (ISO con hora → DD/MM/AAAA);
  fecha del hecho de las filas huérfanas con **`formatDateOnly`** (helper nuevo en `lib/utils`).
- `formatDateOnly` NO pasa por `new Date()` a propósito: `new Date('2026-06-27')` se interpreta como
  medianoche UTC y en Argentina (UTC-3) se mostraría **un día antes** (26/06). Con fechas date-only se
  reordena el string y se evita el corrimiento.
- El campo **editable** es un `<input type="date">` nativo: su display lo decide el navegador/SO (en un
  equipo es-AR ya muestra DD/MM/AAAA) y su `value` es `YYYY-MM-DD`, que es lo que el backend espera. No
  se le impone una máscara de texto: forzar DD/MM/AAAA en un input nativo rompería el binding y la
  accesibilidad. Se documenta como límite aceptado (queda para F09 si se decide un date-picker propio).

**Retrocompat (regla #5).** Un movimiento sin data point trazable (p. ej. cargado antes de la
trazabilidad, o una fila de la sección sin registrar) no tiene captación conocida: se muestra "Al
guardar"/"—" sin romper. Si tiene data point pero `fechaHecho` es `null`, la fecha del hecho se
muestra "—". Ningún caso crashea.

**Verificación.** `typecheck` ✅, `build` ✅, `vitest` 22✅. Navegador contra dev: ver DECISIONES del
backend (`Costear.api`) para el escenario de factura tardía (hecho 27/06 en estructura 07/2026 →
modal de imputación → se comporta como F06).

---

## F08 — El badge de margen no miente: nunca "MARGEN SANO" sobre un resultado no confiable

**Problema.** El panel de resultados podía mostrar un badge verde "MARGEN BRUTO 53,0 % · MARGEN
SANO" sobre un cálculo con **Materia Prima $0 y CIP $0** (número que no contiene materia prima ni
costos indirectos), o sobre un resultado marcado incompleto por F04. Un costista lee ese verde y
confía en un margen sano que no es real. Es la mitad visible del problema F04.

**Regla implementada.** El estado "sano" (verde/`ok`) NO se renderiza cuando se cumple cualquiera de:
- el resultado viene marcado `incompleto` (flag F04, `incompletitud.incompleto`), **o**
- Materia Prima consumida ≤ 0, **o**
- CIP aplicados ≤ 0.

En esos casos el badge pasa a **advertencia** (tono `warn`, "Margen no confiable") con una explicación
breve en español debajo (motivo específico: sin MP, sin CIP, ambos, o incompleto). El badge de un
resultado genuinamente completo (MP > 0, CIP > 0, no marcado) sigue funcionando igual — sin
sobre-disparo.

**Dónde vive el piso de plausibilidad — decisión (DO #3).** En `marginStatus` (`StatusBadge.tsx`),
no en el panel. Se agregó:
- `marginStatus(marginPct, thresholdPct, trustworthy = true)`: un tercer parámetro con default `true`
  (retrocompatible con los llamados existentes de 2 args). Si `trustworthy === false`, degrada a
  `warn` **antes** de evaluar el margen — ni siquiera un margen alto ni uno negativo se afirman como
  algo cuando el número no es confiable.
- `isResultTrustworthy({ rawMaterialConsumed, indirectCostsApplied, incompleto? })`: regla de negocio
  reusable que decide la confiabilidad. Vive junto a `marginStatus` para que **cualquier** consumidor
  del semáforo (no solo el panel) herede el mismo piso. El `ResultTab` solo la invoca y pasa el
  resultado a `marginStatus`.

**Por qué degradar a `warn` y no mantener `danger` en pérdida.** El requisito es no afirmar "sano".
Con MP=0/CIP=0 el propio margen no es confiable, así que tampoco tiene sentido afirmar "venta a
pérdida" (`danger`) sobre él: se muestra una advertencia neutral que dice explícitamente que el número
no es confiable. Reusa los tonos existentes de `StatusBadge` (`warn`) — no se inventaron colores.

**Alcance del flag F04 (`incompleto`).** Llega por el estado `incompletitud` de `CostStructurePage`
(corrida de trazabilidad de esta sesión). Para un resultado cacheado (`latest`, recién abierta la
página sin recalcular) el flag no está disponible, pero el piso MP=0/CIP=0 —que se computa sobre los
propios valores del `CalculationResult`— sigue actuando como guarda siempre presente. Es exactamente
el caso del reporte, así que queda cubierto con o sin sesión de trazabilidad.

**Terminología (regla #6/#7).** Los mensajes usan términos de cátedra en español ("Materia Prima
consumida", "CIP aplicados") y no exponen identificadores internos ni endpoints.

**Verificación.** `typecheck` ✅, `build` ✅, `vitest` 32✅ (nuevo `StatusBadge.test.ts`, 10 casos,
incluye el escenario exacto del reporte). Navegador contra dev: se importó el **módulo compilado real**
(`StatusBadge.tsx` servido por Vite) y se renderizó el `<StatusBadge>` real para los 3 escenarios de
aceptación → reporte (MP 0/CIP 0/53%) y F04-incompleto pintan "MARGEN NO CONFIABLE" ámbar; completo
pinta "MARGEN SANO" verde. (No se pudo usar el flujo autenticado completo: ingresar contraseña es una
acción que el asistente no ejecuta; la verificación se hizo sobre el componente shippeado real.)

## F09 — Pulido de demo: cerrar los 🟡 del reporte del 20/07 (identificación, cierre, fechas, ids)

Lote de defectos chicos e independientes de UI. Cada uno menor; juntos son lo que hace que el
producto se sienta sin terminar en una demo. Se releyó el estado ACTUAL de cada pantalla (el equipo
refactorizó varias desde el 20/07) y se trabajó contra el código como está hoy.

**F09-1 — "Completa" exige identificación (no solo datos de cálculo).**
Antes una materia prima con nombre/unidad vacíos mostraba el verde "Completa" (se veía "Sin nombre")
con solo tener costo unitario y algún movimiento. Ahora "Completa" pide IDENTIFICACIÓN real.
- **Decisión — set mínimo:** `nombre` + `unidad`. El `código de mercado` y el `proveedor habitual`
  quedan OPCIONALES: no siempre se conocen al cargar y no hacen a la identidad mínima de la MP para
  costear. Regla final: `complete = (nombre && unidad) && (costo unitario > 0 && ≥1 movimiento)`.
- Archivo: `RawMaterialsList.tsx`. Sin identificación → badge gris "Incompleta".

**F09-2 — "cierra en 0" distingue "cerró de verdad" de "no repartió nada".**
Antes cualquier centro de servicio pintaba el mismo verde ("cierra en 0" + estado verde) aunque su
reparto secundario estuviera vacío o roto. Ahora:
- **Señal usada:** la CONFIG del prorrateo secundario (los pesos fijo/variable que cargó el costista).
  Un servicio "repartió algo" solo si tiene fila de reparto, con destinos, y con al menos un peso ≠ 0.
  Es exactamente el caso "reparto empty or broken" del reporte. (Se eligió la config y no el resultado
  del cálculo porque es el origen del defecto y está siempre disponible en esta vista de lectura.)
- Servicio que repartió → verde `Cerrado` + "cierra en 0". Servicio que no → estado ámbar
  `Sin reparto` + texto "sin reparto", y en su ficha un aviso que explica que todavía no cerró.
- Archivo: `CostCentersView.tsx` (helper `serviceDistributes`).

**F09-3 — Fechas en DD/MM/AAAA (formato argentino), por helper compartido.**
Barrido de todas las fechas visibles. Hallazgo: el código YA renderiza es-AR (DD/MM/AAAA) en todos
lados — los helpers `formatDate` / `formatDateOnly` (`lib/utils.ts`) ya existían y estaban en uso, y el
`07/17/2026` del reporte correspondía a pantallas ya refactorizadas desde el 20/07. Se completó el
barrido ruteando por el helper los dos renders de fecha que quedaban con `toLocaleDateString('es-AR')`
inline (`CostCentersView` traza de bases, `MetricsDashboard` "congelado el"). Los `<input type="date">`
(fecha del hecho) son nativos: el navegador los pinta en el locale del SO por spec y NO se pueden forzar
a DD/MM desde el código; su valor guardado y todo lo que se MUESTRA en modo lectura ya va por el helper
en DD/MM/AAAA.

**F09-4 — Sin ids internos en texto de usuario.**
Antes, si un centro no tenía nombre cargado, la UI mostraba su id autogenerado (`prod1`/`serv2`…) como
rótulo. Se creó `centerLabel(center)` en `lib/utils.ts` (`nombre || 'Centro sin nombre'`, nunca el id) y
se ruteó por él TODA referencia de usuario a un centro: lista y ficha de centros, prorrateo primario y
secundario, ajustes productivos, destinos del reparto. La base sin nombre cae a "Base sin nombre".
- **Frontera documentada:** el ÚNICO lugar donde el id sigue visible es su propio campo editable en
  "Centros de costo" (el costista asigna ahí el código a mano, como un SKU) — es un valor de input, no
  un rótulo/mensaje. El `id inmutable: …` de la ficha de trazabilidad es un UUID de auditoría a propósito
  (registro auditable), no un slug tipo `serv3` que reemplace a un nombre; se conserva.

**Verificación.** `typecheck` ✅ + `build` (tsc + vite) ✅ + `vitest` 32✅ sin regresión. La verificación
end-to-end en navegador contra dev requiere sesión autenticada (ingresar contraseña es una acción que el
asistente no ejecuta); los cambios son de lógica de presentación pura y quedan cubiertos por
typecheck/build/suite. Pasos de prueba manual para cada ítem, en el resumen al usuario.
