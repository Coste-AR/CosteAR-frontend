# 2026-09-08 — Guarda de tests por feature

- **Issue:** #126
- **Repo:** CosteAR-frontend
- **Rama:** `feat/issue-126-guarda-tests`
- **PR:** [#150](https://github.com/Coste-AR/CosteAR-frontend/pull/150)
- **Agente:** Codex · GPT-5

## Contrato verificado

Una carpeta `src/features/<nombre>/` se considera cubierta únicamente si contiene al menos un
archivo `*.test.ts`, `*.test.tsx`, `*.spec.ts` o `*.spec.tsx` en cualquier profundidad. No se usa
un porcentaje de cobertura.

Sobre `dev` hay 18 features: `auth`, `companies` y `cost-structures` están cubiertas; las otras 15
forman la lista inicial de excepciones decidida en #126.

## Trazabilidad de la deuda

Se creó el issue paraguas [#149](https://github.com/Coste-AR/CosteAR-frontend/issues/149), que enumera
las 15 features sin test y define que cada excepción se retire en el mismo PR que agrega su primer
archivo de prueba. No se agregaron ni modificaron etiquetas.

## Recursos

| | |
| --- | --- |
| Tiempo de la sesión | no informado por la herramienta |
| Tokens consumidos | no informado |
| Intentos hasta el verde | cuatro mutaciones deliberadas; las tres inválidas fallaron y el caso cubierto pasó; restauración basal verde |
| Comandos principales | `npm.cmd run check:feature-tests`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run test:e2e -- --workers=1 --timeout=90000` |

## Qué se hizo

- Se agregó `scripts/check-feature-tests.mjs`, sin dependencias externas.
- El encabezado declara la definición de cobertura y explica por qué la guarda comprueba presencia
  de archivos en vez de porcentaje.
- La lista literal y alfabética contiene las 15 excepciones iniciales, todas asociadas a #149.
- El script detecta una feature sin test ni excepción, una fila sin issue válido, excepciones
  duplicadas o desordenadas, nombres que ya no existen y excepciones que ya tienen test.
- Se expuso el comando `npm run check:feature-tests`.
- El workflow `ci.yml` ejecuta la guarda después de validar sus YAML y antes de lint/build/tests.

## Decisiones que tomé sobre la marcha

- **Una única referencia de deuda:** las 15 filas apuntan al issue paraguas #149, tal como autoriza
  la versión reescrita del #126. No se abrieron quince tickets redundantes.
- **Excepción ya cubierta:** la guarda también falla si una feature obtiene un test y su excepción
  permanece. Así hace ejecutable la regla de quitar la fila en el mismo PR.
- **Errores acumulados:** el script informa todos los problemas encontrados en una corrida para que
  el autor no tenga que corregirlos de a uno.
- **Sin ADR:** es una política local de CI ya especificada en el issue, no una decisión de
  arquitectura del producto.

## Qué quedó afuera

- Escribir tests para las 15 features exceptuadas.
- Medir porcentaje, ramas o afirmaciones de cobertura.
- Juzgar la calidad semántica de un test.
- Modificar etiquetas de #126 o #149.

## Pruebas de sensibilidad exigidas

### 1. Feature nueva sin test — rojo

Se creó temporalmente `src/features/guard-probe/README.md`:

```text
npm.cmd run check:feature-tests
exit_code=1
✗ La cobertura mínima por feature no cumple el contrato:
- La feature "guard-probe" no tiene ningún archivo de test. Agregá un *.test.ts(x) o
  *.spec.ts(x) dentro de su carpeta; si es deuda preexistente, declarala con un issue abierto en
  EXCEPCIONES_INICIALES.
```

### 2. La misma feature con test — verde

Se agregó temporalmente `guard-probe.test.ts`:

```text
npm.cmd run check:feature-tests
exit_code=0
✓ 19 features verificadas: 4 cubiertas y 15 excepciones trazadas.
```

Después se eliminaron ambos archivos y el directorio temporal.

### 3. `auth` sin sus seis tests — rojo

Se cambiaron temporalmente las extensiones de sus seis archivos de test para que dejaran de
matchear el contrato:

```text
npm.cmd run check:feature-tests
exit_code=1
✗ La cobertura mínima por feature no cumple el contrato:
- La feature "auth" no tiene ningún archivo de test. Agregá un *.test.ts(x) o *.spec.ts(x) dentro
  de su carpeta; si es deuda preexistente, declarala con un issue abierto en
  EXCEPCIONES_INICIALES.
```

Los seis nombres originales se restauraron antes de continuar.

### 4. `dashboard` sin número de issue — rojo

Se quitó temporalmente `issue: 149` de esa fila:

```text
npm.cmd run check:feature-tests
exit_code=1
✗ La cobertura mínima por feature no cumple el contrato:
- La excepción "dashboard" no tiene un número de issue válido. Agregá `issue: N` para que la deuda
  tenga responsable.
```

Restaurada la fila, la corrida basal volvió a verde:

```text
✓ 18 features verificadas: 3 cubiertas y 15 excepciones trazadas.
```

## Verificación estándar

```text
npm.cmd run typecheck
exit 0

npm.cmd run lint
0 errores, 108 advertencias preexistentes

npm.cmd test
Test Files 28 passed (28)
Tests 187 passed (187)

npm.cmd run test:e2e -- --workers=1 --timeout=90000
70 passed, 2 skipped (6.5m)
```

La primera corrida E2E con cuatro workers saturó la máquina y los primeros cuatro tests de
Chromium agotaron entre 1,1 y 1,8 minutos. Se detuvo esa corrida y la única repetición, serial y con
90 segundos por test, pasó completa. Los cuatro `x` de la salida son el caso marcado como fallo
esperado que verifica el fixture autenticado; los dos omitidos son el chequeo mobile excluido de
los proyectos desktop.

`python scripts/chequear-workflows.py` no pudo ejecutarse localmente porque esta instalación de
Windows no ofrece el comando `python`. El workflow conserva YAML simple y el propio CI ejecuta ese
validador en Ubuntu antes de la nueva guarda.

## Privacidad

No se incorporaron datos de clientes. La única feature temporal se llamó `guard-probe` y fue
eliminada por completo tras las pruebas.
