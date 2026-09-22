import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const prohibidas = new RegExp(['costista', 'empresa', 'pyme', 'gestiona tu pyme'].join('|'), 'i');
const raiz = path.join(process.cwd(), 'src');

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const archivo = path.join(dir, item.name);
    if (item.isDirectory()) return archivos(archivo);
    return /\.tsx?$/.test(item.name) && !/\.test\.tsx?$/.test(item.name) ? [archivo] : [];
  });
}

function esTextoTecnico(nodo: ts.Node): boolean {
  if (!ts.isStringLiteral(nodo) && !ts.isTemplateHead(nodo)) return false;
  const texto = nodo.text;
  if (/^(?:\/|@\/)/.test(texto) || texto === 'empresa-connections') return true;
  if (/^[A-Z_]+$/.test(texto) && ts.isBinaryExpression(nodo.parent) && nodo.parent.left.getText().endsWith('.role')) return true;
  if (texto === 'empresa' || texto === 'costista' || texto === 'empresas') {
    const padre = nodo.parent;
    if (ts.isLiteralTypeNode(padre)) return true;
    if (ts.isPropertyAssignment(padre) && ['id', 'origen', 'sourceArea', 'queryKey'].includes(padre.name.getText())) return true;
    if (ts.isBinaryExpression(padre) && padre.left.getText().endsWith('.origen')) return true;
    if (ts.isVariableDeclaration(padre) && padre.name.getText() === 'SOURCE_AREA') return true;
  }
  return false;
}

it('impide vocabulario prohibido en textos de la interfaz', () => {
  const hallazgos: string[] = [];
  for (const archivo of archivos(raiz)) {
    const fuente = ts.createSourceFile(archivo, readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true, archivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visitar(nodo: ts.Node): void {
      const texto = 'text' in nodo ? (nodo as ts.Node & { text: string }).text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
      if ((ts.isJsxText(nodo) || ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo) || ts.isTemplateHead(nodo) || ts.isTemplateMiddle(nodo) || ts.isTemplateTail(nodo)) && prohibidas.test(texto) && !esTextoTecnico(nodo)) {
        const linea = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;
        hallazgos.push(`${path.relative(process.cwd(), archivo)}:${linea}: ${nodo.text.trim().replace(/\s+/g, ' ').slice(0, 100)}`);
      }
      ts.forEachChild(nodo, visitar);
    }
    visitar(fuente);
  }
  expect(hallazgos, hallazgos.join('\n')).toEqual([]);
});
