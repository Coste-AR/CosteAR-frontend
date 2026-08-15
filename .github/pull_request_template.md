<!--
  Usá `Closes #N` solo si este PR cierra el issue ENTERO.
  Si quedan gaps reales, poné `part of #N` — cerrar un issue a medias esconde trabajo pendiente.
-->

Closes #

## Qué

<!-- Qué hace este PR, en 2-3 bullets. -->

-

## Por qué

<!-- El motivo. Si hubo una decisión no obvia, linkeá el ADR: docs/adr/NNNN-slug.md -->

## Cambios

| Archivo | Cambio |
| --- | --- |
| | |

## Cómo probarlo

### Automático

- [ ] `npm run lint` pasa
- [ ] `npm run typecheck` pasa
- [ ] `npm test` pasa

### Manual

<!--
  Pasos exactos para verificarlo EN EL NAVEGADOR.
  Los tests unitarios NO validan un flujo: hubo un caso con 98 tests en verde y el flujo roto.
-->

1.

## Checklist

- [ ] Issue vinculado
- [ ] Commits convencionales y atómicos
- [ ] **Lo abrí en el navegador y lo probé** (obligatorio si toca UI o flujo)
- [ ] Tests escritos o actualizados
- [ ] `.env.example` actualizado si agregué variables
- [ ] Busqué si el componente ya existía antes de crear uno nuevo
- [ ] Sin colores en hex crudo ni spacing arbitrario donde hay token
- [ ] Decisión no trivial documentada en `docs/adr/`
