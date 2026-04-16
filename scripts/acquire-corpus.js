import { crawlAndDownload } from '../src/acquisition/crawl.js';

console.error('=== Phase 1: Acquiring Tamagui corpus ===');
await crawlAndDownload();
console.error('=== Acquisition complete ===');
