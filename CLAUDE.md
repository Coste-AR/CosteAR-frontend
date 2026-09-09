# CosteAR — Frontend · reglas del repo

> Este archivo lo lee Claude Code automáticamente al arrancar cada sesión en este repo.
> Es el criterio con el que se juzga si una decisión es correcta — no es documentación del proyecto.
>
> **Estas reglas tienen prioridad sobre lo que diga un issue.** Si un issue las contradice, gana la regla y se avisa.
>
> Formato: cada regla tiene **ID** y **fuente/fecha**. Las marcadas `⛔ SUPERADA` ya no aplican; quedan para trazabilidad.

---

## 0. Reglas de oro

1. **Ante la duda, frená y preguntá.** Nunca elijas por el usuario cuando hay ambigüedad real.
2. **Verificá antes de afirmar.** No digas que algo "está mergeado" o "es solo reformateo" sin haberlo mirado.
3. **No amplíes el scope de lo pedido.** Si el trabajo crece, avisá **antes** de crecerlo.
4. **Nada irreversible sin OK explícito:** `push`, PRs, merges, config de deploy.
5. **Los issues son referencia, no especificación.**
6. **Nunca `--no-verify`.** Si un hook te frena, el hook tiene razón.

---

## 0.bis La filosofía: diagnosticar, planificar, recién ahí implementar

