# 2026-09-02 — Clasificación guiada fijo / variable

- **Issue:** #95
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-95-clasificacion-guiada`
- **PR:** pendiente
- **Agente:** Codex · GPT-5
- **Tanda:** B1

## Qué se hizo

Se agregó una pestaña `Fijo / variable` en la ficha del cliente. La pantalla consulta al backend las
tres clasificaciones del dominio —materia prima, mano de obra directa y costos indirectos—, muestra
la propuesta recibida o informa que el sistema no propone una opción, y permite confirmar cada
concepto de forma explícita.

La interfaz explica en lenguaje directo que un costo fijo puede cambiar y que lo que lo define es no
variar con el volumen. Elegir una opción solo modifica un borrador local: el `PUT` con
`confirmado: true` se ejecuta exclusivamente al presionar `Confirmar`.

## Decisiones que tomé sobre la marcha

- **Alcance de la clasificación:** se guardó a nivel empresa. El issue habla del onboarding de un
  cliente nuevo y el backend admite la cascada período → estructura → empresa → propuesta. No se
  envía `structureId` ni `periodId`, por lo que la decisión inicial sirve como base para todas las
  estructuras y puede ser reemplazada luego por un alcance más específico.
- **Ubicación:** se integró como pestaña de la ficha del cliente. Es el único contexto existente que
  ya tiene el `companyId`, reúne la configuración inicial y no obliga a elegir una estructura antes
  de completar el onboarding.
- **Confirmación:** es por concepto, no un guardado masivo. El backend expone un `PUT` por clave y no
  una operación atómica para las tres; un botón individual evita mostrar como confirmada una tanda
  que pudiera quedar parcialmente guardada.
- **Conceptos sin propuesta:** quedan con `Elegí una opción` y `Falta confirmar`. No se elige fijo,
  variable ni semifijo por defecto.

## Dónde el issue no alcanzaba

- Pedía averiguar qué ocurre al salir sin confirmar, pero no definía una acción de descarte. Se eligió
  el comportamiento conservador: el selector es estado local, salir desmonta la pestaña y no envía
  ninguna mutación. Al volver se muestra otra vez el valor resuelto por el backend.
- No definía dónde vive la pantalla ni en qué nivel de la cascada se guarda la decisión inicial. Se
  eligieron la ficha del cliente y el nivel empresa por las razones anteriores.
- El endpoint de listado de parámetros devuelve el catálogo numérico y no incluye las clasificaciones.
  La pantalla resuelve las tres claves estables individualmente mediante el endpoint puntual que sí
  implementó la dependencia #190.

## Privacidad

No se incorporaron nombres, cifras, escala, precios ni márgenes de un cliente real. Los tests usan
identificadores y textos sintéticos genéricos.

## Verificación

```text
npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd run typecheck
sin errores

npm.cmd test
20 archivos, 149 tests aprobados

npm.cmd run test:e2e
42 tests aprobados, 2 omitidos, 1.5 min
```

La corrida E2E completa pasó en su primer intento y se repitió después del ajuste final del hook y de
`npm ci`, siempre en verde. Antes se usó Chromium para ajustar el propio test:
las dos primeras corridas focalizadas fallaron por selectores del test (rol `button` en vez de `tab` y
un locator demasiado amplio), se corrigieron y las dos corridas focalizadas siguientes pasaron. No
hubo una falla que pasara sin tocar código, por lo que no se reporta ningún flaky.

El primer intento unitario focalizado no llegó a iniciar Vitest porque el sandbox impidió a esbuild
resolver `vite.config.ts`. Repetido fuera de esa restricción, pasó; no fue una falla de la suite.

`npm ci` instaló 458 paquetes desde el lockfile e informó 14 vulnerabilidades de dependencias
(4 moderadas, 9 altas y 1 crítica), además de una advertencia sobre el script de instalación de
`core-js`. No se ejecutó `npm audit fix` ni se cambiaron dependencias porque queda fuera del issue.
