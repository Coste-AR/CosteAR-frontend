---
issue: 185
repo: CosteAR-frontend
pr: pendiente
rama: feat/185-home-accionable
agente: codex
modelo: gpt-5
tanda: B3
inicio: 2026-09-24T21:32:19-03:00
fin: 2026-09-25T00:04:00-03:00
minutos: 152
tokens: no-informado
clears: 1
intentos_hasta_verde: 16
rojos_deliberados: 1
rebotes_de_guarda: 0
---

# 2026-09-24 — Un home breve para decidir y actuar

## Qué se hizo

- Se reemplazó el tablero extenso del inicio por cuatro bloques: contexto macro, tres KPI principales del rubro, accesos rápidos configurados y tres acciones operativas.
- Cada indicador macro conserva su fuente como enlace externo y muestra `Sin dato` cuando el backend entrega `null`.
- Los KPI respetan la terna y el orden declarados por `rubro.kpisHome`; el frontend no recalcula valores de negocio.
- Los accesos rápidos cruzan preferencias y catálogo, omiten entradas sin destino navegable y conservan el orden configurado.
- Configuración quedó accesible desde un engranaje en el encabezado. Proceso, Alertas y Configuración tienen accesos fijos.
- Se agregaron pruebas unitarias del contenido y estados vacíos, más Playwright en cuatro viewports con capturas, navegación y guardas de overflow.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** usar `Elegí un negocio` cuando no existe una única empresa seleccionable. **Alternativa:** conservar `Elegí una empresa`. **Motivo:** el mismo issue prohíbe vocabulario técnico visible; se priorizó el lenguaje del producto conforme a Constitución §1 y §9.
- **Qué decidí:** no elegir implícitamente entre varias estructuras de costos. **Alternativa:** tomar la primera. **Motivo:** una selección silenciosa puede mezclar contexto operativo; Constitución §2 y §3 exigen declarar la ausencia de contexto.
- **Qué decidí:** mostrar tres marcadores `Sin período abierto` y un enlace para abrirlo cuando la estructura no tiene período vigente. **Alternativa:** ocultar el bloque. **Motivo:** mantiene explícita la terna que el rubro define sin fabricar valores; Constitución §2.
- **Qué decidí:** omitir un acceso configurable si el catálogo no trae `destino`. **Alternativa:** inferir una ruta desde la clave. **Motivo:** el destino es parte del contrato resuelto por backend #417; inventarlo en frontend violaría Constitución §4 y §9.

## Dónde el issue no alcanzaba

- No definía qué hacer cuando hay más de una estructura de costos. Se muestra `Elegí una estructura` y no se consulta un período arbitrario.
- No definía el estado sin período abierto. Se preserva la forma de tres KPI con ausencia explícita y una acción para resolverla.
- La frase de aceptación decía `empresa`, pero el propio issue también exige que no aparezca ese término visible. Se adoptó `negocio`.
- No indicaba si un acceso rápido sin destino debía fallar, quedar deshabilitado u ocultarse. Se lo omite para que todos los accesos visibles sean accionables.

## Qué quedó afuera

- La edición de accesos rápidos corresponde a #189; este cambio sólo consume la configuración.
- La configuración consolidada para múltiples negocios y la selección de estructura no forman parte de #185.
- El feed de alertas dejó de estar en el home; su detalle continúa en la pantalla de Alertas y el home conserva el acceso fijo.
- El test `home cuenta solo alertas activas y la lista explica lo que no pudo evaluarse` cambió de alcance y título porque el home ya no muestra ese feed; las aserciones permanecen en la pantalla de alertas.

## Con qué se verifica

```bash
npm run lint
# 0 errores; 109 advertencias preexistentes

npm run typecheck
# verde

npm run test -- --maxWorkers=1
# 61 archivos; 269 tests pasados

npm run test -- src/features/dashboard/HomeBlocks.test.tsx
# 5 tests pasados

npm run build
# verde; advertencia informativa de tamaño de chunk

npm run check:feature-tests
# 20/20

npm run test:e2e -- --workers=1 --retries=1
# 166 pasados; 2 salteados; 16,0 min; cuatro viewports
```

El primer rojo deliberado comprobó que el test de componente fallaba antes de existir `HomeBlocks`. Los fallos posteriores fueron ajustes de selectores/fixtures o presión de recursos: las repeticiones focalizadas y la corrida contractual final quedaron verdes.
