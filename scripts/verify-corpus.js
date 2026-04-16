import fg from 'fast-glob';
import { join } from 'path';
import { DIRS } from '../src/config/project.js';
import { readJson, existsSync } from '../src/utils/fs.js';

console.error('=== Verifying corpus ===');
const issues = [];

// Check manifests
for (const f of ['discovered-pages.json', 'downloaded-pages.json', 'corpus-manifest.json']) {
  const p = join(DIRS.manifests, f);
  if (!existsSync(p)) issues.push(`Missing manifest: ${f}`);
}

// Check indexes
for (const f of ['minisearch-index.json', 'component-index.json', 'package-index.json', 'route-index.json']) {
  const p = join(DIRS.indexes, f);
  if (!existsSync(p)) issues.push(`Missing index: ${f}`);
}

// Check normalized data
for (const f of ['pages.json', 'chunks.json']) {
  const p = join(DIRS.normalized, f);
  if (!existsSync(p)) issues.push(`Missing normalized file: ${f}`);
}

// Check llms files
const llmsFiles = await fg('**/llms.txt', { cwd: DIRS.llms });
if (llmsFiles.length === 0) issues.push('No llms.txt files found in data/raw/llms/');

if (issues.length) {
  console.error('Issues found:');
  issues.forEach(i => console.error(`  - ${i}`));
  process.exit(1);
} else {
  console.error(`Corpus healthy: ${llmsFiles.length} llms.txt files, all manifests and indexes present.`);
}
