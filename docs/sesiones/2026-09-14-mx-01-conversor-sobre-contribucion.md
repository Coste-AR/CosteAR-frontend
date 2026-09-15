# Bitácora — MX-01: el conversor de pesos a unidades divide por la contribución marginal

Tercera tarea de la **Ola A** del plan de análisis marginal v2, y la única de las cuatro que
arregla un número que el dueño **ya está viendo mal en producción**. Las otras dos van en el
backend (PR #359 y #361 de `CosteAR-backend`).

## El bug

El conversor del tablero (issue #93, PR #119, mergeado el 04-09) calculaba
`importe ÷ precioPromedioVenta`. Su propia bitácora lo dice: *«el único cálculo de la herramienta
es `importe / precioPorCajon`»*.

Eso contesta **«cuántas unidades facturan ese importe»**, que no es la pregunta que alguien hace
cuando escribe un gasto ahí. **Un costo fijo no se paga con facturación: se paga con contribución
marginal** — lo que queda de cada unidad después de sus costos variables. La condición de
equilibrio es `CM = CF`, no `V = CF`.

Dividir por el precio siempre da **de menos**, y el error es exactamente la proporción entre el
costo variable y el precio. Con los números del fixture del E2E (precio 30, contribución 19), un
importe de 75 daba **2,5 unidades** cuando la respuesta es **3,95**: vender esas 2,5 deja 47,50 de
contribución, no los 75 que la pantalla daba por cubiertos.

Verificado contra `origin/dev` de hoy antes de tocar nada — el plan se escribió contra un `dev` de
hace una semana (30 commits atrás) y el hallazgo sigue vivo.

## Qué se hizo

`src/features/owner-dashboard/OwnerDashboardPage.tsx`:

- El divisor pasa a ser `contribucionMarginalPorCajon`, que el backend ya entregaba en
  `GET /periods/:id/tablero-dueno`. No hizo falta tocar el backend.
- El texto deja de decir «Equivale a» y pasa a **«Hay que vender»**: el número cambió de
  significado, no solo de valor.
- La trazabilidad dice **cuál** número se usó («Contribución marginal usada: $X por unidad»), no
  solo el período.
- Con la contribución **incompleta**, el campo queda deshabilitado con su motivo — igual que antes
  hacía con el precio.
- Con la contribución **≤ 0**, un mensaje propio: ningún volumen alcanza, porque cada unidad
  vendida agranda la pérdida. Antes este caso ni se planteaba, porque el precio siempre es
  positivo.

## Decisiones

- **El divisor es un solo número, no una opción.** Se evaluó dejar el precio como alternativa
  seleccionable y se descartó: convertir un importe a «unidades que lo facturan» no responde
  ninguna pregunta de gestión, y ofrecerlo al lado del correcto invita a elegir el que da el
  número más cómodo.
- **`precioPromedioVenta` no se toca.** Sigue publicándose como indicador propio del tablero; lo
  que cambió es de dónde se alimenta el conversor.
- **Sin ADR.** No es una decisión nueva: es la corrección de un cálculo.

## Verificación

```
npm run typecheck                      verde
npx eslint <el archivo tocado>         verde
```

E2E (`tests/e2e/tablero-dueno.spec.ts`):
- el caso positivo pasa a verificar la división por contribución (75 / 19 = 3,95) y **asierta que
  el 2,5 viejo ya no aparece**;
- el caso incompleto verifica el mensaje nuevo;
- **caso nuevo**: contribución ≤ 0 → campo deshabilitado, motivo propio, y ni `Infinity` ni `NaN`
  en pantalla.
