import MiniSearch from 'minisearch';
import { join } from 'path';
import { DIRS } from '../config/project.js';
import { readJson, writeJson, ensureDir } from '../utils/fs.js';
import { log } from '../utils/logger.js';

export async function buildIndexes() {
  ensureDir(DIRS.indexes);

  const chunks = readJson(join(DIRS.normalized, 'chunks.json'));
  const pages = readJson(join(DIRS.normalized, 'pages.json'));
  const entities = readJson(join(DIRS.normalized, 'entities.json'));

  // --- BM25 / full-text index via MiniSearch ---
  const ms = new MiniSearch({
    fields: ['title', 'heading', 'body'],
    storeFields: ['chunkId', 'pageId', 'route', 'title', 'heading', 'tokenEstimate'],
    idField: 'chunkId',
    searchOptions: {
      boost: { title: 3, heading: 2, body: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  ms.addAll(chunks);
  writeJson(join(DIRS.indexes, 'minisearch-index.json'), ms.toJSON());

  // --- Component index ---
  const componentIndex = {};
  if (entities.components) {
    for (const [name, routes] of Object.entries(entities.components)) {
      componentIndex[name.toLowerCase()] = { name, routes: [...new Set(routes)] };
    }
  }
  writeJson(join(DIRS.indexes, 'component-index.json'), componentIndex);

  // --- Package index ---
  const packageIndex = {};
  if (entities.packages) {
    for (const [name, routes] of Object.entries(entities.packages)) {
      packageIndex[name.toLowerCase()] = { name, routes: [...new Set(routes)] };
    }
  }
  writeJson(join(DIRS.indexes, 'package-index.json'), packageIndex);

  // --- Route index ---
  const routeIndex = {};
  for (const p of pages) {
    routeIndex[p.route] = { pageId: p.pageId, title: p.title, section: p.section };
  }
  writeJson(join(DIRS.indexes, 'route-index.json'), routeIndex);

  // --- Heading index ---
  const headingIndex = {};
  for (const c of chunks) {
    if (c.heading) {
      const key = c.heading.toLowerCase();
      if (!headingIndex[key]) headingIndex[key] = [];
      headingIndex[key].push({ chunkId: c.chunkId, route: c.route, heading: c.heading });
    }
  }
  writeJson(join(DIRS.indexes, 'heading-index.json'), headingIndex);

  // --- Alias index ---
  const aliasIndex = {
    xstack: '/ui/stacks/stacks',
    ystack: '/ui/stacks/stacks',
    zstack: '/ui/stacks/stacks',
    stacks: '/ui/stacks/stacks',
    styled: '/docs/core/styled',
    usetheme: '/docs/core/use-theme',
    usemedia: '/docs/core/use-media',
    '@tamagui/core': '/docs/core/exports',
    'tamagui': '/docs/intro/introduction',
  };
  writeJson(join(DIRS.indexes, 'alias-index.json'), aliasIndex);

  // --- Corpus manifest ---
  const sections = {};
  for (const p of pages) {
    sections[p.section] = (sections[p.section] || 0) + 1;
  }
  writeJson(join(DIRS.manifests, 'corpus-manifest.json'), {
    totalPages: pages.length,
    totalChunks: chunks.length,
    builtAt: new Date().toISOString(),
    sections,
    componentCount: Object.keys(componentIndex).length,
    packageCount: Object.keys(packageIndex).length,
  });

  // --- Index manifest ---
  writeJson(join(DIRS.manifests, 'index-manifest.json'), {
    builtAt: new Date().toISOString(),
    indexes: ['minisearch-index', 'component-index', 'package-index', 'route-index', 'heading-index', 'alias-index'],
  });

  log.info(`Indexes built: ${chunks.length} chunks indexed, ${Object.keys(componentIndex).length} components, ${Object.keys(packageIndex).length} packages`);
}
