import { crawlAndDownload } from '../src/acquisition/crawl.js';
import { normalizeCorpus } from '../src/normalize/normalize.js';
import { buildIndexes } from '../src/indexing/buildIndexes.js';

console.error('=== Refreshing corpus ===');
await crawlAndDownload();
await normalizeCorpus();
await buildIndexes();
console.error('=== Refresh complete ===');
