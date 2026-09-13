#!/usr/bin/env node
/**
 * GUARDA: ninguna feature puede quedar sin una prueba visible en su propia carpeta.
 *
 * Una feature `src/features/<nombre>/` está cubierta si existe al menos un archivo
 * `*.test.ts`, `*.test.tsx`, `*.spec.ts` o `*.spec.tsx` en cualquier nivel debajo
 * de esa carpeta. No medimos porcentaje: esta guarda atrapa el olvido burdo de
 * entregar una feature sin ningún test, no intenta demostrar la calidad del test.
 *
 * Las excepciones son la deuda inicial medida al crear la guarda. La lista es
 * literal para que una feature nueva no pueda autoexcluirse, sólo puede achicarse
 * y cada fila apunta al issue que paga esa deuda.
 */

import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_FEATURES = join(RAIZ, 'src', 'features');
const ES_TEST = /\.(?:test|spec)\.tsx?$/;

const EXCEPCIONES_INICIALES = [];

function tieneTest(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory() && tieneTest(ruta)) return true;
    if (entrada.isFile() && ES_TEST.test(entrada.name)) return true;
  }
  return false;
}

const features = readdirSync(DIR_FEATURES, { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)
  .sort();
const nombresFeatures = new Set(features);
const problemas = [];

const nombresExcepciones = EXCEPCIONES_INICIALES.map(({ nombre }) => nombre);
const ordenEsperado = [...nombresExcepciones].sort();
if (nombresExcepciones.some((nombre, indice) => nombre !== ordenEsperado[indice])) {
  problemas.push('La lista de excepciones no está ordenada alfabéticamente.');
}

const repetidas = nombresExcepciones.filter(
  (nombre, indice) => nombresExcepciones.indexOf(nombre) !== indice,
);
for (const nombre of new Set(repetidas)) {
  problemas.push(`La excepción "${nombre}" está duplicada.`);
}

for (const excepcion of EXCEPCIONES_INICIALES) {
  if (!Number.isInteger(excepcion.issue) || excepcion.issue <= 0) {
    problemas.push(
      `La excepción "${excepcion.nombre}" no tiene un número de issue válido. ` +
        'Agregá `issue: N` para que la deuda tenga responsable.',
    );
  }
  if (!nombresFeatures.has(excepcion.nombre)) {
    problemas.push(
      `La excepción "${excepcion.nombre}" está podrida: esa carpeta ya no existe en src/features/. ` +
        'Eliminá la fila o actualizala en el mismo cambio que renombra la feature.',
    );
  }
}

const excepciones = new Set(nombresExcepciones);
let cubiertas = 0;
for (const feature of features) {
  const cubierta = tieneTest(join(DIR_FEATURES, feature));
  if (cubierta) cubiertas += 1;

  if (!cubierta && !excepciones.has(feature)) {
    problemas.push(
      `La feature "${feature}" no tiene ningún archivo de test. ` +
        'Agregá un *.test.ts(x) o *.spec.ts(x) dentro de su carpeta; ' +
        'si es deuda preexistente, declarala con un issue abierto en EXCEPCIONES_INICIALES.',
    );
  }
  if (cubierta && excepciones.has(feature)) {
    problemas.push(
      `La feature "${feature}" ya tiene un test pero sigue exceptuada. ` +
        'Eliminá su fila de EXCEPCIONES_INICIALES en este mismo cambio.',
    );
  }
}

if (problemas.length > 0) {
  console.error('\n✗ La cobertura mínima por feature no cumple el contrato:\n');
  for (const problema of problemas) console.error(`  - ${problema}`);
  process.exit(1);
}

console.log(
  `✓ ${features.length} features verificadas: ${cubiertas} cubiertas y ` +
    `${EXCEPCIONES_INICIALES.length} excepciones trazadas.`,
);
