# Guía de contribución — CosteAR Frontend

Punto de partida para cualquiera que trabaje en este repo. Cubre el setup, el flujo de trabajo
del equipo de principio a fin, y las convenciones.

> Las reglas duras y resumidas están en [`CLAUDE.md`](./CLAUDE.md) — ese archivo lo lee la IA
> sola en cada sesión. Este documento es el mismo contenido explicado **para una persona**.

---

## Contexto

CosteAR es un SaaS de costeo para profesionales de costos en PyMEs. Este repo es la SPA del
producto: lo que ve y usa el cliente.

**Desde agosto de 2026 hay un cliente real usándolo.** Un número mal mostrado en pantalla no es
un detalle visual: es una decisión de negocio que el cliente toma con nuestros datos.

| Repo | Qué es |
| --- | --- |
| [`CosteAR-backend`](https://github.com/Coste-AR/CosteAR-backend) | API |
| [`CosteAR-frontend`](https://github.com/Coste-AR/CosteAR-frontend) | Este repo |
| [`CosteAR-admin`](https://github.com/Coste-AR/CosteAR-admin) | Panel interno + **bitácora del desarrollo** |
| [`costear-knowledge-base`](https://github.com/Coste-AR/costear-knowledge-base) | Bóveda que alimenta el RAG |

---

## Setup

**Prerequisitos:** Node 22 · npm · el backend corriendo en `http://localhost:3000`.

```bash
git clone https://github.com/Coste-AR/CosteAR-frontend.git
cd CosteAR-frontend

npm install              # instala dependencias y los git hooks (husky)
cp .env.example .env     # completar

npm run dev              # http://localhost:5173 (proxy /api → backend :3000)
```

### Comandos

```bash
npm run dev          # dev server con HMR
npm run lint         # eslint src
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # tsc -b && vite build
```

### Git hooks

Se instalan solos con `npm install`.

- **`pre-commit`** — `lint-staged` (eslint --fix sobre lo staged) + `typecheck` del proyecto
- **`commit-msg`** — valida el mensaje con `commitlint`

**Nunca uses `--no-verify`.** Si un hook te frena, tiene razón.

---

## El flujo de trabajo

```
issue → rama desde dev → commits atómicos → PR a dev → review → merge → bitácora
```

### 1. Issue

Plantillas en `.github/ISSUE_TEMPLATE/`. Un issue útil explica **por qué** hace falta y trae
criterios de aceptación verificables.

> Los issues son **referencia, no especificación**. Si uno se contradice a sí mismo, **frená y
> preguntá** — no elijas por tu cuenta.

### 2. Rama

```bash
git fetch origin
git checkout -b feat/pantalla-de-procesos origin/dev
```

Sale siempre de **`dev`**. Nombre `<tipo>/<slug-corto>`, solo `a-z0-9-`, máximo 40 caracteres.
Vive días, no semanas.

### 3. Commits

```
<tipo>(<scope>): <descripción en imperativo>
```

Tipos: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `ci` · `build` · `perf` · `style` · `revert`
Scopes de este repo: `costeo`, `onboarding`, `auth`, `dashboard`, `trazabilidad`, `ui`, `router`, `api-client`, `ci`.

**Un commit = un cambio lógico.** Se puede escribir en español. Atajo: `/costear-commit`.

### 4. Pull Request

El PR apunta a **`dev`** y la plantilla se precarga sola. Atajo: `/costear-pr`.

Antes de pedir review: **tests, lint y typecheck en verde, y lo probaste en el navegador.**

- `Closes #N` solo si cierra el issue entero; si no, `part of #N`
- Si no lo describís en 3 bullets, es más de un PR

### 5. Review

**CRITICAL** (bloquea) / **WARNING** (habría que arreglarlo) / **SUGGESTION** (opcional).
Atajo: `/costear-review`. Los comentarios son sobre el trabajo, nunca sobre la persona.

### 6. Merge y promoción

```
feature → dev → staging → main
```

- **Nunca push directo** a `main`, `staging` ni `dev`. GitHub lo bloquea.
- `main` solo desde `staging`; `staging` solo desde `dev`.
- `main` y `staging` exigen **review de otro socio + CI en verde**. `dev` exige CI en verde.

### 7. Bitácora

Al cerrar la sesión: **`/costear-bitacora`**.

---

## Decisiones técnicas

Van a un **ADR** en [`docs/adr/`](./docs/adr/README.md), creado con `/costear-adr` y revisado en
el mismo PR que lo implementa.

> `DECISIONES.md` en la raíz es **registro histórico cerrado**. No se le agrega nada nuevo.

---

## Reglas de frontend

1. **Nada de `fetch` o `axios` directo dentro de componentes.** Todo el estado del servidor pasa
   por hooks de TanStack Query.
2. **Zustand es para estado de cliente** (sesión, UI). Nunca para estado del servidor.
3. **Ninguna URL de API hardcodeada.** Todo por el cliente Axios centralizado.
4. **El access token vive en memoria, nunca en `localStorage`.** Es una decisión de seguridad
   tomada: para revertirla hace falta un ADR.
5. **Antes de crear un componente, buscá si ya existe.** Un botón o modal duplicado es deuda el
   mismo día.
6. **Sin colores en hex crudo ni spacing arbitrario** donde hay token de Tailwind. La identidad
   es el granate de "Identidad Visual v1.0".
7. **El frontend no recalcula costos.** Los números vienen del backend y se muestran tal cual,
   con el formato y el redondeo que define él.

---

## Tu primer aporte

1. Cloná el repo y completá el setup.
2. Levantá el backend y después el front, y verificá que carga.
3. **Leé [`CLAUDE.md`](./CLAUDE.md) completo.**
4. Tomá un issue del tablero.
5. Rama desde `dev` → commits atómicos → `/costear-pr`.
6. Esperá el review. Los CRITICAL se resuelven antes del merge.
7. Post-merge: borrá la rama local y corré `/costear-bitacora`.

---

## Lo más importante, si te llevás una sola cosa

> **Los tests unitarios no validan un flujo.**
>
> Caso real: 98 tests en verde, lint y typecheck limpios, y el flujo roto en dos lugares
> distintos. **Ningún cambio de UI o de flujo se pushea sin haberlo abierto en el navegador.**

Y su corolario: **verificá antes de afirmar.** No digas que algo "ya está mergeado" o que un
diff "es solo reformateo" sin haberlo mirado.
