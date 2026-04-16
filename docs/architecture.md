# Architecture

## Overview

`tamagui-mcp-server-community` is a single JavaScript project that provides offline Tamagui documentation retrieval through the Model Context Protocol (MCP). It operates in two distinct phases: one-time online acquisition, then fully offline serving.

## Two-phase design

### Phase 1 — Acquisition (online, manual)

Runs once (or on-demand to refresh). Downloads the Tamagui documentation corpus.

```
tamagui.dev/llms.txt  ──→  split by ## sections  ──→  data/raw/llms/**/llms.txt
tamagui.dev/docs/**   ──→  HTML crawl for metadata ──→  data/manifests/*.json
tamagui.dev/docs/*.md ──→  per-page .md download   ──→  data/raw/llms/docs/**/llms.txt
```

The root `llms.txt` from Tamagui (~1MB) contains the full docs corpus. Phase 1 splits it into page-level files stored in a route-mirrored directory structure, then crawls HTML pages for titles and link discovery.

### Phase 2 — Offline server (no network)

Reads only from local files. Never fetches anything at runtime.

```
data/raw/llms/**  ──→  normalize  ──→  data/normalized/*.json
                                  ──→  chunk (heading-aware)
                                  ──→  extract entities
                  ──→  index      ──→  data/indexes/*.json (MiniSearch, component, package, route, heading, alias)
                  ──→  serve      ──→  MCP tools over stdio
```

## Directory structure

```
├── server.js                  # MCP entry point (stdio)
├── mcp-server.json            # Kiro CLI MCP config
├── package.json
│
├── scripts/                   # CLI commands (acquire, normalize, index, verify, etc.)
│
├── src/
│   ├── config/                # Seeds, crawl rules, retrieval params, project paths
│   ├── acquisition/           # Phase 1: fetch pages, discover links, download llms.txt
│   ├── normalize/             # Phase 2: parse, chunk, extract headings/entities/code
│   ├── indexing/              # Phase 2: build MiniSearch + component/package/route indexes
│   ├── retrieval/             # Query layer: search, lookup, rerank, format citations
│   ├── mcp/                   # MCP server, tool definitions, handlers
│   └── utils/                 # fs, hash, logger, pathing, text helpers
│
├── data/                      # Generated (gitignored)
│   ├── raw/llms/**/llms.txt   # Downloaded corpus (route-mirrored)
│   ├── raw/page-metadata.json # Titles and sections from HTML crawl
│   ├── normalized/            # pages.json, chunks.json, headings.json, entities.json
│   ├── indexes/               # minisearch, component, package, route, heading, alias indexes
│   └── manifests/             # discovered-pages, downloaded-pages, corpus-manifest
│
├── tests/                     # Corpus, retrieval, and MCP integration tests
└── docs/                      # This file
```

## Data pipeline

```
npm run acquire   →  crawl + download  →  data/raw/, data/manifests/
npm run normalize →  parse + chunk     →  data/normalized/
npm run index     →  build indexes     →  data/indexes/, data/manifests/corpus-manifest.json
npm run start     →  load indexes      →  MCP server on stdio
```

## Retrieval stack

Hybrid local retrieval, no network dependencies.

**Tier 1 — Lexical (always active):**
- MiniSearch full-text index (BM25-like scoring with fuzzy + prefix matching)
- Boost weights: title (3x), heading (2x), body (1x)
- Alias index for common lookups (xstack → stacks, usetheme → use-theme)

**Tier 2 — Entity indexes (always active):**
- Component index: maps component names → routes (with smart ranking: component's own page first)
- Package index: maps package names → routes
- Route index: direct route → page lookup
- Heading index: heading text → chunks

**Tier 3 — Deterministic reranking:**
- Component page priority (e.g. XStack query → `/components/stacks/*` ranked first)
- Alias resolution before search

## Chunking strategy

Heading-aware splitting that preserves technical structure:

- Split on `##` / `###` headings
- Target: 300–900 words per chunk
- Overlap: ~80 words when splitting large sections
- Never splits inside code fences
- Each chunk carries: id, page id, route, local path, title, heading, body, code snippets, entities, token estimate, checksum

## Entity extraction

Regex-based extraction during normalization:

| Type | Examples |
|------|----------|
| Components | XStack, YStack, Button, Dialog, Sheet, Popover |
| Packages | @tamagui/core, @tamagui/static, tamagui |
| Hooks | useTheme, useMedia |
| Frameworks | Expo, Next.js, Vite, React Native |
| CLI commands | npx, yarn, npm install patterns |

## MCP tools

10 tools exposed over stdio:

| Tool | Purpose |
|------|---------|
| `search_docs` | Full-text search with optional filters (section, package, component) |
| `get_page` | Full page by route |
| `get_component_docs` | Component-focused docs with smart route ranking |
| `get_installation_docs` | Installation guides by framework |
| `get_package_docs` | Package-focused docs |
| `list_sections` | All corpus sections |
| `list_components` | All discovered components |
| `explain_topic` | Synthesized answer with citations |
| `doctor_corpus` | Health check |
| `refresh_instructions` | How to rebuild |

## Citation format

Every result includes deterministic local citations:

```
localPath: data/raw/llms/components/stacks/2/llms.txt
route:     /components/stacks/2
heading:   XStack, YStack, ZStack
chunkId:   components-stacks-2-004
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server over stdio
- `cheerio` — HTML parsing (Phase 1 only)
- `fast-glob` — corpus file enumeration
- `minisearch` — lightweight full-text search index
- `zod` — tool schema validation

No browser automation, no online APIs, no embedding services at runtime.
