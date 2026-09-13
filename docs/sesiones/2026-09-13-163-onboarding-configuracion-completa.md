---
issue: 163
repo: CosteAR-frontend
pr: 171
rama: feat/onboarding-configuracion-completa
agente: codex
modelo: gpt-5
tanda: B1
inicio: 2026-09-13T17:43:00-03:00
fin: 2026-09-13T18:03:11-03:00
minutos: 20
tokens: no-informado
clears: 0
intentos_hasta_verde: 2
rojos_deliberados: 0
rebotes_de_guarda: 0
---

# 2026-09-13 — Onboarding con toda la configuración necesaria

## Qué se hizo

- El wizard ahora sigue el orden módulos, preguntas de opción, parámetros numéricos y resumen.
- En onboarding se eliminó “No sé todavía” y se exige completar todas las opciones y todos los números.
- Los inputs numéricos empiezan vacíos; el valor habitual del rubro aparece únicamente como ayuda.
- El cierre reutiliza los PUT existentes y envía opciones y números con `confirmado: true`.
- El resumen enumera módulos, respuestas y valores numéricos declarados.
- La ficha detecta opciones activas pendientes y números no confirmados con los dos contratos existentes. Una empresa incompleta se redirige al wizard y la ficha no se monta mientras tanto.
- Perfil reúne módulos, opciones y números dentro de su única pestaña Configuración. La pestaña Parámetros desapareció de la ficha de empresa y se reutilizó `CompanyCostParametersTab` dentro de Configuración.
- Los E2E cubren los rechazos por campos vacíos, la ausencia de “No sé todavía”, la redirección obligatoria, el guardado confirmado, el reingreso sin wizard y la edición desde perfil.

## Decisiones que tomé sobre la marcha

- **Qué decidí:** calcular el estado completo con `modulos-rubro` y `parametros-costeo`. Una opción sólo obliga si su clave pertenece a un módulo prendido; todo parámetro numérico devuelto debe estar confirmado. **Alternativa:** inferir relaciones por el nombre o por valores default. **Por qué:** las claves de `module.parametros` y `confirmado` ya son el contrato explícito que pide el issue.
- **Qué decidí:** mantener la edición numérica existente como componente reutilizado dentro de Perfil. **Alternativa:** duplicar tarjetas y mutaciones dentro de la configuración del rubro. **Por qué:** el criterio exige conservar el mismo camino de “Guardar y confirmar”.
- **Qué decidí:** guardar todas las respuestas pendientes juntas al pasar al resumen. **Alternativa:** persistir en cada cambio. **Por qué:** el resumen sólo puede afirmar que la configuración quedó lista después de que todas las escrituras aprobaron.

## Dónde el issue no alcanzaba

- No especificaba si una pregunta de un módulo apagado bloqueaba empresas existentes. Se tomó la relación explícita de `module.parametros`: sólo bloquean las preguntas de módulos prendidos.
- No definía una pantalla de error si falla la comprobación inicial. Se mantuvo cerrada la ficha y se ofrece reintento; abrirla sin poder verificar contradiría el bloqueo obligatorio.

## Qué quedó afuera

- No se tocó backend, cálculo de costos, textos del catálogo ni seeds.
- No se cambió la configuración posterior de estructura objetivo, que empieza después de completar este wizard.
- No se eliminó ni renombró ningún test.

## Verificación

- `npm ci`: aprobado; informó dos vulnerabilidades ya presentes (una baja y una alta).
- `npm run lint`: 0 errores y 109 advertencias preexistentes.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado; conserva la advertencia preexistente por chunks mayores a 500 kB.
- `npm run check:feature-tests`: 19 features cubiertas, 0 excepciones.
- `npm test`: 50 archivos y 233 tests aprobados.
- Playwright focalizado: 20 tests aprobados en cuatro proyectos.
- `npm run test:e2e`: 118 tests aprobados y 2 omitidos en cuatro proyectos.
- La primera corrida focalizada unitaria tuvo un único rojo por un matcher que no atravesaba el elemento `strong`; se corrigió el test sin cambiar comportamiento y la repetición aprobó 11 de 11.
