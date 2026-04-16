import { buildIndexes } from '../src/indexing/buildIndexes.js';

console.error('=== Building indexes ===');
await buildIndexes();
console.error('=== Indexing complete ===');
