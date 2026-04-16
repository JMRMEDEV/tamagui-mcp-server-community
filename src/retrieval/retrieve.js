import MiniSearch from 'minisearch';
import { join } from 'path';
import { DIRS } from '../config/project.js';
import { SEARCH_DEFAULT_LIMIT } from '../config/retrieval.js';
import { readJson, existsSync } from '../utils/fs.js';

let _ms = null;
let _chunks = null;
let _pages = null;
let _componentIndex = null;
let _packageIndex = null;
let _routeIndex = null;
let _headingIndex = null;
let _aliasIndex = null;

export function loadIndexes() {
  const msData = readJson(join(DIRS.indexes, 'minisearch-index.json'));
  _ms = MiniSearch.loadJSON(JSON.stringify(msData), {
    fields: ['title', 'heading', 'body'],
    storeFields: ['chunkId', 'pageId', 'route', 'title', 'heading', 'tokenEstimate'],
    idField: 'chunkId',
  });
  _chunks = readJson(join(DIRS.normalized, 'chunks.json'));
  _pages = readJson(join(DIRS.normalized, 'pages.json'));
  _componentIndex = readJson(join(DIRS.indexes, 'component-index.json'));
  _packageIndex = readJson(join(DIRS.indexes, 'package-index.json'));
  _routeIndex = readJson(join(DIRS.indexes, 'route-index.json'));
  _headingIndex = readJson(join(DIRS.indexes, 'heading-index.json'));
  _aliasIndex = readJson(join(DIRS.indexes, 'alias-index.json'));
}

function getChunk(chunkId) {
  return _chunks.find(c => c.chunkId === chunkId);
}

function getPage(pageId) {
  return _pages.find(p => p.pageId === pageId);
}

function formatResult(chunk) {
  return {
    chunkId: chunk.chunkId,
    route: chunk.route,
    title: chunk.title,
    heading: chunk.heading,
    excerpt: chunk.body.slice(0, 800),
    codeSnippets: chunk.codeSnippets?.slice(0, 3) || [],
    tokenEstimate: chunk.tokenEstimate,
    citation: {
      localPath: chunk.localPath,
      route: chunk.route,
      title: chunk.title,
      heading: chunk.heading,
      chunkId: chunk.chunkId,
    },
  };
}

// --- Public retrieval functions ---

export function searchDocs(query, { limit = SEARCH_DEFAULT_LIMIT, section, packageFilter, componentFilter } = {}) {
  if (!_ms) throw new Error('Indexes not loaded');

  // Check alias first
  const aliasRoute = _aliasIndex[query.toLowerCase()];
  if (aliasRoute) {
    const aliasChunks = _chunks.filter(c => c.route === aliasRoute);
    if (aliasChunks.length) {
      return aliasChunks.slice(0, limit).map(formatResult);
    }
  }

  let results = _ms.search(query, { boost: { title: 3, heading: 2, body: 1 }, fuzzy: 0.2, prefix: true });

  // Apply filters
  if (section) {
    results = results.filter(r => r.route.startsWith(`/${section}`));
  }
  if (componentFilter) {
    const key = componentFilter.toLowerCase();
    const entry = _componentIndex[key];
    if (entry) {
      const routeSet = new Set(entry.routes);
      results = results.filter(r => routeSet.has(r.route));
    }
  }
  if (packageFilter) {
    const key = packageFilter.toLowerCase();
    const entry = _packageIndex[key];
    if (entry) {
      const routeSet = new Set(entry.routes);
      results = results.filter(r => routeSet.has(r.route));
    }
  }

  return results.slice(0, limit).map(r => {
    const chunk = getChunk(r.id);
    return chunk ? formatResult(chunk) : { chunkId: r.id, route: r.route, title: r.title, heading: r.heading, score: r.score };
  });
}

export function getPageByRoute(route) {
  const page = _pages.find(p => p.route === route);
  if (!page) {
    // Try alias
    const aliasRoute = _aliasIndex[route.toLowerCase()] || _aliasIndex[route.replace(/^\//, '').toLowerCase()];
    if (aliasRoute) return _pages.find(p => p.route === aliasRoute) || null;
    return null;
  }
  const chunks = _chunks.filter(c => c.pageId === page.pageId);
  return { ...page, chunks: chunks.map(formatResult) };
}

export function getComponentDocs(name) {
  const key = name.toLowerCase();
  const entry = _componentIndex[key];
  if (!entry) return null;

  // Score routes: direct component pages first, then mentions
  const scoreRoute = (r) => {
    const rl = r.toLowerCase();
    // Exact component name in route
    if (rl.includes(key)) return 0;
    // Common aliases (xstack -> stacks, ystack -> stacks)
    const base = key.replace(/(x|y|z)stack/, 'stacks');
    if (base !== key && rl.includes(base)) return 0;
    // Component section pages
    if (rl.startsWith('/components/') || rl.startsWith('/ui/')) return 1;
    return 2;
  };

  const sortedRoutes = [...entry.routes].sort((a, b) => scoreRoute(a) - scoreRoute(b));

  const chunks = _chunks
    .filter(c => sortedRoutes.includes(c.route))
    .sort((a, b) => sortedRoutes.indexOf(a.route) - sortedRoutes.indexOf(b.route));

  return { component: entry.name, routes: sortedRoutes, chunks: chunks.map(formatResult) };
}

export function getPackageDocs(name) {
  const key = name.toLowerCase();
  const entry = _packageIndex[key];
  if (!entry) return null;
  const chunks = _chunks.filter(c => entry.routes.includes(c.route));
  return { package: entry.name, routes: entry.routes, chunks: chunks.map(formatResult) };
}

export function getInstallationDocs(framework) {
  const query = framework ? `installation ${framework}` : 'installation';
  return searchDocs(query, { limit: 10, section: 'docs' });
}

export function listSections() {
  const sections = {};
  for (const p of _pages) {
    if (!sections[p.section]) sections[p.section] = [];
    sections[p.section].push({ route: p.route, title: p.title });
  }
  return sections;
}

export function listComponents() {
  return Object.entries(_componentIndex).map(([key, val]) => ({
    name: val.name,
    routes: val.routes,
  }));
}

export function explainTopic(query) {
  const results = searchDocs(query, { limit: 5 });
  if (!results.length) return { answer: `No local documentation found for "${query}".`, citations: [] };
  const answer = results.map(r => `## ${r.title}${r.heading ? ' > ' + r.heading : ''}\n\n${r.excerpt}`).join('\n\n---\n\n');
  const citations = results.map(r => r.citation);
  return { answer, citations };
}

export function doctorCorpus() {
  const issues = [];
  if (!existsSync(join(DIRS.manifests, 'corpus-manifest.json'))) issues.push('Missing corpus-manifest.json');
  if (!existsSync(join(DIRS.indexes, 'minisearch-index.json'))) issues.push('Missing minisearch-index.json');
  if (!existsSync(join(DIRS.normalized, 'chunks.json'))) issues.push('Missing chunks.json');
  if (!existsSync(join(DIRS.normalized, 'pages.json'))) issues.push('Missing pages.json');

  let manifest = null;
  if (existsSync(join(DIRS.manifests, 'corpus-manifest.json'))) {
    manifest = readJson(join(DIRS.manifests, 'corpus-manifest.json'));
  }

  return {
    healthy: issues.length === 0,
    issues,
    manifest,
  };
}
