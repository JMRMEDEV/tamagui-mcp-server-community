import { z } from 'zod';

export const TOOL_DEFINITIONS = [
  {
    name: 'search_docs',
    description: 'Search the local Tamagui documentation corpus. Returns ranked chunks with citations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 10)' },
        section: { type: 'string', description: 'Filter by section (docs, ui)' },
        packageFilter: { type: 'string', description: 'Filter by package name' },
        componentFilter: { type: 'string', description: 'Filter by component name' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_page',
    description: 'Get the full normalized page record for a Tamagui docs route.',
    inputSchema: {
      type: 'object',
      properties: {
        route: { type: 'string', description: 'Page route, e.g. /ui/button/button' },
      },
      required: ['route'],
    },
  },
  {
    name: 'get_component_docs',
    description: 'Get documentation for a specific Tamagui component or primitive (e.g. XStack, Button, Dialog).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_installation_docs',
    description: 'Get Tamagui installation guidance, optionally filtered by framework (Expo, Next.js, Vite).',
    inputSchema: {
      type: 'object',
      properties: {
        framework: { type: 'string', description: 'Framework name (optional)' },
      },
    },
  },
  {
    name: 'get_package_docs',
    description: 'Get documentation for a Tamagui package (e.g. @tamagui/core, tamagui).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Package name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_sections',
    description: 'List all major sections in the local Tamagui corpus.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_components',
    description: 'List all known Tamagui components/primitives discovered from the corpus.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'explain_topic',
    description: 'Get a compact synthesized answer about a Tamagui topic from local docs, with citations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic to explain' },
      },
      required: ['query'],
    },
  },
  {
    name: 'doctor_corpus',
    description: 'Check whether the local Tamagui corpus and indexes are present and healthy.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'refresh_instructions',
    description: 'Get instructions for re-running corpus acquisition and index building.',
    inputSchema: { type: 'object', properties: {} },
  },
];
