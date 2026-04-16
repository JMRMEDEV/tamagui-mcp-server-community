import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'fs';
import { join } from 'path';
import { DIRS } from '../src/config/project.js';
import { readJson } from '../src/utils/fs.js';

describe('Corpus integrity', () => {
  it('manifests exist', () => {
    for (const f of ['discovered-pages.json', 'downloaded-pages.json', 'corpus-manifest.json']) {
      assert.ok(existsSync(join(DIRS.manifests, f)), `Missing ${f}`);
    }
  });

  it('normalized data exists', () => {
    for (const f of ['pages.json', 'chunks.json', 'headings.json', 'entities.json']) {
      assert.ok(existsSync(join(DIRS.normalized, f)), `Missing ${f}`);
    }
  });

  it('indexes exist', () => {
    for (const f of ['minisearch-index.json', 'component-index.json', 'package-index.json', 'route-index.json', 'heading-index.json', 'alias-index.json']) {
      assert.ok(existsSync(join(DIRS.indexes, f)), `Missing ${f}`);
    }
  });

  it('has a reasonable number of pages and chunks', () => {
    const pages = readJson(join(DIRS.normalized, 'pages.json'));
    const chunks = readJson(join(DIRS.normalized, 'chunks.json'));
    assert.ok(pages.length > 50, `Expected >50 pages, got ${pages.length}`);
    assert.ok(chunks.length > 200, `Expected >200 chunks, got ${chunks.length}`);
  });

  it('every chunk has required fields', () => {
    const chunks = readJson(join(DIRS.normalized, 'chunks.json'));
    for (const c of chunks.slice(0, 50)) {
      assert.ok(c.chunkId, 'Missing chunkId');
      assert.ok(c.pageId, 'Missing pageId');
      assert.ok(c.route, 'Missing route');
      assert.ok(c.body, 'Missing body');
      assert.ok(c.checksum, 'Missing checksum');
      assert.ok(typeof c.tokenEstimate === 'number', 'Missing tokenEstimate');
    }
  });

  it('every page has required fields', () => {
    const pages = readJson(join(DIRS.normalized, 'pages.json'));
    for (const p of pages.slice(0, 50)) {
      assert.ok(p.pageId, 'Missing pageId');
      assert.ok(p.route, 'Missing route');
      assert.ok(p.localPath, 'Missing localPath');
      assert.ok(p.section, 'Missing section');
    }
  });

  it('downloaded llms.txt files exist on disk', () => {
    const downloaded = readJson(join(DIRS.manifests, 'downloaded-pages.json'));
    let missing = 0;
    for (const d of downloaded) {
      if (!existsSync(d.localPath)) missing++;
    }
    assert.ok(missing < downloaded.length * 0.1, `Too many missing files: ${missing}/${downloaded.length}`);
  });
});
