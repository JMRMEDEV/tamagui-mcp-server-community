import { doctorCorpus } from '../src/retrieval/retrieve.js';
import { loadIndexes } from '../src/retrieval/retrieve.js';

try {
  loadIndexes();
  const result = doctorCorpus();
  console.error(JSON.stringify(result, null, 2));
  if (!result.healthy) process.exit(1);
} catch (err) {
  console.error('Doctor failed — indexes may not be built yet.');
  console.error('Run: npm run acquire && npm run normalize && npm run index');
  console.error(err.message);
  process.exit(1);
}
