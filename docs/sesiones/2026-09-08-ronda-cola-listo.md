# 2026-09-08 — Ronda completa de la cola `listo`

- **Repo:** CosteAR-frontend
- **Agente:** Codex · GPT-5
- **Cola consultada al inicio y después de cada entrega:** #94, #126, #128 y #132
- **Etiquetas modificadas:** ninguna
- **Merges manuales:** ninguno

## Resultado de la ronda

| Issue | Resultado |
| --- | --- |
| #94 | Implementado en [PR #148](https://github.com/Coste-AR/CosteAR-frontend/pull/148), abierto, listo para revisión, contra `dev`, build y E2E verdes. Consume la clasificación real del dominio, conserva la incompletitud y usa el punto de equilibrio de backend. |
| #126 | Implementado en [PR #150](https://github.com/Coste-AR/CosteAR-frontend/pull/150), abierto, listo para revisión, contra `dev`, build y E2E verdes. Agrega la guarda de tests por feature y el issue paraguas [#149](https://github.com/Coste-AR/CosteAR-frontend/issues/149). |
| #128 | No implementado: la opción preferida exige un contrato de responses derivable que backend todavía no publica. Se dejó el [diagnóstico y propuesta](https://github.com/Coste-AR/CosteAR-frontend/issues/128#issuecomment-5589530289) y se abrió la dependencia [backend #282](https://github.com/Coste-AR/CosteAR-backend/issues/282). Copiar tipos manualmente habría incumplido el criterio del propio issue. |
| #132 | No requirió cambios: los PR #136, #139 y #142 ya dejaron las dependencias de producción en cero vulnerabilidades. Se pegó la [evidencia actual](https://github.com/Coste-AR/CosteAR-frontend/issues/132#issuecomment-5589565215); no se regeneró el lockfile ni se creó un PR vacío. |

## Verificación consolidada

```text
# PR #148
npm.cmd ci
exit 0 — 536 paquetes instalados

npm.cmd run typecheck
exit 0

npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd test
28 archivos, 181 tests aprobados antes del último bump de dev

npm.cmd run test:e2e -- tests/e2e/simulador-clasificacion.spec.ts
4 passed (Chromium, WebKit, Mobile Chrome y Mobile Safari)

# PR #150 y base actual de dev
npm.cmd run check:feature-tests
✓ 18 features verificadas: 3 cubiertas y 15 excepciones trazadas.

npm.cmd run typecheck
exit 0

npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd test
28 archivos, 187 tests aprobados

npm.cmd run test:e2e -- --workers=1 --timeout=90000
70 passed, 2 skipped (6.5m)

# Estado de producción para #132
npm.cmd audit --omit=dev
found 0 vulnerabilities
```

Las pruebas rojas deliberadas y sus restauraciones están detalladas en las bitácoras específicas
de #94 y #126. No se incorporaron datos de clientes; todos los fixtures y nombres temporales fueron
sintéticos.

## Qué queda fuera de esta sesión

- Esperar o ejecutar los merges: los workflows son responsables y ambos PR se dejaron abiertos.
- #128 hasta que backend #282 publique el contrato tipado.
- Las dos vulnerabilidades actuales de herramientas de desarrollo, fuera del alcance de #132.
