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

---

## 4. Decisiones y trazabilidad

|ID|Regla|
|---|---|
|**DOC-01**|Toda decisión técnica no obvia va a un ADR: `docs/adr/NNNN-slug.md`. Se crea con `/costear-adr`.|
|**DOC-02**|`DECISIONES.md` es **registro histórico** de Trazabilidad Total v1. **No agregar nada nuevo ahí.**|
|**DOC-03**|Al cerrar una sesión, correr `/costear-bitacora`.|

---

## 5. Reglas de frontend

|ID|Regla|
|---|---|
|**FE-01**|**Nada de `fetch` o `axios` directo dentro de componentes.** Todo el estado del servidor pasa por hooks de TanStack Query.|
|**FE-02**|**Zustand es para estado de cliente** (sesión, UI). Nunca para estado del servidor.|
|**FE-03**|**Ninguna URL de API hardcodeada.** Todo por el cliente Axios centralizado con refresh de token.|
|**FE-04**|El access token vive **en memoria**, nunca en `localStorage`. Es una decisión de seguridad tomada, no la revierta nadie sin ADR.|
|**FE-05**|**Antes de crear un componente nuevo, buscá si ya existe.** Un botón/input/modal duplicado es deuda inmediata.|
|**FE-06**|**Nada de colores en hex crudo ni spacing arbitrario** donde hay token de Tailwind. La identidad visual es el granate de la guía "Identidad Visual v1.0".|
|**FE-07**|Los números que se muestran al usuario son **plata de un cliente real**. Formato y redondeo se respetan tal cual los define el backend — el frontend no recalcula.|

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
|**GR-08**|Confiar en tests unitarios para validar un flujo|**Caso real: 98 tests verdes y el flujo roto en dos lugares.** Ningún cambio de UI o de flujo se pushea sin abrirlo en el navegador|

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
|**REV-07**|**No mergear el mismo día que se abre el PR.** Mínimo 24 horas, salvo que haya algo roto en producción.|La mitad de los problemas del 18-08 salieron de mergear rápido y en cadena.|
|**REV-08**|**Los PRs apilados se mergean en orden, de abajo hacia arriba.** Y después se verifica que el trabajo llegó a `dev`, no solo que el PR figura como *merged*.|Dos PRs se mergearon contra su rama base. GitHub los marcó en verde y el trabajo quedó en ramas que ya nadie miraba.|

### Sobre el conocimiento

**El conocimiento no se va con quien lo escribió: se queda escrito.** Los ADR, la bitácora de `CosteAR-admin`, los tests con nombres en castellano y las reglas de este archivo existen exactamente para eso: para que no dependan de una persona ni de su memoria.

Pero escribirlo no alcanza.

> **Lo que falta siempre es que alguien más lo lea.**

Por eso `/costear-bitacora` al cerrar una sesión (DOC-03) y el ADR en el mismo PR que lo implementa (DOC-01) no son burocracia: son el único mecanismo que tenemos para que el equipo sepa lo que el equipo ya sabe.

---

## 7. Ciclo de trabajo obligatorio (skills)

> **Esta sección es OBLIGATORIA en toda sesión de Claude Code en este repo.** No es una sugerencia
> ni un "flujo recomendado": saltear un paso es un error, no una optimización.

### El ciclo

```
código listo → /costear-commit → /costear-pr → /costear-review → merge (lo hace Alan a mano)
                                                                        ↓
                                                              /costear-bitacora
```

