---
paths:
  - "src/**"
---

# Reglas de frontend

> Extraído de `CLAUDE.md` el 22-08-2026 (Pieza 1: partir el archivo raíz por rutas). Carga solo
> cuando el trabajo toca código de la aplicación (`src/`), no cuando se editan docs, CI o config.

|ID|Regla|
|---|---|
|**FE-01**|**Nada de `fetch` o `axios` directo dentro de componentes.** Todo el estado del servidor pasa por hooks de TanStack Query.|
|**FE-02**|**Zustand es para estado de cliente** (sesión, UI). Nunca para estado del servidor.|
|**FE-03**|**Ninguna URL de API hardcodeada.** Todo por el cliente Axios centralizado con refresh de token.|
|**FE-04**|El access token vive **en memoria**, nunca en `localStorage`. Es una decisión de seguridad tomada, no la revierta nadie sin ADR.|
|**FE-05**|**Antes de crear un componente nuevo, buscá si ya existe.** Un botón/input/modal duplicado es deuda inmediata.|
|**FE-06**|**Nada de colores en hex crudo ni spacing arbitrario** donde hay token de Tailwind. La identidad visual es el granate de la guía "Identidad Visual v1.0".|
|**FE-07**|Los números que se muestran al usuario son **plata de un cliente real**. Formato y redondeo se respetan tal cual los define el backend — el frontend no recalcula.|

---
