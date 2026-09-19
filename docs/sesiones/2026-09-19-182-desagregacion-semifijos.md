---
issue: 182
repo: CosteAR-frontend
pr: pendiente
rama: feat/m1-02-desagregacion-semifijos
agente: claude
modelo: claude-opus-5
tanda: B3
inicio: 2026-09-19T10:07-03:00
fin: 2026-09-19T10:32-03:00
minutos: 25
tokens: no-informado
clears: 0
intentos_hasta_verde: 1
rojos_deliberados: 2
rebotes_de_guarda: 0
---

# 2026-09-19 — Separar un costo semifijo en su parte fija y su parte variable, desde la pantalla

> **Esta sesión no la corrió la Automation de Codex.** Codex se quedó sin tokens, así que la corrió
> Claude (Opus 5) a pedido de Lautaro, siguiendo `CosteAR-os/prompts/lauti.md` igual que lo habría
> hecho el agente del carril. Los campos `agente` y `modelo` dicen eso y no `codex`: el balance de
> la tanda se suma con estos números y una etiqueta equivocada los ensucia.
>
> **`pr: pendiente` es literal.** Lautaro pidió llegar hasta el verde y parar, así que la rama está
> commiteada y sin `push`. Cuando el PR exista, este campo lleva su número.

## Recursos

`inicio` es el momento medible en que arrancó el trabajo sobre el issue (creación del worktree,
10:07:53). La lectura previa —`prompts/README.md`, `automation-codex.md`, `lauti.md`,
`CONSTITUCION.md`, `docs/tandas/B3.md`, el issue y el contrato del backend— pasó antes de ese
ancla y no la tengo cronometrada, así que no está contada en `minutos`. No la estimo.

`intentos_hasta_verde: 1` — cada verificación pasó en la primera corrida. Los dos rojos del
frontmatter son deliberados, no intentos fallidos.

## Qué se hizo

Una pestaña nueva, **Semifijos**, en la pantalla de una empresa, al lado de «Fijo / variable».

Un costo semifijo es el que tiene una parte que se paga igual produzcas mucho o poco, y otra que
se mueve con el volumen: la luz de la planta, con su abono fijo y su consumo. La pestaña separa
esas dos partes.

La persona elige uno de los conceptos que ya clasificó como semifijos, dice cuánto es el importe
a separar y con qué método quiere separarlo, y aprieta **Ver la separación**. Recién ahí aparecen
la parte fija, la parte variable, el costo variable por unidad y, si el método lo da, qué tan bien
los datos siguen una línea. El botón de guardar está apagado hasta ese momento, y se vuelve a
apagar si toca cualquier dato después de mirar: no hay forma de ver una cuenta y guardar otra.

Si las dos partes declaradas no suman el importe, la pantalla muestra **el mensaje del backend, tal
cual**, y no guarda nada. No redondea ni completa la diferencia por su cuenta.

La pantalla no hace ni una cuenta: pide la vista previa y el guardado a la API, que corre la misma
función de dominio para los dos. Es lo que pedía el issue en «Fuera de alcance» y es lo que evita
dos matemáticas distintas.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** la pantalla vive como una pestaña de `CompanyDetailPage`, y adentro tiene su
  propio selector de concepto semifijo, alimentado por `GET /conceptos-costeo` filtrando por
  `comportamientoVolumen === 'SEMIFIJO'`.
  **Qué otra opción había:** una ruta propia (`/companies/$id/conceptos/$conceptoId/semifijo`), o
  construir antes la pantalla de conceptos de M1-01 y colgar la desagregación de ahí.
  **Por qué elegí esta:** los tres endpoints necesitan un `conceptoId` y **en el frontend no existe
  ni una sola llamada a `/conceptos-costeo`** — no hay lista, no hay ruta, no hay de dónde sacar
  ese id. Una ruta propia habría quedado inalcanzable haciendo clic, porque nada la enlazaría.
  Construir M1-01 era ampliar el alcance del issue. La pestaña reusa la navegación que ya existe y
  queda justo después de la pantalla que produce un concepto semifijo, que es «Fijo / variable».
  Decidido con Lautaro antes de escribir código, no sobre la marcha a ciegas.

- **Qué decidí:** el importe a separar lo escribe la persona en el formulario.
  **Qué otra opción había:** leerlo del concepto.
  **Por qué elegí esta:** `ConceptoCosteo` no tiene columna de importe. El `importe` sólo existe en
  el cuerpo del request. No hay de dónde leerlo.

- **Qué decidí:** con `DISPERSION_GRAFICA` el formulario pide **las observaciones y además las dos
  porciones declaradas**.
  **Qué otra opción había:** tratarlo como a `PUNTOS_EXTREMOS` y `CORRELACION`, que calculan solos.
  **Por qué elegí esta:** el dominio lo manda por la rama de porciones explícitas y encima le exige
  al menos dos observaciones. Pedir sólo una de las dos cosas daba 422 siempre. El nombre del
  método engaña: el gráfico lo lee la persona, no el servidor.

