# tamagui-mcp-server-community

Offline Tamagui documentation MCP server for Kiro CLI.

## What it does

Provides local, offline retrieval of Tamagui documentation through the Model Context Protocol (MCP). The server answers queries about Tamagui components, packages, installation, hooks, styling, and more — all from a locally downloaded corpus. **No network access at runtime.**

## Architecture

### Phase 1 — One-time acquisition

Crawls `tamagui.dev` docs to discover pages. Downloads the root `llms.txt` (which contains the full Tamagui docs corpus) and splits it into page-level files stored in a mirrored local directory. Also downloads individual `.md` files for `/docs/` routes when they provide richer content.

### Phase 2 — Offline server

Normalizes, chunks, and indexes the downloaded corpus. Exposes MCP tools over stdio that answer queries from local data only.

## Setup

```bash
npm install
npm run acquire     # Crawl docs + download llms.txt files
npm run normalize   # Parse and chunk the corpus
npm run index       # Build search indexes
npm run verify      # Verify corpus integrity
```

## Usage

```bash
npm start           # Start MCP server on stdio
```

### Kiro CLI configuration

Add to your Kiro MCP configuration (e.g. `~/.kiro/mcp.json` or workspace `.kiro/settings.json`):

```json
{
  "mcpServers": {
    "tamagui-docs": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/absolute/path/to/tamagui-mcp-server-community"
    }
  }
}
```

The `mcp-server.json` in this repo contains the same structure for reference.

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_docs` | Full-text search across the corpus with optional section/package/component filters |
| `get_page` | Get a full page by route (e.g. `/components/stacks/2`) |
| `get_component_docs` | Docs for a specific component — prioritizes the component's own page (e.g. XStack → Stacks) |
| `get_installation_docs` | Installation guides, optionally filtered by framework (Expo, Next.js, Vite) |
| `get_package_docs` | Docs for a package (e.g. `@tamagui/core`, `tamagui`) |
| `list_sections` | List all major sections discovered in the corpus |
| `list_components` | List all known components/primitives with their routes |
| `explain_topic` | Synthesized answer from local chunks with citations |
| `doctor_corpus` | Health check — verifies corpus, indexes, and manifests are present |
| `refresh_instructions` | Human-readable steps to re-run acquisition and rebuild |

## Citations

Every result includes deterministic citations mapping to local files:

```
Source: data/raw/llms/components/stacks/2/llms.txt
Route: /components/stacks/2
Heading: XStack, YStack, ZStack
Chunk: components-stacks-2-004
```

This makes responses auditable — agents can reopen the exact local file when needed.

## Corpus structure

Downloaded files are stored in a route-mirrored structure:

```
data/raw/llms/
  components/stacks/1/llms.txt
  components/stacks/2/llms.txt
  components/button/2/llms.txt
  components/dialog/2/llms.txt
  core/styled/llms.txt
  intro/installation/llms.txt
  guides/next-js/llms.txt
  ...
```

Normalized data and indexes live under `data/normalized/` and `data/indexes/`.

## Refreshing the corpus

When Tamagui docs change:

```bash
npm run refresh     # Re-crawl, normalize, and re-index in one step
```

Or step by step:

```bash
npm run acquire
npm run normalize
npm run index
npm run verify
```

## Testing

```bash
npm test
```

Runs corpus integrity checks, retrieval unit tests, and MCP server integration tests (44 tests total).

## Troubleshooting

```bash
npm run doctor      # Check if corpus and indexes are healthy
npm run verify      # Verify all files are present
```

If doctor reports issues, re-run the full pipeline:

```bash
npm run acquire && npm run normalize && npm run index
```

## License

MIT