|ID|Regla|
|---|---|
|**SK-01**|**El ciclo es siempre el mismo:** código listo → `/costear-commit` → `/costear-pr` → `/costear-review` → merge. **El merge lo decide y lo ejecuta Alan a mano.** Claude nunca mergea.|
|**SK-02**|**Si hubo una decisión técnica no obvia, el ADR va en el MISMO PR** que implementa la decisión. Se crea con `/costear-adr` (ver **DOC-01**). Un PR con decisión no obvia y sin ADR está incompleto.|
|**SK-03**|**Al cerrar la sesión, después del merge, correr `/costear-bitacora`.** La bitácora vive en `CosteAR-admin`, no en este repo (ver **DOC-03**).|
|**SK-04**|**Nunca saltear `/costear-commit`** al terminar un pedazo de trabajo. Nada de `git commit` a mano "porque es un cambio chico".|
|**SK-05**|**Nunca saltear `/costear-review` antes de mergear** algo que toque: el **motor de cálculo**, **migraciones**, **plata del cliente**, o que vaya a **`main`**. En esos cuatro casos el review no es opcional aunque GitHub no lo bloquee (ver **REV-07**: tampoco se mergea el mismo día que se abre el PR).|
|**SK-06**|**Nunca `--no-verify`.** Si un hook frena el commit, el hook tiene razón: se arregla lo que marcó y se vuelve a commitear con el mismo mensaje. (Es la regla de oro #6, repetida acá porque es la que más se tienta saltear.)|
|**SK-07**|**Si el diff toca `prisma/schema.prisma`, correr `npx prisma generate` antes de commitear.** Sin eso el typecheck del hook `pre-commit` tira errores falsos. *En este repo (frontend) hoy no hay `prisma/`; la regla aplica en `CosteAR-backend` y acá solo si algún día aparece ese archivo.*|
|**SK-08**|**Nunca editar a mano los archivos de `.claude/skills/`.** Son una copia generada: se sobreescriben con `npm run skills:sync` desde `CosteAR-admin`. Un arreglo hecho acá se pierde en el próximo sync. Si una skill está mal, se corrige **en `CosteAR-admin`** y se vuelve a sincronizar.|
|**SK-09**|**Si hay más de una skill con el mismo nombre disponible** (porque está duplicada en varios repos o instalada a nivel usuario), **usar siempre la de este repo** (`.claude/skills/`).|
|**SK-10**|**Antes de empezar, verificar de qué rama se sale.** `git fetch origin` y salir de `origin/dev` (**GIT-02**). Trabajar sobre una rama atrasada produce un diff que borra trabajo ajeno sin que nadie lo note.|

### Qué hace cada skill (verificado contra `.claude/skills/`, 2026-08-21)

|Skill|Qué hace realmente|Ejecuta directo|
|---|---|---|
|`/costear-commit`|Agrupa el diff staged por concepto y hace **un commit convencional por grupo**. Valida contra el mismo regex que `commitlint`. Usa `git add -p` si un archivo mezcla dos conceptos.|Sí, salvo que haya que partir por hunks|
|`/costear-pr`|Corre los chequeos previos (`npm test`, `npm run lint`, `npm run typecheck`), verifica que la rama salga de `dev`, la pushea y abre el PR **siempre contra `dev`** con la plantilla completa. Pregunta si se probó en el navegador cuando toca UI o flujo.|Sí, pero **frena antes de pushear** si el árbol está sucio o algo falla|
|`/costear-review`|Revisa un PR (`gh pr diff N`) o el diff local (`git diff origin/dev...HEAD`) contra los checklists de dominio, antipatrones, frontend, design system y proceso. Clasifica en **CRITICAL / WARNING / SUGGESTION**.|Sí|
|`/costear-adr`|Crea `docs/adr/NNNN-slug.md` desde `_template.md`, numeración correlativa de 4 dígitos, y actualiza `docs/adr/README.md`. **Alternativas descartadas** y **Consecuencias** son obligatorias.|Sí|
|`/costear-bitacora`|Ubica `CosteAR-admin` (env `COSTEAR_ADMIN_PATH`, `git config costear.adminPath`, o pregunta), lee el `git log` y los PRs **reales**, escribe la entrada en `bitacora/sesiones/` y actualiza `INDICE.md`.|Sí, pero **muestra el borrador antes de commitear** y no pushea sin preguntar|
|`/costear-issue`|Entrevista hasta tener lo mínimo, elige repo, busca duplicados con `gh issue list`, redacta con la plantilla y crea el issue **sin asignar**, con `type:` + `priority:` + `area:`.|**No.** Muestra el borrador y espera el OK|

### Lo que el ciclo NO cubre

- Las promociones `dev → staging` y `staging → main` **no las abre ninguna skill**: son decisión del
  equipo (ver **GIT-04** y los gotchas de `/costear-pr`).
- El review **no bloquea el merge en GitHub** (decisión del 15-08-2026). Que no lo bloquee la
  herramienta no lo vuelve opcional: **SK-05** sigue valiendo.

---

## 8. Registro de cambios de este archivo

|Fecha|Qué cambió|Fuente|
|---|---|---|
|2026-08-21|Sección **7** (ciclo de trabajo obligatorio con skills, SK-01 a SK-10) y tabla de qué hace cada skill, verificada leyendo `.claude/skills/`. Se reordenaron las secciones: 5.bis estaba al final, después del registro de cambios, que pasó a ser la sección 8. **SK-10** sale de esta misma sesión: la sección se escribió primero sobre una copia atrasada de este archivo, en `staging`, y el diff resultante borraba 5.bis y 6.bis enteras.|Alan|
|2026-08-18|Secciones **5.bis** (datos de clientes en repos públicos, CLI-01 a CLI-04) y **6.bis** (protocolo de revisión, REV-01 a REV-08). Las dos salen de cosas que pasaron ese día: se publicó la estructura de costos de un betatester en un repo público, y ocho PRs se mergearon el mismo día que se abrieron.|Santiago|
|2026-08-15|Creación. Reglas destiladas del repo `asomelab/de-wall` y de las convenciones del equipo.|Santiago|