- **Qué decidí:** el `404` de `GET .../tramo-semifijo` se traduce a «todavía no tiene una separación
  guardada», en texto, y no a un cartel de error.
  **Qué otra opción había:** mostrarlo como fallo de carga.
  **Por qué elegí esta:** Constitución §2. Que nadie lo haya separado todavía no es un error, y
  tampoco se puede dibujar con ceros.

- **Qué decidí:** cuando el método no produce el costo variable unitario o el coeficiente, la
  pantalla escribe «Este método no lo calcula.».
  **Qué otra opción había:** el guión que devuelve `formatMoney(null)`, que es lo que hace el resto
  de la app.
  **Por qué elegí esta:** Constitución §2 nombra el guión explícitamente. Un `—` en una columna de
  plata se lee como cero. Hay un test que lo fija, y uno de los dos rojos deliberados fue
  justamente volver a poner el guión para ver que el test lo agarra.

## Dónde el issue no alcanzaba

- **Lo más grande: el issue no dice dónde vive la pantalla ni cómo se llega a un concepto.** Pide
  «la pantalla de desagregación de un `ConceptoCosteo` clasificado `SEMIFIJO`» y da por supuesto
  que en el frontend hay conceptos. No los hay: cero llamadas a `/conceptos-costeo`, y tampoco
  existe un issue de frontend para M1-01 que los vaya a traer después. Lo que más se le parece es
  la pestaña «Fijo / variable», que es **otra entidad** (`parametros-costeo`, tres claves fijas del
  catálogo, sin `id`). Un agente sin nadie a quien preguntarle o se frena (Constitución §9) o
  inventa una ruta huérfana.
- **De dónde sale el importe a separar.** Los criterios de aceptación hablan de «importe 90.000»
  sin decir quién lo pone. El modelo no tiene ese campo.
- **`DISPERSION_GRAFICA` figura entre los métodos de vista previa** como si calculara, y no calcula.
- **La forma del `GET` no es la del `POST .../calcular`.** La fila guardada manda los importes como
  string (son `Decimal` de Prisma) y **no trae `importe`**: hay que reconstruirlo sumando las dos
  porciones. El issue habla de «el contrato backend de M1-02» como si fuera uno solo; son dos
  formas distintas para los mismos datos.
- **Qué pasa si el concepto no está confirmado.** No lo dice. Se deja separar y se avisa, porque
  `confirmado` significa «lo confirmó el cliente» y no «se puede usar».

Nada de esto frenó el trabajo porque Lautaro estaba disponible para contestar lo primero. La
Automation corriendo sola a las 08:00 no lo habría tenido.

## Qué quedó afuera

- **El PR.** Por pedido de Lautaro la sesión termina en el commit; no hay `push` ni PR abierto, así
  que tampoco hay etiqueta `auto-merge` ni entrada a `dev`.
- **Crear, editar o borrar conceptos de costeo.** Es M1-01 y no tiene issue de frontend. La pestaña
  sólo lista los que ya existen. No abrí un issue nuevo: quién lo pide y con qué alcance es
  decisión de Santiago al podar la tanda.
- **Un gráfico de dispersión de verdad** para el método que lo nombra. El backend no devuelve nada
  para dibujar más allá de las observaciones que la persona ya cargó, y el issue no lo pide.
- **`rojos_deliberados: 2`**, los dos sobre la lógica nueva: habilitar el guardado sin vista previa
  (caen 3 tests) y volver a mostrar el guión en lugar de declarar la ausencia (cae 1). Los dos se
  revirtieron; el árbol quedó limpio.

## Con qué se verifica

```bash
npm run lint              # 0 errores (109 advertencias, todas preexistentes; mis archivos, limpios)
npm run typecheck         # sin salida = sin errores
npm run test              # 53 archivos, 248 tests, todos en verde (6 nuevos)
npm run check:feature-tests  # 19 features verificadas: 19 cubiertas, 0 excepciones
npm run test:e2e          # Playwright: 126 pasados, 2 salteados, 0 fallados (8.3 min)
npx playwright test desagregacion-semifijos --reporter=list  # el spec nuevo: 4 de 4 viewports
```

El test de pantalla nuevo es `tests/e2e/desagregacion-semifijos.spec.ts`: recorre el flujo entero
—rechazo del importe que no cierra, guardado del que sí, y puntos extremos dando 30.000 / 60.000 /
300— y adjunta la captura con `testInfo.attach()`, que es la evidencia que reemplazó a que una
persona abra el navegador.
