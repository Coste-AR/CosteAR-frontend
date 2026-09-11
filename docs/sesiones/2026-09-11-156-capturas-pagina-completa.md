# 2026-09-11 — Cada E2E deja una captura completa

- **Issue:** #156
- **Repo:** CosteAR-frontend
- **Rama:** `test/issue-156-e2e-screenshots`
- **PR:** #158
- **Agente:** Codex · GPT-5
- **Tanda:** B1

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | ~30 min |
| Tokens consumidos | no informado |
| Intentos hasta el verde | 2 (una comprobación roja intencional y la verde focal); la suite completa pasó en el primer intento |
| Comandos de verificación corridos | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, Playwright con reporte JSON y auditoría de adjuntos |

## Qué se hizo

La evidencia de pantalla completa dejó de depender de que cada spec se acordara de adjuntarla.
El fixture compartido ahora toma una captura `fullPage` al finalizar todo caso ejecutado y la
adjunta con un nombre que identifica el proyecto de Playwright. Los tests públicos y los
autenticados heredan el mismo comportamiento.

Se eliminaron las capturas manuales de página completa que pasaron a ser redundantes. Se
conservaron las tres capturas parciales de clasificación, parámetros y simulador porque muestran
un componente concreto y siguen siendo evidencia suplementaria.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** conservar `screenshot: 'on'` en la configuración global.
- **Qué otra opción había:** quitarlo y dejar solamente el nuevo adjunto full-page.
- **Por qué elegí esta:** el issue prohibía cambiar comportamiento fuera del fixture y pedía
  garantizar el adjunto explícito, no reemplazar la evidencia automática ya existente.

- **Qué decidí:** hacer que el fixture sea automático y heredable por `testConSesion`.
- **Qué otra opción había:** exigir el fixture por nombre en la firma de cada test.
- **Por qué elegí esta:** una dependencia manual conservaría exactamente el modo de falla del
  hallazgo: un spec nuevo podría olvidarla y seguir quedando verde.

- **Qué decidí:** no capturar cuando `page.isClosed()` y no silenciar otros errores de captura.
- **Qué otra opción había:** atrapar cualquier error de screenshot y continuar.
- **Por qué elegí esta:** cerrar la página es el caso explícito donde intentar capturar puede
  tapar el error original; fuera de ese caso, no producir la evidencia obligatoria debe hacer
  fallar la verificación.

## Dónde el issue no alcanzaba

El issue no definía si `screenshot: 'on'` debía eliminarse al incorporar el adjunto explícito ni
si un error inesperado al capturar debía tragarse. Se conservaron la captura automática y el
comportamiento fail-closed: si la página sigue abierta pero no se puede generar la evidencia, el
test no debe aparentar que cumplió el contrato.

## Qué quedó afuera

No se modificaron `src/`, el splash, los timeouts, las intercepciones de API, los recorridos
funcionales ni las tres capturas parciales. Tampoco se tocó la vulnerabilidad baja informada por
GitHub al hacer push, porque no pertenece al issue #156.

## Con qué se verifica

```text
npm run lint       → 0 errores (109 warnings preexistentes en src/)
npm run typecheck  → verde
npm run test       → 44 archivos, 213 tests aprobados
npm run test:e2e   → 90 tests aprobados, 2 omitidos, 5.1 min
auditoría JSON      → 90 ejecutados, 2 omitidos, 0 adjuntos inválidos
reporte HTML       → 183 PNG: 90 screenshots automáticos, 90 full-page adjuntos y 3 parciales
```

La prueba roja previa usó el caso `el login no deja enviar el formulario vacio`: Playwright
pasó, pero el reporte sólo contenía `screenshot`; la comprobación que exigía
`pagina-completa-chromium` falló. Después del cambio, el mismo caso adjuntó ambos archivos.
