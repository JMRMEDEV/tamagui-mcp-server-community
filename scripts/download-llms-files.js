import { SEED_URLS } from '../src/config/seeds.js';
import { downloadLlmsFile } from '../src/acquisition/downloadLlmsFile.js';
import { canonicalizeRoute } from '../src/utils/pathing.js';
import { writeJson, ensureDir } from '../src/utils/fs.js';
import { DIRS } from '../src/config/project.js';
import { join } from 'path';

ensureDir(DIRS.manifests);
const results = [];
for (const seed of SEED_URLS) {
  const route = canonicalizeRoute(seed);
  const dl = await downloadLlmsFile(route);
  if (dl) results.push(dl);
}
writeJson(join(DIRS.manifests, 'downloaded-pages.json'), results);
console.error(`Downloaded ${results.length} llms.txt files`);
