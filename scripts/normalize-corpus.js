import { normalizeCorpus } from '../src/normalize/normalize.js';

console.error('=== Normalizing corpus ===');
await normalizeCorpus();
console.error('=== Normalization complete ===');
