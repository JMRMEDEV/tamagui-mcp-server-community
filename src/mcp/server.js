import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleToolCall } from './handlers.js';
import { loadIndexes } from '../retrieval/retrieve.js';
import { log } from '../utils/logger.js';

const toolSchemas = {
  search_docs: {
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Max results (default 10)'),
    section: z.string().optional().describe('Filter by section (docs, ui)'),
    packageFilter: z.string().optional().describe('Filter by package name'),
    componentFilter: z.string().optional().describe('Filter by component name'),
  },
  get_page: {
    route: z.string().describe('Page route, e.g. /ui/button/button'),
  },
  get_component_docs: {
    name: z.string().describe('Component name'),
  },
  get_installation_docs: {
    framework: z.string().optional().describe('Framework name (Expo, Next.js, Vite)'),
  },
  get_package_docs: {
    name: z.string().describe('Package name'),
  },
  list_sections: {},
  list_components: {},
  explain_topic: {
    query: z.string().describe('Topic to explain'),
  },
  doctor_corpus: {},
  refresh_instructions: {},
};

const toolDescriptions = {
  search_docs: 'Search the local Tamagui documentation corpus. Returns ranked chunks with citations.',
  get_page: 'Get the full normalized page record for a Tamagui docs route.',
  get_component_docs: 'Get documentation for a specific Tamagui component or primitive.',
  get_installation_docs: 'Get Tamagui installation guidance, optionally filtered by framework.',
  get_package_docs: 'Get documentation for a Tamagui package.',
  list_sections: 'List all major sections in the local Tamagui corpus.',
  list_components: 'List all known Tamagui components/primitives discovered from the corpus.',
  explain_topic: 'Get a compact synthesized answer about a Tamagui topic from local docs, with citations.',
  doctor_corpus: 'Check whether the local Tamagui corpus and indexes are present and healthy.',
  refresh_instructions: 'Get instructions for re-running corpus acquisition and index building.',
};

export async function startServer() {
  loadIndexes();
  log.info('Indexes loaded');

  const server = new McpServer({ name: 'tamagui-docs', version: '1.0.0' });

  for (const [name, schema] of Object.entries(toolSchemas)) {
    server.tool(name, toolDescriptions[name], schema, async (args) => {
      try {
        return handleToolCall(name, args);
      } catch (err) {
        log.error(`Tool ${name} error:`, err.message);
        return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('MCP server running on stdio');
}
