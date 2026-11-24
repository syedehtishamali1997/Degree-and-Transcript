import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const srcFiles = getFiles('src');
let errors = 0;

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), importPath);
      const possible = [
        resolved,
        resolved + '.js',
        resolved + '.jsx',
        resolved + '.css',
        path.join(resolved, 'index.js'),
        path.join(resolved, 'index.jsx')
      ];
      const exists = possible.some(p => fs.existsSync(p));
      if (!exists) {
        console.error('MISSING IMPORT in', file, '->', importPath);
        errors++;
      }
    }
  }
});

console.log(`Checked ${srcFiles.length} source files. Relative import errors: ${errors}`);
if (errors > 0) process.exit(1);
