import fs from 'node:fs';

/**
 * @irys/sdk (ESM) imports `parse` as a default export from `csv-parse`.
 * csv-parse v5 ESM entrypoints only export named `parse`, so Next/Node throws:
 *   "The requested module 'csv-parse' does not provide an export named 'default'"
 *
 * This patch adds `export default parse;` to the ESM entrypoints.
 */

const targets = [
  'node_modules/csv-parse/lib/index.js',
  'node_modules/csv-parse/dist/esm/index.js',
  'node_modules/@bundlr-network/client/node_modules/csv-parse/lib/index.js',
  'node_modules/@bundlr-network/client/node_modules/csv-parse/dist/esm/index.js',
];

function patchFile(relPath) {
  if (!fs.existsSync(relPath)) return { relPath, status: 'missing' };

  const original = fs.readFileSync(relPath, 'utf8');
  if (/^\s*export\s+default\s+parse\s*;\s*$/m.test(original)) {
    return { relPath, status: 'already-patched' };
  }

  // Prefer converting the existing comment `// export default parse` if present.
  let next = original.replace(/^\s*\/\/\s*export default parse\s*$/m, 'export default parse;');

  // Otherwise inject right before the last named-export line containing `parse`.
  if (next === original) {
    next = next.replace(
      /^(\s*export\s*\{[^}]*\bparse\b[^}]*\};\s*)$/m,
      'export default parse;\n$1'
    );
  }

  if (next === original) {
    return { relPath, status: 'no-change' };
  }

  fs.writeFileSync(relPath, next, 'utf8');
  return { relPath, status: 'patched' };
}

const results = targets.map(patchFile);
const patched = results.filter((r) => r.status === 'patched');

// eslint-disable-next-line no-console
console.log('[patch-csv-parse-default]', results);

if (patched.length === 0) {
  // Keep postinstall non-fatal if layout differs.
  process.exit(0);
}
