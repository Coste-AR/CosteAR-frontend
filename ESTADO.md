<!--
  EL MENSAJE DEL ORQUESTADOR — repo del FRONTEND.

  Se inyecta entero al principio de cada sesión de Claude en este repo. Vale más
  corto que completo.

  Reglas para mantenerlo:
   - Máximo 20 líneas. Si no entra, es que algo de acá ya no está pasando.
   - Solo lo que cambia lo que alguien va a hacer HOY. Lo histórico va a docs/.
   - "No tocar" siempre con el motivo al lado: una prohibición sin razón se
     ignora o se pregunta, y las dos cuestan.
   - Cada repo tiene el suyo: lo que no hay que tocar en el backend no es lo
     mismo que acá.

  El hook saca los comentarios HTML como éste antes de inyectar: son para
  nosotros, no gastan contexto de la sesión.
-->

**Actualizado: 22-08-2026**

- ⚠️ **El flujo cambió**: el PR nace en draft y se mergea con squash. Las promociones
  (`dev→staging→main`) van con **merge commit**, no squash.
  Manual: https://github.com/Coste-AR/CosteAR-backend/blob/dev/docs/manual-de-flujo-de-trabajo.md
- 📌 **Hay tres pantallas pendientes de datos que el backend ya calcula y nadie muestra**: costo
  unitario de lo terminado (#57), desperdicio del período (#58) y trabajos de terceros (#59).
  Son el patrón que la auditoría marcó: piezas construidas y nunca enchufadas.
- 🔴 **No inventes datos de un cliente real en fixtures ni en ejemplos.** Ni nombre, ni localidad,
  ni números. Este repo es **público** (regla CLI-01).

**En curso:** Santiago — infraestructura y flujo, en el backend.
