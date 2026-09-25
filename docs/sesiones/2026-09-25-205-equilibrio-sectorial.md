---
issue: 205
repo: CosteAR-frontend
pr: 230
rama: feat/205-equilibrio-sectorial
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-25T13:25:11-03:00
fin: 2026-09-25T14:58:00-03:00
minutos: 93
tokens: no-informado
clears: 1
intentos_hasta_verde: 20
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-25 — Equilibrio sectorial y específico

## Qué se hizo

- Se integró AM-02 en el tablero del dueño con equilibrio específico, equilibrio sectorial,
  contribución neta, excedente y la unidad declarada por el negocio para cada segmento.
- Las vistas sin prorrateo y con prorrateo quedaron lado a lado. La segunda muestra de forma
  explícita que no es doctrinaria y reproduce el motivo recibido del backend.
- Se agregó la administración de segmentos de análisis: alta, edición y baja, con nivel,
  jerarquía, participación, precio, costos, producción conjunta y coproductos.
- Los cálculos y las reglas de dominio siguen en backend. El frontend sólo envía el contrato,
  invalida ambas consultas y muestra literalmente los 422, incluido R15.
- Se cubrieron el contrato HTTP y los estados con pruebas unitarias, y se agregó un flujo
  Playwright que captura AM-02 y la gestión de segmentos en los cuatro proyectos.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** consumir y mostrar los resultados de las dos vistas sin calcular diferencias ni
  equilibrios en React.
  **Qué otra opción había:** reconstruir AM-02 a partir de participación y costos del formulario.
  **Por qué elegí esta:** backend es la única fuente de verdad del dominio y de sus redondeos
  (Constitución §4).
- **Qué decidí:** presentar el motivo de `vistaConProrrateo` tal como llega y acompañarlo con la
  marca «No doctrinaria».
  **Qué otra opción había:** resumirlo o convertir la segunda vista en un resultado equivalente al
  doctrinario.
  **Por qué elegí esta:** evita esconder una diferencia conceptual relevante y conserva la
  trazabilidad del contrato (Constitución §2 y §9).
- **Qué decidí:** usar la unidad ya resuelta por el tablero para los equilibrios de cada segmento.
  **Qué otra opción había:** inferir una unidad a partir del rubro o fijar «unidades».
  **Por qué elegí esta:** la configuración explícita prevalece sobre una inferencia local
  (Constitución §3).
- **Qué decidí:** exponer todos los campos que acepta el contrato de segmentos, incluida la
  producción conjunta con coproductos.
  **Qué otra opción había:** ocultar campos y completar valores por defecto sin que la persona los
  vea.
  **Por qué elegí esta:** no inventa decisiones económicas ni manda supuestos silenciosos
  (Constitución §1, §2 y §5).
- **Qué decidí:** conservar el camino inválido de costo variable propio más producción conjunta y
  mostrar R15 desde backend.
  **Qué otra opción había:** impedir esa combinación en el navegador.
  **Por qué elegí esta:** prueba que la regla permanece centralizada y que el error exacto llega a
  la persona, en vez de duplicar la validación.

## Dónde el issue no alcanzaba

- La descripción abreviaba la carga como nivel, participación y costos, pero el POST cerrado por
  backend también exige nombre y producción conjunta y admite jerarquía y coproductos. Se siguió
  el OpenAPI completo sin inventar valores ocultos.
- El issue no definía cómo nombrar el nivel técnico `empresa`. En pantalla se usó «Negocio
  completo», manteniendo el literal únicamente en el contrato HTTP.
- No especificaba de dónde tomar la unidad de los equilibrios. Se reutilizó la unidad ya declarada
  y normalizada por el tablero.
- La fila recién actualizada puede moverse durante el refetch. En WebKit, la espera geométrica de
  Playwright no llegó a considerarla estable; el test final hace scroll DOM al botón exacto y luego
  conserva un click real y localizado.
- El wrapper global de `npm` apunta a una instalación inexistente. Los scripts se ejecutaron con
  `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` o con el binario local.
- `node_modules` no existía. El primer `npm ci` dejó una instalación parcial por `ENOTEMPTY`; se
  retiró únicamente ese directorio parcial y la segunda instalación terminó correctamente.

## Qué quedó afuera

- No se agregaron fórmulas, redondeos ni reglas económicas en frontend.
- No se modificó el contrato backend ni se implementó edición masiva de segmentos.
- No se eliminó ni renombró ningún test.
- Antes de tomar #205 se comprobó que #190 no tiene todavía contratos suficientes para completar
  su alcance. Se documentó el bloqueo allí y se abrió Coste-AR/CosteAR-backend#488; no hay cambios
  de #190 dentro de este PR.

## Con qué se verifica

```bash
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
# 0 errores; 109 advertencias preexistentes

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test
# 63 archivos; 279 tests pasados

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
# verde

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run check:feature-tests
# 20 features cubiertas; 0 excepciones

node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test:e2e -- --workers=1
# 178 pasados; 2 salteados; 18.1 min; cuatro proyectos
```
