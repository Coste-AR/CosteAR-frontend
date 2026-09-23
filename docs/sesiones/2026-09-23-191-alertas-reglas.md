---
issue: 191
repo: CosteAR-frontend
pr: 204
rama: feat/alertas-home-reglas
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-23T02:20-03:00
fin: 2026-09-23T03:01-03:00
minutos: 41
tokens: no-informado
clears: 1
intentos_hasta_verde: 2
rojos_deliberados: 0
rebotes_de_guarda: 0
---

# 2026-09-23 — Alertas y reglas por negocio

## Qué se hizo

El inicio muestra cuántas alertas evaluadas y sin leer requieren atención y separa las que no pudieron evaluarse. La lista explica la severidad, el indicador, el valor, el umbral, la fecha y el motivo de ausencia de datos. Cada negocio permite crear y editar reglas con el catálogo de indicadores que entrega el backend; el error de umbral vuelve al campo correspondiente. Hay pruebas de componente y de navegador con capturas de página completa en escritorio y teléfono.

## Decisiones que tomé sobre la marcha

- **Conteo activo:** conté alertas evaluadas y sin leer. La alternativa era incluir también las no evaluables, pero mostrar un número de alertas activas para datos ausentes daría una señal falsa. Se muestran por separado (Constitución §2).
- **Indicadores disponibles:** el selector usa el catálogo del negocio y muestra explícitamente cuando está vacío. La alternativa era codificar una lista fija por rubro, que podría ofrecer reglas inválidas (Constitución §4).
- **Destinatarios:** el formulario ofrece el titular dentro de la app o direcciones de correo, que son los canales del contrato existente. La alternativa era inventar nuevos canales; eso excedería el issue (Constitución §4).
- **Error remoto:** ante un rechazo del backend se conserva el formulario y se muestra el mensaje en umbral. La alternativa era mostrar un aviso genérico sin relación con el campo que motivó el rechazo (Constitución §1).

## Dónde el issue no alcanzaba

- No definía qué significa «activa» cuando la alerta está leída o no pudo evaluarse; asumí evaluada y sin leer.
- No definía la presentación de varios negocios; usé un selector y no guardo ninguna regla hasta elegir uno.
- No definía si la configuración anterior de margen debía seguir visible. La pantalla de reglas ocupa su lugar, mientras el endpoint anterior queda intacto.
- No definía cómo asociar un error de validación remoto con un campo; el caso solicitado se muestra en umbral.

## Qué quedó afuera

- El cálculo de alertas y el envío de notificaciones fuera de la app siguen a cargo del backend, según el alcance del issue.
- No hubo rojo deliberado: el camino de rechazo se probó con una respuesta HTTP 400 simulada, sin modificar producción.

## Con qué se verifica

```text
npm run typecheck — pasó
npm run lint — pasó, 109 advertencias existentes
npm run test — primer intento: 1 timeout en briefing-messages.test.ts; segundo intento: 60 archivos y 266 tests pasaron
npm run test:e2e — 158 pasaron, 2 omitidos (160 en total)
npx playwright test tests/e2e/alertas-reglas.spec.ts --reporter=line — 8 pasaron tras agregar guardado exitoso
git diff --check — pasó
```
