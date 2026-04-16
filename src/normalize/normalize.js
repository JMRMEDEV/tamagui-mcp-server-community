import fg from 'fast-glob';
import { join, relative } from 'path';
import { DIRS } from '../config/project.js';
import { CHUNK_TARGET_WORDS, CHUNK_MAX_WORDS, CHUNK_OVERLAP_WORDS } from '../config/retrieval.js';
import { readText, readJson, writeJson, ensureDir, existsSync } from '../utils/fs.js';
import { normalizeWhitespace, estimateTokens, wordCount } from '../utils/text.js';
import { sha256 } from '../utils/hash.js';
import { log } from '../utils/logger.js';

// --- Parsing ---

function extractHeadings(text) {
  const headings = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m) headings.push({ level: m[1].length, text: m[2].trim() });
  }
  return headings;
}

function extractCodeBlocks(text) {
  const blocks = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) {
    blocks.push({ language: m[1] || 'text', code: m[2].trim() });
  }
  return blocks;
}

const ENTITY_PATTERNS = {
  components: /\b(XStack|YStack|ZStack|Stack|Text|Button|Input|Dialog|Sheet|Popover|Tooltip|Toast|Tabs|Accordion|Avatar|Card|Checkbox|Form|Label|Progress|RadioGroup|Select|Slider|Switch|TextArea|ToggleGroup|AlertDialog|Group|Image|ListItem|Separator|Spinner|Anchor|Adapt|AnimatePresence|ScrollView|LinearGradient|VisuallyHidden|Unspaced|Heading)\b/g,
  packages: /@tamagui\/[\w-]+|(?<!\w)tamagui(?!\w)/g,
  hooks: /\buse[A-Z]\w+/g,
  frameworks: /\b(Expo|Next\.js|Vite|Metro|React Native|React)\b/g,
  cliCommands: /\bnpx\s+[\w@/-]+|yarn\s+\w+|npm\s+\w+|bunx?\s+[\w@/-]+/g,
};

function extractEntities(text) {
  const entities = {};
  for (const [type, re] of Object.entries(ENTITY_PATTERNS)) {
    const matches = [...new Set((text.match(re) || []))];
    if (matches.length) entities[type] = matches;
  }
  return entities;
}

// --- Chunking ---

function splitByHeadings(text) {
  const sections = [];
  const lines = text.split('\n');
  let current = { heading: '', level: 0, lines: [] };

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m && current.lines.length > 0) {
      sections.push(current);
      current = { heading: m[2].trim(), level: m[1].length, lines: [] };
    } else if (m && current.lines.length === 0) {
      current.heading = m[2].trim();
      current.level = m[1].length;
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

function chunkPage(pageId, route, localPath, title, text) {
  const sections = splitByHeadings(text);
  const chunks = [];
  let idx = 0;

  for (const sec of sections) {
    const body = sec.lines.join('\n').trim();
    if (!body) continue;

    const wc = wordCount(body);
    if (wc <= CHUNK_MAX_WORDS) {
      chunks.push(makeChunk(pageId, route, localPath, title, sec.heading, body, idx++));
    } else {
      // Split large sections preserving code fences
      const subChunks = splitLargeSection(body);
      for (const sub of subChunks) {
        chunks.push(makeChunk(pageId, route, localPath, title, sec.heading, sub, idx++));
      }
    }
  }

  // If no chunks were created (no headings), chunk the whole text
  if (chunks.length === 0 && text.trim()) {
    chunks.push(makeChunk(pageId, route, localPath, title, '', text.trim(), 0));
  }

  return chunks;
}

function splitLargeSection(text) {
  const paragraphs = text.split(/\n\n+/);
  const result = [];
  let current = [];
  let currentWc = 0;

  for (const para of paragraphs) {
    const pwc = wordCount(para);
    if (currentWc + pwc > CHUNK_TARGET_WORDS && current.length > 0) {
      result.push(current.join('\n\n'));
      // Overlap: keep last paragraph
      const overlap = current.slice(-1);
      current = [...overlap, para];
      currentWc = wordCount(current.join('\n\n'));
    } else {
      current.push(para);
      currentWc += pwc;
    }
  }
  if (current.length) result.push(current.join('\n\n'));
  return result;
}

function makeChunk(pageId, route, localPath, title, heading, body, idx) {
  const chunkId = `${pageId}-${String(idx).padStart(3, '0')}`;
  return {
    chunkId,
    pageId,
    route,
    localPath,
    title,
    heading,
    body: normalizeWhitespace(body),
    codeSnippets: extractCodeBlocks(body),
    entities: extractEntities(body),
    tokenEstimate: estimateTokens(body),
    checksum: sha256(body),
  };
}

// --- Main normalize pipeline ---

export async function normalizeCorpus() {
  ensureDir(DIRS.normalized);

  const metadataPath = join(DIRS.raw, 'page-metadata.json');
  const metadata = existsSync(metadataPath) ? readJson(metadataPath) : {};

  const files = await fg('**/llms.txt', { cwd: DIRS.llms, absolute: true });
  log.info(`Normalizing ${files.length} llms.txt files`);

  const pages = [];
  const allChunks = [];
  const allHeadings = [];
  const allCodeBlocks = [];
  const allEntities = {};

  for (const file of files) {
    const rel = relative(DIRS.llms, file).replace(/\/llms\.txt$/, '');
    const route = '/' + rel;
    const pageId = rel.replace(/\//g, '-');
    const text = readText(file);
    const meta = metadata[route] || {};
    const title = meta.title || rel.split('/').pop() || '';

    const headings = extractHeadings(text);
    const codeBlocks = extractCodeBlocks(text);
    const entities = extractEntities(text);
    const chunks = chunkPage(pageId, route, file, title, text);

    pages.push({
      pageId,
      route,
      localPath: file,
      title,
      section: meta.section || route.split('/').filter(Boolean)[0],
      headings,
      entities,
      chunkCount: chunks.length,
      tokenEstimate: estimateTokens(text),
    });

    allChunks.push(...chunks);
    allHeadings.push(...headings.map(h => ({ ...h, pageId, route })));
    allCodeBlocks.push(...codeBlocks.map(cb => ({ ...cb, pageId, route })));

    for (const [type, vals] of Object.entries(entities)) {
      if (!allEntities[type]) allEntities[type] = {};
      for (const v of vals) {
        if (!allEntities[type][v]) allEntities[type][v] = [];
        allEntities[type][v].push(route);
      }
    }
  }

  writeJson(join(DIRS.normalized, 'pages.json'), pages);
  writeJson(join(DIRS.normalized, 'chunks.json'), allChunks);
  writeJson(join(DIRS.normalized, 'headings.json'), allHeadings);
  writeJson(join(DIRS.normalized, 'codeblocks.json'), allCodeBlocks);
  writeJson(join(DIRS.normalized, 'entities.json'), allEntities);

  log.info(`Normalized: ${pages.length} pages, ${allChunks.length} chunks`);
  return { pages, chunks: allChunks };
}
