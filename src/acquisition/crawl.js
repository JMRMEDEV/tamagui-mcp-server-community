import { join } from 'path';
import { DIRS, BASE_URL, CRAWL_DELAY_MS } from '../config/project.js';
import { SEED_URLS } from '../config/seeds.js';
import { fetchPage } from './fetchPage.js';
import { discoverLinks, extractTitle } from './discoverLinks.js';
import { canonicalizeRoute } from '../utils/pathing.js';
import { writeJson, writeText, ensureDir } from '../utils/fs.js';
import { sha256 } from '../utils/hash.js';
import { log } from '../utils/logger.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Download the root llms.txt and split it into page-level files.
 * Also crawl HTML pages for discovery and metadata.
 */
export async function crawlAndDownload() {
  ensureDir(DIRS.manifests);
  ensureDir(DIRS.llms);

  // Step 1: Download root llms.txt
  log.info('Downloading root llms.txt...');
  const rootRes = await fetch(`${BASE_URL}/llms.txt`, {
    headers: { 'User-Agent': 'tamagui-mcp-server-community/1.0' },
  });
  if (!rootRes.ok) throw new Error(`Failed to download root llms.txt: ${rootRes.status}`);
  const rootText = await rootRes.text();
  log.info(`Root llms.txt: ${rootText.length} bytes`);

  // Step 2: Split root llms.txt into page-level sections
  const sections = splitRootLlms(rootText);
  log.info(`Split into ${sections.length} sections`);

  const downloadedPages = [];
  for (const sec of sections) {
    const localPath = join(DIRS.llms, sec.route, 'llms.txt');
    writeText(localPath, sec.content);
    downloadedPages.push({
      pageId: sec.route.replace(/\//g, '-'),
      route: '/' + sec.route,
      localPath,
      llmsUrl: `${BASE_URL}/llms.txt#${sec.route}`,
      hash: sha256(sec.content),
      byteSize: Buffer.byteLength(sec.content),
      downloadedAt: new Date().toISOString(),
      status: 'ok',
    });
  }

  // Step 3: Also download individual .md files for /docs/ routes
  log.info('Downloading individual .md files for docs routes...');
  for (const seed of SEED_URLS) {
    const route = canonicalizeRoute(seed);
    if (!route.startsWith('/docs/')) continue;
    const mdUrl = `${BASE_URL}${route}.md`;
    await sleep(CRAWL_DELAY_MS);
    try {
      const res = await fetch(mdUrl, {
        headers: { 'User-Agent': 'tamagui-mcp-server-community/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.trim()) {
          const localPath = join(DIRS.llms, route.replace(/^\//, ''), 'llms.txt');
          // Only write if we don't already have content from root llms.txt, or if .md is richer
          const existing = downloadedPages.find(p => p.route === route);
          if (!existing || text.length > (existing.byteSize || 0)) {
            writeText(localPath, text);
            if (existing) {
              existing.hash = sha256(text);
              existing.byteSize = Buffer.byteLength(text);
            } else {
              downloadedPages.push({
                pageId: route.replace(/\//g, '-').replace(/^-/, ''),
                route,
                localPath,
                llmsUrl: mdUrl,
                hash: sha256(text),
                byteSize: Buffer.byteLength(text),
                downloadedAt: new Date().toISOString(),
                status: 'ok',
              });
            }
            log.info(`Downloaded .md for ${route}`);
          }
        }
      }
    } catch (e) {
      log.warn(`Failed .md download for ${route}: ${e.message}`);
    }
  }

  // Step 4: Crawl HTML pages for metadata
  log.info('Crawling HTML pages for metadata...');
  const visited = new Set();
  const queue = [...SEED_URLS.map(canonicalizeRoute)];
  const discoveredPages = [];

  while (queue.length > 0) {
    const route = queue.shift();
    if (visited.has(route)) continue;
    visited.add(route);

    const page = await fetchPage(route);
    if (!page) continue;

    const title = extractTitle(page.html);
    const section = route.split('/').filter(Boolean)[0] || 'unknown';

    discoveredPages.push({
      pageId: route.replace(/\//g, '-').replace(/^-/, ''),
      route,
      sourceUrl: page.url,
      title,
      section,
      crawledAt: new Date().toISOString(),
    });

    // Discover new links (limited depth - only from seeds)
    const links = discoverLinks(page.html, route);
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link) && visited.size < 300) {
        queue.push(link);
      }
    }

    log.info(`[${visited.size}] ${route} — ${title || '(no title)'}`);
  }

  // Save manifests
  writeJson(join(DIRS.manifests, 'discovered-pages.json'), discoveredPages);
  writeJson(join(DIRS.manifests, 'downloaded-pages.json'), downloadedPages);

  // Build page metadata from both crawled pages and llms sections
  const metadata = {};
  for (const p of discoveredPages) {
    metadata[p.route] = { title: p.title, section: p.section };
  }
  // Fill in metadata from llms sections that weren't crawled
  for (const dl of downloadedPages) {
    if (!metadata[dl.route]) {
      const parts = dl.route.split('/').filter(Boolean);
      metadata[dl.route] = {
        title: parts[parts.length - 1]?.replace(/-/g, ' ') || '',
        section: parts[0] || 'unknown',
      };
    }
  }
  writeJson(join(DIRS.raw, 'page-metadata.json'), metadata);

  log.info(`Crawl complete: ${discoveredPages.length} pages discovered, ${downloadedPages.length} llms.txt files saved`);
  return { discoveredPages, downloadedPages };
}

/**
 * Split the root llms.txt into page-level sections based on ## markers.
 */
function splitRootLlms(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentRoute = null;
  let currentLines = [];

  for (const line of lines) {
    const match = line.match(/^## ([a-z][\w/-]+)/);
    if (match) {
      if (currentRoute && currentLines.length) {
        sections.push({ route: currentRoute, content: currentLines.join('\n').trim() });
      }
      currentRoute = match[1];
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentRoute && currentLines.length) {
    sections.push({ route: currentRoute, content: currentLines.join('\n').trim() });
  }

  return sections;
}
