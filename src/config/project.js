import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '../..');

export const DIRS = {
  data: resolve(ROOT, 'data'),
  raw: resolve(ROOT, 'data/raw'),
  llms: resolve(ROOT, 'data/raw/llms'),
  normalized: resolve(ROOT, 'data/normalized'),
  indexes: resolve(ROOT, 'data/indexes'),
  manifests: resolve(ROOT, 'data/manifests'),
};

export const BASE_URL = 'https://tamagui.dev';
export const CRAWL_CONCURRENCY = parseInt(process.env.CRAWL_CONCURRENCY || '3', 10);
export const CRAWL_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS || '500', 10);