**La forma de trabajar, no una recomendación.** Diagnosticar con números → planificar con
alternativas descartadas → recién ahí implementar, y verificar donde el trabajo va a vivir, no
donde uno está parado. Se movió el 22-08-2026 para no cargarla en cada sesión sin importar la
tarea. La versión completa —con el caso que la probó y el detalle de cada trampa— vive en
[`CosteAR-admin/docs/2026-08-22-filosofia-diagnosticar-planificar-implementar.md`](https://github.com/Coste-AR/CosteAR-admin/blob/dev/docs/2026-08-22-filosofia-diagnosticar-planificar-implementar.md)
(fuente canónica: el Second Brain de Santiago, fuera de los repos de código).

---

## 1. Contexto del proyecto

CosteAR es un SaaS de costeo para profesionales de costos en PyMEs. Este repo es la **SPA del producto**.

**Desde agosto 2026 hay un cliente real usándolo.** Un número mal mostrado en pantalla es una
decisión de negocio equivocada del cliente, no un detalle visual.

| Repo | Qué es | Visibilidad |
|---|---|---|
| `Coste-AR/CosteAR-backend` | API | pública |
| `Coste-AR/CosteAR-frontend` | Este repo | pública |
| `Coste-AR/CosteAR-admin` | Panel interno + **bitácora del desarrollo** | privada |
| `Coste-AR/costear-knowledge-base` | Bóveda que alimenta el RAG | privada |

---

## 2. Stack y comandos reales

React 19 + TypeScript strict · Vite · TanStack Router + Query · Zustand · Tailwind v4 ·
React Hook Form · Axios · Vitest · **npm**.

```bash
npm run dev          # vite (proxy /api → backend :3000)
npm run lint         # eslint src
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # tsc -b && vite build
```

|ID|Regla|
|---|---|
|**CMD-01**|**`npm` siempre.** Nunca mezclar con pnpm o yarn.|
|**CMD-02**|Requiere el backend corriendo en `http://localhost:3000`.|

---

## 3. Ramas, commits y PRs

### Ramas

```
feature-branch → dev → staging → main
```

|ID|Regla|
|---|---|
|**GIT-01**|**Nunca push directo a `main`, `staging` ni `dev`.** Todo entra por PR. GitHub lo bloquea.|
|**GIT-02**|Las ramas salen de **`dev`**, nunca de `main`.|
|**GIT-03**|Nombre: `<tipo>/<slug-corto>` — solo `a-z0-9-`, máximo 40 caracteres.|
|**GIT-04**|`main` solo acepta PRs desde `staging`. `staging` solo desde `dev`.|
|**GIT-05**|Ninguna rama se mergea con el CI en rojo.|

### Commits

```
<tipo>(<scope>): <descripción en imperativo>
```

Tipos: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `ci` · `build` · `perf` · `style` · `revert`
Scopes típicos de este repo: `costeo`, `onboarding`, `auth`, `dashboard`, `trazabilidad`, `ui`, `router`, `api-client`, `ci`.

|ID|Regla|
|---|---|
|**COM-01**|**Un commit = un cambio lógico.** Si tocaste dos cosas sin relación, son dos commits.|
|**COM-02**|Lo valida `commitlint` en el hook `commit-msg`. Nunca `WIP` ni "cambios varios".|
|**COM-03**|Se puede escribir en español; la config desactiva `subject-case` a propósito.|

Usá `/costear-commit`.

### Pull Requests

Se abren con `/costear-pr`.

|ID|Regla|
|---|---|
|**PR-01**|**`Closes #N`** solo si el PR cierra el issue **entero**. Si no, `part of #N`.|
|**PR-02**|Antes de pedir review: tests, lint y typecheck en verde localmente.|
|**PR-03**|Si no lo describís en 3 bullets, es más de un PR.|
|**PR-04**|**Todo PR nace en DRAFT.** GitHub **impide mergear un borrador**: mientras el trabajo crece, nadie lo mergea por error. Se marca `gh pr ready` cuando está listo de verdad — y se dice **«terminé de pushear»**. Entre el 20 y el 22-08 se perdieron 4 PRs de trabajo por mergear PRs que todavía estaban creciendo; en un caso, 12 minutos antes del commit que faltaba.|
|**PR-05**|**Nadie mergea a mano, y el agente no mergea nunca — tampoco con `gh pr merge --auto`.** Desde el 30-08-2026 un PR entra solo cuando pasan dos cosas: todos sus checks en verde (cero checks no cuenta como verde) **y** alguien le puso la etiqueta `auto-merge`. La etiqueta la pone Santiago y es el juicio humano que **reemplaza al review**. Mergea `.github/workflows/auto-merge.yml`: squash contra `dev`, merge commit contra `staging`, y `main` a mano. El agente llega hasta `gh pr ready` y avisa. Canónico: `CosteAR-os/ORQUESTACION.md`.|
|**PR-06**|**Después de mergear, verificar que el trabajo LLEGÓ** (`git log origin/dev`), no que el PR figura en verde. Un PR apilado mergeado contra su rama de abajo aparece como `MERGED` y el trabajo no llega. Pasó 3 veces entre el 20 y el 21-08.|

---

## El briefing automático y `ESTADO.md`

Al abrir cualquier sesión de Claude en este repo, un hook (`SessionStart`) corre
`.claude/hooks/briefing.mjs` e **inyecta el estado real del proyecto** antes de que nadie escriba
nada: la rama, si `origin/dev` avanzó, los PRs abiertos, los issues asignados y el contenido de
`ESTADO.md`.

|ID|Regla|
|---|---|
|**EST-01**|**`ESTADO.md` es el mensaje del orquestador**: qué se está haciendo, qué **no** tocar y por qué. Se inyecta entero en cada sesión, así que vale más **corto que completo** — máximo 20 líneas. **Cada repo tiene el suyo**: lo que no hay que tocar acá no es lo mismo que en el backend.|
|**EST-02**|**Actualizarlo al abrir y al cerrar un bloque de trabajo.** Un estado viejo es peor que ninguno: enseña a ignorarlo, igual que un semáforo que siempre está en rojo.|
|**EST-03**|**El briefing nunca puede romper una sesión.** Si `git` o `gh` fallan, imprime lo que pudo y sigue. Se prueba con `node .claude/hooks/briefing.mjs`.|
|**EST-04**|**Cada línea del briefing ocupa contexto de la conversación real.** Antes de agregarle algo: ¿cambia lo que la persona va a hacer? Si no, no va.|
|**EST-05**|**Antes de commitear un cambio en `.claude/settings.json`, correr `node .claude/hooks/briefing.mjs --check-settings`.** Un `settings.json` inválido **se descarta entero**, no solo la parte mal escrita — y el error recién aparece al abrir una sesión nueva.|

> **Por qué existe.** La trazabilidad estaba escrita en documentos, y un documento depende de que
> alguien se acuerde de leerlo — el mismo modo de fallar que el diagnóstico del 22-08 encontró en el
> flujo de PRs. Además envejece. Esto no reemplaza la documentación: la vuelve innecesaria de buscar.
>
> El script es **el mismo en los tres repos**. Si se cambia acá, se cambia en los tres.

---

## 4. Decisiones y trazabilidad

|ID|Regla|
|---|---|
|**DOC-01**|Toda decisión técnica no obvia va a un ADR: `docs/adr/NNNN-slug.md`. Se crea con `/costear-adr`.|
|**DOC-02**|`DECISIONES.md` es **registro histórico** de Trazabilidad Total v1. **No agregar nada nuevo ahí.**|
|**DOC-03**|Al cerrar una sesión, correr `/costear-bitacora`.|

---

## 4.bis Definition of Done

**Cuándo algo está "terminado", no solo "andando en mi máquina".** Resumen operativo (Nivel 1):
probado en `staging` —no alcanza tu máquina—, PR con la plantilla completa, `lint` + `typecheck` +
`test` en verde, sin `console.log` de debug, commits atómicos. **Si tocó UI o un flujo: hay un
test de Playwright que lo recorre** (`npm run test:e2e`, cuatro viewports, con captura adjunta) —
los tests unitarios no alcanzan. *Desde el 30-08-2026 la DoD ya no pide abrir el navegador a mano:
lo reemplaza esa suite.*

Los tres niveles completos —por tarea, por tanda de trabajo (cada promoción a `staging`) y por
entrega al cliente— viven en
[`DEFINITION-OF-DONE.md`](https://github.com/Coste-AR/CosteAR-admin/blob/dev/DEFINITION-OF-DONE.md)
(`CosteAR-admin`, privado). Es la **fuente única**: no se duplica acá, se referencia.

---

## 5. Reglas de frontend

**FE-01 a FE-07** — sin fetch directo en componentes, Zustand solo para estado de cliente, sin URLs
hardcodeadas, el token en memoria, buscar antes de crear un componente, sin colores hex crudos, y
que el frontend no recalcula los números que ya vienen del backend. **Viven en
`.claude/rules/frontend-ui.md`**: cargan al tocar cualquier archivo de `src/`.

---

## 6. Guardarraíles — antipatrones ya observados

|ID|Antipatrón|Qué hacer en su lugar|
|---|---|---|
|**GR-01**|Atribuir decisiones que el usuario no tomó|Verificá que efectivamente las haya decidido él|
|**GR-02**|Bundlear scope de más|Avisá **antes** de que el plan crezca|
|**GR-03**|Afirmar sin verificar|Mirá el diff crudo|
|**GR-04**|Confirmar tu propio resumen del repo|Contrastá con `git log origin/dev`|
|**GR-05**|Razonar hacia el permiso|**La ausencia de evidencia no es evidencia de permiso**|
|**GR-06**|Resolver una ambigüedad del ticket en silencio|Marcala como pregunta abierta|
|**GR-07**|Pisar el scope de otro issue|Andamio mínimo + `TODO`, y avisá|
|**GR-08**|Confiar en tests unitarios para validar un flujo|**Caso real: 98 tests verdes y el flujo roto en dos lugares.** Ningún cambio de UI o de flujo se pushea sin un test E2E que lo recorra (`npm run test:e2e`)|
|**GR-09**|Decir "arreglado" verificándolo con algo que escribí yo en la misma sesión|**Hereda mis puntos ciegos: no es una segunda opinión, es la misma opinión con otra sintaxis.** El 30-08 un workflow se reportó arreglado tres veces sin haber funcionado nunca. Mirá el **artefacto final**, no el diff, y preferí una guarda en CI antes que prometer más cuidado|

---

---

## 6.bis Cómo trabajamos juntos — el protocolo de revisión

> Esta sección va dirigida a **los dos lados**: a quien implementa y a quien revisa.
> La mitad de las reglas son obligaciones de quien escribe el código; la otra mitad, de quien lo aprueba.
>
> **Existe porque el 18-08-2026 pasaron todas las cosas que están abajo, el mismo día.**

### Lo que tiene que hacer quien implementa

|ID|Regla|Por qué|
|---|---|---|
|**REV-01**|**"Verificado" no se dice solo: se dice CÓMO.** Toda afirmación de que algo funciona viene con el comando que se corrió y su resultado.|Se dijo "verificado contra base limpia" sin haberlo hecho. El bug de orden de las migraciones lo encontró el CI, no una persona.|
|**REV-02**|**No afirmar sobre el estado del repo sin mirarlo.** Ni "está mergeado", ni "eso ya existe", ni "no hace falta tocarlo".|`anomaly-detection.ts` figuraba como huérfano, y además había una versión peor corriendo en su lugar. Nadie lo había mirado.|
|**REV-03**|**Separar lo que se decidió de lo que se sabe.** Un valor elegido para poder avanzar se marca como tal y **nunca** se presenta como dato del cliente.|La vida útil del lote son 2 años porque lo decidimos nosotros, no porque nos lo haya dicho el productor.|
|**REV-04**|**Avisarle a quien le cambió el terreno.** Si un cambio afecta la tarea de otro, se le dice: en el PR, en el issue o por fuera.|Giuli no sabía que su G-01 ya estaba en `dev`. Se descubrió de casualidad.|

### Lo que tiene que hacer quien revisa

|ID|Regla|Por qué|
|---|---|---|
|**REV-05**|**Leer los ADR, no el código.** `docs/adr/` es el lugar pensado para revisar sin ser programador: ahí está la decisión, las alternativas descartadas y el costo de cada una. **Discutirlos es la forma de revisar.**|Un PR de 800 líneas no se revisa. Un ADR de una página, sí.|
|**REV-06**|**Cuando alguien diga "verificado", preguntar cómo.** Es una pregunta de diez segundos y caza la mayoría de los errores.|Esa pregunta habría encontrado el bug de las migraciones antes que el CI.|
|**REV-07** ⛔ SUPERADA (30-08-2026)|~~No mergear el mismo día que se abre el PR. Mínimo 24 horas.~~ **Ya no aplica.** Reemplazada por REV-09.|Se escribió el 18-08, cuando la única verificación era `npm test` y el review dependía de que alguien se acordara. Las 24 horas compraban tiempo de mirada humana porque no había otra cosa. Hoy la reemplazan mecanismos: CI obligatorio en las tres ramas con `enforce_admins`, E2E en cuatro viewports, `strict`, y el merge automático que verifica todo antes de tocar nada. **Y el costo pasó a ser mayor que el beneficio:** con varios agentes en paralelo, una cola de PRs esperando 24 horas se desactualiza sola y genera los conflictos que la espera venía a evitar.|
|**REV-09**|**Un PR entra apenas está verde, al día con su base y sin conflictos.** No se espera. Lo que antes compraban las 24 horas ahora lo compra el CI, y lo que la espera costaba —PRs acumulados que se pisan entre sí— ya no se paga.|Santiago, 30-08-2026|
|**REV-08**|**Los PRs apilados se mergean en orden, de abajo hacia arriba.** Y después se verifica que el trabajo llegó a `dev`, no solo que el PR figura como *merged*.|Dos PRs se mergearon contra su rama base. GitHub los marcó en verde y el trabajo quedó en ramas que ya nadie miraba.|

### Sobre el conocimiento

**El conocimiento no se va con quien lo escribió: se queda escrito.** Los ADR, la bitácora de `CosteAR-admin`, los tests con nombres en castellano y las reglas de este archivo existen exactamente para eso: para que no dependan de una persona ni de su memoria.

Pero escribirlo no alcanza.

> **Lo que falta siempre es que alguien más lo lea.**

Por eso `/costear-bitacora` al cerrar una sesión (DOC-03) y el ADR en el mismo PR que lo implementa (DOC-01) no son burocracia: son el único mecanismo que tenemos para que el equipo sepa lo que el equipo ya sabe.

## 7. Registro de cambios de este archivo

|Fecha|Qué cambió|Fuente|
|---|---|---|
|2026-08-31|**Dos cosas que el archivo decía y ya no eran ciertas.** La DoD del 4.bis seguía pidiendo abrir el navegador a mano: lo reemplazó Playwright el 30-08, y `GR-08` va con ella. Se suma `GR-09` sobre verificar con herramientas propias, que salió de reportar tres veces como arreglado un workflow que nunca corrió. *La tercera —`PR-05`— la reescribió #81 mientras este PR esperaba; quedó esa redacción.*|Santiago|
|2026-08-22|**0.bis sale de acá.** La filosofía (diagnosticar/planificar/implementar) cargaba en TODAS las sesiones sin importar la tarea. El resumen operativo queda inline; la versión completa vive en `CosteAR-admin/docs/2026-08-22-filosofia-diagnosticar-planificar-implementar.md` (espejo del Second Brain de Santiago, que es la fuente canónica). Se evaluó y descartó ponerla en `costear-knowledge-base`: ese repo alimenta el RAG del clasificador y mete cualquier `.md` al índice — se habría mezclado con la doctrina de costeo.|Santiago|
|2026-08-22|**Pieza 1 — FE-01..07 se mudan a `.claude/rules/frontend-ui.md`**, scoped a `src/**`. Antes cargaban en todas las sesiones; ahora solo cuando el trabajo toca código de la app.|Santiago|
|2026-08-22|**PR-04/05/06**: el PR nace en draft, se mergea con `--auto`, y después se verifica que el trabajo llegó. Reemplazan por mecanismo lo que REV-08 pedía recordar. La skill `/costear-pr` ya crea los PRs en borrador.|Santiago|
|2026-08-22|**Sección 0.bis — la filosofía: diagnosticar, planificar, recién ahí implementar.** Se escribió después de que aplicarla encontrara, en una tarde, la causa de tres días de re-trabajo: cuatro casillas de configuración apagadas, no falta de disciplina. Incluye las tres trampas que el orden evita.|Santiago|
|2026-08-18|Secciones **5.bis** (datos de clientes en repos públicos, CLI-01 a CLI-04) y **6.bis** (protocolo de revisión, REV-01 a REV-08). Las dos salen de cosas que pasaron ese día: se publicó la estructura de costos de un betatester en un repo público, y ocho PRs se mergearon el mismo día que se abrieron.|Santiago|
|2026-08-15|Creación. Reglas destiladas del repo `asomelab/de-wall` y de las convenciones del equipo.|Santiago|

---

## 5.bis Datos de clientes en repositorios públicos

`CosteAR-backend` y `CosteAR-frontend` son **públicos**. `CosteAR-admin` es privado.

|ID|Regla|
|---|---|
|**CLI-01**|**Los datos de un cliente no entran a un repositorio público.** Ni su nombre, ni su localidad, ni sus números reales — no en tests, no en seeds, no en comentarios, no en ejemplos, no en cuerpos de PR ni en mensajes de commit.|
|**CLI-02**|Un fixture que necesita números realistas usa **datos ficticios** que ejerciten la misma matemática. El caso real, si hace falta conservarlo, va a `CosteAR-admin` (privado).|
|**CLI-03**|Antes de abrir un PR que toque un vertical de un cliente: `git grep -in "<nombre del cliente>"`. Si devuelve algo, no se abre.|
|**CLI-04**|Esto incluye la estructura económica: costo unitario, punto de equilibrio, precio de venta, márgenes y escala. **Que un competidor pueda leer el margen de un productor es un problema para él, no para nosotros.**|

> **Ya pasó** (18-08-2026): se subió la estructura de costos completa de un cliente, con su nombre
> al lado, a un repositorio público. Se anonimizó, pero **el historial de git es permanente**.
> Lo barato es no escribirlo; una vez publicado, ya no hay vuelta atrás completa.
