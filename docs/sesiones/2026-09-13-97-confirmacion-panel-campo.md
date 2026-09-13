---
issue: 97
repo: CosteAR-frontend
pr: pendiente
rama: feat/panel-confirmacion-no-bloqueo
agente: codex
modelo: gpt-5
tanda: B1
inicio: 2026-09-13T17:28:15-03:00
fin: 2026-09-13T17:41:25-03:00
minutos: 13
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 0
rebotes_de_guarda: 0
---

# 2026-09-13 — Confirmación visible del panel de campo

## Qué se hizo

- Después de guardar una producción o una baja, el panel muestra un tilde grande y repite cantidad, unidad, lote y fecha en palabras.
- La confirmación ofrece salidas explícitas para cargar otro dato o volver al inicio.
- El frontend conserva únicamente las validaciones estructurales del contrato y no agrega máximos. El E2E guarda `999999999` huevos y verifica la confirmación.
- La captura de Playwright se revisó en Chromium y no mostró desbordes ni datos económicos.

## Decisión y límite del issue

- No se inventó un rango en el frontend: el issue declara que definirlo pertenece al dominio.
- Tampoco se afirmó un flag persistente inexistente. Los contratos `POST /lotes/:id/producciones` y `POST /lotes/:id/eventos` sólo devuelven el registro creado y sus modelos no exponen `requiereRevision`, estado equivalente ni endpoint para marcarlo.
- Por eso esta rama completa la confirmación visible y la política de no rechazo por máximos, pero no puede cerrar #97 hasta que exista un contrato de backend que determine el fuera de rango y persista la revisión.

## Verificación

- `npm run lint`: 0 errores, 109 advertencias preexistentes.
- `npm run typecheck`: aprobado.
- `npm test`: 50 archivos y 231 tests aprobados en la repetición aislada. La primera corrida se lanzó en paralelo con Playwright: 43 archivos aprobaron y 7 workers agotaron el tiempo de arranque por contención.
- `npm run test:e2e`: 114 tests aprobados y 2 omitidos en los cuatro proyectos.
- No se eliminó ni renombró ningún test.
