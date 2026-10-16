import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

async function walk(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
      ),
    )
  ).flat();
}
const files = (await walk('src')).filter((f) => /\.(ts|astro)$/.test(f));
const graph = new Map<string, string[]>();
const errors: string[] = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const references = [
    ...source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g),
  ].map((m) => m[1]!);
  const edges: string[] = [];
  for (const spec of references) {
    const target = spec.startsWith('.')
      ? path.normalize(path.join(path.dirname(file), spec))
      : spec;
    const disallow = (message: string) => errors.push(`${file}: ${message} (${spec})`);
    if (
      /^src\/(core|application)\//.test(file) &&
      (/^astro/.test(spec) || /\.(astro|css)$/.test(spec) || /^(three|node:)/.test(spec))
    )
      disallow('핵심 규칙에 런타임·화면 의존');
    if (/^src\/core\//.test(file) && target.startsWith('src/') && !target.startsWith('src/core/'))
      disallow('core 외부 의존');
    if (
      /^src\/application\//.test(file) &&
      target.startsWith('src/') &&
      !/^src\/(application|core)\//.test(target)
    )
      disallow('application 외부 구현 의존');
    if (
      /^src\/(features|designs)\//.test(file) &&
      (/^src\/(server|adapters|pages)\//.test(target) || spec === 'astro:content')
    )
      disallow('브라우저·디자인에서 빌드 계층 참조');
    if (/^src\/features\//.test(file) && /^src\/(designs|presentation)\//.test(target))
      disallow('기능에서 디자인 참조');
    if (
      spec === 'astro:content' &&
      !file.startsWith('src/adapters/') &&
      file !== 'src/content.config.ts'
    )
      disallow('컬렉션 API는 adapter에만 허용');
    if (spec.startsWith('.')) {
      const resolved = files.find(
        (f) =>
          f === target ||
          f === `${target}.ts` ||
          f === `${target}.astro` ||
          f === `${target}/index.ts`,
      );
      if (resolved) edges.push(resolved);
    }
  }
  if (/^src\/(features|designs)\//.test(file) && file.endsWith('.ts')) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    ast.forEachChild((node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        if (
          spec.includes('application/') &&
          node.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword
        )
          errors.push(`${file}: application은 타입 전용 import만 허용`);
      }
    });
  }
  graph.set(file, edges);
}
const visiting = new Set<string>(),
  visited = new Set<string>();
function visit(file: string) {
  if (visiting.has(file)) {
    errors.push(`순환 참조: ${file}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const next of graph.get(file) || []) visit(next);
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) visit(file);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Architecture boundaries: ${files.length} files checked.`);
