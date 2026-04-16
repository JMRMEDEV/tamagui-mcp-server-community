import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadIndexes,
  searchDocs,
  getPageByRoute,
  getComponentDocs,
  getPackageDocs,
  getInstallationDocs,
  listSections,
  listComponents,
  explainTopic,
  doctorCorpus,
} from '../src/retrieval/retrieve.js';

before(() => loadIndexes());

describe('search_docs', () => {
  it('returns results for "XStack"', () => {
    const results = searchDocs('XStack', { limit: 5 });
    assert.ok(results.length > 0, 'No results for XStack');
    assert.ok(results.some(r => r.route.includes('stacks')), 'Expected stacks route in results');
  });

  it('returns results for "YStack"', () => {
    const results = searchDocs('YStack', { limit: 5 });
    assert.ok(results.length > 0, 'No results for YStack');
  });

  it('returns results for "styled"', () => {
    const results = searchDocs('styled', { limit: 5 });
    assert.ok(results.length > 0, 'No results for styled');
  });

  it('returns results for "useTheme"', () => {
    const results = searchDocs('useTheme', { limit: 5 });
    assert.ok(results.length > 0, 'No results for useTheme');
  });

  it('respects limit parameter', () => {
    const results = searchDocs('button', { limit: 3 });
    assert.ok(results.length <= 3, `Expected <=3 results, got ${results.length}`);
  });

  it('results include citations', () => {
    const results = searchDocs('Dialog', { limit: 3 });
    assert.ok(results.length > 0);
    for (const r of results) {
      assert.ok(r.citation, 'Missing citation');
      assert.ok(r.citation.route, 'Missing citation.route');
      assert.ok(r.citation.chunkId, 'Missing citation.chunkId');
    }
  });

  it('returns empty array for nonsense query', () => {
    const results = searchDocs('xyzzy_nonexistent_term_12345');
    assert.ok(Array.isArray(results));
  });
});

describe('get_component_docs', () => {
  it('XStack resolves to stacks page first', () => {
    const data = getComponentDocs('XStack');
    assert.ok(data, 'No data for XStack');
    assert.equal(data.component, 'XStack');
    assert.ok(data.routes[0].includes('stacks'), `First route should be stacks, got ${data.routes[0]}`);
  });

  it('YStack resolves to stacks page first', () => {
    const data = getComponentDocs('YStack');
    assert.ok(data);
    assert.ok(data.routes[0].includes('stacks'));
  });

  it('Button returns docs', () => {
    const data = getComponentDocs('Button');
    assert.ok(data);
    assert.equal(data.component, 'Button');
    assert.ok(data.chunks.length > 0);
  });

  it('Dialog returns docs', () => {
    const data = getComponentDocs('Dialog');
    assert.ok(data);
    assert.ok(data.chunks.length > 0);
  });

  it('returns null for unknown component', () => {
    const data = getComponentDocs('NonExistentWidget');
    assert.equal(data, null);
  });
});

describe('get_page', () => {
  it('returns page for /components/stacks/1', () => {
    const page = getPageByRoute('/components/stacks/1');
    assert.ok(page, 'No page found');
    assert.ok(page.chunks.length > 0, 'No chunks');
  });

  it('returns null for unknown route', () => {
    const page = getPageByRoute('/nonexistent/route');
    assert.equal(page, null);
  });
});

describe('get_installation_docs', () => {
  it('returns results for general installation', () => {
    const results = getInstallationDocs();
    assert.ok(results.length > 0, 'No installation results');
  });

  it('returns results for Next.js', () => {
    const results = getInstallationDocs('Next.js');
    assert.ok(results.length > 0);
  });

  it('returns results for Expo', () => {
    const results = getInstallationDocs('Expo');
    assert.ok(results.length > 0);
  });
});

describe('get_package_docs', () => {
  it('returns docs for @tamagui/core', () => {
    const data = getPackageDocs('@tamagui/core');
    assert.ok(data, 'No data for @tamagui/core');
    assert.ok(data.chunks.length > 0);
  });

  it('returns docs for tamagui', () => {
    const data = getPackageDocs('tamagui');
    assert.ok(data);
    assert.ok(data.chunks.length > 0);
  });

  it('returns null for unknown package', () => {
    const data = getPackageDocs('nonexistent-package');
    assert.equal(data, null);
  });
});

describe('list_sections', () => {
  it('returns sections with pages', () => {
    const sections = listSections();
    assert.ok(Object.keys(sections).length > 0, 'No sections');
    assert.ok(sections['components'] || sections['docs'] || sections['core'], 'Missing expected sections');
  });
});

describe('list_components', () => {
  it('returns known components', () => {
    const comps = listComponents();
    assert.ok(comps.length > 10, `Expected >10 components, got ${comps.length}`);
    const names = comps.map(c => c.name.toLowerCase());
    assert.ok(names.includes('button'), 'Missing Button');
    assert.ok(names.includes('dialog') || names.includes('sheet'), 'Missing Dialog or Sheet');
  });
});

describe('explain_topic', () => {
  it('returns answer with citations for "styled"', () => {
    const result = explainTopic('styled');
    assert.ok(result.answer, 'No answer');
    assert.ok(result.answer.length > 50, 'Answer too short');
    assert.ok(result.citations.length > 0, 'No citations');
  });

  it('returns not-found message for nonsense', () => {
    const result = explainTopic('xyzzy_nonexistent_12345');
    assert.ok(result.answer.includes('No local documentation found'));
  });
});

describe('doctor_corpus', () => {
  it('reports healthy', () => {
    const result = doctorCorpus();
    assert.equal(result.healthy, true);
    assert.equal(result.issues.length, 0);
    assert.ok(result.manifest, 'Missing manifest');
    assert.ok(result.manifest.totalPages > 0);
    assert.ok(result.manifest.totalChunks > 0);
  });
});
