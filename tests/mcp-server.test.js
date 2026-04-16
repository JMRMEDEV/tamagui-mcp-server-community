import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let client;

describe('MCP server', () => {
  it('connects and lists all 10 tools', async () => {
    const transport = new StdioClientTransport({ command: 'node', args: ['server.js'] });
    client = new Client({ name: 'test', version: '1.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = tools.map(t => t.name).sort();
    assert.deepEqual(names, [
      'doctor_corpus',
      'explain_topic',
      'get_component_docs',
      'get_installation_docs',
      'get_package_docs',
      'get_page',
      'list_components',
      'list_sections',
      'refresh_instructions',
      'search_docs',
    ]);
  });

  it('search_docs returns results', async () => {
    const res = await client.callTool({ name: 'search_docs', arguments: { query: 'Button', limit: 3 } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].citation);
  });

  it('get_component_docs returns XStack docs', async () => {
    const res = await client.callTool({ name: 'get_component_docs', arguments: { name: 'XStack' } });
    const data = JSON.parse(res.content[0].text);
    assert.equal(data.component, 'XStack');
    assert.ok(data.routes[0].includes('stacks'));
  });

  it('get_page returns page data', async () => {
    const res = await client.callTool({ name: 'get_page', arguments: { route: '/components/stacks/2' } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.chunks.length > 0);
  });

  it('get_page returns error for unknown route', async () => {
    const res = await client.callTool({ name: 'get_page', arguments: { route: '/nonexistent' } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.error);
  });

  it('get_installation_docs returns results', async () => {
    const res = await client.callTool({ name: 'get_installation_docs', arguments: { framework: 'Expo' } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
  });

  it('get_package_docs returns results for tamagui', async () => {
    const res = await client.callTool({ name: 'get_package_docs', arguments: { name: 'tamagui' } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.chunks.length > 0);
  });

  it('list_sections returns sections', async () => {
    const res = await client.callTool({ name: 'list_sections', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    assert.ok(Object.keys(data).length > 0);
  });

  it('list_components returns components', async () => {
    const res = await client.callTool({ name: 'list_components', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.length > 10);
  });

  it('explain_topic returns answer with citations', async () => {
    const res = await client.callTool({ name: 'explain_topic', arguments: { query: 'animations' } });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.answer.length > 50);
    assert.ok(data.citations.length > 0);
  });

  it('doctor_corpus reports healthy', async () => {
    const res = await client.callTool({ name: 'doctor_corpus', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    assert.equal(data.healthy, true);
  });

  it('refresh_instructions returns text', async () => {
    const res = await client.callTool({ name: 'refresh_instructions', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.instructions.includes('npm run acquire'));

    await client.close();
  });
});
