# 2026-09-06 — Guardas básicas de accesibilidad

- **Issue:** #127
- **Repo:** CosteAR-frontend
- **Rama:** `fix/issue-127-accesibilidad`
- **PR:** [#134](https://github.com/Coste-AR/CosteAR-frontend/pull/134)
- **Agente:** Codex · GPT-5

## Cola revisada

- #96 no se tomó porque CosteAR-backend#239 sigue abierto y todavía no existe el contrato de
  alimento, peso ni fórmula habitual. Se documentó el bloqueo en el issue sin tocar etiquetas.
- #126 no se tomó porque pide que cada excepción apunte al issue concreto que la elimina, pero las
  quince features sin tests no tienen esos issues abiertos. Usar #126 como excepción circular haría
  que la lista no pudiera achicarse. Se documentó el bloqueo sin crear issues ni tocar etiquetas.
- #127 fue el siguiente issue ejecutable de número más bajo.

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | no informado por la herramienta |
| Tokens consumidos | no informado |
| Dependencia agregada | `eslint-plugin-jsx-a11y@6.10.2`, sólo de desarrollo y pedida por el issue |
| Comandos de verificación | `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run test:e2e` |

## Qué se hizo

Se activó la configuración recomendada de `eslint-plugin-jsx-a11y` dentro del flat config de ESLint.
Al encenderla aparecieron 84 errores: 31 etiquetas sin control asociado, 24 clicks sin teclado, 19
elementos estáticos usados como controles, cuatro interacciones sobre elementos no interactivos,
cuatro `autoFocus`, un elemento interactivo sin foco y un enlace inválido.

Se corrigieron los 84 sin deshabilitar reglas. Los campos quedaron unidos a su etiqueta con
`htmlFor` e `id`; los fondos clickeables de menús, asistentes y lightboxes pasaron a botones reales;
las filas que abren fichas recibieron foco y soporte de Enter/Espacio sin interceptar los botones
internos; y el enlace falso del portal pasó a `<button>`. Los cierres que estaban escritos como una
cruz de texto ahora usan `X` de `lucide-react`.

Las imágenes ya cumplían `alt-text`, por lo que no hubo que inventar descripciones. El único
`alt=""` relevante es el avatar decorativo, acompañado por el nombre o la inicial de la persona.

Se agregó un E2E que entra a Recuperar contraseña, alcanza el email con Tab, escribe con el teclado,
avanza al botón con Tab y envía con Enter. Verifica la petición, el estado neutral final, la consola
y adjunta una captura por navegador.

## Medición y verificación

```text
Antes de activar jsx-a11y: 0 errores, 108 advertencias preexistentes
Configuración activa antes de corregir: 84 errores, 108 advertencias
Después de corregir: 0 errores, 108 advertencias

npm.cmd run typecheck
sin errores

npm.cmd test
26 archivos aprobados, 181 tests aprobados

npm.cmd run test:e2e
66 aprobados, 2 omitidos, 4.0 min
```

El flujo nuevo pasó en Chromium, WebKit, Mobile Chrome y Mobile Safari. Las capturas de escritorio y
Mobile Safari se revisaron visualmente: el estado final queda legible y sin desborde.

### Prueba roja deliberada

Se agregó temporalmente un componente con `<div onClick={() => undefined}>`. El lint falló con
código 1 por `jsx-a11y/click-events-have-key-events` y
`jsx-a11y/no-static-element-interactions`: dos errores y las 108 advertencias preexistentes.

Se eliminó solamente ese componente temporal. La misma corrida volvió a 0 errores y código 0.

## Decisiones

- La configuración recomendada se aplica a todos los TSX; una allowlist habría dejado abierta la
  misma regresión que el issue busca bloquear.
- En los listados tabulares se mantuvo la estructura de tabla y se agregó semántica de botón más
  teclado. El manejador ignora controles anidados para que Enter sobre una acción interna no abra
  también la ficha de la fila.
- Se quitaron los `autoFocus`: forzar el foco al montar modales o ediciones puede desorientar a quien
  navega con tecnología asistiva y la regla recomendada lo prohíbe.
- No se agregó ADR: es una regla local de calidad del frontend, no una decisión arquitectónica entre
  repositorios.

## Fuera de alcance

- Contraste de colores y tamaños táctiles, excluidos expresamente por #127.
- Las 108 advertencias preexistentes que no pertenecen a `jsx-a11y`.
- Los 14 hallazgos que `npm install` informó para el árbol completo (4 moderados, 9 altos y 1
  crítico). No se ejecutó `npm audit fix` porque modificaría dependencias fuera de esta guarda.

## Privacidad

No se incorporaron datos de clientes. Los fixtures usan una identidad y un dominio sintéticos.
